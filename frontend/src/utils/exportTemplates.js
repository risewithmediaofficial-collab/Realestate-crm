/**
 * Professional Real Estate CRM Export Templates & CSV Generator
 * Standardized UTF-8 BOM, RFC-4180 Escaping, Corporate Header Banners, and Summary Aggregations
 * Compatible with Microsoft Excel, Apple Numbers, Google Sheets, and LibreOffice Calc
 */

// Helper to escape CSV fields according to RFC-4180 standard
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

// Helper to trigger browser file download with UTF-8 BOM
const triggerDownload = (csvContent, fileName) => {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generates corporate report metadata header block
const buildReportBanner = (reportTitle, orgName = 'MRP REAL ESTATE', extraNotes = '') => {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 19);
  let banner = `# =========================================================================\n`;
  banner += `# ORGANIZATION: ${orgName.toUpperCase()}\n`;
  banner += `# REPORT TITLE: ${reportTitle}\n`;
  banner += `# GENERATED AT: ${dateStr} (IST)\n`;
  if (extraNotes) banner += `# NOTE: ${extraNotes}\n`;
  banner += `# =========================================================================\n\n`;
  return banner;
};

// ── 1. LEADS REGISTER EXPORT
export const exportLeadsCSV = (leads = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Lead ID', 'Full Name', 'Phone Number', 'Email Address', 'City / Location',
    'Current Stage', 'Lead Type / Priority', 'Lead Score', 'Source Channel',
    'Interested Project', 'Unit Preference', 'Budget Min (INR)', 'Budget Max (INR)',
    'Assigned Telecaller / Rep', 'Next Re-follow Date', 'Next Re-follow Time',
    'Last Call Outcome', 'Total Call Logs Spoken', 'Created Date'
  ];

  let csv = buildReportBanner('LEAD REGISTER & PROSPECT DIRECTORY', orgName, `Total Active Leads: ${leads.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalBudget = 0;
  let totalCalls = 0;

  leads.forEach((l, idx) => {
    const bgMin = typeof l.budget === 'object' ? (l.budget?.min || 0) : (l.budget || 0);
    const bgMax = typeof l.budget === 'object' ? (l.budget?.max || 0) : (l.budget || 0);
    const repName = l.assignedTo?.name || (typeof l.assignedTo === 'string' ? l.assignedTo : 'Unassigned');
    const logsCount = (l.callLogs?.length || 0) + (l.activities?.filter(a => a.type === 'call')?.length || 0);
    const refollowDate = l.nextFollowUp ? new Date(l.nextFollowUp).toISOString().slice(0, 10) : '';

    totalBudget += (Number(bgMax) || Number(bgMin) || 0);
    totalCalls += logsCount;

    const row = [
      l._id || `LEAD-${idx + 1001}`,
      l.name || 'Unnamed',
      l.phone || '',
      l.email || '',
      l.city || '',
      l.stage || 'new',
      l.leadType || 'Warm',
      l.leadScore || 50,
      l.source || 'direct',
      l.interestedProject?.name || l.project || '',
      l.interestedUnitType || '',
      bgMin,
      bgMax,
      repName,
      refollowDate,
      l.nextFollowUpTime || '',
      l.lastCallOutcome || '',
      logsCount,
      l.createdAt ? new Date(l.createdAt).toISOString().slice(0, 10) : ''
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Aggregate Row
  csv += '\n';
  const summaryRow = [
    'TOTAL PROSPECTS SUMMARY',
    `Total: ${leads.length} Leads`,
    '', '', '', '', '', '', '', '', '',
    '-',
    totalBudget,
    '', '', '', '',
    totalCalls,
    ''
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Leads_Register_${dateStr}.csv`);
};

// ── 2. SAMPLE LEADS IMPORT TEMPLATE
export const downloadLeadsImportTemplateCSV = () => {
  const headers = [
    'Name', 'Phone', 'Email', 'City', 'Source', 'InterestedProject',
    'UnitType', 'BudgetMin', 'BudgetMax', 'AssignedToEmail', 'Notes'
  ];

  let csv = `# =========================================================================\n`;
  csv += `# INSTRUCTIONS FOR BULK LEAD IMPORT:\n`;
  csv += `# 1. Name and Phone are mandatory fields.\n`;
  csv += `# 2. Phone must include 10 digits (e.g. 9876543210 or +919876543210).\n`;
  csv += `# 3. Source values: meta_ads, google_ads, website, portal, walk_in, referral, whatsapp\n`;
  csv += `# 4. Do not alter column headers in row 7 below.\n`;
  csv += `# =========================================================================\n\n`;

  csv += headers.map(escapeCSV).join(',') + '\n';

  const sampleRows = [
    ['Rajesh Sharma', '+919876543210', 'rajesh.sharma@example.com', 'Chennai', 'meta_ads', 'Greenwood Villas', '3 BHK', '8500000', '12000000', 'telecaller@crm.com', 'Interested in East facing villa plot.'],
    ['Priya Swaminathan', '+919840123456', 'priya.s@example.com', 'Bengaluru', 'google_ads', 'Skyline Residences', '2 BHK', '6000000', '8000000', 'sales@crm.com', 'Looking for immediate possession near IT Park.'],
    ['Karthik Venkatesh', '+919710987654', 'karthik.v@example.com', 'Coimbatore', 'website', 'Royal Palm Enclave', 'Villa Plot', '4500000', '6500000', '', 'Inquired through web cost sheet form.']
  ];

  sampleRows.forEach(r => {
    csv += r.map(escapeCSV).join(',') + '\n';
  });

  triggerDownload(csv, 'CRM_Leads_Import_Template.csv');
};

