/**
 * Role-Based Access Control (RBAC) Module Permissions
 * Standard Real Estate CRM role matrix with Super Admin dynamic override capability.
 */

export const ALL_CRM_MODULES = [
  { id: 'dashboard', label: 'Dashboard & Analytics', category: 'MAIN', icon: 'LayoutDashboard', desc: 'Real-time sales KPI widgets, revenue metrics, conversion funnel' },
  { id: 'marketing', label: 'Marketing & Ad Campaigns', category: 'MARKETING', icon: 'TrendingUp', desc: 'Campaign budget tracking, Meta Lead Ads, UTM attribution, ROI' },
  { id: 'leads', label: 'Leads & Pre-Sales Pipeline', category: 'MARKETING', icon: 'Users', desc: 'Lead capture, stage progression, smart routing, qualification' },
  { id: 'communication', label: 'Omnichannel Communication', category: 'SALES', icon: 'MessageSquare', desc: 'Cloud calling dialer, WhatsApp live chat, automated SMS/email' },
  { id: 'activities', label: 'Activities & Follow-up Tasks', category: 'SALES', icon: 'CheckSquare', desc: 'Daily calling queues, overdue SLA alerts, calendar appointments' },
  { id: 'pipeline', label: 'Visual Sales Pipeline', category: 'SALES', icon: 'GitBranch', desc: 'Interactive Kanban stage progression and deal probability' },
  { id: 'projects', label: 'Projects & Developments', category: 'INVENTORY', icon: 'Building', desc: 'Master project catalogue, phase specs, master layout plans' },
  { id: 'inventory', label: 'Unit Matrix & Grid', category: 'INVENTORY', icon: 'Warehouse', desc: 'Real-time unit availability, blocking, reservations, hold countdown' },
  { id: 'pricing', label: 'Pricing & Cost Sheets', category: 'INVENTORY', icon: 'DollarSign', desc: 'Official quote generation, PLC rules, payment milestone schedules' },
  { id: 'sitevisits', label: 'Site Visits & Transport', category: 'BOOKINGS', icon: 'MapPin', desc: 'Customer cab booking, gate pass QR, feedback collection' },
  { id: 'negotiations', label: 'Price Negotiations & Approvals', category: 'BOOKINGS', icon: 'Scale', desc: 'Discount matrices, approval tiers, margin protection' },
  { id: 'booking', label: 'Booking & Unit Applications', category: 'BOOKINGS', icon: 'FileText', desc: 'Official booking forms, KYC verification, token receipts' },
  { id: 'payments', label: 'Payments, Demands & Escrow', category: 'FINANCE', icon: 'CreditCard', desc: 'Demand generation, milestone collection, bank reconciliations' },
  { id: 'customerportal', label: 'Customer Portal & KYC', category: 'PORTAL', icon: 'User', desc: 'Buyer account portal, ledger, payment milestones' },
  { id: 'reports', label: 'BI Reports & Revenue Analytics', category: 'OPERATIONS', icon: 'BarChart3', desc: 'Executive dashboard, lead source ROI, team scorecards' },
  { id: 'users', label: 'User Directory & Hierarchy', category: 'ADMIN', icon: 'Building2', desc: 'Sales team accounts, reporting hierarchy, manager assignment' },
  { id: 'settings', label: 'System Settings & Webhooks', category: 'ADMIN', icon: 'Settings', desc: 'Company RERA settings, Meta Webhooks, WhatsApp Cloud API' }
];

