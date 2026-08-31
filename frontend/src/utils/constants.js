// Lead stage labels & colors
export const LEAD_STAGES = {
  new: { label: 'New', color: 'badge-new' },
  contacted: { label: 'Contacted', color: 'badge-success' },
  connected: { label: 'Connected', color: 'badge-primary' },
  qualified: { label: 'Qualified', color: 'badge-purple' },
  site_visit_scheduled: { label: 'SV Scheduled', color: 'badge-warning' },
  site_visit_done: { label: 'SV Done', color: 'badge-info' },
  negotiation: { label: 'Negotiation', color: 'badge-orange' },
  booking_in_progress: { label: 'Booking', color: 'badge-primary' },
  booked: { label: 'Booked', color: 'badge-success' },
  not_connected: { label: 'Not Connected', color: 'badge-gray' },
  follow_up: { label: 'Follow Up', color: 'badge-warning' },
  nurturing: { label: 'Nurturing', color: 'badge-info' },
  not_interested: { label: 'Not Interested', color: 'badge-danger' },
  lost: { label: 'Lost', color: 'badge-danger' },
  duplicate: { label: 'Duplicate', color: 'badge-gray' },
};

export const LEAD_SOURCES = {
  meta_ads: { label: 'Meta Ads', icon: '📘', color: '#1877f2' },
  facebook: { label: 'Facebook', icon: '📘', color: '#1877f2' },
  instagram: { label: 'Instagram', icon: '📸', color: '#e1306c' },
  google_ads: { label: 'Google Ads', icon: '🔍', color: '#ea4335' },
  property_portal: { label: 'Property Portal', icon: '🏢', color: '#0284c7' },
  website: { label: 'Website', icon: '🌐', color: '#059669' },
  walk_in: { label: 'Walk-in', icon: '🚶', color: '#7c3aed' },
  channel_partner: { label: 'Channel Partner', icon: '🤝', color: '#d97706' },
  phone_call: { label: 'Phone Call', icon: '📞', color: '#2563eb' },
  referral: { label: 'Referral', icon: '👥', color: '#0891b2' },
  whatsapp: { label: 'WhatsApp', icon: '💬', color: '#22c55e' },
  manual: { label: 'Manual Entry', icon: '✍️', color: '#64748b' },
  organic: { label: 'Organic', icon: '🌱', color: '#10b981' },
  email_campaign: { label: 'Email Campaign', icon: '📧', color: '#6366f1' },
  other: { label: 'Other', icon: '❓', color: '#94a3b8' },
};

export const META_INTEGRATION_STATUSES = {
  'Not Configured': { label: 'Not Configured', badge: 'badge-gray', color: '#64748b', bg: '#f1f5f9' },
  'Configured': { label: 'Configured', badge: 'badge-info', color: '#0284c7', bg: '#e0f2fe' },
  'Testing': { label: 'Testing / Incomplete', badge: 'badge-warning', color: '#d97706', bg: '#fef3c7' },
  'Connected': { label: 'Connected & Live', badge: 'badge-success', color: '#16a34a', bg: '#dcfce7' },
  'Disconnected': { label: 'Disconnected', badge: 'badge-danger', color: '#dc2626', bg: '#fee2e2' },
  'Error': { label: 'Error', badge: 'badge-danger', color: '#dc2626', bg: '#fee2e2' },
};

export const META_WEBHOOK_STATUSES = {
  received: { label: 'Received', badge: 'badge-warning' },
  processing: { label: 'Processing', badge: 'badge-info' },
  processed: { label: 'Processed', badge: 'badge-success' },
  duplicate: { label: 'Duplicate', badge: 'badge-gray' },
  failed: { label: 'Failed', badge: 'badge-danger' },
};

export const LEAD_TYPES = {
  hot: { label: 'Hot', badge: 'badge-hot' },
  warm: { label: 'Warm', badge: 'badge-warm' },
  cold: { label: 'Cold', badge: 'badge-cold' },
};

export const UNIT_STATUSES = {
  available: { label: 'Available', badge: 'badge-available', color: '#dcfce7' },
  on_hold: { label: 'On Hold', badge: 'badge-on_hold', color: '#fef3c7' },
  blocked: { label: 'Blocked', badge: 'badge-blocked', color: '#fee2e2' },
  booked: { label: 'Booked', badge: 'badge-booked', color: '#dbeafe' },
  sold: { label: 'Sold', badge: 'badge-sold', color: '#e9d5ff' },
  not_for_sale: { label: 'N/A', badge: 'badge-gray', color: '#f1f5f9' },
};