// ── 3. BOOKINGS APPLICATION & KYC REGISTER
export const exportBookingsCSV = (bookings = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Booking Reference #', 'Primary Applicant Name', 'Phone Number', 'Email Address',
    'PAN Number', 'Aadhaar Number', 'Co-Applicant Name', 'Co-Applicant Relation', 'Co-Applicant Phone',
    'Project Name', 'Unit / Plot #', 'Typology / Config', 'Tower / Block',
    'Agreed Total Sale Value (INR)', 'Token Advance Paid (INR)', 'Remaining Balance Due (INR)',
    'Payment Plan Scheme', 'Payment Mode', 'Transaction / Chq #', 'Assigned Sales Closer',
    'Booking Application Date', 'Approval / Deed Status'
  ];

  let csv = buildReportBanner('BOOKING APPLICATIONS, KYC & SALES CLOSURE REGISTER', orgName, `Total Active Bookings: ${bookings.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalSaleVal = 0;
  let totalTokenVal = 0;
  let totalBalVal = 0;

  bookings.forEach((b, idx) => {
    const saleAmt = Number(b.totalAmount || b.totalPrice || 0);
    const tokenAmt = Number(b.tokenAmount || b.bookingAmount || 0);
    const balAmt = Math.max(0, saleAmt - tokenAmt);

    totalSaleVal += saleAmt;
    totalTokenVal += tokenAmt;
    totalBalVal += balAmt;

    const coApp = (b.coApplicants && b.coApplicants[0]) || {};
    const bDate = b.createdAt || b.bookingDate || '';
    const dateStr = bDate ? new Date(bDate).toISOString().slice(0, 10) : '';

    const row = [
      b.bookingNumber || `BK-${b._id ? b._id.slice(-6) : (idx + 1001)}`,
      b.customerName || b.applicantName || 'Primary Applicant',
      b.customerPhone || b.phone || '',
      b.customerEmail || b.email || '',
      b.panNumber || '',
      b.aadharNumber || '',
      coApp.name || '',
      coApp.relation || '',
      coApp.phone || '',
      b.project?.name || b.projectName || 'Active Project',
      b.unit?.unitNumber || b.unitNumber || '',
      b.unit?.type || b.unitType || 'Apartment / Plot',
      b.unit?.tower || b.tower || b.block || 'Phase 1',
      saleAmt,
      tokenAmt,
      balAmt,
      b.paymentPlan || 'construction_linked',
      b.bookingAmountMode || b.paymentMode || 'NEFT / Cheque',
      b.transactionRef || b.chequeNumber || 'Recorded',
      b.handledBy?.name || b.agentName || 'Sales Team',
      dateStr,
      (b.status || 'approved').toUpperCase()
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const summaryRow = [
    'TOTAL REVENUE & ADVANCE COLLECTIONS',
    `Total Bookings: ${bookings.length}`,
    '', '', '', '', '', '', '', '', '', '', '',
    totalSaleVal,
    totalTokenVal,
    totalBalVal,
    '', '', '', '', '', ''
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Bookings_Register_${dateStr}.csv`);
};

// ── 4. INVENTORY MATRIX & STACKING REGISTER
export const exportInventoryMatrixCSV = (unitsList = [], orgName = 'MRP REAL ESTATE', projectName = 'All Projects') => {
  const headers = [
    'Unit / Plot Number', 'Project Name', 'Typology / Type', 'Tower / Sector / Block',
    'Floor Level', 'Super Built-Up Area (sq.ft)', 'Carpet Area (sq.ft)', 'Facing Orientation',
    'Base Rate (INR/sq.ft)', 'Base Price (INR)', 'Development / PLC Charges (INR)',
    'Total Package Price (INR)', 'Electricity Connection', 'Water Source', 'Irrigation / Fencing',
    'Current Availability Status', 'Held By Customer', 'Hold Expiry Date',
    'Booked Customer Name', 'Token Received (INR)', 'Assigned Closer / Rep'
  ];

  let csv = buildReportBanner(`INVENTORY MASTER & STACKING MATRIX — ${projectName.toUpperCase()}`, orgName, `Total Units: ${unitsList.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalAvailableUnits = 0;
  let totalBookedUnits = 0;
  let totalGrossInventoryVal = 0;

  unitsList.forEach(u => {
    const area = Number(u.area?.superBuiltUp || u.area || 1200);
    const carpet = Number(u.area?.carpet || u.carpetArea || Math.round(area * 0.75));
    const bPrice = Number(u.pricing?.basePrice || u.basePrice || 0);
    const totPrice = Number(u.pricing?.totalPrice || u.totalPrice || (bPrice * 1.15) || 0);
    const devCharges = Math.max(0, totPrice - bPrice);
    const bRate = area > 0 ? Math.round(bPrice / area) : 0;

    totalGrossInventoryVal += totPrice;
    if (u.status === 'available') totalAvailableUnits++;
    if (['booked', 'registered', 'sold'].includes(u.status)) totalBookedUnits++;

    const holdCust = u.holdCustomer?.name || '';
    const holdExp = u.holdExpiresAt ? new Date(u.holdExpiresAt).toISOString().slice(0, 16).replace('T', ' ') : '';
    const bookCust = u.bookingCustomer?.name || '';
    const tokenPaid = u.bookingCustomer?.tokenAmount || 0;
    const rep = u.bookingCustomer?.agentName || u.holdCustomer?.agentName || 'Sales Team';

    const row = [
      u.unitNumber || 'Plot-TBD',
      u.project?.name || u.projectName || projectName,
      u.type || 'Plot / Apartment',
      u.tower || u.block || u.sector || 'Phase 1',
      u.floor !== undefined ? u.floor : 'Ground',
      area,
      carpet,
      u.facing || 'East',
      bRate,
      bPrice,
      devCharges,
      totPrice,
      u.utilities?.electricity || 'Available',
      u.utilities?.waterSource || 'Municipal / Borewell',
      u.utilities?.fencing || 'Gated Boundary',
      (u.status || 'available').toUpperCase(),
      holdCust,
      holdExp,
      bookCust,
      tokenPaid,
      rep
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const summaryRow = [
    'INVENTORY ABSORPTION TOTALS',
    `Total Units: ${unitsList.length}`,
    `Available: ${totalAvailableUnits}`,
    `Booked/Sold: ${totalBookedUnits}`,
    '', '', '', '', '', '', '',
    totalGrossInventoryVal,
    '', '', '', '', '', '', '', '', ''
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Inventory_Master_${dateStr}.csv`);
};

