import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Home, ChevronRight, ArrowLeft, History, RotateCcw, X } from 'lucide-react';

// Route dictionary for human-friendly breadcrumb labels, icons and descriptions
const ROUTE_CONFIG = {
  '/': { label: 'Dashboard', icon: '📊' },
  '/dashboard': { label: 'Dashboard', icon: '📊' },
  '/leads': { label: 'Leads Management', icon: '👥' },
  '/pipeline': { label: 'Sales Pipeline', icon: '📈' },
  '/site-visits': { label: 'Site Visits & Tours', icon: '🚗' },
  '/marketing': { label: 'Marketing & Campaigns', icon: '📢' },
  '/bookings': { label: 'Bookings & KYC Deals', icon: '📑' },
  '/activities': { label: 'Tasks & Activities', icon: '✅' },
  '/channel-partners': { label: 'Channel Partners', icon: '🤝' },
  '/negotiations': { label: 'Negotiations & Approvals', icon: '⚖️' },
  '/projects': { label: 'Projects & Inventory', icon: '🏢' },
  '/inventory': { label: 'Units Inventory', icon: '📦' },
  '/pricing': { label: 'Pricing Calculator', icon: '🧮' },
  '/payments': { label: 'Payments & Milestones', icon: '💳' },
  '/communication': { label: 'Omnichannel Inbox', icon: '💬' },
  '/telephony': { label: 'Telephony & Call Logs', icon: '📞' },
  '/reports': { label: 'Reports & Analytics', icon: '📈' },
  '/users': { label: 'Team & Quotas', icon: '👥' },
  '/settings': { label: 'Settings & Integrations', icon: '⚙️' },
  '/settings/meta': { label: 'Meta Lead Ads & Webhooks', icon: '🌐' },
  '/superadmin': { label: 'Super Admin Console', icon: '🛡️' },
  '/customer': { label: 'Customer Portal', icon: '👤' },
};

const TRAIL_STORAGE_KEY = 'realtyhub_navigation_trail';
const RECENTS_STORAGE_KEY = 'realtyhub_recent_pages';

