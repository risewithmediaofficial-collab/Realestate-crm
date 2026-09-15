import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CheckSquare,
  GitBranch, Warehouse, MapPin,
  FileText, CreditCard, User, BarChart3,
  Settings, ChevronRight, LogOut, Building, X, Bell, Sparkles, Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getInitials } from '../../utils/formatters';
import { getAccessibleNavConfig } from '../../utils/rbac';
import NotificationCenter from '../notifications/NotificationCenter';
import api from '../../services/api';

const navConfig = [
  {
    section: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { id: 'public-site', label: 'Customer Website ↗', icon: Globe, path: '/', external: true },
    ],
  },
  {
    section: 'SALES & LEADS',
    items: [
      {
        id: 'leads', label: 'Leads Pipeline', icon: Users, path: '/leads',
        children: [
          { label: '🗂️ All Leads Board', path: '/leads' },
          { label: '⚡ New Leads Board', path: '/leads/new' },
          { label: '📅 SV Scheduled & Done', path: '/leads/scheduled' },
          { label: '🔥 Hot Priority Leads', path: '/leads/hot' },
        ],
      },
      { id: 'pipeline', label: 'Visual Pipeline', icon: GitBranch, path: '/pipeline' },
      { id: 'requirements', label: 'Buyer Requirements', icon: Sparkles, path: '/requirements' },
      { id: 'activities', label: 'Follow-ups & Tasks', icon: CheckSquare, path: '/activities' },
    ],
  },
  {
    section: 'PROPERTY & INVENTORY',
    items: [
      {
        id: 'projects', label: 'Projects & Developments', icon: Building, path: '/projects',
        children: [
          { label: 'All Master Projects', path: '/projects' },
          { label: 'Residential Apartments', path: '/projects/residential' },
          { label: 'Plots & Farmlands', path: '/projects/plots' },
          { label: 'Commercial Spaces', path: '/projects/commercial' },
        ],
      },
      {
        id: 'inventory', label: 'Inventory & Plot Grid', icon: Warehouse, path: '/inventory',
        children: [
          { label: 'All Inventory Units', path: '/inventory' },
          { label: 'Tower & Sector Matrix', path: '/inventory/tower-a' },
        ],
      },
    ],
  },
  {
    section: 'BOOKINGS & CLOSINGS',
    items: [
      { id: 'siteVisits', label: 'Site Visits', icon: MapPin, path: '/site-visits' },
      { id: 'booking', label: 'Bookings & Applications', icon: FileText, path: '/booking' },
      { id: 'payments', label: 'Payments & Demands', icon: CreditCard, path: '/payments' },
    ],
  },
  {
    section: 'ADMIN & TOOLS',
    items: [
      { id: 'reports', label: 'Reports & Revenue BI', icon: BarChart3, path: '/reports' },
      { id: 'users', label: 'Team Members', icon: User, path: '/users' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { simulatedRole, isMobileMenuOpen, closeMobileMenu } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);
  const [openMenus, setOpenMenus] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchReminders = async () => {
      try {
        const { data } = await api.get('/bookings/upcoming-reminders');
        if (isMounted && data?.data) {
          setReminderCount(data.data.length);
        }
      } catch (err) {
        // quiet catch
      }
    };
    fetchReminders();
    const interval = setInterval(fetchReminders, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  const effectiveRole = simulatedRole || user?.role || 'admin';
  const effectiveUser = user ? { ...user, role: effectiveRole } : null;
  const accessibleSections = effectiveUser ? getAccessibleNavConfig(effectiveUser, navConfig) : [];

  if (!user) return null;

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isSubItemActive = (childPath) => {
    return location.pathname === childPath;
  };

  const handleItemClick = (item) => {
    if (item.external) {
      window.open(item.path, '_blank');
      return;
    }
    navigate(item.path);
    if (item.children?.length) {
      setOpenMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
    }
    if (window.innerWidth < 1024) {
      closeMobileMenu();
    }
  };

  const handleSubItemClick = (e, childPath) => {
    e.stopPropagation();
    navigate(childPath);
    if (window.innerWidth < 1024) {
      closeMobileMenu();
    }
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div className="sidebar-mobile-overlay" onClick={closeMobileMenu} title="Close Navigation" />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div
            onClick={() => { navigate('/dashboard'); closeMobileMenu(); }}
            style={{
              width: 58,
              height: 58,
              borderRadius: 12,
              border: '1.5px solid #d4e8cb',
              background: '#ffffff',
              padding: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(69, 133, 34, 0.14)'
            }}
          >
            <img
              src="/mrp-logo-trimmed.png"
              alt="MRP Real Estate"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
          <div className="sidebar-brand" onClick={() => { navigate('/dashboard'); closeMobileMenu(); }} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
            <div className="sidebar-brand-name" style={{ lineHeight: 1.2, fontWeight: 800, fontSize: '13px', color: '#172a11', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="MRP REAL ESTATE CRM">
              MRP REAL ESTATE
            </div>
            <div className="sidebar-brand-sub" style={{ fontSize: 10.5, color: '#458522', fontWeight: 700, letterSpacing: '0.04em' }}>
              CRM &bull; {user?.organization || 'REVENUE OS'}
            </div>
          </div>
          <button 
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            title="Notifications"
            style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            <Bell size={18} />
            {reminderCount > 0 && (
              <span 
                className="pulse-notification-dot" 
                style={{ position: 'absolute', top: 6, right: 6 }} 
                title={`${reminderCount} upcoming legal/registration alerts`}
              />
            )}
          </button>
          <button 
            className="btn btn-ghost btn-icon btn-sm sidebar-mobile-close"
            onClick={closeMobileMenu}
            title="Close Menu"
          >
            <X size={18} />
          </button>
        </div>

        <NotificationCenter 
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          userId={user?._id}
        />

        {/* Nav */}
        <nav className="sidebar-nav">
          {accessibleSections.map((section) => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-label">{section.section}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = item.children?.length > 0;
                const active = isActive(item.path);
                const menuOpen = Boolean(openMenus[item.id]);

                return (
                  <div key={item.id}>
                    <div
                      className={`nav-item ${active ? 'active' : ''}`}
                      onClick={() => handleItemClick(item)}
                      title={item.label}
                    >
                      <Icon className="nav-icon" size={17} />
                      <span className="nav-label">{item.label}</span>
                      {item.badge && (
                        <span className={`nav-badge ${item.badgeType || ''}`}>{item.badge}</span>
                      )}
                      {item.id === 'booking' && reminderCount > 0 && (
                        <span className="sidebar-dotted-alert" title={`${reminderCount} upcoming agreements/registrations due in 4 days`}>
                          <span className="pulse-notification-dot" style={{ width: 6, height: 6 }} />
                          {reminderCount} due
                        </span>
                      )}
                      {item.id === 'dashboard' && reminderCount > 0 && !active && (
                        <span className="pulse-notification-dot" style={{ marginLeft: 'auto', width: 7, height: 7 }} title="Pending registration & legal actions" />
                      )}
                      {hasChildren && (
                        <ChevronRight
                          className={`nav-chevron ${menuOpen ? 'open' : ''}`}
                          size={14}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenus(p => ({ ...p, [item.id]: !p[item.id] }));
                          }}
                        />
                      )}
                    </div>
                    {hasChildren && menuOpen && (
                      <div className="nav-submenu open">
                        {item.children.map((child, idx) => {
                          const subActive = isSubItemActive(child.path);
                          return (
                            <div
                              key={idx}
                              className={`nav-sub-item ${subActive ? 'active' : ''}`}
                              onClick={(e) => handleSubItemClick(e, child.path)}
                              title={child.label}
                            >
                              {child.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={logout} title="Sign Out">
            <div className="user-avatar-sm">{getInitials(user?.name || 'U')}</div>
            <div className="user-info">
              <div className="user-info-name">{user?.name || 'Administrator'}</div>
              <div className="user-info-role">
                {effectiveRole.replace(/_/g, ' ')}
                {simulatedRole && <span style={{ fontSize: '10px', color: '#2563eb', marginLeft: 4, fontWeight: 700 }}>(Preview)</span>}
              </div>
            </div>
            <LogOut size={15} style={{ color: '#94a3b8', flexShrink: 0, transition: 'color 0.2s' }} />
          </div>
        </div>
      </aside>
    </>
  );
}