// ── 5. PROJECTS DIRECTORY EXPORT
export const exportProjectsCSV = (projectsList = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Project Code', 'Project Name', 'Development Category', 'Project Stage / Status',
    'City / Location', 'Address / Locality', 'Total Land Extent', 'Extent Measurement Unit',
    'Total Units Launched', 'Available Units', 'Booked Units', 'Sold Units',
    'Starting Base Price (INR)', 'Max Unit Price (INR)', 'RERA Registration #',
    'Regulatory Approvals', 'Project Launch Date'
  ];

  let csv = buildReportBanner('REAL ESTATE PROJECTS MASTER DIRECTORY', orgName, `Total Projects: ${projectsList.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalUnitsLaunched = 0;

  projectsList.forEach(p => {
    const units = p.unitsList || [];
    const totUnits = p.totalUnits || units.length || 0;
    const avail = units.filter(u => u.status === 'available').length;
    const booked = units.filter(u => u.status === 'booked').length;
    const sold = units.filter(u => u.status === 'sold').length;

    totalUnitsLaunched += totUnits;

    const approvals = Array.isArray(p.approvals) ? p.approvals.join('; ') : (p.approvals || 'RERA Approved');
    const launchDate = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '';

    const row = [
      p.code || `PRJ-${p._id?.slice(-4)}`,
      p.name || 'Untitled Project',
      p.type || p.categoryDetails?.label || 'Residential',
      (p.status || 'Active').toUpperCase(),
      p.city || '',
      p.address || '',
      p.totalAcres || 0,
      p.extentUnit || 'Acres',
      totUnits,
      avail,
      booked,
      sold,
      p.minPrice || p.pricing?.basePrice || 0,
      p.maxPrice || 0,
      p.reraNumber || 'PRM/RERA/PENDING',
      approvals,
      launchDate
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const summaryRow = [
    'TOTAL DEVELOPMENT PORTFOLIO',
    `Projects: ${projectsList.length}`,
    '', '', '', '', '', '',
    totalUnitsLaunched,
    '', '', '', '', '', '', '', ''
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Projects_Directory_${dateStr}.csv`);
};

// ── 6. SITE VISITS & PROPERTY TOURS REGISTER
export const exportSiteVisitsCSV = (visits = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Visit Reference #', 'Customer / Visitor Name', 'Contact Phone', 'Email Address',
    'Project Name', 'Unit / Configuration Preference', 'Scheduled Visit Date', 'Scheduled Time',
    'Assigned Sales Executive', 'Cab Logistics Requested', 'Pickup Address', 'Cab Driver Details',
    'Visit Status', 'Actual Check-in Time', 'Actual Check-out Time', 'Customer Rating',
    'Tour Outcome & Feedback Notes'
  ];

  let csv = buildReportBanner('SITE VISITS, PROPERTY TOURS & VISITOR FEEDBACK REGISTER', orgName, `Total Visits: ${visits.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let completedVisits = 0;

  visits.forEach((v, idx) => {
    if (v.status === 'completed') completedVisits++;
    const vDate = v.visitDate ? new Date(v.visitDate).toISOString().slice(0, 10) : '';
    const lead = v.lead || {};

    const row = [
      v._id ? `SV-${v._id.slice(-6)}` : `SV-${idx + 1001}`,
      lead.name || v.customerName || v.leadName || 'Visitor',
      lead.phone || v.customerPhone || v.phone || '',
      lead.email || v.customerEmail || '',
      v.project?.name || v.projectName || 'Project Site',
      v.unitType || 'Apartment / Villa Plot',
      vDate,
      v.visitTime || v.time || '11:00 AM',
      v.assignedTo?.name || v.executiveName || 'Field Executive',
      v.cabRequired ? 'Yes (Complimentary Cab)' : 'No (Self Drive)',
      v.pickupAddress || '',
      v.cabDetails?.driverName ? `${v.cabDetails.driverName} (${v.cabDetails.vehicleNo})` : '—',
      (v.status || 'scheduled').toUpperCase(),
      v.checkInTime ? new Date(v.checkInTime).toISOString().slice(11, 16) : '',
      v.checkOutTime ? new Date(v.checkOutTime).toISOString().slice(11, 16) : '',
      v.rating ? `${v.rating} / 5 Stars` : '—',
      v.feedback || v.notes || v.outcome || 'Tour in progress'
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const summaryRow = [
    'VISIT ACTIVITY TOTALS',
    `Total Scheduled: ${visits.length}`,
    `Completed Tours: ${completedVisits}`,
    '', '', '', '', '', '', '', '', '', '', '', '', '', ''
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Site_Visits_Register_${dateStr}.csv`);
};

