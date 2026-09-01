/**
 * Professional Real Estate CRM Export Templates & CSV Generator
 * Standardized UTF-8 BOM, RFC-4180 Escaping, Corporate Header Banners, and Summary Aggregations
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

// ── 1. LEADS EXPORT TEMPLATE
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

  leads.forEach((l, idx) => {
    const bgMin = typeof l.budget === 'object' ? (l.budget?.min || 0) : (l.budget || 0);
    const bgMax = typeof l.budget === 'object' ? (l.budget?.max || 0) : (l.budget || 0);
    const repName = l.assignedTo?.name || (typeof l.assignedTo === 'string' ? l.assignedTo : 'Unassigned');
    const logsCount = (l.callLogs?.length || 0) + (l.activities?.filter(a => a.type === 'call')?.length || 0);
    const refollowDate = l.nextFollowUp ? new Date(l.nextFollowUp).toISOString().slice(0, 10) : '';

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

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `${orgName.replace(/\s+/g, '_')}_Leads_Register_${dateStr}.csv`);
};

// ── 2. SAMPLE LEADS IMPORT TEMPLATE (For Bulk Upload)
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

// ── 3. TEAM SCORECARD & PRODUCTIVITY REPORT
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

// ── 4. FINANCE & MILESTONE COLLECTIONS REPORT
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

// ── 5. SALES & REVENUE REALIZATION REPORT
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

// ── 6. LEAD SOURCING & FUNNEL ROI REPORT
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

// ── 7. INVENTORY ABSORPTION REPORT
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
