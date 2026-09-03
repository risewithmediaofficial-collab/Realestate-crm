import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, ChevronDown, User, LogOut, Settings, Menu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getInitials } from '../../utils/formatters';
import { hasModuleAccess } from '../../utils/rbac';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { openCreateLead, toggleMobileMenu } = useUI();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      navigate(`/leads?search=${encodeURIComponent(searchTerm.trim())}`);
    }
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
