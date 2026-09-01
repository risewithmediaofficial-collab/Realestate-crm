import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, DollarSign, Users, Award,
  Download, Calendar, Filter, FileSpreadsheet, Layers, Building, CheckCircle2, MessageSquare,
  CreditCard, AlertCircle, ShieldCheck, Receipt, PieChart as PieIcon, LayoutDashboard, Eye
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import UserDashboardModal from '../../components/users/UserDashboardModal';
import {
  exportFinanceReportCSV,
  exportSalesRealizationCSV,
  exportLeadFunnelRoiCSV,
  exportTeamScorecardCSV,
  exportInventoryAbsorptionCSV
} from '../../utils/exportTemplates';

const DEFAULT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CHANNEL_CONFIG = [
  { id: 'meta_ads', name: 'Meta Ads (Facebook / IG)', defaultSpend: 0 },
  { id: 'google_ads', name: 'Google Ads (Search & PMax)', defaultSpend: 0 },
  { id: 'portals', name: 'Property Portals (99acres/MagicBricks)', defaultSpend: 0 },
  { id: 'website', name: 'Website Landing Page Inbound', defaultSpend: 0 },
  { id: 'direct', name: 'Direct Office Walk-ins', defaultSpend: 0 },
  { id: 'other', name: 'Other Referral Channels', defaultSpend: 0 }
];

const PAYMENT_MODE_COLORS = {
  bank_transfer: '#2563eb',
  upi: '#10b981',
  cheque: '#f59e0b',
  cash: '#8b5cf6',
  loan_disbursement: '#06b6d4',
  card: '#ec4899',
  other: '#64748b'
};

const PAYMENT_MODE_LABELS = {
  bank_transfer: 'Bank Wire / RTGS / NEFT',
  upi: 'Instant UPI Transfer',
  cheque: 'Bank Cheque / DD',
  cash: 'Cash Receipt',
  loan_disbursement: 'Home Loan Bank Disbursement',
  card: 'Credit / Debit Card',
  other: 'Other / Adjustments'
};