export const DEFAULT_ROLE_MODULE_PERMISSIONS = {
  super_admin: ['*'],
  admin: ['*'],
  sales_head: [
    'dashboard', 'leads', 'communication', 'activities', 'pipeline',
    'projects', 'inventory', 'pricing', 'sitevisits', 'negotiations',
    'booking', 'reports'
  ],
  sales_manager: [
    'dashboard', 'leads', 'communication', 'activities', 'pipeline',
    'projects', 'inventory', 'pricing', 'sitevisits', 'negotiations',
    'booking', 'reports'
  ],
  sales_executive: [
    'dashboard', 'leads', 'communication', 'activities', 'pipeline',
    'projects', 'inventory', 'pricing', 'sitevisits', 'booking'
  ],
  sales_rep: [
    'dashboard', 'leads', 'communication', 'activities', 'pipeline',
    'projects', 'inventory', 'pricing', 'sitevisits', 'booking'
  ],
  telecaller: [
    'dashboard', 'leads', 'communication', 'activities', 'sitevisits',
    'projects', 'inventory', 'booking'
  ],
  presales: [
    'dashboard', 'leads', 'communication', 'activities', 'sitevisits',
    'projects', 'inventory', 'booking'
  ],
  pre_sales_manager: [
    'dashboard', 'leads', 'communication', 'activities', 'sitevisits',
    'projects', 'inventory', 'booking', 'reports'
  ],
  marketing_head: [
    'dashboard', 'marketing', 'leads', 'reports', 'settings'
  ],
  marketing: [
    'dashboard', 'marketing', 'leads', 'reports'
  ],
  finance_manager: [
    'dashboard', 'pricing', 'negotiations', 'booking', 'payments', 'reports'
  ],
  finance: [
    'dashboard', 'pricing', 'booking', 'payments', 'reports'
  ],
  channel_partner: [
    'dashboard', 'projects', 'inventory', 'leads', 'sitevisits', 'booking'
  ],
  partner: [
    'dashboard', 'projects', 'inventory', 'leads', 'sitevisits', 'booking'
  ],
  customer: [
    'dashboard', 'customerportal'
  ]
};

// Storage Keys
const DYNAMIC_PERMISSIONS_KEY = 'crm_dynamic_role_permissions';
const USER_CUSTOM_PERMISSIONS_KEY = 'crm_user_custom_permissions';
const GLOBAL_DISABLED_MODULES_KEY = 'crm_global_disabled_modules';

/**
 * Retrieve current role-level permissions (with Super Admin dynamic overrides)
 */
export const getRoleModulePermissions = () => {
  try {
    const saved = localStorage.getItem(DYNAMIC_PERMISSIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = { ...DEFAULT_ROLE_MODULE_PERMISSIONS };
      Object.keys(parsed).forEach(role => {
        if (Array.isArray(parsed[role])) {
          merged[role] = Array.from(new Set([...(DEFAULT_ROLE_MODULE_PERMISSIONS[role] || []), ...parsed[role]]));
        }
      });
      return merged;
    }
  } catch (e) {
    console.error('Error reading role permissions from localStorage', e);
  }
  return { ...DEFAULT_ROLE_MODULE_PERMISSIONS };
};

/**
 * Save Super Admin role-level module permissions matrix
 */
export const saveRoleModulePermissions = (newPermissions) => {
  try {
    localStorage.setItem(DYNAMIC_PERMISSIONS_KEY, JSON.stringify(newPermissions));
    setTimeout(() => window.dispatchEvent(new Event('crm_permissions_updated')), 0);
    return true;
  } catch (e) {
    console.error('Error saving role permissions', e);
    return false;
  }
};

/**
 * Retrieve user-specific custom module access overrides
 */