export const PROJECT_STATUSES = {
  upcoming: { label: 'Upcoming', badge: 'badge-gray' },
  pre_launch: { label: 'Pre-Launch', badge: 'badge-warning' },
  launched: { label: 'Launched', badge: 'badge-primary' },
  under_construction: { label: 'Under Construction', badge: 'badge-info' },
  ready_to_move: { label: 'Ready to Move', badge: 'badge-success' },
  sold_out: { label: 'Sold Out', badge: 'badge-danger' },
  on_hold: { label: 'On Hold', badge: 'badge-gray' },
};

// ─── Real Estate Categories & Development Types ─────────────
export const REAL_ESTATE_CATEGORIES = {
  residential_apartment: {
    id: 'residential_apartment',
    label: 'Residential Apartments',
    shortLabel: 'Apartments',
    icon: '🏢',
    unitTerm: 'Flat / Unit',
    badge: 'badge-primary',
    bg: '#eff6ff',
    color: '#2563eb',
    description: 'High-rise & multi-storey gated residential towers',
    fields: ['tower', 'floor', 'unitNumber', 'type', 'carpetArea', 'superBuiltUp', 'facing', 'floorRise', 'balconies', 'parking', 'basePrice', 'totalPrice']
  },
  villa: {
    id: 'villa',
    label: 'Villas & Row Houses',
    shortLabel: 'Villas',
    icon: '🏡',
    unitTerm: 'Villa No',
    badge: 'badge-purple',
    bg: '#f5f3ff',
    color: '#7c3aed',
    description: 'Gated luxury villas, independent bungalows & row houses',
    fields: ['phase', 'unitNumber', 'type', 'plotArea', 'builtUp', 'gardenArea', 'levels', 'facing', 'coveredCarParks', 'isCorner', 'basePrice', 'totalPrice']
  },
  plots: {
    id: 'plots',
    label: 'Plotted Land Developments',
    shortLabel: 'Plots / Layouts',
    icon: '📐',
    unitTerm: 'Plot No',
    badge: 'badge-warning',
    bg: '#fffbeb',
    color: '#d97706',
    description: 'Residential layout plots, gated land estates & farm plots',
    fields: ['sector', 'unitNumber', 'dimensions', 'plotArea', 'roadWidth', 'facing', 'isCornerPlot', 'boundaryWall', 'approvalAuthority', 'basePricePerSqFt', 'totalPrice']
  },
  farmland: {
    id: 'farmland',
    label: 'Farmhouses & Managed Farmlands',
    shortLabel: 'Farmhouses & Farmlands',
    icon: '🌴',
    unitTerm: 'Farm Lot / Parcel',
    badge: 'badge-success',
    bg: '#f0fdf4',
    color: '#16a34a',
    description: 'Weekend farm villas, organic agro groves, agro lots & managed farmlands',
    fields: ['sector', 'unitNumber', 'extentAcres', 'plantationType', 'waterSource', 'boundaryWall', 'roadWidth', 'facing', 'totalPrice']
  },
  agricultural_land: {
    id: 'agricultural_land',
    label: 'Agricultural Lands & Agri Acreages',
    shortLabel: 'Agri Lands',
    icon: '🌾',
    unitTerm: 'Acre / Guntha / Bigha / Plot',
    badge: 'badge-success',
    bg: '#f0fdf4',
    color: '#15803d',
    description: 'Raw agricultural lands, cultivation plots, green agro estates & farm parcels',
    fields: ['sector', 'unitNumber', 'extentAcres', 'plantationType', 'waterSource', 'roadWidth', 'boundaryWall', 'facing', 'basePrice', 'totalPrice']
  },
  layouts: {
    id: 'layouts',
    label: 'Plotted Layouts & Gated Communities',
    shortLabel: 'Layouts & Sites',
    icon: '🗺️',
    unitTerm: 'Plot / Site No',
    badge: 'badge-warning',
    bg: '#fffbeb',
    color: '#b45309',
    description: 'Master-planned layout plots, DTCP/HMDA/BDA layout gated communities with blacktop roads',
    fields: ['sector', 'unitNumber', 'dimensions', 'plotArea', 'roadWidth', 'facing', 'isCornerPlot', 'boundaryWall', 'approvalAuthority', 'basePrice', 'totalPrice']
  },
  resort_plots: {
    id: 'resort_plots',
    label: 'Resort Plots & Holiday Communities',
    shortLabel: 'Resort Plots',
    icon: '🏖️',
    unitTerm: 'Resort Lot / Villa Site',
    badge: 'badge-info',
    bg: '#f0fdfa',
    color: '#0d9488',
    description: 'Weekend holiday plots, clubhouse resort communities, eco-retreat villas',
    fields: ['sector', 'unitNumber', 'dimensions', 'plotArea', 'facing', 'totalPrice']
  },
  commercial_office: {
    id: 'commercial_office',
    label: 'Commercial Offices & IT Parks',
    shortLabel: 'Offices',
    icon: '🏬',
    unitTerm: 'Office Suite',
    badge: 'badge-info',
    bg: '#f0f9ff',
    color: '#0284c7',
    description: 'Corporate office suites, IT tech parks & commercial towers',
    fields: ['tower', 'floor', 'unitNumber', 'type', 'carpetArea', 'chargeableArea', 'fitoutStatus', 'powerBackup', 'facing', 'basePrice', 'totalPrice']
  },
  retail_shop: {
    id: 'retail_shop',
    label: 'Retail Shops & Showrooms',
    shortLabel: 'Retail & Shops',
    icon: '🛍️',
    unitTerm: 'Shop / Showroom',
    badge: 'badge-success',
    bg: '#ecfdf5',
    color: '#059669',
    description: 'High-street retail outlets, mall anchor stores & food courts',
    fields: ['block', 'floor', 'unitNumber', 'type', 'frontage', 'carpetArea', 'superBuiltUp', 'ceilingHeight', 'suitableFor', 'facing', 'basePrice', 'totalPrice']
  },
  industrial_warehouse: {
    id: 'industrial_warehouse',
    label: 'Industrial Sheds & Logistics Warehouses',
    shortLabel: 'Industrial',
    icon: '🏭',
    unitTerm: 'Shed / Bay',
    badge: 'badge-gray',
    bg: '#f8fafc',
    color: '#475569',
    description: 'Grade-A logistics warehouses, cold storage & manufacturing sheds',
    fields: ['zone', 'unitNumber', 'type', 'coveredArea', 'landArea', 'clearHeight', 'loadingDocks', 'roadWidth', 'flooringCapacity', 'basePrice', 'totalPrice']
  },
  studio_apartment: {
    id: 'studio_apartment',
    label: 'Studio Suites & Co-living Spaces',
    shortLabel: 'Studio & Co-living',
    icon: '🛌',
    unitTerm: 'Suite / Studio No',
    badge: 'badge-purple',
    bg: '#faf5ff',
    color: '#9333ea',
    description: 'Compact studio suites, executive serviced apartments & student living units',
    fields: ['tower', 'floor', 'unitNumber', 'type', 'carpetArea', 'superBuiltUp', 'facing', 'basePrice', 'totalPrice']
  },
  mixed_use: {
    id: 'mixed_use',
    label: 'Integrated Mixed-Use Township',
    shortLabel: 'Mixed-Use',
    icon: '🌆',
    unitTerm: 'Unit / Space',
    badge: 'badge-primary',
    bg: '#eff6ff',
    color: '#1d4ed8',
    description: 'Master-planned townships with residential, retail & commercial zones',
    fields: ['block', 'floor', 'unitNumber', 'type', 'category', 'superBuiltUp', 'facing', 'basePrice', 'totalPrice']
  },
  custom: {
    id: 'custom',
    label: 'Custom Property Category (Manual Entry)',
    shortLabel: 'Custom Category',
    icon: '✨',
    unitTerm: 'Custom Unit / Space',
    badge: 'badge-purple',
    bg: '#faf5ff',
    color: '#7c3aed',
    description: 'User-defined bespoke real estate development type or custom land category',
    fields: ['unitNumber', 'type', 'area', 'facing', 'basePrice', 'totalPrice']
  }
};