const getRouteInfo = (pathname) => {
  if (ROUTE_CONFIG[pathname]) {
    return { path: pathname, ...ROUTE_CONFIG[pathname] };
  }

  // Check prefix matches (e.g. /projects/123)
  for (const [key, val] of Object.entries(ROUTE_CONFIG)) {
    if (key !== '/' && key !== '/dashboard' && pathname.startsWith(key)) {
      const sub = pathname.replace(key, '').replace(/^\//, '');
      return {
        path: pathname,
        label: sub ? `${val.label} / ${decodeURIComponent(sub)}` : val.label,
        icon: val.icon
      };
    }
  }

  const segment = pathname.split('/').filter(Boolean).pop() || 'Page';
  return {
    path: pathname,
    label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    icon: '📄'
  };
};

/**
 * Breadcrumbs Component
 * Tracks and saves visited page history. Clicking any previous breadcrumb
 * instantly navigates back to that exact page and preserves workflow context.
 */
export default function Breadcrumbs({
  items,
  customCurrent,
  showBack = true,
  showRecents = true,
  className = '',
  style = {}
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Active navigation trail: sequential path taken by user
  const [trail, setTrail] = useState(() => {
    try {
      const saved = sessionStorage.getItem(TRAIL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }];
  });

  // Recent unique visited pages list
  const [recents, setRecents] = useState(() => {
    try {
      const saved = sessionStorage.getItem(RECENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Update navigation history trail on route change
  useEffect(() => {
    const currentInfo = getRouteInfo(currentPath);

    // 1. Update Sequential Trail
    setTrail((prevTrail) => {
      let newTrail = [...prevTrail];

      // If user is on dashboard root
      if (currentPath === '/' || currentPath === '/dashboard') {
        newTrail = [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }];
      } else {
        // Ensure Dashboard is always the anchor
        if (newTrail.length === 0 || newTrail[0].path !== '/dashboard') {
          newTrail = [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }, ...newTrail];
        }

        const existingIndex = newTrail.findIndex(item => item.path === currentPath);

        if (existingIndex !== -1) {
          // If clicked or navigated back to an existing step in history, trim forward steps
          newTrail = newTrail.slice(0, existingIndex + 1);
        } else {
          // Append new visited page
          newTrail.push(currentInfo);
          // Keep trail reasonable size (max 7 steps)
          if (newTrail.length > 7) {
            newTrail = [newTrail[0], ...newTrail.slice(newTrail.length - 6)];
          }
        }
      }

      try {
        sessionStorage.setItem(TRAIL_STORAGE_KEY, JSON.stringify(newTrail));
      } catch {}
      return newTrail;
    });

    // 2. Update Recent Pages List
    if (currentPath !== '/' && currentPath !== '/dashboard') {
      setRecents((prevRecents) => {
        const filtered = prevRecents.filter(p => p.path !== currentPath);
        const updated = [currentInfo, ...filtered].slice(0, 5); // Keep top 5 recents
        try {
          sessionStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [currentPath]);

  // Handle clicking a breadcrumb item: jump back to that page & trim forward trail
  const handleCrumbClick = (e, targetPath, index) => {
    e.preventDefault();
    if (targetPath === currentPath) return;

    // Update trail to this point
    const newTrail = trail.slice(0, index + 1);
    setTrail(newTrail);
    try {
      sessionStorage.setItem(TRAIL_STORAGE_KEY, JSON.stringify(newTrail));
    } catch {}

    navigate(targetPath);
  };

  // Remove a recent tab
  const handleRemoveRecent = (e, pathToRemove) => {
    e.stopPropagation();
    const updated = recents.filter(r => r.path !== pathToRemove);
    setRecents(updated);
    try {
      sessionStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Clear history trail back to Dashboard
  const handleResetHistory = () => {
    const reset = [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }];
    setTrail(reset);
    try {
      sessionStorage.setItem(TRAIL_STORAGE_KEY, JSON.stringify(reset));
    } catch {}
    navigate('/dashboard');
  };

  const isHome = currentPath === '/' || currentPath === '/dashboard';

  return (
    <nav
      aria-label="Saved Navigation Breadcrumbs"
      className={`app-breadcrumbs-nav ${className}`}
      style={style}
    >
      <div className="breadcrumbs-container">
        {/* Quick Back Button */}
        {showBack && !isHome && (
          <button
            type="button"
            className="breadcrumbs-back-btn"
            onClick={() => navigate(-1)}
            title="Go back to previous page"
          >
            <ArrowLeft size={13} />
            <span className="breadcrumbs-back-text">Back</span>
          </button>
        )}

        {/* Dynamic Saved Breadcrumbs Trail */}
        <ol className="breadcrumbs-list">
          {trail.map((item, idx) => {
            const isLast = idx === trail.length - 1;
            const isRoot = idx === 0 && item.path === '/dashboard';

            return (
              <li key={`${item.path}-${idx}`} className="breadcrumbs-item">
                {idx > 0 && (
                  <ChevronRight size={13} className="breadcrumbs-separator" />
                )}

                {isLast ? (
                  <span
                    className="breadcrumbs-current"
                    aria-current="page"
                    title={`Current: ${customCurrent || item.label}`}
                  >
                    {isRoot ? (
                      <Home size={13} className="breadcrumbs-home-icon" />
                    ) : (
                      item.icon && <span className="breadcrumbs-icon">{item.icon}</span>
                    )}
                    <span className="breadcrumbs-text">
                      {customCurrent || item.label}
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleCrumbClick(e, item.path, idx)}
                    className={`breadcrumbs-link ${isRoot ? 'home' : ''}`}
                    title={`Return back to ${item.label}`}
                  >
                    {isRoot ? (
                      <>
                        <Home size={13} className="breadcrumbs-home-icon" />
                        <span className="breadcrumbs-home-label">Dashboard</span>
                      </>
                    ) : (
                      <>
                        {item.icon && <span className="breadcrumbs-icon">{item.icon}</span>}
                        <span className="breadcrumbs-text">{item.label}</span>
                      </>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        {/* Quick Recent Visited Pages Jump Bar */}
        {showRecents && recents.length > 1 && (
          <div className="breadcrumbs-recents-group">
            <span className="breadcrumbs-recents-label" title="Recently visited pages">
              <History size={11} /> Recent:
            </span>
            <div className="breadcrumbs-recents-list">
              {recents.map((recent) => {
                const isActive = recent.path === currentPath;
                return (
                  <div
                    key={recent.path}
                    className={`breadcrumbs-recent-chip ${isActive ? 'active' : ''}`}
                    onClick={() => !isActive && navigate(recent.path)}
                    title={`Open ${recent.label}`}
                  >
                    <span>{recent.icon} {recent.label}</span>
                    <button
                      type="button"
                      className="breadcrumbs-recent-close"
                      onClick={(e) => handleRemoveRecent(e, recent.path)}
                      title="Remove from recents"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clear / Reset History Button */}
        {trail.length > 2 && (
          <button
            type="button"
            className="breadcrumbs-reset-btn"
            onClick={handleResetHistory}
            title="Reset navigation history trail to Dashboard"
          >
            <RotateCcw size={11} />
          </button>
        )}
      </div>
    </nav>
  );
}
