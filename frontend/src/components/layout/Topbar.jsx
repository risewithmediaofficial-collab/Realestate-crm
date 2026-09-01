import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, Plus, HelpCircle, ChevronDown, CheckCircle,
  User, LogOut, Settings, Trash2, X, BellOff, Sparkles, Menu, Phone, Calendar, Clock, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getInitials, formatDate, timeAgo } from '../../utils/formatters';
import { hasModuleAccess } from '../../utils/rbac';
import api from '../../services/api';

const INITIAL_NOTIFICATIONS = [];

export default function Topbar() {
  const { user, logout } = useAuth();
  const { openCreateLead, showNotification, toggleMobileMenu, startCall } = useUI();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [followUps, setFollowUps] = useState([]);
  const [followUpCounts, setFollowUpCounts] = useState({ count: 0, overdueCount: 0, todayCount: 0 });
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_notifications');
      return saved !== null ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });
  const navigate = useNavigate();

  // Fetch live follow-up notifications
  const fetchFollowUps = useCallback(async () => {
    try {
      const { data } = await api.get('/leads/follow-ups/today');
      if (data?.success) {
        setFollowUps(data.data || []);
        setFollowUpCounts({
          count: data.count || 0,
          overdueCount: data.overdueCount || 0,
          todayCount: data.todayCount || 0
        });
      }
    } catch (err) {
      console.warn('Could not fetch follow-up alerts:', err?.message);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
    const interval = setInterval(fetchFollowUps, 60000); // refresh every 1 min
    return () => clearInterval(interval);
  }, [fetchFollowUps]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      navigate(`/leads?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleClearAll = (e) => {
    e?.stopPropagation();
    setNotifications([]);
    try {
      localStorage.setItem('crm_notifications', JSON.stringify([]));
    } catch {}
    showNotification('All notifications cleared');
  };

  const handleDismissOne = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      try {
        localStorage.setItem('crm_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const totalAlertsCount = followUpCounts.count + notifications.length;

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {/* Mobile Hamburger Toggle */}
        <button
          className="topbar-action-btn mobile-menu-toggle"
          onClick={toggleMobileMenu}
          title="Open Navigation Menu"
          aria-label="Toggle navigation menu"
        >
          <Menu size={19} />
        </button>

        {/* Search Bar */}
        <div className="topbar-search">
          <Search size={15} color="var(--text-muted)" />
          <input
            placeholder="Search leads, projects, contacts... (Press Enter)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        {/* + New Lead Button */}
        <button
          id="topbar-add-lead-btn"
          className="btn btn-primary btn-sm"
          style={{ gap: '6px', fontWeight: 600 }}
          onClick={openCreateLead}
        >
          <Plus size={15} /> New Lead
        </button>

        {/* Notifications with Live Re-follow Feed */}
        <div style={{ position: 'relative' }}>
          <button
            id="topbar-notifications-btn"
            className="topbar-action-btn"
            title="Notifications & Re-follow Alerts"
            onClick={() => {
              setShowNotifs(p => !p);
              if (!showNotifs) fetchFollowUps();
            }}
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {totalAlertsCount > 0 && (
              <span
                className="notif-dot"
                style={{
                  background: followUpCounts.overdueCount > 0 ? '#ef4444' : '#f59e0b',
                  width: 8, height: 8
                }}
              />
            )}
          </button>

          {showNotifs && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowNotifs(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'white', border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow-hover)',
                width: 380, maxWidth: '92vw', zIndex: 50, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--card-border)',
                  background: '#f8fafc', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 13 }}>Notifications & Follow-ups</span>
                    {totalAlertsCount > 0 ? (
                      <span className="badge badge-primary" style={{ fontSize: 10 }}>{totalAlertsCount} Due</span>
                    ) : (
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>All Caught Up</span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      id="clear-all-notifications-btn"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11, color: 'var(--danger)', height: 'auto' }}
                      onClick={handleClearAll}
                      title="Clear all notifications"
                    >
                      <Trash2 size={11} /> Clear all
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {/* Section 1: Live Re-follow Date Notifications */}
                  {followUps.length > 0 && (
                    <div style={{ background: '#fff' }}>
                      <div style={{
                        padding: '8px 14px', background: '#eff6ff',
                        borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: '#1e40af'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>⏰</span>
                          <span>Re-follow Leads Due ({followUps.length})</span>
                        </div>
                        {followUpCounts.overdueCount > 0 && (
                          <span style={{ background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>
                            {followUpCounts.overdueCount} Overdue
                          </span>
                        )}
                      </div>

                      {followUps.map(lead => {
                        const isOverdue = lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date(new Date().setHours(0,0,0,0));
                        return (
                          <div
                            key={lead._id}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              background: isOverdue ? '#fffdfa' : '#fff',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseOut={e => e.currentTarget.style.background = isOverdue ? '#fffdfa' : '#fff'}
                          >
                            <div
                              style={{ flex: 1, cursor: 'pointer' }}
                              onClick={() => {
                                navigate(`/leads?search=${encodeURIComponent(lead.name)}`);
                                setShowNotifs(false);
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>{lead.name}</span>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                                  background: isOverdue ? '#fee2e2' : '#fef3c7',
                                  color: isOverdue ? '#dc2626' : '#d97706'
                                }}>
                                  {isOverdue ? 'Overdue' : 'Due Today'}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {lead.phone} {lead.nextFollowUpTime ? `· ⏰ ${lead.nextFollowUpTime}` : ''} {lead.lastCallOutcome ? `· ${lead.lastCallOutcome}` : ''}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button
                                className="btn btn-success btn-sm"
                                style={{ padding: '3px 8px', fontSize: 11, height: 26, gap: 4 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startCall(lead);
                                  setShowNotifs(false);
                                }}
                                title="Call lead now"
                              >
                                <Phone size={11} /> Call
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '3px 6px', fontSize: 11, height: 26, color: 'var(--primary)' }}
                                onClick={() => {
                                  navigate(`/leads?search=${encodeURIComponent(lead.name)}`);
                                  setShowNotifs(false);
                                }}
                                title="Open lead"
                              >
                                View →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Section 2: General Alerts */}
                  {notifications.length === 0 && followUps.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <BellOff size={26} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>No pending notifications</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>All telecalling re-follows are on schedule!</div>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                          fontSize: 12, display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', gap: 8, cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'white'}
                        onClick={() => {
                          if (n.link) {
                            navigate(n.link);
                            setShowNotifs(false);
                          }
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35 }}>{n.text}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{n.time}</div>
                        </div>
                        <button
                          className="btn btn-ghost btn-icon btn-sm text-muted"
                          style={{ width: 20, height: 20, padding: 0, flexShrink: 0, opacity: 0.7 }}
                          onClick={(e) => handleDismissOne(n.id, e)}
                          title="Dismiss notification"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>


        {/* Help */}
        <button
          className="topbar-action-btn topbar-help-btn"
          title="Quick Help"
          onClick={() => showNotification('PropCRM Pro v1.0 — Need assistance? Contact support@propcrm.com')}
        >
          <HelpCircle size={18} />
        </button>

        {/* Organization Badge */}
        {user?.organization && user?.role !== 'super_admin' && (
          <div className="topbar-org-badge" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 8,
            whiteSpace: 'nowrap'
          }}>
            🏢 {user.organization}
          </div>
        )}

        {/* User profile dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            className="topbar-user"
            onClick={() => setShowUserMenu(p => !p)}
          >
            <div className="avatar avatar-sm">
              {getInitials(user?.name || 'Admin')}
            </div>
            <div>
              <div className="topbar-user-name">{user?.name?.split(' ')[0] || 'Admin'}</div>
              <div className="topbar-user-role" style={{ textTransform: 'capitalize' }}>
                {user?.organization ? user.organization : (user?.role?.replace(/_/g, ' ') || 'Admin')}
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>

          {showUserMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowUserMenu(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'white', border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow-hover)',
                minWidth: 220, zIndex: 50, overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{user?.name || 'Administrator'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user?.email || 'admin@crm.com'}</div>
                  {user?.organization && (
                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      🏢 {user.organization}
                    </div>
                  )}
                </div>

                {hasModuleAccess(user?.role, 'settings') && (
                  <div
                    style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Settings size={14} color="var(--text-muted)" /> System Settings
                  </div>
                )}

                {hasModuleAccess(user?.role, 'users') && (
                  <div
                    style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => { setShowUserMenu(false); navigate('/users'); }}
                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <User size={14} color="var(--text-muted)" /> User Management
                  </div>
                )}

                <div
                  style={{
                    padding: '10px 16px', fontSize: '13px', cursor: 'pointer',
                    color: 'var(--danger)', borderTop: '1px solid var(--card-border)',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}
                  onClick={logout}
                >
                  <LogOut size={14} /> Sign Out
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