export const CATEGORY_TYPOLOGIES = {
  residential_apartment: ['1 BHK', '1.5 BHK', '2 BHK', '2.5 BHK', '3 BHK', '3.5 BHK', '4 BHK', '5 BHK', 'Penthouse', 'Duplex Studio', 'Custom Typology'],
  villa: ['3 BHK Villa (G+1)', '4 BHK Luxury Villa (G+2)', '5 BHK Royal Villa', 'Row House (G+1)', 'Twin Villa', 'Duplex Villa', 'Custom Villa'],
  plots: ['30 x 40 ft (1,200 sq.ft)', '30 x 50 ft (1,500 sq.ft)', '40 x 60 ft (2,400 sq.ft)', '50 x 80 ft (4,000 sq.ft)', 'Odd Dimension Plot', 'Corner Plot (Dual Road)', 'Commercial Main Road Plot', 'Custom Dimension Plot'],
  farmland: ['0.25 Acre Farm Lot (10,890 sq.ft)', '0.5 Acre Farm Lot (21,780 sq.ft)', '1 Acre Managed Farm (43,560 sq.ft)', '2+ Acres Agro Estate', 'Weekend Agro Villa', 'Managed Teak / Sandalwood Grove', 'Organic Fruit Orchard Lot', 'Custom Farm Parcel'],
  agricultural_land: ['0.5 Acre Raw Agri Land', '1 Acre Cultivated Land', '2.5 Acres Agro Farm', '5+ Acres Green Acreage', '10 Gunthas Farm Land', '20 Gunthas Agri Parcel', '1 Bigha Land Parcel', 'Bordered Agro Estate', 'Custom Agri Parcel'],
  layouts: ['30 x 40 ft (1,200 sq.ft)', '30 x 50 ft (1,500 sq.ft)', '33 x 50 ft (1,650 sq.ft)', '40 x 60 ft (2,400 sq.ft)', '50 x 80 ft (4,000 sq.ft)', 'Dual Road Corner Layout Plot', 'Park-Facing Layout Site', 'Commercial Frontage Site', 'Custom Layout Plot'],
  resort_plots: ['Resort Villa Plot (2,000 sq.ft)', 'Holiday Home Lot (3,500 sq.ft)', 'Lakeside Weekend Lot (5,000 sq.ft)', 'Hill-View Retreat Plot', 'Clubhouse Facing Plot', 'Custom Resort Plot'],
  commercial_office: ['Small Office (500-1000 sq.ft)', 'Medium Office (1000-3000 sq.ft)', 'Large Office (3000-5000 sq.ft)', 'Full Floor Plate (5000+ sq.ft)', 'Executive Suite', 'Bare Shell IT Space', 'Custom Office Suite'],
  retail_shop: ['Ground Floor High-Street', 'First Floor Retail', 'Anchor Showroom', 'Food Court / QSR Outlet', 'Kiosk / Booth', 'Corner Double-Height Showroom', 'Custom Retail Space'],
  industrial_warehouse: ['Grade-A Logistics Warehouse', 'Light Industrial Shed', 'Heavy Manufacturing Bay', 'Cold Storage Unit', 'Open Industrial Yard', 'Custom Industrial Bay'],
  studio_apartment: ['Studio Suite (350 sq.ft)', '1 RK Studio (450 sq.ft)', 'Executive Service Apt (600 sq.ft)', 'Co-living 1 Bed Suite', 'Custom Studio'],
  mixed_use: ['Residential Condo', 'Commercial Studio', 'Retail Frontage Unit', 'Serviced Apartment', 'Custom Mixed-Use Space'],
  custom: ['Standard Custom Unit', 'Custom Land Plot', 'Custom Commercial Lot', 'Custom Farm Unit']
};