export default function ReportsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/finance')) return 'finance';
    if (location.pathname.includes('/leads')) return 'leads';
    if (location.pathname.includes('/team')) return 'team';
    if (location.pathname.includes('/inventory')) return 'inventory';
    return 'sales';
  };

  const [tab, setTab] = useState(getTabFromPath());
  const [dateRange, setDateRange] = useState('all_time');
  const [loading, setLoading] = useState(true);
  const [selectedUserDashboard, setSelectedUserDashboard] = useState(null);

  // Live Dynamic Data States
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [siteVisits, setSiteVisits] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, bookingsRes, visitsRes, projectsRes, usersRes, paymentsRes, invRes] = await Promise.all([
        api.get('/leads?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/bookings?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/site-visits').catch(() => ({ data: { data: [] } })),
        api.get('/projects').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get('/payments').catch(() => ({ data: { data: [] } })),
        api.get('/inventory?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);

      const rawBookings = bookingsRes.data?.data || [];
      const rawInv = invRes.data?.data || [];
      const rawLeads = leadsRes.data?.data || [];

      // Merge booked/registered inventory units into bookings
      const mergedBookings = [...rawBookings];
      rawInv.forEach(un => {
        if (['booked', 'registered', 'sold'].includes(un.status) && un.bookingCustomer) {
          const exists = mergedBookings.some(b => b.unit?._id === un._id || b.unit === un._id || b.customerName === un.bookingCustomer.name);
          if (!exists) {
            mergedBookings.push({
              _id: `inv-${un._id}`,
              customerName: un.bookingCustomer.name,
              customerPhone: un.bookingCustomer.phone,
              totalAmount: un.pricing?.totalPrice || un.totalPrice || 0,
              tokenAmount: un.bookingCustomer.tokenAmount || 0,
              handledBy: { name: un.bookingCustomer.agentName || 'Sales Team' },
              createdAt: un.updatedAt || new Date()
            });
          }
        }
      });

      // Merge leads in 'booked' stage
      rawLeads.forEach(l => {
        if (l.stage === 'booked') {
          const exists = mergedBookings.some(b => b.customerName === l.name || (b.customerPhone && l.phone && b.customerPhone === l.phone));
          if (!exists) {
            const bgVal = (typeof l.budget === 'object' ? (l.budget?.max || l.budget?.min) : Number(l.budget)) || 2220000;
            mergedBookings.push({
              _id: `lead-${l._id}`,
              customerName: l.name,
              customerPhone: l.phone,
              totalAmount: bgVal,
              tokenAmount: 100000,
              handledBy: l.assignedTo ? (typeof l.assignedTo === 'object' ? l.assignedTo : { name: 'Sales Rep' }) : { name: 'Sales Rep' },
              createdAt: l.updatedAt || new Date()
            });
          }
        }
      });

      setLeads(rawLeads);
      setBookings(mergedBookings);
      setSiteVisits(visitsRes.data?.data || []);
      setProjects(projectsRes.data?.data || []);
      setUsers(usersRes.data?.data || []);
      setPayments(paymentsRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load reports live data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setTab(tabId);
    navigate(`/reports/${tabId}`);
  };

  // 1. Compute Monthly Sales & Realization
  const revenueData = useMemo(() => {
    return DEFAULT_MONTHS.map((month, idx) => {
      const monthBookings = bookings.filter(b => {
        if (!b.createdAt) return false;
        return new Date(b.createdAt).getMonth() === idx;
      });
      const monthPayments = payments.filter(p => {
        if (!p.createdAt) return false;
        return new Date(p.createdAt).getMonth() === idx;
      });

      const bookingVal = monthBookings.reduce((sum, b) => sum + (b.totalAmount || b.tokenAmount || 0), 0);
      const collectedVal = monthPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

      return {
        month,
        bookingValue: bookingVal,
        collected: collectedVal
      };
    });
  }, [bookings, payments]);

  // 2. Compute Lead Sourcing & Funnel ROI
  const sourceRoiData = useMemo(() => {
    return CHANNEL_CONFIG.map(ch => {
      const matchedLeads = leads.filter(l => {
        const src = (l.source || '').toLowerCase();
        if (ch.id === 'meta_ads') return src.includes('meta') || src.includes('facebook') || src.includes('instagram');
        if (ch.id === 'google_ads') return src.includes('google');
        if (ch.id === 'portals') return src.includes('portal') || src.includes('99acres') || src.includes('magicbricks');
        if (ch.id === 'website') return src.includes('website') || src.includes('inbound');
        if (ch.id === 'direct') return src.includes('direct') || src.includes('walk');
        return true;
      });

      const leadIds = matchedLeads.map(l => l._id);
      const matchedVisits = siteVisits.filter(v => v.lead && leadIds.includes(v.lead._id || v.lead));
      const matchedBookings = bookings.filter(b => b.lead && leadIds.includes(b.lead._id || b.lead));
      const grossRevenue = matchedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const spend = ch.defaultSpend;
      const roi = spend > 0 ? `${(grossRevenue / spend).toFixed(1)}x` : '—';

      return {
        source: ch.name,
        spend: spend,
        leads: matchedLeads.length,
        siteVisits: matchedVisits.length,
        bookings: matchedBookings.length,
        revenue: grossRevenue,
        roi: roi
      };
    });
  }, [leads, siteVisits, bookings]);

  // 3. Compute Team Scorecard
  const teamScorecard = useMemo(() => {
    return users
      .filter(u => u.role !== 'super_admin')
      .map(u => {
        const uId = u._id?.toString();
        const uName = (u.name || '').trim().toLowerCase();

        const userLeads = leads.filter(l => {
          const aId = l.assignedTo?._id?.toString() || l.assignedTo?.toString();
          if (aId && aId === uId) return true;
          const lName = (l.assignedTo?.name || '').trim().toLowerCase();
          return lName && uName && (lName === uName || lName.includes(uName) || uName.includes(lName));
        });

        const userVisits = siteVisits.filter(v => {
          const aId = v.assignedTo?._id?.toString() || v.assignedTo?.toString() || v.assignedExecutive?._id?.toString() || v.assignedExecutive?.toString();
          return aId === uId;
        });

        const userBookings = bookings.filter(b => {
          const hId = b.bookedBy?._id?.toString() || b.bookedBy?.toString() || b.handledBy?._id?.toString() || b.handledBy?.toString() || b.assignedAgent?.toString();
          if (hId && hId === uId) return true;
          const bName = (b.handledBy?.name || b.agentName || '').trim().toLowerCase();
          if (bName && uName && (bName === uName || bName.includes(uName) || uName.includes(bName))) return true;
          // Match if customer phone or name matches a lead assigned to this user
          if (b.customerPhone && userLeads.some(ul => ul.phone === b.customerPhone)) return true;
          if (b.customerName && userLeads.some(ul => ul.name?.toLowerCase() === b.customerName?.toLowerCase())) return true;
          return false;
        });

        const totalSalesValue = userBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const conversionPct = userLeads.length > 0
          ? `${((userBookings.length / userLeads.length) * 100).toFixed(0)}%`
          : (userBookings.length > 0 ? '100%' : '0%');

        return {
          user: u,
          name: u.name,
          role: u.role?.replace(/_/g, ' ') || 'Staff',
          assignedLeads: userLeads.length,
          connectedCalls: userLeads.reduce((acc, l) => acc + (l.callLogs?.length || 0), 0),
          siteVisitsDone: userVisits.length,
          bookingsClosed: userBookings.length,
          revenue: totalSalesValue,
          achievement: conversionPct
        };
      });
  }, [users, leads, siteVisits, bookings]);

  // 4. Compute Financial & Collections Aggregations
  const financeStats = useMemo(() => {
    const totalDemanded = payments.reduce((acc, p) => acc + (p.demandAmount || 0), 0);
    const totalCollected = payments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    const totalOutstanding = payments.reduce((acc, p) => acc + (p.balanceAmount || 0), 0);
    const totalGst = payments.reduce((acc, p) => acc + (p.gstAmount || 0), 0);
    const totalTds = payments.reduce((acc, p) => acc + (p.tdsAmount || 0), 0);
    const realizationRate = totalDemanded > 0 ? ((totalCollected / totalDemanded) * 100).toFixed(1) : 0;
    const overdueCount = payments.filter(p => p.status === 'overdue').length;

    // Group collections by payment mode
    const modeMap = {};
    payments.forEach(p => {
      const m = p.paymentMode || 'bank_transfer';
      modeMap[m] = (modeMap[m] || 0) + (p.paidAmount || 0);
    });

    const modeData = Object.entries(modeMap).map(([k, val]) => ({
      name: PAYMENT_MODE_LABELS[k] || k,
      modeKey: k,
      value: val,
      color: PAYMENT_MODE_COLORS[k] || '#94a3b8'
    })).filter(d => d.value > 0);

    // Milestone Stage breakdown
    const milestoneMap = {};
    payments.forEach(p => {
      const name = p.milestoneName || 'Milestone Stage';
      if (!milestoneMap[name]) {
        milestoneMap[name] = { demanded: 0, collected: 0, count: 0 };
      }
      milestoneMap[name].demanded += (p.demandAmount || 0);
      milestoneMap[name].collected += (p.paidAmount || 0);
      milestoneMap[name].count += 1;
    });

    const milestoneData = Object.entries(milestoneMap).map(([name, data]) => ({
      name,
      demanded: data.demanded,
      collected: data.collected,
      outstanding: Math.max(0, data.demanded - data.collected),
      count: data.count
    }));

    return {
      totalDemanded,
      totalCollected,
      totalOutstanding,
      totalGst,
      totalTds,
      realizationRate,
      overdueCount,
      modeData,
      milestoneData
    };
  }, [payments]);

  const { user } = useAuth();
  const { showNotification } = useUI();

  const handleExportCSV = () => {
    const orgName = user?.organization || 'MRP REAL ESTATE';

    if (tab === 'finance') {
      exportFinanceReportCSV(payments, orgName);
      showNotification('Exported Financial Demand & Realization Ledger!');
    } else if (tab === 'sales') {
      exportSalesRealizationCSV(revenueData, orgName);
      showNotification('Exported Sales & Revenue Realization Report!');
    } else if (tab === 'leads') {
      exportLeadFunnelRoiCSV(sourceRoiData, orgName);
      showNotification('Exported Lead Channel Sourcing & ROI Report!');
    } else if (tab === 'team') {
      exportTeamScorecardCSV(teamScorecard, orgName);
      showNotification('Exported Sales Force Productivity Scorecard!');
    } else if (tab === 'inventory') {
      exportInventoryAbsorptionCSV(projects, bookings, orgName);
      showNotification('Exported Inventory Absorption Report!');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Executive BI</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {tab === 'finance' ? 'Finance & Milestone Collections' : tab === 'sales' ? 'Sales Realization' : tab === 'leads' ? 'Lead Attribution ROI' : tab === 'team' ? 'Team Performance' : 'Absorption Velocity'}
            </span>
          </div>
          <h1 className="page-title">Executive Reports & BI Analytics</h1>
          <p className="page-subtitle">Real-time revenue realization, milestone collections, channel attribution, and rep productivity matrix</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={handleExportCSV} title="Export live dataset to CSV">
            <Download size={14} /> Export Excel / CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'finance', label: '💳 Finance & Milestone Collections' },
          { id: 'sales', label: '📊 Sales & Revenue Realization' },
          { id: 'leads', label: '🎯 Lead Sourcing & Funnel ROI' },
          { id: 'team', label: '👥 Team Scorecard & Productivity' },
          { id: 'inventory', label: '🏗️ Inventory Absorption Velocity' },
        ].map(t => (
          <div
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* TAB 0: Finance & Collections */}
      {tab === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Finance KPI Row */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon-wrap" style={{ background: '#eff6ff' }}>
                <CreditCard size={20} color="#2563eb" />
              </div>
              <div className="stat-info">
                <div className="stat-label">Total Demands Raised</div>
                <div className="stat-value">{formatCurrency(financeStats.totalDemanded)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{payments.length} Milestone Notices</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap" style={{ background: '#dcfce7' }}>
                <CheckCircle2 size={20} color="#16a34a" />
              </div>
              <div className="stat-info">
                <div className="stat-label">Realized Collections (Paid)</div>
                <div className="stat-value">{formatCurrency(financeStats.totalCollected)}</div>
                <div className="stat-change up" style={{ fontSize: 11 }}>
                  {financeStats.realizationRate}% Overall Realization
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap" style={{ background: '#fee2e2' }}>
                <AlertCircle size={20} color="#dc2626" />
              </div>
              <div className="stat-info">
                <div className="stat-label">Outstanding Balance</div>
                <div className="stat-value">{formatCurrency(financeStats.totalOutstanding)}</div>
                <div className="stat-change down" style={{ fontSize: 11 }}>
                  {financeStats.overdueCount} Notices Past Due
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap" style={{ background: '#f3e8ff' }}>
                <ShieldCheck size={20} color="#8b5cf6" />
              </div>
              <div className="stat-info">
                <div className="stat-label">GST & Tax Reconciled</div>
                <div className="stat-value">{formatCurrency(financeStats.totalGst)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>TDS: {formatCurrency(financeStats.totalTds)}</div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="dashboard-grid">
            {/* Payment Mode Breakdown */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Collections by Payment Method</div>
                  <div className="card-subtitle">Real-time breakdown of cash, bank transfer, UPI, and cheques</div>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                {financeStats.modeData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>💳</div>
                    <div>No payment receipts recorded yet.</div>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={financeStats.modeData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={42}
                          paddingAngle={3}
                        >
                          {financeStats.modeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                      {financeStats.modeData.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                          <span>{d.name}: <strong>{formatCurrency(d.value)}</strong></span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Milestone Collections Table / Bar */}
            <div className="card span-2">
              <div className="card-header">
                <div>
                  <div className="card-title">Milestone Construction Demand Realization</div>
                  <div className="card-subtitle">Demanded vs. Paid collection comparison across construction phases</div>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                {financeStats.milestoneData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🏗️</div>
                    <div>Demands will show here as milestone notices are issued.</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={financeStats.milestoneData} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip formatter={v => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="demanded" name="Demanded (₹)" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="collected" name="Collected (₹)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Sales & Revenue */}
      {tab === 'sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="card-title">Monthly Revenue Realization & Collections (₹)</div>
                <div className="card-subtitle">Calculated dynamically from approved customer bookings & payment receipts</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={revenueData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickFormatter={v => `₹${(v / 10000000).toFixed(1)}Cr`} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="bookingValue" name="Gross Bookings Value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Realized Cash Collections" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 2: Lead Attribution */}
      {tab === 'leads' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Omnichannel Marketing ROI & Attribution Matrix</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0' }}>Cost per acquisition, site visits generated, and total closed booking revenue by traffic channel</p>
          </div>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Marketing Channel</th>
                  <th>Leads Generated</th>
                  <th>Site Visits Scheduled</th>
                  <th>Bookings Closed</th>
                  <th>Closed Revenue (₹)</th>
                  <th>Calculated ROI</th>
                </tr>
              </thead>
              <tbody>
                {sourceRoiData.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.source}</strong></td>
                    <td>{row.leads}</td>
                    <td>{row.siteVisits}</td>
                    <td><span className="badge badge-success">{row.bookings}</span></td>
                    <td><strong style={{ color: row.revenue > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>{formatCurrency(row.revenue)}</strong></td>
                    <td><span className="badge badge-gray">{row.roi}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Team Scorecard */}
      {tab === 'team' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Sales Force Productivity & Conversion Scorecard</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0' }}>
                Real-time conversion metrics per sales executive · Click any executive to view their live user dashboard
              </p>
            </div>
            <span className="badge badge-info" style={{ fontSize: 11 }}>
              💡 Click any row to open User Dashboard
            </span>
          </div>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Executive Name</th>
                  <th>Assigned Leads</th>
                  <th>Site Visits Conducted</th>
                  <th>Deals Closed</th>
                  <th>Closed Sales Value (₹)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {teamScorecard.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No staff members found.</td></tr>
                ) : (
                  teamScorecard.map((m, i) => (
                    <tr
                      key={i}
                      style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                      className="table-row-hover"
                      onClick={() => setSelectedUserDashboard(m.user)}
                      title={`Click to view ${m.name}'s Dashboard`}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: '#eff6ff',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #dbeafe'
                          }}>
                            {m.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{m.role}</div>
                          </div>
                        </div>
                      </td>
                      <td><strong>{m.assignedLeads}</strong> Leads</td>
                      <td><strong>{m.siteVisitsDone}</strong> Visits</td>
                      <td>
                        <span className={`badge ${m.bookingsClosed > 0 ? 'badge-success' : 'badge-gray'}`} style={{ fontWeight: 700 }}>
                          {m.bookingsClosed} Won
                        </span>
                      </td>
                      <td><strong style={{ color: m.revenue > 0 ? '#15803d' : 'var(--text-muted)' }}>{formatCurrency(m.revenue)}</strong></td>
                      <td>
                        <span className={`badge ${m.bookingsClosed > 0 ? 'badge-success' : 'badge-gray'}`} style={{ fontSize: 12 }}>
                          {m.achievement}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: 11, gap: 4, color: 'var(--primary)', fontWeight: 600, padding: '4px 8px', borderRadius: 6, border: '1px solid #dbeafe', background: '#eff6ff' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserDashboard(m.user);
                          }}
                          title={`Open ${m.name}'s dedicated dashboard`}
                        >
                          <LayoutDashboard size={12} /> View Dashboard
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Inventory Absorption */}
      {tab === 'inventory' && (
        <div>
          {projects.length === 0 ? (
            <div className="card" style={{ padding: '50px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🏗️</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No Active Projects in Portfolio</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 460, margin: '0 auto 16px' }}>
                Add your real estate projects and unit inventory in the Projects & Inventory module to track absorption velocity and sellout timelines in real time.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects/all')}>
                Go to Projects Module →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
              {projects.map((p, i) => {
                const totalUnits = p.totalUnits || 0;
                const bookedUnits = bookings.filter(b => b.project?._id === p._id || b.project === p._id).length;
                const available = Math.max(0, totalUnits - bookedUnits);

                return (
                  <div key={p._id || i} className="card" style={{ padding: 'clamp(16px, 2.5vw, 22px)' }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{p.location || p.city || 'Active Project'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 10, marginBottom: 14 }}>
                      <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>AVAILABLE STOCK</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>{available} / {totalUnits}</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>BOOKED UNITS</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{bookedUnits}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Total Inventory Size: <strong style={{ color: 'var(--primary)' }}>{totalUnits} Units</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* User Dashboard Modal for Admin Inspection */}
      {selectedUserDashboard && (
        <UserDashboardModal
          user={selectedUserDashboard}
          onClose={() => setSelectedUserDashboard(null)}
          allLeads={leads}
          allBookings={bookings}
          allSiteVisits={siteVisits}
        />
      )}
    </div>
  );
}
