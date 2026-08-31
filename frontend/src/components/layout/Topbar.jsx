import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, Plus, HelpCircle, ChevronDown, CheckCircle,
  User, LogOut, Settings, Trash2, X, BellOff, Sparkles, Menu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getInitials } from '../../utils/formatters';
import { hasModuleAccess } from '../../utils/rbac';

const INITIAL_NOTIFICATIONS = [];

export default function Topbar() {
  const { user, logout } = useAuth();
  const { openCreateLead, showNotification, toggleMobileMenu } = useUI();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_notifications');
      return saved !== null ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });
  const navigate = useNavigate();

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

  const handleRestoreSampleNotifs = (e) => {
    e.stopPropagation();
    setNotifications(INITIAL_NOTIFICATIONS);
    try {
      localStorage.setItem('crm_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    } catch {}
    showNotification('Sample notifications restored');
  };

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

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            id="topbar-notifications-btn"
            className="topbar-action-btn"
            title="Notifications"
            onClick={() => setShowNotifs(p => !p)}
          >
            <Bell size={18} />
            {notifications.length > 0 && <span className="notif-dot" />}
          </button>

          {showNotifs && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowNotifs(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'white', border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow-hover)',
                width: 340, zIndex: 50, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '10px 14px', borderBottom: '1px solid var(--card-border)',
                  background: '#f8fafc', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Notifications</span>
                    {notifications.length > 0 ? (
                      <span className="badge badge-primary" style={{ fontSize: 10 }}>{notifications.length} New</span>
                    ) : (
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>0 New</span>
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

                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                      <BellOff size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>No notifications</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>You're all caught up!</div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, marginTop: 10, color: 'var(--primary)' }}
                        onClick={handleRestoreSampleNotifs}
                      >
                        <Sparkles size={11} /> Reset sample alerts
                      </button>
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
          className="topbar-action-btn"
          title="Quick Help"
          onClick={() => showNotification('PropCRM Pro v1.0 — Need assistance? Contact support@propcrm.com')}
        >
          <HelpCircle size={18} />
        </button>

        {/* Organization Badge */}
        {user?.organization && user?.role !== 'super_admin' && (
          <div style={{
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
                {user?.organization ? user.organization : (user?.role?.replace(/_/g, ' ') || 'Super Admin')}
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