/**
 * Returns metadata for a category, whether it's built-in or custom user text
 */
export const getCategoryMeta = (catId, customName = '') => {
  if (catId && REAL_ESTATE_CATEGORIES[catId]) {
    const found = REAL_ESTATE_CATEGORIES[catId];
    if (catId === 'custom' && customName) {
      return { ...found, label: customName, shortLabel: customName };
    }
    return found;
  }
  // If catId itself is a custom string
  if (catId) {
    return {
      id: catId,
      label: customName || catId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      shortLabel: customName || catId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: '✨',
      unitTerm: 'Unit / Plot / Space',
      badge: 'badge-purple',
      bg: '#faf5ff',
      color: '#7c3aed',
      description: 'Custom User-Defined Real Estate Category'
    };
  }
  return REAL_ESTATE_CATEGORIES.residential_apartment;
};

export const FACING_OPTIONS = [
  { value: 'East', label: 'East Facing 🌅' },
  { value: 'North', label: 'North Facing 🧭' },
  { value: 'West', label: 'West Facing 🌇' },
  { value: 'South', label: 'South Facing 🧭' },
  { value: 'North-East', label: 'North-East (Ishanya) ✨' },
  { value: 'North-West', label: 'North-West (Vayavya)' },
  { value: 'South-East', label: 'South-East (Agneya)' },
  { value: 'South-West', label: 'South-West (Nairutya)' },
  { value: 'Corner', label: 'Corner Dual-Road Facing 🛣️' },
  { value: 'Road Facing', label: 'Main Road Frontage 🚗' },
  { value: 'Park Facing', label: 'Park & Garden Facing 🌳' },
  { value: 'Lake Facing', label: 'Lake / Water Body Facing 🌊' },
  { value: 'Custom', label: '✏️ Custom / Other Facing (Manual Entry)' },
];

