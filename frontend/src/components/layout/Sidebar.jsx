import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, TrendingUp, MessageSquare, CheckSquare,
  GitBranch, Building2, Warehouse, DollarSign, Scale, MapPin,
  FileText, CreditCard, Handshake, User, Zap, BarChart3,
  Settings, ChevronRight, LogOut, Building, X, Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getInitials } from '../../utils/formatters';
import { getAccessibleNavConfig } from '../../utils/rbac';
import NotificationCenter from '../notifications/NotificationCenter';

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
    section: 'BOOKINGS',
    items: [
      {
        id: 'sitevisits', label: 'Site Visits', icon: MapPin, path: '/site-visits',
        children: [
          { label: 'All Site Visits', path: '/site-visits/all' },
          { label: "Today's Schedule", path: '/site-visits/today' },
          { label: 'Confirmed Visits', path: '/site-visits/confirmed' },
          { label: 'Completed Tours', path: '/site-visits/completed' },
        ],
      },
      {
        id: 'negotiations', label: 'Negotiations', icon: Scale, path: '/negotiations',
        children: [
          { label: 'Pending Review', path: '/negotiations/pending' },
          { label: 'Approved Discounts', path: '/negotiations/approved' },
          { label: 'Approval Limit Policy', path: '/negotiations/policy' },
        ],
      },
      {
        id: 'booking', label: 'Booking', icon: FileText, path: '/booking',
        children: [
          { label: 'All Bookings', path: '/booking/all' },
          { label: 'Pending Approvals', path: '/booking/pending_approval' },
          { label: 'Approved Agreements', path: '/booking/approved' },
        ],
      },
    ],
  },
  {
    section: 'FINANCE',
    items: [
      {
        id: 'payments', label: 'Payments & Collections', icon: CreditCard, path: '/payments',
        children: [
          { label: 'All Demand Notices', path: '/payments/all' },
          { label: 'Pending Collections', path: '/payments/pending' },
          { label: 'Overdue Demands', path: '/payments/overdue' },
          { label: 'Paid & Cleared', path: '/payments/paid' },
        ],
      },
    ],
  },
  {
    section: 'BUYER PORTAL',
    items: [
      { id: 'customerportal', label: 'Customer Portal', icon: User, path: '/customer-portal' },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      {
        id: 'reports', label: 'Reports & Analytics', icon: BarChart3, path: '/reports',
        children: [
          { label: 'Sales & Revenue Realization', path: '/reports/sales' },
          { label: 'Lead Sourcing & Funnel ROI', path: '/reports/leads' },
          { label: 'Team Scorecard', path: '/reports/team' },
          { label: 'Inventory Absorption', path: '/reports/inventory' },
        ],
      },
    ],
  },
  {
    section: 'ADMIN',
    items: [
      {
        id: 'users', label: 'Users & Org', icon: Building2, path: '/users',
        children: [
          { label: 'User Directory', path: '/users/accounts' },
          { label: 'Roles Matrix (RBAC)', path: '/users/roles' },
          { label: 'Sales Reporting Hierarchy', path: '/users/hierarchy' },
        ],
      },
      {
        id: 'settings', label: 'Settings', icon: Settings, path: '/settings',
        children: [
          { label: 'Company & RERA Profile', path: '/settings/general' },
          { label: 'Meta Lead Ads (FB & IG)', path: '/settings/integrations/meta' },
          { label: 'WhatsApp Cloud API', path: '/settings/whatsapp' },
          { label: 'Telephony Gateway', path: '/settings/telephony' },
          { label: 'Lead Webhooks (Custom HTTP)', path: '/settings/webhooks' },
          { label: 'Email SMTP & SMS', path: '/settings/smtp' },
        ],
      },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isMobileMenuOpen, closeMobileMenu, simulatedRole } = useUI();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const effectiveRole = simulatedRole || user?.role || 'admin';
  const effectiveUser = user ? { ...user, role: effectiveRole } : null;
  const accessibleSections = effectiveUser ? getAccessibleNavConfig(effectiveUser, navConfig) : [];

  // ALL categories closed by default as requested
  const [openMenus, setOpenMenus] = useState({});

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
      // Toggle category open/close one by one
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
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-mobile-overlay" 
          onClick={closeMobileMenu} 
          title="Close Navigation"
        />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
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
            style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell size={18} />
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