// ── 7. TASKS & SALES ACTIVITIES LEDGER
export const exportActivitiesCSV = (tasks = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Activity ID', 'Activity Type', 'Task Subject / Title', 'Description / Action Notes',
    'Customer / Prospect Name', 'Contact Phone', 'Project Reference', 'Priority Level',
    'Scheduled Due Date', 'Scheduled Due Time', 'Task Status', 'Assigned Sales Rep',
    'Performed By User', 'Completion Timestamp'
  ];

  let csv = buildReportBanner('SALES ACTIVITIES, TASKS & SLA FOLLOW-UP LEDGER', orgName, `Total Activities: ${tasks.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let completedTasks = 0;

  tasks.forEach((t, idx) => {
    if (t.status === 'completed') completedTasks++;
    const dDate = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '';
    const compDate = t.completedAt ? new Date(t.completedAt).toISOString().slice(0, 19).replace('T', ' ') : '';
    const lead = t.lead || {};

    const row = [
      t._id ? `ACT-${t._id.slice(-6)}` : `ACT-${idx + 1001}`,
      (t.type || 'call').toUpperCase(),
      t.title || 'Follow-up task',
      t.description || '',
      lead.name || t.leadName || '',
      lead.phone || t.leadPhone || '',
      t.project?.name || '',
      (t.priority || 'medium').toUpperCase(),
      dDate,
      t.dueTime || '',
      (t.status || 'pending').toUpperCase(),
      t.assignedTo?.name || 'Assigned Rep',
      t.performedBy?.name || '',
      compDate
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const summaryRow = [
    'ACTIVITIES METRICS TOTALS',
    `Total Tasks: ${tasks.length}`,
    `Completed: ${completedTasks}`,
    `Pending: ${tasks.length - completedTasks}`,
    '', '', '', '', '', '', '', '', '', ''
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Sales_Activities_Ledger_${dateStr}.csv`);
};

// ── 8. PRICE NEGOTIATIONS & APPROVALS LEDGER
export const exportNegotiationsCSV = (requests = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Deal Reference #', 'Customer Name', 'Contact Phone', 'Project Name', 'Unit / Plot #',
    'Standard Listed Price (INR)', 'Requested Discount Amount (INR)', 'Discount Percentage (%)',
    'Net Proposed Deal Value (INR)', 'Commercial Justification / Reason', 'Requested By Executive',
    'Approval Decision Status', 'Approved / Reviewed By', 'Approval Notes / Conditions', 'Submission Date'
  ];

  let csv = buildReportBanner('PRICE NEGOTIATIONS, COMMERCIAL EXCEPTIONS & APPROVALS LEDGER', orgName, `Total Requests: ${requests.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalListVal = 0;
  let totalDiscountVal = 0;
  let totalProposedVal = 0;

  requests.forEach((r, idx) => {
    const listPrice = Number(r.originalPrice || 0);
    const reqPrice = Number(r.requestedPrice || 0);
    const discountAmt = Math.max(0, listPrice - reqPrice);
    const discountPct = listPrice > 0 ? ((discountAmt / listPrice) * 100).toFixed(1) : '0.0';

    totalListVal += listPrice;
    totalDiscountVal += discountAmt;
    totalProposedVal += reqPrice;

    const subDate = r.createdAt || r.submissionDate || '';
    const dateStr = subDate ? new Date(subDate).toISOString().slice(0, 10) : '';

    const row = [
      r.id || r._id ? `NEG-${(r.id || r._id).slice(-6)}` : `NEG-${idx + 1001}`,
      r.leadName || r.customerName || 'Customer',
      r.phone || '',
      r.project || 'Project',
      r.unitNumber || '',
      listPrice,
      discountAmt,
      `${discountPct}%`,
      reqPrice,
      r.reason || 'Customer request within budget',
      r.requestedBy || 'Sales Executive',
      (r.status || 'pending').toUpperCase(),
      r.approvedBy?.name || r.approvedBy || (r.status === 'approved' ? 'Management' : '—'),
      r.approvalRemarks || '',
      dateStr
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const summaryRow = [
    'TOTAL COMMERCIAL EXPOSURE',
    `Total Requests: ${requests.length}`,
    '', '', '',
    totalListVal,
    totalDiscountVal,
    totalListVal > 0 ? `${((totalDiscountVal / totalListVal) * 100).toFixed(1)}%` : '0%',
    totalProposedVal,
    '', '', '', '', '', ''
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Negotiation_Approvals_${dateStr}.csv`);
};