export const APPROVAL_BODIES = [
  'RERA Approved',
  'DTCP Approved',
  'HMDA Approved',
  'BDA / BMRDA Approved',
  'CMDA Approved',
  'PMRDA Approved',
  'Town Planning / Municipal Approved',
  'Gram Panchayat Clear Title',
  'Revenue Land Clear Title (Patta/7/12)',
  'Industrial Zone (MIDC / GIDC / TSIIC)',
  'Agri Zone / Farm Clear Title',
  'Custom / Other Approval (Manual Entry)'
];

export const USER_ROLES = {
  super_admin: { label: 'Super Admin (Platform Owner)', badge: 'badge-purple' },
  admin: { label: 'Organization Admin', badge: 'badge-purple' },
  marketing_head: { label: 'Marketing Head', badge: 'badge-primary' },
  sales_head: { label: 'Sales Head / Director', badge: 'badge-primary' },
  sales_manager: { label: 'Sales Manager', badge: 'badge-info' },
  sales_rep: { label: 'Sales Rep', badge: 'badge-success' },
  sales_executive: { label: 'Sales Executive', badge: 'badge-success' },
  presales: { label: 'Pre-Sales Rep', badge: 'badge-warning' },
  pre_sales_manager: { label: 'Pre-Sales Manager', badge: 'badge-warning' },
  telecaller: { label: 'Telecaller', badge: 'badge-gray' },
  finance_manager: { label: 'Finance Manager', badge: 'badge-purple' },
  post_sales_manager: { label: 'Post-Sales Manager', badge: 'badge-info' },
  cp_manager: { label: 'CP Manager', badge: 'badge-primary' },
  channel_partner: { label: 'Channel Partner', badge: 'badge-gray' },
  customer: { label: 'Customer', badge: 'badge-gray' },
};

// Organization tenant-level roles available to Org Admins
export const ORGANIZATION_ROLES = {
  admin: { label: 'Organization Admin (Developer / Owner)', badge: 'badge-purple' },
  sales_head: { label: 'Sales Head / Director', badge: 'badge-primary' },
  sales_manager: { label: 'Sales Manager', badge: 'badge-info' },
  sales_executive: { label: 'Sales Executive / Closer', badge: 'badge-success' },
  presales: { label: 'Pre-Sales / Telecaller Lead', badge: 'badge-warning' },
  telecaller: { label: 'Telecaller', badge: 'badge-gray' },
  finance_manager: { label: 'Finance Manager', badge: 'badge-purple' },
  marketing_head: { label: 'Marketing Head', badge: 'badge-primary' },
  channel_partner: { label: 'Channel Partner / Broker', badge: 'badge-gray' },
};

export const ACTIVITY_TYPES = {
  call: { label: 'Call', icon: '📞', color: '#dcfce7' },
  note: { label: 'Note', icon: '📝', color: '#f0f9ff' },
  email: { label: 'Email', icon: '📧', color: '#eff6ff' },
  sms: { label: 'SMS', icon: '💬', color: '#fef3c7' },
  whatsapp: { label: 'WhatsApp', icon: '💚', color: '#dcfce7' },
  task: { label: 'Task', icon: '✅', color: '#f3e8ff' },
  meeting: { label: 'Meeting', icon: '🤝', color: '#fff7ed' },
  site_visit: { label: 'Site Visit', icon: '🏠', color: '#dbeafe' },
  stage_change: { label: 'Stage Change', icon: '🔄', color: '#fef9c3' },
  system: { label: 'System', icon: '⚙️', color: '#f1f5f9' },
};

export const TASK_TYPES = {
  call: { label: 'Call', icon: '📞' },
  follow_up: { label: 'Follow Up', icon: '🔄' },
  meeting: { label: 'Meeting', icon: '🤝' },
  site_visit: { label: 'Site Visit', icon: '🏠' },
  email: { label: 'Email', icon: '📧' },
  document_collection: { label: 'Doc Collection', icon: '📄' },
  other: { label: 'Other', icon: '📋' },
};

export const TASK_STATUSES = {
  pending: { label: 'Pending', badge: 'badge-warning' },
  in_progress: { label: 'In Progress', badge: 'badge-primary' },
  completed: { label: 'Completed', badge: 'badge-success' },
  cancelled: { label: 'Cancelled', badge: 'badge-danger' },
};

export const TASK_PRIORITIES = {
  low: { label: 'Low', badge: 'badge-gray' },
  medium: { label: 'Medium', badge: 'badge-info' },
  high: { label: 'High', badge: 'badge-warning' },
  urgent: { label: 'Urgent', badge: 'badge-danger' },
};

export const PIPELINE_STAGES = [
  'new', 'contacted', 'connected', 'qualified',
  'site_visit_scheduled', 'site_visit_done', 'negotiation', 'booking_in_progress', 'booked',
];