export const getUserCustomPermissions = () => {
  try {
    const saved = localStorage.getItem(USER_CUSTOM_PERMISSIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {};
};

/**
 * Save user-specific module access overrides for a specific user ID
 */
export const saveUserCustomPermissions = (userId, customModules) => {
  try {
    const allCustom = getUserCustomPermissions();
    if (!customModules || customModules === null) {
      delete allCustom[userId];
    } else {
      allCustom[userId] = customModules;
    }
    localStorage.setItem(USER_CUSTOM_PERMISSIONS_KEY, JSON.stringify(allCustom));
    setTimeout(() => window.dispatchEvent(new Event('crm_permissions_updated')), 0);
    return true;
  } catch (e) {
    console.error('Error saving user custom permissions', e);
    return false;
  }
};

/**
 * Retrieve globally disabled modules
 */
export const getGloballyDisabledModules = () => {
  try {
    const saved = localStorage.getItem(GLOBAL_DISABLED_MODULES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
};

/**
 * Save globally disabled modules
 */
export const saveGloballyDisabledModules = (disabledList) => {
  try {
    localStorage.setItem(GLOBAL_DISABLED_MODULES_KEY, JSON.stringify(disabledList));
    setTimeout(() => window.dispatchEvent(new Event('crm_permissions_updated')), 0);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Reset all permissions back to system defaults
 */
export const resetToDefaultPermissions = () => {
  localStorage.removeItem(DYNAMIC_PERMISSIONS_KEY);
  localStorage.removeItem(USER_CUSTOM_PERMISSIONS_KEY);
  localStorage.removeItem(GLOBAL_DISABLED_MODULES_KEY);
  setTimeout(() => window.dispatchEvent(new Event('crm_permissions_updated')), 0);
};

/**
 * Path prefix to module ID mapping for route guard checks
 */
const PATH_TO_MODULE_MAP = [
  { prefix: '/marketing', moduleId: 'marketing' },
  { prefix: '/leads', moduleId: 'leads' },
  { prefix: '/communication', moduleId: 'communication' },
  { prefix: '/activities', moduleId: 'activities' },
  { prefix: '/pipeline', moduleId: 'pipeline' },
  { prefix: '/projects', moduleId: 'projects' },
  { prefix: '/inventory', moduleId: 'inventory' },
  { prefix: '/pricing', moduleId: 'pricing' },
  { prefix: '/site-visits', moduleId: 'sitevisits' },
  { prefix: '/negotiations', moduleId: 'negotiations' },
  { prefix: '/booking', moduleId: 'booking' },
  { prefix: '/payments', moduleId: 'payments' },
  { prefix: '/customer-portal', moduleId: 'customerportal' },
  { prefix: '/reports', moduleId: 'reports' },
  { prefix: '/users', moduleId: 'users' },
  { prefix: '/settings/integrations/meta', moduleId: 'marketing' },
  { prefix: '/settings', moduleId: 'settings' },
];

/**
 * Checks if a given user/role has permission for a specific module ID
 */
export const hasModuleAccess = (userOrRole, moduleId) => {
  if (!userOrRole) return false;

  let role = '';
  let userId = null;
  let userCustomPerms = null;

  if (typeof userOrRole === 'object') {
    role = (userOrRole.role || '').toLowerCase().trim();
    userId = userOrRole._id || userOrRole.id;
    if (userOrRole.permissions && Array.isArray(userOrRole.permissions) && userOrRole.permissions.length > 0) {
      userCustomPerms = userOrRole.permissions;
    }
  } else {
    role = String(userOrRole).toLowerCase().trim();
  }

  // Super admin always has unrestricted root access
  if (role === 'super_admin') return true;

  // Check if globally disabled
  const disabledList = getGloballyDisabledModules();
  if (disabledList.includes(moduleId)) return false;

  // Admin has access to all non-disabled modules
  if (role === 'admin' || role === 'superadmin') return true;

  // User-specific custom module overrides (if specified)
  if (userId) {
    const allUserCustom = getUserCustomPermissions();
    if (allUserCustom[userId] && Array.isArray(allUserCustom[userId])) {
      if (allUserCustom[userId].includes('*')) return true;
      return allUserCustom[userId].includes(moduleId);
    }
  }

  if (userCustomPerms && Array.isArray(userCustomPerms) && !userCustomPerms.includes('*')) {
    return userCustomPerms.includes(moduleId);
  }

  // Fallback to role-level dynamic permissions
  const rolePermissions = getRoleModulePermissions();
  const allowed = rolePermissions[role] || [];
  if (allowed.includes('*')) return true;
  return allowed.includes(moduleId);
};

/**
 * Checks if a given user/role has permission to access a specific URL pathname
 */
export const hasPathAccess = (userOrRole, pathname) => {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'object' ? (userOrRole.role || '').toLowerCase().trim() : String(userOrRole).toLowerCase().trim();

  if (role === 'super_admin') return true;
  if (pathname.startsWith('/superadmin')) return role === 'super_admin';
  if (pathname === '/' || pathname === '/login') return true;

  // Find matching module from path prefix
  const matched = PATH_TO_MODULE_MAP.find(m => pathname.startsWith(m.prefix));
  if (!matched) return true; // Default allow if not a restricted module path

  return hasModuleAccess(userOrRole, matched.moduleId);
};

/**
 * Filters the sidebar navigation structure based on the active user/role.
 */
export const getAccessibleNavConfig = (userOrRole, navConfig) => {
  if (!userOrRole) return [];
  const role = typeof userOrRole === 'object' ? (userOrRole.role || '').toLowerCase().trim() : String(userOrRole).toLowerCase().trim();
  if (role === 'super_admin') return navConfig;

  return navConfig
    .map(section => {
      const allowedItems = section.items.filter(item => hasModuleAccess(userOrRole, item.id));
      if (allowedItems.length === 0) return null;
      return {
        ...section,
        items: allowedItems,
      };
    })
    .filter(Boolean);
};

export const ROLE_MODULE_PERMISSIONS = DEFAULT_ROLE_MODULE_PERMISSIONS;