// ── 9. CHANNEL PARTNER NETWORK DIRECTORY
export const exportChannelPartnersCSV = (partners = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Partner Reference #', 'Agency / Brokerage Firm Name', 'Contact Person', 'Phone Number',
    'Email Address', 'Operating City', 'Partnership Tier', 'RERA Registration No',
    'Verification Status', 'Total Leads Sourced', 'Total Units Closed', 'Total Sales Revenue Generated (INR)',
    'Commission Slab Rate %', 'Total Commission Earned (INR)', 'Commission Disbursed (INR)', 'Commission Outstanding (INR)'
  ];

  let csv = buildReportBanner('CHANNEL PARTNER NETWORK, DEAL ATTRIBUTION & COMMISSION LEDGER', orgName, `Total Partners: ${partners.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalSales = 0;
  let totalEarned = 0;
  let totalPaid = 0;
  let totalPending = 0;

  partners.forEach((p, idx) => {
    const sVal = Number(p.totalValue || 0);
    const earned = Number(p.commissionEarned || 0);
    const paid = Number(p.commissionPaid || (earned * 0.7) || 0);
    const pend = Number(p.commissionPending || Math.max(0, earned - paid));

    totalSales += sVal;
    totalEarned += earned;
    totalPaid += paid;
    totalPending += pend;

    const row = [
      p._id ? `CP-${p._id.slice(-6)}` : `CP-${idx + 1001}`,
      p.firmName || 'Channel Partner Firm',
      p.contactPerson || '',
      p.phone || '',
      p.email || '',
      p.city || '',
      (p.tier || 'Silver').toUpperCase(),
      p.reraNumber || 'PRM/RERA/PENDING',
      (p.status || 'approved').toUpperCase(),
      p.totalLeads || 0,
      p.totalBookings || 0,
      sVal,
      `${p.commissionRate || 2.0}%`,
      earned,
      paid,
      pend
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const summaryRow = [
    'TOTAL CP SOURCED PRODUCTION',
    `Firms: ${partners.length}`,
    '', '', '', '', '', '', '', '', '',
    totalSales,
    '',
    totalEarned,
    totalPaid,
    totalPending
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Channel_Partners_Directory_${dateStr}.csv`);
};

