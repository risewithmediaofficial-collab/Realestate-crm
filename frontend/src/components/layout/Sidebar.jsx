import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, TrendingUp, MessageSquare, CheckSquare,
  GitBranch, Building2, Warehouse, DollarSign, Scale, MapPin,
  FileText, CreditCard, Handshake, User, Zap, BarChart3,
  Settings, ChevronRight, LogOut, Building, X, Bell, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getInitials } from '../../utils/formatters';
import { getAccessibleNavConfig } from '../../utils/rbac';
import NotificationCenter from '../notifications/NotificationCenter';
import api from '../../services/api';

const navConfig = [
  {
    section: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    section: 'MARKETING & LEADS',
    items: [
      {
        id: 'marketing', label: 'Marketing', icon: TrendingUp, path: '/marketing',
        children: [
          { label: 'Ad Campaigns', path: '/marketing/campaigns' },
          { label: 'Meta Lead Ads (FB & IG)', path: '/settings/integrations/meta' },
          { label: 'Lead Sources & Integrations', path: '/marketing/sources' },
          { label: 'Drip Automations', path: '/marketing/drip' },
          { label: 'Lead Scoring Algorithm', path: '/marketing/scoring' },
        ],
      },
      {
        id: 'leads', label: 'Leads / Pre-Sales', icon: Users, path: '/leads',
        children: [
          { label: 'All Leads', path: '/leads' },
          { label: 'My Hot Leads', path: '/leads/hot' },
          { label: 'New / Unassigned', path: '/leads/new' },
          { label: 'Qualified Deals', path: '/leads/qualified' },
        ],
      },
      {
        id: 'requirements', label: 'Buyer Requirements', icon: Sparkles, path: '/requirements'
      },
    ],
  },
  {
    section: 'SALES',
    items: [
      {
        id: 'communication', label: 'Communication', icon: MessageSquare, path: '/communication',
        children: [
          { label: 'Cloud Dialer & Call Logs', path: '/communication/calling' },
          { label: 'WhatsApp Live Chat', path: '/communication/whatsapp' },
          { label: 'Email Automation', path: '/communication/email' },
          { label: 'Message Templates', path: '/communication/templates' },
        ],
      },
      {
        id: 'activities', label: 'Activities', icon: CheckSquare, path: '/activities',
        children: [
          { label: 'All Tasks', path: '/activities/all' },
          { label: 'Follow-up Calls', path: '/activities/call' },
          { label: 'Overdue SLA Tasks', path: '/activities/overdue' },
          { label: 'Scheduled Meetings', path: '/activities/meeting' },
        ],
      },
      { id: 'pipeline', label: 'Sales Pipeline', icon: GitBranch, path: '/pipeline' },
    ],
  },
  {
    section: 'PROJECTS & INVENTORY',
    items: [
      {
        id: 'projects', label: 'Projects', icon: Building, path: '/projects',
        children: [
          { label: 'All Projects', path: '/projects/all' },
          { label: 'Residential Apartments', path: '/projects/residential' },
          { label: 'Commercial Offices', path: '/projects/commercial' },
          { label: 'Plotted Developments', path: '/projects/plots' },
        ],
      },
      {
        id: 'inventory', label: 'Inventory', icon: Warehouse, path: '/inventory',
        children: [
          { label: 'Tower A Plan (GVR)', path: '/inventory/tower-a' },
          { label: 'Tower B Plan (GVR)', path: '/inventory/tower-b' },
          { label: 'Commercial Suites (STC)', path: '/inventory/tower-commercial' },
        ],
      },
      {
        id: 'pricing', label: 'Pricing & Cost Sheets', icon: DollarSign, path: '/pricing',
        children: [
          { label: 'Cost Sheet Calculator', path: '/pricing/calculator' },
          { label: 'Base Rates & PLC Rules', path: '/pricing/rules' },
          { label: 'Payment Schemes (CLP/Subvention)', path: '/pricing/plans' },
        ],
      },
    ],
  },
  {
    section: 'SITE VISITS & NEGOTIATION',
    items: [
      {
        id: 'siteVisits', label: 'Site Visits', icon: MapPin, path: '/site-visits',
        children: [
          { label: 'Today’s Visits', path: '/site-visits/today' },
          { label: 'Scheduled Visits', path: '/site-visits/scheduled' },
          { label: 'Completed Visits', path: '/site-visits/completed' },
          { label: 'Driver & Cab Logs', path: '/site-visits/logistics' },
        ],
      },
      {
        id: 'negotiations', label: 'Negotiations & Offers', icon: Scale, path: '/negotiations',
        children: [
          { label: 'Active Price Offers', path: '/negotiations/active' },
          { label: 'Approved Discounts', path: '/negotiations/approved' },
          { label: 'Floor-Rise Waivers', path: '/negotiations/waivers' },
        ],
      },
    ],
  },
  {
    section: 'CLOSING & FINANCE',
    items: [
      {
        id: 'booking', label: 'Booking & Deeds', icon: FileText, path: '/booking',
        children: [
          { label: 'Pending Approval', path: '/booking/pending' },
          { label: 'Approved Bookings', path: '/booking/approved' },
          { label: 'Agreement Signed', path: '/booking/agreements' },
          { label: 'Cancelled / Released', path: '/booking/cancelled' },
        ],
      },
      {
        id: 'payments', label: 'Payment Collections', icon: CreditCard, path: '/payments',
        children: [
          { label: 'Demand Letters (CLP)', path: '/payments/demands' },
          { label: 'Overdue Installments', path: '/payments/overdue' },
          { label: 'Bank Approvals & NOC', path: '/payments/loans' },
          { label: 'Receipt Generation', path: '/payments/receipts' },
        ],
      },
      {
        id: 'channelPartners', label: 'Channel Partners', icon: Handshake, path: '/channel-partners',
        children: [
          { label: 'Broker Directory', path: '/channel-partners/all' },
          { label: 'Pending Slabs / Payouts', path: '/channel-partners/payouts' },
          { label: 'Incentive Schemes', path: '/channel-partners/tiers' },
        ],
      },
    ],
  },
  {
    section: 'POST-SALES & CUSTOMER',
    items: [
      {
        id: 'customerPortal', label: 'Customer Portal', icon: User, path: '/customer-portal',
        children: [
          { label: 'Buyer Documents', path: '/customer-portal/documents' },
          { label: 'Construction Progress', path: '/customer-portal/progress' },
          { label: 'Possession Handover', path: '/customer-portal/possession' },
        ],
      },
    ],
  },
  {
    section: 'INSIGHTS & ADMIN',
    items: [
      {
        id: 'reports', label: 'Analytics & Reports', icon: BarChart3, path: '/reports',
        children: [
          { label: 'Sales Velocity & Revenue', path: '/reports/sales' },
          { label: 'Inventory Aging Report', path: '/reports/inventory' },
          { label: 'Agent Calling Productivity', path: '/reports/telecallers' },
          { label: 'Lead Source ROI', path: '/reports/sources' },
        ],
      },
      {
        id: 'users', label: 'Team Management', icon: Users, path: '/users',
        children: [
          { label: 'All Staff Members', path: '/users' },
          { label: 'Telecaller Teams', path: '/users/telecallers' },
          { label: 'Sales Executives / Closers', path: '/users/executives' },
          { label: 'Managers & Team Leads', path: '/users/managers' },
        ],
      },
      {
        id: 'settings', label: 'Settings', icon: Settings, path: '/settings',
        children: [
          { label: 'Company Profile & RERA', path: '/settings/company' },
          { label: 'Team Roles & RBAC', path: '/settings/roles' },
          { label: 'Custom Property Types', path: '/settings/properties' },
          { label: 'API Integrations', path: '/settings/integrations' },
        ],
      },
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
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isSubItemActive = (childPath) => {
    return location.pathname === childPath;
  };

  const handleItemClick = (item) => {
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
            className="sidebar-logo"
            onClick={() => { navigate('/'); closeMobileMenu(); }}
            style={{
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: 'white',
              fontWeight: 800,
              fontSize: 14,
              width: 38,
              height: 38,
              borderRadius: 10,
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            RH
          </div>
          <div className="sidebar-brand" onClick={() => { navigate('/'); closeMobileMenu(); }} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
            <div className="sidebar-brand-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user?.organization || 'Rise With RealtyHub'}>
              {user?.organization || 'Rise With RealtyHub'}
            </div>
            <div className="sidebar-brand-sub">Real Estate Revenue OS</div>
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