// ── 10. FINANCE & MILESTONE COLLECTIONS REPORT
export const exportFinanceReportCSV = (payments = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Demand Notice #', 'Customer Name', 'Phone Number', 'Unit Assigned',
    'Milestone Stage', 'Demand Date', 'Due Date', 'Demanded Amount (INR)',
    'Paid Amount (INR)', 'Balance Due (INR)', 'GST Amount (INR)', 'TDS Amount (INR)',
    'Payment Status', 'Payment Mode', 'Transaction / UTR Ref'
  ];

  let csv = buildReportBanner('FINANCIAL MILESTONE DEMAND & REALIZATION LEDGER', orgName);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalDemanded = 0;
  let totalPaid = 0;
  let totalBal = 0;
  let totalGST = 0;
  let totalTDS = 0;

  payments.forEach(p => {
    const dem = p.demandAmount || 0;
    const paid = p.paidAmount || 0;
    const bal = p.balanceAmount ?? Math.max(0, dem - paid);
    const gst = p.gstAmount || 0;
    const tds = p.tdsAmount || 0;

    totalDemanded += dem;
    totalPaid += paid;
    totalBal += bal;
    totalGST += gst;
    totalTDS += tds;

    const row = [
      p.demandNumber || 'DN-PENDING',
      p.customerName || p.booking?.customerName || '',
      p.customerPhone || p.booking?.customerPhone || '',
      p.unitNumber || p.unit?.unitNumber || '',
      p.milestoneName || 'Stage Milestone',
      p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '',
      p.dueDate ? new Date(p.dueDate).toISOString().slice(0, 10) : '',
      dem,
      paid,
      bal,
      gst,
      tds,
      (p.status || 'pending').toUpperCase(),
      p.paymentMode || '',
      p.referenceNumber || p.utrNumber || ''
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const summaryRow = [
    'TOTAL REALIZATION SUMMARY',
    '', '', '', '', '', '',
    totalDemanded,
    totalPaid,
    totalBal,
    totalGST,
    totalTDS,
    totalDemanded > 0 ? `${((totalPaid / totalDemanded) * 100).toFixed(1)}% Realized` : '0%',
    '', ''
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Milestone_Finance_Report_${dateStr}.csv`);
};

// ── 11. SALES & REVENUE REALIZATION REPORT
export const exportSalesRealizationCSV = (revenueData = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Calendar Month', 'Gross Bookings Value (INR)',
    'Realized Cash Collections (INR)', 'Pending Milestone Balance (INR)',
    'Collection Efficiency %'
  ];

  let csv = buildReportBanner('MONTHLY SALES & REVENUE REALIZATION REPORT', orgName);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totBooked = 0;
  let totColl = 0;

  revenueData.forEach(r => {
    const booked = r.bookingValue || 0;
    const coll = r.collected || 0;
    const rem = Math.max(0, booked - coll);
    const eff = booked > 0 ? `${((coll / booked) * 100).toFixed(1)}%` : '100%';

    totBooked += booked;
    totColl += coll;

    const row = [
      r.month,
      booked,
      coll,
      rem,
      eff
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  csv += '\n';
  const summaryRow = [
    'ANNUAL TOTALS',
    totBooked,
    totColl,
    Math.max(0, totBooked - totColl),
    totBooked > 0 ? `${((totColl / totBooked) * 100).toFixed(1)}%` : '0%'
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Sales_Realization_Report_${dateStr}.csv`);
};

// ── 12. LEAD SOURCING & FUNNEL ROI REPORT
export const exportLeadFunnelRoiCSV = (sourceRoiData = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Acquisition Channel', 'Marketing Ad Spend (INR)', 'Leads Generated',
    'Site Visits Done', 'Bookings Won & Closed', 'Gross Sales Realized (INR)',
    'Cost Per Lead (INR)', 'Marketing ROI Multiplier'
  ];

  let csv = buildReportBanner('LEAD SOURCING, CHANNEL ATTRIBUTION & MARKETING ROI', orgName);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totSpend = 0;
  let totLeads = 0;
  let totVisits = 0;
  let totBookings = 0;
  let totRevenue = 0;

  sourceRoiData.forEach(s => {
    totSpend += (s.spend || 0);
    totLeads += (s.leads || 0);
    totVisits += (s.siteVisits || 0);
    totBookings += (s.bookings || 0);
    totRevenue += (s.revenue || 0);

    const cpl = (s.leads > 0 && s.spend > 0) ? Math.round(s.spend / s.leads) : 0;

    const row = [
      s.source,
      s.spend || 0,
      s.leads || 0,
      s.siteVisits || 0,
      s.bookings || 0,
      s.revenue || 0,
      cpl,
      s.roi || '—'
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  csv += '\n';
  const avgCpl = totLeads > 0 ? Math.round(totSpend / totLeads) : 0;
  const overallRoi = totSpend > 0 ? `${(totRevenue / totSpend).toFixed(1)}x` : '—';
  const summaryRow = [
    'TOTAL CAMPAIGN PERFORMANCE',
    totSpend,
    totLeads,
    totVisits,
    totBookings,
    totRevenue,
    avgCpl,
    overallRoi
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Channel_Funnel_ROI_Report_${dateStr}.csv`);
};

// ── 13. INVENTORY ABSORPTION REPORT
export const exportInventoryAbsorptionCSV = (projects = [], bookings = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Project Name', 'RERA Registration #', 'City / Location', 'Total Units Launched',
    'Units Booked / Sold', 'Available Inventory', 'Absorption Velocity %', 'Estimated Inventory Value (INR)'
  ];

  let csv = buildReportBanner('PROJECT INVENTORY ABSORPTION & SALES VELOCITY', orgName);
  csv += headers.map(escapeCSV).join(',') + '\n';

  projects.forEach(p => {
    const totalUnits = p.totalUnits || 100;
    const bookedUnits = bookings.filter(b => b.project?._id === p._id || b.project === p._id).length;
    const available = Math.max(0, totalUnits - bookedUnits);
    const absRate = totalUnits > 0 ? `${((bookedUnits / totalUnits) * 100).toFixed(1)}%` : '0%';
    const estVal = totalUnits * (p.pricing?.basePrice || 4500000);

    const row = [
      p.name,
      p.reraNumber || 'PRM/RERA/PENDING',
      p.city || '',
      totalUnits,
      bookedUnits,
      available,
      absRate,
      estVal
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Inventory_Absorption_Report_${dateStr}.csv`);
};

// ── 14. TEAM SCORECARD & PRODUCTIVITY REPORT
export const exportTeamScorecardCSV = (scorecard = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Executive / Staff Name', 'Role Title', 'Assigned Leads',
    'Telecalling Notes Spoken', 'Site Visits Conducted', 'Deals Won & Closed',
    'Closed Sales Value (INR)', 'Conversion Achievement %'
  ];

  let csv = buildReportBanner('SALES FORCE PRODUCTIVITY & CONVERSION SCORECARD', orgName, 'Real-time sales attribution by telecaller and closing executive');
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalLeads = 0;
  let totalCalls = 0;
  let totalVisits = 0;
  let totalDeals = 0;
  let totalRevenue = 0;

  scorecard.forEach(m => {
    totalLeads += (m.assignedLeads || 0);
    totalCalls += (m.connectedCalls || 0);
    totalVisits += (m.siteVisitsDone || 0);
    totalDeals += (m.bookingsClosed || 0);
    totalRevenue += (m.revenue || 0);

    const row = [
      m.name || 'Staff Member',
      m.role || 'Telecaller',
      m.assignedLeads || 0,
      m.connectedCalls || 0,
      m.siteVisitsDone || 0,
      m.bookingsClosed || 0,
      m.revenue || 0,
      m.achievement || '0%'
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary row
  csv += '\n';
  const summaryRow = [
    'TOTALS / TEAM AGGREGATE',
    '-',
    totalLeads,
    totalCalls,
    totalVisits,
    totalDeals,
    totalRevenue,
    totalLeads > 0 ? `${((totalDeals / totalLeads) * 100).toFixed(1)}%` : '0%'
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Team_Scorecard_Report_${dateStr}.csv`);
};

// ── 15. MARKETING CAMPAIGNS & ROI REPORT
export const exportMarketingCampaignsCSV = (campaigns = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Campaign Name', 'Channel / Platform', 'Execution Status', 'Target Project',
    'Allocated Budget (INR)', 'Actual Ad Spend (INR)', 'Impressions Delivered',
    'Ad Clicks', 'Click-Through Rate (CTR %)', 'Leads Generated', 'Cost Per Lead - CPL (INR)',
    'Closed Bookings Attributed', 'Sales Revenue Generated (INR)', 'Return On Ad Spend (ROAS)'
  ];

  let csv = buildReportBanner('MARKETING CAMPAIGNS PERFORMANCE & ATTRIBUTION REPORT', orgName, `Total Campaigns: ${campaigns.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalBudget = 0;
  let totalSpent = 0;
  let totalLeads = 0;
  let totalConversions = 0;
  let totalRevenue = 0;

  campaigns.forEach(c => {
    const budget = Number(c.budget || 0);
    const spent = Number(c.spent || 0);
    const leadsCount = Number(c.leads || 0);
    const convs = Number(c.conversions || 0);
    const rev = Number(c.revenue || 0);
    const cpl = leadsCount > 0 ? Math.round(spent / leadsCount) : 0;
    const roas = spent > 0 ? `${(rev / spent).toFixed(1)}x` : '—';
    const ctr = c.impressions > 0 ? `${(((c.clicks || 0) / c.impressions) * 100).toFixed(2)}%` : '—';

    totalBudget += budget;
    totalSpent += spent;
    totalLeads += leadsCount;
    totalConversions += convs;
    totalRevenue += rev;

    const row = [
      c.name || 'Ad Campaign',
      c.type || 'Meta Ads',
      (c.status || 'active').toUpperCase(),
      c.project?.name || c.projectName || 'All Projects',
      budget,
      spent,
      c.impressions || 0,
      c.clicks || 0,
      ctr,
      leadsCount,
      cpl,
      convs,
      rev,
      roas
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const overallCpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;
  const overallRoas = totalSpent > 0 ? `${(totalRevenue / totalSpent).toFixed(1)}x` : '—';
  const summaryRow = [
    'TOTAL CAMPAIGN EXPOSURE',
    `Campaigns: ${campaigns.length}`,
    '', '',
    totalBudget,
    totalSpent,
    '', '', '',
    totalLeads,
    overallCpl,
    totalConversions,
    totalRevenue,
    overallRoas
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Marketing_Campaigns_${dateStr}.csv`);
};

// ── 16. SALES PIPELINE DEALS REGISTER
export const exportSalesPipelineCSV = (leads = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Prospect Name', 'Contact Phone', 'Current Pipeline Stage', 'Deal Budget Value (INR)',
    'Interested Project', 'Priority Level', 'Lead Score', 'Assigned Sales Closer',
    'Days in Stage', 'Next Scheduled Follow-up'
  ];

  let csv = buildReportBanner('SALES PIPELINE & ACTIVE OPPORTUNITY REGISTER', orgName, `Total Deals in Pipeline: ${leads.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  let totalPipelineVal = 0;

  leads.forEach(l => {
    const val = Number(l.budgetVal || (typeof l.budget === 'object' ? (l.budget?.max || l.budget?.min) : l.budget) || 0);
    totalPipelineVal += val;

    const row = [
      l.name || 'Prospect',
      l.phone || '',
      (l.stage || 'new').toUpperCase(),
      val,
      l.project || l.interestedProject?.name || 'Active Project',
      (l.type || l.leadType || 'warm').toUpperCase(),
      l.score || l.leadScore || 50,
      l.agent || l.assignedTo?.name || 'Sales Representative',
      l.daysInStage || 1,
      l.nextFollowUp ? new Date(l.nextFollowUp).toISOString().slice(0, 10) : ''
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  // Summary Row
  csv += '\n';
  const summaryRow = [
    'TOTAL ACTIVE PIPELINE VALUE',
    `Opportunities: ${leads.length}`,
    '',
    totalPipelineVal,
    '', '', '', '', '', ''
  ];
  csv += summaryRow.map(escapeCSV).join(',') + '\n';

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Sales_Pipeline_${dateStr}.csv`);
};

// ── 17. PRICING & COST SHEET BREAKDOWN EXPORT
export const exportPricingCostSheetCSV = (costSheetData, orgName = 'MRP REAL ESTATE') => {
  const {
    projectName = 'Green Valley Residences',
    unitType = '3BHK',
    superArea = 1350,
    floorNumber = 5,
    baseRate = 7200,
    baseCost = 9720000,
    floorRiseCost = 202500,
    plcCost = 337500,
    infraCost = 202500,
    clubhouseRate = 250000,
    totalParkingCost = 350000,
    agreementValue = 11062500,
    gstAmount = 553125,
    stampDutyAmount = 663750,
    regCharge = 30000,
    legalAdvocateFees = 15000,
    totalPackageValue = 12324375,
    milestones = []
  } = costSheetData || {};

  let csv = buildReportBanner(`OFFICIAL DEVELOPER COST SHEET — ${projectName.toUpperCase()}`, orgName, `Unit: ${unitType} (${superArea} sq.ft on Floor ${floorNumber})`);

  csv += `# 1. AGREEMENT VALUE (AV) BREAKDOWN\n`;
  csv += ['Component Item', 'Rate / Parameter', 'Total Amount (INR)'].map(escapeCSV).join(',') + '\n';
  csv += ['Base Carpet/Built-up Cost', `@ INR ${baseRate} / sq.ft`, baseCost].map(escapeCSV).join(',') + '\n';
  csv += ['Floor Rise Premium', `@ Floor ${floorNumber}`, floorRiseCost].map(escapeCSV).join(',') + '\n';
  csv += ['Prime Location Charges (PLC)', 'East Facing + Corner', plcCost].map(escapeCSV).join(',') + '\n';
  csv += ['Infrastructure & Development Charges', 'Electrification, Roads & Water', infraCost].map(escapeCSV).join(',') + '\n';
  csv += ['Clubhouse & Lifestyle Amenities', 'Lifetime Membership', clubhouseRate].map(escapeCSV).join(',') + '\n';
  csv += ['Dedicated Covered Car Parking', 'Reserved Slot', totalParkingCost].map(escapeCSV).join(',') + '\n';
  csv += ['SUBTOTAL: BASIC AGREEMENT VALUE (AV)', '', agreementValue].map(escapeCSV).join(',') + '\n';

  csv += `\n# 2. STATUTORY TAXES & GOVERNMENT CHARGES\n`;
  csv += ['Statutory Head', 'Rate % / Basis', 'Total Tax (INR)'].map(escapeCSV).join(',') + '\n';
  csv += ['Goods & Services Tax (GST)', '5.00% on AV', gstAmount].map(escapeCSV).join(',') + '\n';
  csv += ['Stamp Duty Registration', '6.00% on AV', stampDutyAmount].map(escapeCSV).join(',') + '\n';
  csv += ['Govt Registration Fee', 'Flat Statutory Charge', regCharge].map(escapeCSV).join(',') + '\n';
  csv += ['Legal & Documentation Scrutiny', 'Advocate Scrutiny', legalAdvocateFees].map(escapeCSV).join(',') + '\n';
  csv += ['ALL-IN TOTAL PACKAGE VALUE (AV + TAXES)', 'Complete Homeownership Cost', totalPackageValue].map(escapeCSV).join(',') + '\n';

  if (milestones.length > 0) {
    csv += `\n# 3. CONSTRUCTION-LINKED MILESTONE PAYMENT SCHEDULE\n`;
    csv += ['Milestone Stage Description', 'Slab %', 'Amount Payable (INR)', 'Payment Due Timeline'].map(escapeCSV).join(',') + '\n';
    milestones.forEach(m => {
      csv += [m.name, `${m.pct}%`, m.amount, m.due].map(escapeCSV).join(',') + '\n';
    });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Cost_Sheet_${unitType}_${dateStr}.csv`);
};

// ── 18. CALL LOGS & TELEPHONY DISPOSITIONS EXPORT
export const exportCallLogsCSV = (callLogs = [], orgName = 'MRP REAL ESTATE') => {
  const headers = [
    'Log Reference #', 'Customer / Prospect Name', 'Phone Number', 'Call Type / Direction',
    'Call Duration', 'Call Disposition Outcome', 'Next Scheduled Re-Follow Date', 'Assigned Telecaller',
    'Customer Notes / Discussion Summary', 'Timestamp'
  ];

  let csv = buildReportBanner('TELEPHONY CALL RECORDINGS & DISPOSITIONS LOG', orgName, `Total Calls: ${callLogs.length}`);
  csv += headers.map(escapeCSV).join(',') + '\n';

  callLogs.forEach((c, idx) => {
    const row = [
      c.id || c._id || `CALL-${idx + 1001}`,
      c.name || c.leadName || 'Customer',
      c.phone || c.dialNumber || '',
      c.type || 'Outbound Call',
      c.duration || '01:24',
      c.outcome || c.disposition || 'Connected - Interested',
      c.nextDate ? `${c.nextDate} ${c.nextTime || ''}` : '—',
      c.agentName || 'Telecaller',
      c.notes || 'Discussion logged via dialer widget',
      c.time || new Date().toISOString().slice(0, 19).replace('T', ' ')
    ];
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Call_Logs_${dateStr}.csv`);
};

// ── 19. MASTER 360° EXECUTIVE DASHBOARD SUMMARY EXPORT
export const exportMasterDashboardSummaryCSV = (dashboardData = {}, orgName = 'MRP REAL ESTATE') => {
  const {
    teamStats = {},
    leadsCount = 0,
    bookingsCount = 0,
    inventoryCount = 0,
    visitsCount = 0,
    topAgents = [],
    leadStages = []
  } = dashboardData;

  let csv = buildReportBanner('MASTER EXECUTIVE REVENUE PULSE & DEPARTMENT SUMMARY', orgName);

  csv += `# 1. EXECUTIVE KEY PERFORMANCE INDICATORS\n`;
  csv += ['Metric Description', 'Value'].map(escapeCSV).join(',') + '\n';
  csv += ['Total Booked Sales Revenue', `INR ${teamStats.totalRevenue || 0}`].map(escapeCSV).join(',') + '\n';
  csv += ['Total Token Advances Collected', `INR ${teamStats.totalTokens || 0}`].map(escapeCSV).join(',') + '\n';
  csv += ['Pending Milestone Receivables', `INR ${Math.max(0, (teamStats.totalRevenue || 0) - (teamStats.totalTokens || 0))}`].map(escapeCSV).join(',') + '\n';
  csv += ['Active Prospect Pipeline Value', `INR ${teamStats.totalPipeline || 0}`].map(escapeCSV).join(',') + '\n';
  csv += ['Confirmed Deals Closed', `${bookingsCount} Units`].map(escapeCSV).join(',') + '\n';
  csv += ['Total Active Leads in Follow-up', `${leadsCount} Prospects`].map(escapeCSV).join(',') + '\n';
  csv += ['Completed Site Visits', `${visitsCount} Tours`].map(escapeCSV).join(',') + '\n';
  csv += ['Inventory Units in Portfolio', `${inventoryCount} Units`].map(escapeCSV).join(',') + '\n';

  if (topAgents && topAgents.length > 0) {
    csv += `\n# 2. TOP SALES EXECUTIVES PERFORMANCE ATTRIBUTION\n`;
    csv += ['Sales Executive / Closer', 'Role', 'Assigned Leads', 'Closed Deals', 'Revenue Generated (INR)', 'Conversion %'].map(escapeCSV).join(',') + '\n';
    topAgents.forEach(a => {
      csv += [a.name, a.role || 'Sales Executive', a.leads || 0, a.deals || 0, a.revenue || 0, `${a.conversion || 0}%`].map(escapeCSV).join(',') + '\n';
    });
  }

  if (leadStages && leadStages.length > 0) {
    csv += `\n# 3. PIPELINE STAGE DISTRIBUTION\n`;
    csv += ['Pipeline Stage', 'Lead Count', 'Stage Pipeline Value (INR)'].map(escapeCSV).join(',') + '\n';
    leadStages.forEach(s => {
      csv += [s.label || s.stage, s.count || 0, s.value || 0].map(escapeCSV).join(',') + '\n';
    });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Executive_Dashboard_Summary_${dateStr}.csv`);
};
