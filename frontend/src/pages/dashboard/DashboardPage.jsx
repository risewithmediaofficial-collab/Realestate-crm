import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, MapPin, FileText, CreditCard, ArrowUp, ArrowDown,
  PhoneCall, CheckCircle, AlertCircle, Clock, Download, Plus, MessageSquare,
  Scale, Warehouse, DollarSign, Building, Zap, BarChart3, Shield, Phone,
  Sparkles, CheckSquare, Eye, Award, ExternalLink, Calendar, Handshake,
  Search, X, UserCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { formatCurrency, formatDate, timeAgo } from '../../utils/formatters';
import CustomSelect from '../../components/ui/CustomSelect';
import { exportMasterDashboardSummaryCSV } from '../../utils/exportTemplates';

const FUNNEL_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff', '#f0f9ff', '#10b981'];

const FollowUpStatusBadge = ({ lead }) => {
  if (!lead.nextFollowUp) {
    return <span style={{ fontSize: 11, color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>⚪ No Follow-up Set</span>;
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const fDate = new Date(lead.nextFollowUp);
  fDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((fDate - now) / (1000 * 60 * 60 * 24));
  const timeStr = lead.nextFollowUpTime ? `@ ${lead.nextFollowUpTime}` : '';

  if (diffDays < 0) {
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '3px 8px', borderRadius: 6, border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        🚨 Overdue ({formatDate(lead.nextFollowUp)} {timeStr})
      </span>
    );
  } else if (diffDays === 0) {
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '3px 8px', borderRadius: 6, border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        ⚡ Today {timeStr}
      </span>
    );
  } else if (diffDays === 1) {
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: 6, border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        📅 Tomorrow {timeStr}
      </span>
    );
  } else {
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        🗓️ {formatDate(lead.nextFollowUp)} {timeStr}
      </span>
    );
  }
};

const LeadStageBadge = ({ stage, outcome }) => {
  if (outcome === 'connected_interested' || stage === 'qualified') {
    return <span className="badge badge-success">🟢 Connected (Hot)</span>;
  }
  if (outcome === 'callback_scheduled' || stage === 'follow_up') {
    return <span className="badge badge-warning">🟡 Callback Scheduled</span>;
  }
  if (outcome === 'site_visit_agreed' || stage === 'site_visit_scheduled') {
    return <span className="badge badge-primary">🏠 Site Visit Scheduled</span>;
  }
  if (outcome === 'ringing_no_answer' || stage === 'not_connected') {
    return <span className="badge badge-gray">🔵 Ringing / No Answer</span>;
  }
  if (outcome === 'busy_call_later') {
    return <span className="badge badge-warning">🟠 Busy / Call Later</span>;
  }
  if (stage === 'not_interested' || outcome === 'not_interested') {
    return <span className="badge badge-danger">🔴 Not Interested</span>;
  }
  return <span className="badge badge-info">⚡ New Inbound</span>;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { openCreateLead, showNotification, simulatedRole, setSimulatedRole } = useUI();
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [activities, setActivities] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const activeRoleView = simulatedRole || user?.role || 'admin';
  const setActiveRoleView = (role) => {
    setSimulatedRole(role === user?.role ? null : role);
  };
  
  // Telecaller Follow-Up Command Center State
  const [telecallerTab, setTelecallerTab] = useState('today'); // 'today' | 'overdue' | 'upcoming' | 'hot' | 'all'
  const [telecallerSearch, setTelecallerSearch] = useState('');
  const [selectedFollowUpLead, setSelectedFollowUpLead] = useState(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    outcome: 'callback_scheduled',
    stage: 'follow_up',
    nextFollowUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    nextFollowUpTime: '11:00',
    notes: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const [dashRes, payRes, leadRes, actRes, userRes, remindersRes, invRes] = await Promise.allSettled([
          api.get('/dashboard/stats'),
          api.get('/payments'),
          api.get('/leads?limit=1000'),
          api.get('/activities?limit=10'),
          api.get('/users'),
          api.get('/bookings/upcoming-reminders'),
          api.get('/inventory?limit=1000')
        ]);
        if (dashRes.status === 'fulfilled' && dashRes.value.data) {
          setStats(dashRes.value.data.data);
        }
        if (payRes.status === 'fulfilled' && payRes.value.data?.data) {
          setPayments(payRes.value.data.data);
        }
        if (leadRes.status === 'fulfilled' && leadRes.value.data?.data) {
          setLeadsList(leadRes.value.data.data);
        }
        if (actRes.status === 'fulfilled' && actRes.value.data?.data) {
          setActivities(actRes.value.data.data);
        }
        if (userRes.status === 'fulfilled' && userRes.value.data?.data) {
          setTeamUsers(userRes.value.data.data);
        }
        if (remindersRes.status === 'fulfilled' && remindersRes.value.data?.data) {
          setUpcomingReminders(remindersRes.value.data.data);
        }
        if (invRes.status === 'fulfilled' && invRes.value.data?.data) {
          setInventoryList(invRes.value.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setInventoryList([]);
        setStats({
          kpis: { totalLeads: 0, todayLeads: 0, newLeads: 0, pendingTasks: 0, todaySiteVisits: 0, todayBookings: 0 },
          finance: { totalDemandRaised: 0, totalPaidCollected: 0, totalOutstanding: 0, grossBookingValue: 0, totalBookingsCount: 0, realizationRate: 0 },
          funnel: [
            { stage: 'new', count: 0 }, { stage: 'contacted', count: 0 },
            { stage: 'connected', count: 0 }, { stage: 'qualified', count: 0 },
            { stage: 'site_visit_scheduled', count: 0 }, { stage: 'site_visit_done', count: 0 },
            { stage: 'negotiation', count: 0 }, { stage: 'booking_in_progress', count: 0 },
            { stage: 'booked', count: 0 },
          ],
          sourceStats: [],
          inventoryStats: [],
        });
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  // Open Log Call & Re-Follow Modal
  const openFollowUp = (lead) => {
    setSelectedFollowUpLead(lead);
    const existingDate = lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setFollowUpForm({
      outcome: lead.lastCallOutcome || 'callback_scheduled',
      stage: lead.stage || 'follow_up',
      nextFollowUpDate: existingDate,
      nextFollowUpTime: lead.nextFollowUpTime || '11:00',
      notes: lead.followUpNotes || ''
    });
    setShowFollowUpModal(true);
  };

  // Submit Follow-Up & Call Log
  const handleSaveFollowUp = async (e) => {
    e.preventDefault();
    if (!selectedFollowUpLead) return;

    const outcomeLabels = {
      connected_interested: 'Connected - Interested (Hot Prospect)',
      callback_scheduled: 'Callback Scheduled',
      site_visit_agreed: 'Site Visit Agreed',
      ringing_no_answer: 'Ringing - No Answer',
      busy_call_later: 'Busy / Asked to Call Later',
      budget_mismatch: 'Budget / Location Mismatch',
      not_interested: 'Not Interested / Lost'
    };

    const newActivity = {
      type: 'call',
      title: `Call: ${outcomeLabels[followUpForm.outcome] || followUpForm.outcome}`,
      description: followUpForm.notes ? `Notes: ${followUpForm.notes}` : 'Call logged via Telecaller Command Center',
      outcome: followUpForm.outcome,
      performedAt: new Date()
    };

    const updatePayload = {
      stage: followUpForm.stage,
      lastCallOutcome: followUpForm.outcome,
      nextFollowUp: followUpForm.nextFollowUpDate ? new Date(followUpForm.nextFollowUpDate) : null,
      nextFollowUpTime: followUpForm.nextFollowUpTime,
      followUpNotes: followUpForm.notes,
      leadType: followUpForm.outcome === 'connected_interested' ? 'hot' : selectedFollowUpLead.leadType
    };

    // Optimistic Update
    setLeadsList(prev => prev.map(l => l._id === selectedFollowUpLead._id ? {
      ...l,
      ...updatePayload,
      activities: [...(l.activities || []), newActivity]
    } : l));

    try {
      await api.put(`/leads/${selectedFollowUpLead._id}`, updatePayload);
      await api.post(`/leads/${selectedFollowUpLead._id}/activity`, newActivity);
    } catch (err) {
      console.error('Failed to sync follow-up to backend:', err);
    }

    showNotification(`Re-follow up logged for ${selectedFollowUpLead.name}! Next follow-up: ${followUpForm.nextFollowUpDate} at ${followUpForm.nextFollowUpTime}`);
    setShowFollowUpModal(false);
    setSelectedFollowUpLead(null);
  };

  // Date helpers for telecaller follow-up queues
  const now = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dueTodayLeads = useMemo(() => {
    return leadsList.filter(l => {
      if (!l.nextFollowUp) return l.stage === 'new' || l.stage === 'contacted';
      const d = new Date(l.nextFollowUp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === now.getTime();
    });
  }, [leadsList, now]);

  const overdueLeads = useMemo(() => {
    return leadsList.filter(l => {
      if (!l.nextFollowUp) return false;
      const d = new Date(l.nextFollowUp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < now.getTime();
    });
  }, [leadsList, now]);

  const upcomingLeads = useMemo(() => {
    return leadsList.filter(l => {
      if (!l.nextFollowUp) return false;
      const d = new Date(l.nextFollowUp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() > now.getTime();
    });
  }, [leadsList, now]);

  const hotLeads = useMemo(() => {
    return leadsList.filter(l => l.leadType === 'hot' || l.stage === 'qualified');
  }, [leadsList]);

  const filteredTelecallerLeads = useMemo(() => {
    let list = dueTodayLeads;
    if (telecallerTab === 'overdue') list = overdueLeads;
    else if (telecallerTab === 'upcoming') list = upcomingLeads;
    else if (telecallerTab === 'hot') list = hotLeads;
    else if (telecallerTab === 'all') list = leadsList;

    if (!telecallerSearch.trim()) return list;
    const q = telecallerSearch.toLowerCase();
    return list.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.phone?.includes(q) ||
      l.interestedProject?.name?.toLowerCase().includes(q) ||
      l.followUpNotes?.toLowerCase().includes(q)
    );
  }, [telecallerTab, dueTodayLeads, overdueLeads, upcomingLeads, hotLeads, leadsList, telecallerSearch]);

  const funnelLabels = {
    new: 'New', contacted: 'Contacted', connected: 'Connected',
    qualified: 'Qualified', site_visit_scheduled: 'SV Sched.', site_visit_done: 'SV Done',
    negotiation: 'Negotiation', booking_in_progress: 'Booking', booked: 'Booked',
  };

  const pieColors = { available: '#10b981', on_hold: '#f59e0b', blocked: '#ef4444', booked: '#3b82f6', sold: '#8b5cf6' };

  const monthlyData = [
    { month: 'Apr', leads: 0, conversions: 0 },
    { month: 'May', leads: 0, conversions: 0 },
    { month: 'Jun', leads: 0, conversions: 0 },
    { month: 'Jul', leads: 0, conversions: 0 },
    { month: 'Aug', leads: stats?.kpis?.totalLeads ?? 0, conversions: stats?.kpis?.todayBookings ?? 0 },
  ];

  const teamData = useMemo(() => {
    if (!teamUsers || teamUsers.length === 0) return [];
    return teamUsers.filter(u => ['sales_executive', 'sales_manager', 'sales_head', 'telecaller', 'admin'].includes(u.role)).map(member => {
      const memberLeads = leadsList.filter(l => l.assignedTo?._id === member._id || l.assignedTo === member._id || l.assignedTo?.name === member.name);
      const bookingsWon = memberLeads.filter(l => l.stage === 'booked').length;
      const rev = payments.filter(p => p.booking?.handledBy === member._id || p.booking?.handledBy?._id === member._id).reduce((acc, p) => acc + (p.paidAmount || 0), 0);
      const target = member.role === 'sales_head' ? 10 : member.role === 'sales_manager' ? 8 : 5;
      return {
        id: member._id,
        name: member.name || 'Sales Officer',
        role: member.role ? member.role.replace(/_/g, ' ').toUpperCase() : 'SALES EXEC',
        leads: memberLeads.length,
        visits: memberLeads.filter(l => l.stage === 'site_visit_done' || l.stage === 'site_visit_scheduled').length,
        bookings: bookingsWon,
        revenue: rev,
        target: target
      };
    });
  }, [teamUsers, leadsList, payments]);

  // Live finance metrics synchronized with Payments Ledger and backend stats
  const financeMetrics = useMemo(() => {
    if (payments && payments.length > 0) {
      const totalDemandRaised = payments.reduce((acc, p) => acc + (p.demandAmount || 0), 0);
      const totalPaidCollected = payments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
      const totalOutstanding = payments.reduce((acc, p) => acc + (p.balanceAmount || 0), 0);
      const overdueDemandsCount = payments.filter(p => p.status === 'overdue').length;
      const realizationRate = totalDemandRaised > 0
        ? Number(((totalPaidCollected / totalDemandRaised) * 100).toFixed(1))
        : 0;
      return {
        grossBookingValue: stats?.finance?.grossBookingValue || totalDemandRaised,
        totalBookingsCount: stats?.finance?.totalBookingsCount || payments.length,
        totalDemandRaised,
        totalPaidCollected,
        totalOutstanding,
        overdueDemandsCount,
        realizationRate
      };
    }
    return {
      grossBookingValue: stats?.finance?.grossBookingValue || 0,
      totalBookingsCount: stats?.finance?.totalBookingsCount || 0,
      totalDemandRaised: stats?.finance?.totalDemandRaised || 0,
      totalPaidCollected: stats?.finance?.totalPaidCollected || 0,
      totalOutstanding: stats?.finance?.totalOutstanding || 0,
      overdueDemandsCount: stats?.finance?.overdueDemandsCount || 0,
      realizationRate: stats?.finance?.realizationRate || 0
    };
  }, [payments, stats?.finance]);

  const unitsOnHold = useMemo(() => {
    if (inventoryList && inventoryList.length > 0) {
      return inventoryList.filter(u => u.status === 'on_hold').length;
    }
    return (stats?.inventoryStats || []).find(i => i._id === 'on_hold')?.count || 0;
  }, [inventoryList, stats?.inventoryStats]);

  const totalInventoryCount = useMemo(() => {
    if (inventoryList && inventoryList.length > 0) {
      return inventoryList.length;
    }
    return (stats?.inventoryStats || []).reduce((acc, i) => acc + (i.count || 0), 0) || (stats?.kpis?.availableUnits || 0);
  }, [inventoryList, stats]);

  const handleExportDashboard = () => {
    const totalRev = stats?.kpis?.totalRevenue || (stats?.kpis?.revenue ? Number(stats.kpis.revenue) : 0);
    const totalTok = stats?.kpis?.totalTokens || (stats?.kpis?.tokenAdvances ? Number(stats.kpis.tokenAdvances) : 0);
    const totalPipe = stats?.kpis?.pipelineValue || leadsList.reduce((acc, l) => acc + (Number(l.budget?.max || l.budget?.min || l.budget || 0)), 0);

    const summaryPayload = {
      teamStats: {
        totalRevenue: totalRev,
        totalTokens: totalTok,
        totalPipeline: totalPipe,
      },
      leadsCount: leadsList.length,
      bookingsCount: stats?.kpis?.totalBookings || stats?.kpis?.bookingsCount || 0,
      inventoryCount: totalInventoryCount,
      visitsCount: stats?.kpis?.siteVisits || stats?.kpis?.completedVisits || 0,
      topAgents: teamData.map(t => ({
        name: t.name,
        role: t.role,
        leads: t.leads,
        deals: t.bookings,
        revenue: t.revenue,
        conversion: t.leads > 0 ? Math.round((t.bookings / t.leads) * 100) : 0
      })),
      leadStages: [
        { label: 'New Inbound Leads', count: leadsList.filter(l => l.stage === 'new').length, value: leadsList.filter(l => l.stage === 'new').reduce((a, l) => a + (Number(l.budget?.max || l.budget || 0)), 0) },
        { label: 'Follow-up Active', count: leadsList.filter(l => l.stage === 'follow_up' || l.stage === 'contacted').length, value: leadsList.filter(l => l.stage === 'follow_up' || l.stage === 'contacted').reduce((a, l) => a + (Number(l.budget?.max || l.budget || 0)), 0) },
        { label: 'Site Visits Scheduled / Done', count: leadsList.filter(l => l.stage === 'site_visit_scheduled' || l.stage === 'site_visit_done').length, value: leadsList.filter(l => l.stage === 'site_visit_scheduled' || l.stage === 'site_visit_done').reduce((a, l) => a + (Number(l.budget?.max || l.budget || 0)), 0) },
        { label: 'Negotiation & Booking Pending', count: leadsList.filter(l => l.stage === 'negotiation' || l.stage === 'booking_in_progress').length, value: leadsList.filter(l => l.stage === 'negotiation' || l.stage === 'booking_in_progress').reduce((a, l) => a + (Number(l.budget?.max || l.budget || 0)), 0) },
        { label: 'Booked & Closed Won', count: leadsList.filter(l => l.stage === 'booked').length, value: leadsList.filter(l => l.stage === 'booked').reduce((a, l) => a + (Number(l.budget?.max || l.budget || 0)), 0) },
      ]
    };

    exportMasterDashboardSummaryCSV(summaryPayload, user?.organization || 'MRP REAL ESTATE');
    showNotification('Exported Executive 360° Dashboard Summary CSV!');
  };

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  // Determine current effective role for dashboard view
  const currentRole = activeRoleView || user?.role || 'admin';
  const isTelecallerRole = ['telecaller', 'presales', 'pre_sales_manager'].includes(currentRole);
  const isSalesManagerRole = ['sales_manager', 'sales_head'].includes(currentRole);
  const isSalesExecRole = ['sales_executive', 'sales_rep'].includes(currentRole);
  const isMarketingRole = ['marketing', 'marketing_head'].includes(currentRole);
  const isFinanceRole = ['finance', 'finance_manager'].includes(currentRole);
  const isCPRole = ['channel_partner', 'cp_manager'].includes(currentRole);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              {isTelecallerRole && 'Telecaller Dashboard'}
              {isSalesManagerRole && 'Sales Leadership Dashboard'}
              {isSalesExecRole && 'Sales Closer Dashboard'}
              {isMarketingRole && 'Marketing Dashboard'}
              {isFinanceRole && 'Finance Dashboard'}
              {isCPRole && 'Channel Partner Hub'}
              {(!isTelecallerRole && !isSalesManagerRole && !isSalesExecRole && !isMarketingRole && !isFinanceRole && !isCPRole) && 'Executive Dashboard'}
            </h1>
            <span className="badge badge-primary" style={{ textTransform: 'capitalize', fontSize: 11 }}>
              {currentRole.replace(/_/g, ' ')}
            </span>
            {user?.organization && (
              <span style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: 20,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                🏢 {user.organization}
              </span>
            )}
          </div>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            Real-time overview of sales pipeline, revenue realization, and operations.
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <div className="dashboard-view-as-box" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>View as:</span>
              <div style={{ minWidth: 150 }}>
                <CustomSelect
                  value={activeRoleView}
                  onChange={val => setActiveRoleView(typeof val === 'object' && val.target ? val.target.value : val)}
                  size="sm"
                  options={[
                    { value: 'admin', label: 'Admin / Executive' },
                    { value: 'sales_head', label: 'Sales Head' },
                    { value: 'sales_manager', label: 'Sales Manager' },
                    { value: 'sales_executive', label: 'Sales Closer' },
                    { value: 'telecaller', label: 'Telecaller' },
                    { value: 'marketing_head', label: 'Marketing Head' },
                    { value: 'finance_manager', label: 'Finance Manager' }
                  ]}
                />
              </div>
            </div>
          )}

          <button className="btn btn-secondary btn-sm" onClick={handleExportDashboard}>
            <Download size={14} /> Export Summary
          </button>
        </div>
      </div>

      {/* Fresh Workspace Banner */}
      {(!stats?.kpis?.totalLeads && !stats?.kpis?.totalBookings && leadsList.length === 0 && user?.role !== 'super_admin') && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Welcome to {user?.organization || 'your organization'}!
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Your workspace is active and ready. Start by adding your first lead or setting up property inventory.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={openCreateLead}>
              <Plus size={14} /> Add Lead
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/inventory')}>
              Setup Inventory
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Registrations Alert Banner */}
      {upcomingReminders.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: 10,
          padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#9a3412', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🏛️</span>
            <span>
              <strong>{upcomingReminders.length} Registration{upcomingReminders.length > 1 ? 's' : ''} Due in 4 Days:</strong>{' '}
              {upcomingReminders[0]?.customerName || 'Customer'} ({upcomingReminders[0]?.unitNumber || 'Unit'})
            </span>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => navigate('/booking')}
            style={{ background: '#ea580c', color: 'white', fontWeight: 600, fontSize: 11.5, padding: '4px 12px', borderRadius: 6 }}
          >
            View Bookings →
          </button>
        </div>
      )}

      {/* ─── ROLE-SPECIFIC KPI METRICS ─── */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        {isTelecallerRole ? (
          <>
            <div className="stat-card" onClick={() => navigate('/booking')} style={{ cursor: 'pointer' }} title="Deals won and converted to formal bookings">
              <div className="stat-icon-wrap" style={{ background: '#ecfdf5' }}><CheckCircle size={20} color="#16a34a" /></div>
              <div className="stat-info">
                <div className="stat-label">Deals Won & Closed</div>
                <div className="stat-value">{financeMetrics.totalBookingsCount ?? (stats?.funnel?.find(f => f.stage === 'booked')?.count || 0)} Deals</div>
                <div className="stat-change up"><ArrowUp size={11} /> Converted</div>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/booking')} style={{ cursor: 'pointer' }} title="Gross revenue realized from won deals">
              <div className="stat-icon-wrap" style={{ background: '#eff6ff' }}><DollarSign size={20} color="#2563eb" /></div>
              <div className="stat-info">
                <div className="stat-label">Closed Revenue</div>
                <div className="stat-value">{formatCurrency(financeMetrics.grossBookingValue || 0)}</div>
                <div className="stat-change up"><ArrowUp size={11} /> Realized</div>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/leads')} style={{ cursor: 'pointer' }} title="Total leads ready to be contacted">
              <div className="stat-icon-wrap" style={{ background: '#f8fafc' }}><Users size={20} color="#475569" /></div>
              <div className="stat-info">
                <div className="stat-label">Calling Queue</div>
                <div className="stat-value">{stats?.kpis?.totalLeads ?? 0} Leads</div>
                <div className="stat-change up"><ArrowUp size={11} /> {stats?.kpis?.todayLeads ?? 0} today</div>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/leads')} style={{ cursor: 'pointer' }} title="Leads qualified for sales">
              <div className="stat-icon-wrap" style={{ background: '#fffbeb' }}><Sparkles size={20} color="#d97706" /></div>
              <div className="stat-info">
                <div className="stat-label">Qualified Leads</div>
                <div className="stat-value">{stats?.funnel?.find(f => f.stage === 'qualified')?.count ?? 0}</div>
                <div className="stat-change up"><ArrowUp size={11} /> Pipeline</div>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/activities')} style={{ cursor: 'pointer' }} title="Pending tasks requiring immediate follow-up">
              <div className="stat-icon-wrap" style={{ background: '#fef2f2' }}><Clock size={20} color="#dc2626" /></div>
              <div className="stat-info">
                <div className="stat-label">Pending Follow-ups</div>
                <div className="stat-value">{dueTodayLeads.length + overdueLeads.length || stats?.kpis?.pendingTasks || 0}</div>
                <div className="stat-change down"><AlertCircle size={11} /> Due / Overdue</div>
              </div>
            </div>
          </>
        ) : isSalesManagerRole ? (
          <>
            <div className="stat-card" onClick={() => navigate('/pipeline')} style={{ cursor: 'pointer' }} title="Active pipeline deals">
              <div className="stat-icon-wrap" style={{ background: '#eff6ff' }}><TrendingUp size={20} color="#2563eb" /></div>
              <div className="stat-info">
                <div className="stat-label">Active Pipeline Deals</div>
                <div className="stat-value">{stats?.kpis?.totalLeads ?? 0} Leads</div>
                <div className="stat-change up"><ArrowUp size={11} /> Live Pipeline</div>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/booking')} style={{ cursor: 'pointer' }} title="Total verified units booked">
              <div className="stat-icon-wrap" style={{ background: '#ecfdf5' }}><CheckCircle size={20} color="#16a34a" /></div>
              <div className="stat-info">
                <div className="stat-label">Bookings Closed</div>
                <div className="stat-value">{stats?.kpis?.totalBookings ?? 0} Deals</div>
                <div className="stat-change up"><ArrowUp size={11} /> Confirmed</div>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/site-visits')} style={{ cursor: 'pointer' }} title="Property site visits scheduled">
              <div className="stat-icon-wrap" style={{ background: '#fffbeb' }}><MapPin size={20} color="#d97706" /></div>
              <div className="stat-info">
                <div className="stat-label">Site Visits Today</div>
                <div className="stat-value">{stats?.kpis?.todaySiteVisits ?? 0} Tours</div>
                <div className="stat-change up"><ArrowUp size={11} /> Scheduled</div>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }} title="Inventory units on hold">
              <div className="stat-icon-wrap" style={{ background: '#f8fafc' }}><Warehouse size={20} color="#475569" /></div>
              <div className="stat-info">
                <div className="stat-label">Units on Hold</div>
                <div className="stat-value">{unitsOnHold} Units</div>
                <div className="stat-change down"><Clock size={11} /> 48h Holds</div>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/activities')} style={{ cursor: 'pointer' }} title="Tasks pending across sales team">
              <div className="stat-icon-wrap" style={{ background: '#fef2f2' }}><Clock size={20} color="#dc2626" /></div>
              <div className="stat-info">
                <div className="stat-label">Pending Team Tasks</div>
                <div className="stat-value">{stats?.kpis?.pendingTasks ?? 0} Tasks</div>
                <div className="stat-change down"><AlertCircle size={11} /> Action items</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card" onClick={() => navigate('/booking')} style={{ cursor: 'pointer' }} title="Gross value of all customer bookings">
              <div className="stat-icon-wrap" style={{ background: '#ecfdf5' }}><DollarSign size={20} color="#16a34a" /></div>
              <div className="stat-info">
                <div className="stat-label">Gross Revenue</div>
                <div className="stat-value">{formatCurrency(financeMetrics.grossBookingValue || 0)}</div>
                <div className="stat-change up"><ArrowUp size={11} /> {financeMetrics.totalBookingsCount || 0} Bookings</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/payments')} style={{ cursor: 'pointer' }} title="Milestone collections paid and cleared">
              <div className="stat-icon-wrap" style={{ background: '#eff6ff' }}><CreditCard size={20} color="#2563eb" /></div>
              <div className="stat-info">
                <div className="stat-label">Collections Paid</div>
                <div className="stat-value">{formatCurrency(financeMetrics.totalPaidCollected || 0)}</div>
                <div className="stat-change up"><ArrowUp size={11} /> {financeMetrics.realizationRate || 0}% Realization</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/leads')} style={{ cursor: 'pointer' }} title="Total CRM leads in pipeline">
              <div className="stat-icon-wrap" style={{ background: '#f8fafc' }}><Users size={20} color="#475569" /></div>
              <div className="stat-info">
                <div className="stat-label">Total Leads</div>
                <div className="stat-value">{stats?.kpis?.totalLeads ?? 0}</div>
                <div className="stat-change up"><ArrowUp size={11} /> {stats?.kpis?.todayLeads ?? 0} today</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/site-visits')} style={{ cursor: 'pointer' }} title="Site visits scheduled today">
              <div className="stat-icon-wrap" style={{ background: '#fffbeb' }}><MapPin size={20} color="#d97706" /></div>
              <div className="stat-info">
                <div className="stat-label">Site Visits Today</div>
                <div className="stat-value">{stats?.kpis?.todaySiteVisits ?? 0}</div>
                <div className="stat-change up"><ArrowUp size={11} /> Scheduled visits</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/activities')} style={{ cursor: 'pointer' }} title="Follow-up tasks due or pending">
              <div className="stat-icon-wrap" style={{ background: '#fef2f2' }}><Clock size={20} color="#dc2626" /></div>
              <div className="stat-info">
                <div className="stat-label">Pending Tasks</div>
                <div className="stat-value">{stats?.kpis?.pendingTasks ?? 0}</div>
                <div className="stat-change down"><AlertCircle size={11} /> Action items</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── ROLE CUSTOMIZED MAIN SECTION ─── */}
      {isTelecallerRole ? (
        /* TELECALLER COMMAND SECTION */
        <div style={{ marginBottom: 20 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header & Sub-Tabs */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📞 Telecaller Re-Follow & Prospect Call Center</span>
                  <span className="badge badge-primary">{leadsList.length} Active Leads</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Log customer conversation outcomes, track next re-follow dates, and trigger 1-click WhatsApp or Site Visits
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="search-box" style={{ maxWidth: 240 }}>
                  <Search size={13} className="search-icon" />
                  <input
                    type="text"
                    className="form-input search-input"
                    placeholder="Search name, phone, project..."
                    value={telecallerSearch}
                    onChange={e => setTelecallerSearch(e.target.value)}
                    style={{ fontSize: 12, height: 34 }}
                  />
                  {telecallerSearch && (
                    <button className="search-clear" onClick={() => setTelecallerSearch('')}><X size={12} /></button>
                  )}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => openCreateLead()}>
                  <Plus size={13} /> Add Inbound Lead
                </button>
              </div>
            </div>

            {/* Sub-Tabs: Due Today, Overdue, Upcoming, Hot, All */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 20px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', overflowX: 'auto' }}>
              {[
                { id: 'today', label: '⚡ Due Today', count: dueTodayLeads.length, color: '#f59e0b' },
                { id: 'overdue', label: '🚨 Overdue Re-Follows', count: overdueLeads.length, color: '#ef4444' },
                { id: 'upcoming', label: '📅 Upcoming Follow-ups', count: upcomingLeads.length, color: '#2563eb' },
                { id: 'hot', label: '🔥 Hot Priority Leads', count: hotLeads.length, color: '#dc2626' },
                { id: 'all', label: 'All Inbound Prospects', count: leadsList.length, color: '#64748b' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTelecallerTab(t.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: telecallerTab === t.id ? `1.5px solid ${t.color}` : '1px solid #e2e8f0',
                    background: telecallerTab === t.id ? `${t.color}15` : '#ffffff',
                    color: telecallerTab === t.id ? t.color : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{t.label}</span>
                  <span style={{
                    background: telecallerTab === t.id ? t.color : '#f1f5f9',
                    color: telecallerTab === t.id ? '#ffffff' : '#64748b',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 800
                  }}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Queue Table */}
            <div className="table-wrapper" style={{ border: 'none' }}>
              {filteredTelecallerLeads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>No follow-up calls pending in this queue</div>
                  <div style={{ fontSize: 12, marginTop: 4, maxWidth: 360, margin: '4px auto 14px' }}>
                    Great job! All scheduled customer follow-up calls for this view have been addressed.
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setTelecallerTab('all')}>
                    View All Active Prospects
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Customer / Buyer</th>
                      <th>Project & Typology</th>
                      <th>Disposition Status</th>
                      <th>Next Re-Follow Date & Time</th>
                      <th>Last Note / Conversation</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTelecallerLeads.map(lead => {
                      return (
                        <tr key={lead._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: '#eff6ff', color: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 12
                              }}>
                                {lead.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lead.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {lead.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{lead.interestedProject?.name || 'General Inbound'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.interestedUnitType || 'Any Typology'}</div>
                          </td>
                          <td>
                            <LeadStageBadge stage={lead.stage} outcome={lead.lastCallOutcome} />
                          </td>
                          <td>
                            <FollowUpStatusBadge lead={lead} />
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.followUpNotes || lead.notes || 'No notes logged yet'}>
                              {lead.followUpNotes || lead.notes || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes yet</span>}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                className="btn btn-sm btn-primary"
                                style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
                                title="Log Call Outcome & Schedule Next Re-Follow"
                                onClick={() => openFollowUp(lead)}
                              >
                                <PhoneCall size={12} /> Call & Re-Follow
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '4px 8px', fontSize: 11, gap: 4, color: '#16a34a', borderColor: '#bbf7d0' }}
                                title="Open WhatsApp Chat"
                                onClick={() => {
                                  showNotification(`Opening WhatsApp thread with ${lead.name}`);
                                  navigate('/communication/whatsapp');
                                }}
                              >
                                <MessageSquare size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : isFinanceRole ? (
        /* FINANCE BILLING & ESCROW SECTION */
        <div className="dashboard-grid" style={{ marginBottom: 20 }}>
          <div className="card span-2">
            <div className="card-header">
              <div>
                <div className="card-title">💳 Recent Construction Demand Notices & Milestones</div>
                <div className="card-subtitle">Automated CLP demand notices and ledger reconciliation</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/payments')}>Generate Demand →</button>
            </div>
            <div className="table-wrapper" style={{ border: 'none' }}>
              {payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>💳</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>No payment demand notices raised yet</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>Construction milestone demands and token advance receipts will show here.</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Demand No.</th>
                      <th>Customer & Unit</th>
                      <th>Milestone Name</th>
                      <th>Demanded</th>
                      <th>Collected</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 5).map(dem => (
                      <tr key={dem._id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{dem.demandNumber || `DEM-${dem._id.slice(-4)}`}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{dem.customerName || dem.booking?.customerName || 'Customer'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dem.unitNumber || dem.unit?.unitNumber || 'Unit'} • {dem.projectName || dem.project?.name || ''}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{dem.milestoneName || 'Milestone Demand'}</td>
                        <td><strong style={{ color: 'var(--primary)' }}>{formatCurrency(dem.demandAmount)}</strong></td>
                        <td><span style={{ color: '#16a34a', fontWeight: 700 }}>{formatCurrency(dem.paidAmount || 0)}</span></td>
                        <td>
                          <span className={`badge ${dem.status === 'paid' ? 'badge-success' : dem.status === 'overdue' ? 'badge-danger' : dem.status === 'partial' ? 'badge-warning' : 'badge-info'}`}>
                            {dem.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/payments')}>View Demand</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Collection Milestone Trend</div>
            </div>
            <div className="card-body" style={{ paddingTop: 8 }}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Collections" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── MASTER ANALYTICS & VISUALS (For Leadership, Execs & Admins) ─── */}
      <div className="dashboard-grid" style={{ marginBottom: 16 }}>
        {/* Lead Funnel */}
        <div className="card span-2">
          <div className="card-header">
            <div>
              <div className="card-title">Lead Conversion Funnel</div>
              <div className="card-subtitle">All-time pipeline progression from Inquiry to Booked</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/pipeline')}>View Kanban Pipeline →</button>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(stats?.funnel || []).map(f => ({ name: funnelLabels[f.stage] || f.stage, count: f.count }))} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(stats?.funnel || []).map((_, idx) => (
                    <Cell key={idx} fill={FUNNEL_COLORS[idx % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Donut */}
        <div className="card" onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Inventory Stacking Status</div>
              <div className="card-subtitle">All active property categories</div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Explore Matrix →</span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={(stats?.inventoryStats || []).map(i => ({ name: i._id, value: i.count }))}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70}
                  paddingAngle={3} dataKey="value"
                >
                  {(stats?.inventoryStats || []).map((entry, idx) => (
                    <Cell key={idx} fill={pieColors[entry._id] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 4 }}>
              {(stats?.inventoryStats || []).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: pieColors[s._id] || '#94a3b8', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{s._id.replace('_', ' ')}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="dashboard-grid" style={{ marginBottom: 16 }}>
        {/* Lead Sources */}
        <div className="card" onClick={() => navigate('/marketing')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <div className="card-title">Lead Acquisition Channels</div>
            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Campaigns →</span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {(stats?.sourceStats || []).slice(0, 5).map((s, i) => {
              const total = (stats?.sourceStats || []).reduce((acc, x) => acc + x.count, 0);
              const pct = total ? Math.round((s.count / total) * 100) : 0;
              const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{s._id?.replace(/_/g, ' ')}</span>
                    <span style={{ fontWeight: 700 }}>{s.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 3, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Monthly Conversion Velocity</div>
            <div className="card-subtitle">Inquiries vs Token Bookings</div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Inbound Leads" />
                <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Token Bookings" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Omnichannel Activity Stream</div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => navigate('/activities')}>View All</button>
          </div>
          <div className="card-body" style={{ padding: '12px 20px' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>📋</div>
                <div style={{ fontSize: 12 }}>No activity logged yet across calls, visits or bookings.</div>
              </div>
            ) : (
              activities.slice(0, 5).map((item, idx) => {
                const isCall = item.type === 'call';
                const isVisit = item.type === 'site_visit';
                const isBooking = item.type === 'booking';
                const iconBg = isCall ? '#eff6ff' : isVisit ? '#fef3c7' : isBooking ? '#dcfce7' : '#f3e8ff';
                const iconColor = isCall ? '#2563eb' : isVisit ? '#d97706' : isBooking ? '#16a34a' : '#8b5cf6';
                const IconComponent = isCall ? Phone : isVisit ? MapPin : isBooking ? CheckCircle : Clock;

                return (
                  <div key={item._id || item.id || idx} style={{ display: 'flex', gap: 12, paddingBottom: 14, borderBottom: idx < Math.min(activities.length, 5) - 1 ? '1px solid #f1f5f9' : 'none', marginBottom: idx < Math.min(activities.length, 5) - 1 ? 14 : 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconComponent size={15} color={iconColor} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {item.title || item.text || item.description || 'Activity logged in CRM'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.lead?.name ? `Lead: ${item.lead.name} · ` : ''}{item.createdAt ? timeAgo(item.createdAt) : 'Recently'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Sales Team Leaderboard & Quota Performance</div>
            <div className="card-subtitle">Current monthly closing targets and revenue contribution</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>View All Details</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reports')}>View Executive BI Report</button>
          </div>
        </div>

        {teamData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>No sales team quota records yet</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>Closers and assigned revenue targets will be tracked here once team members are added.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16, padding: '16px 20px' }}>
            {teamData.map((member, i) => {
              const pct = Math.max(0, Math.min(100, Math.round((member.bookings / Math.max(member.target || 1, 1)) * 100)));
              return (
                <div key={i} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                  padding: 18,
                  boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
                  minWidth: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                    <div className="table-avatar" style={{ minWidth: 0 }}>
                      <div className="avatar avatar-sm" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>{member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                      <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</span>
                    </div>
                    <span className="badge badge-gray" style={{ fontSize: 11, flexShrink: 0 }}>{member.role}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 10, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Assigned Leads</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{member.leads}</div>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 10, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Site Visits</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{member.visits}</div>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 10, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Bookings</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{member.bookings}</div>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 10, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Revenue</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(member.revenue)}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Target: <strong style={{ color: 'var(--text-primary)' }}>{member.target}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(pct, 100)}%`,
                        background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444',
                        borderRadius: 999
                      }} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 12, minWidth: 36, textAlign: 'right', color: pct >= 80 ? '#16a34a' : '#334155' }}>{pct}%</span>
                  </div>

                  <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => navigate('/reports')}>
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── TELECALLER LOG CALL & RE-FOLLOW MODAL ─── */}
      {showFollowUpModal && selectedFollowUpLead && (
        <div className="modal-overlay" onClick={() => setShowFollowUpModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 580, width: '100%', borderRadius: 16, overflow: 'hidden', padding: 0 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#ffffff',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 16, color: '#ffffff'
                  }}>
                    {selectedFollowUpLead.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{selectedFollowUpLead.name}</h3>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>📞 {selectedFollowUpLead.phone}</span>
                      {selectedFollowUpLead.city && <span>📍 {selectedFollowUpLead.city}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <span style={{ background: 'rgba(255,255,255,0.12)', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    🏢 {selectedFollowUpLead.interestedProject?.name || 'General Project Inbound'}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.12)', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    📐 {selectedFollowUpLead.interestedUnitType || 'Any Typology'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowFollowUpModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveFollowUp} style={{ padding: 24 }}>
              {/* 1. Call Outcome / Disposition */}
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                  🎯 Call Disposition / Conversation Outcome *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                  {[
                    { id: 'connected_interested', label: '🟢 Connected - Hot', stage: 'qualified' },
                    { id: 'callback_scheduled', label: '🟡 Callback Scheduled', stage: 'follow_up' },
                    { id: 'site_visit_agreed', label: '🏠 Site Visit Agreed', stage: 'site_visit_scheduled' },
                    { id: 'ringing_no_answer', label: '🔵 Ringing - No Answer', stage: 'not_connected' },
                    { id: 'busy_call_later', label: '🟠 Busy / Call Later', stage: 'follow_up' },
                    { id: 'budget_mismatch', label: '🟣 Budget Mismatch', stage: 'nurturing' },
                    { id: 'not_interested', label: '🔴 Not Interested / Lost', stage: 'not_interested' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFollowUpForm(prev => ({ ...prev, outcome: opt.id, stage: opt.stage }))}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: followUpForm.outcome === opt.id ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                        background: followUpForm.outcome === opt.id ? '#eff6ff' : '#ffffff',
                        color: followUpForm.outcome === opt.id ? 'var(--primary)' : 'var(--text-primary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Next Re-Follow-up Date & Time Picker */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 18 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="var(--primary)" />
                  <span>Next Re-Follow-up Schedule *</span>
                </label>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {[
                    { label: '⚡ Today 5:00 PM', getDate: () => new Date().toISOString().split('T')[0], time: '17:00' },
                    { label: '🌅 Tomorrow 10:30 AM', getDate: () => new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '10:30' },
                    { label: '📅 In 2 Days', getDate: () => new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], time: '11:00' },
                    { label: '🗓️ Next Week', getDate: () => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], time: '11:00' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFollowUpForm(prev => ({ ...prev, nextFollowUpDate: preset.getDate(), nextFollowUpTime: preset.time }))}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        cursor: 'pointer',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Re-Follow Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={followUpForm.nextFollowUpDate}
                      onChange={e => setFollowUpForm(prev => ({ ...prev, nextFollowUpDate: e.target.value }))}
                      style={{ height: 38, fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Re-Follow Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={followUpForm.nextFollowUpTime}
                      onChange={e => setFollowUpForm(prev => ({ ...prev, nextFollowUpTime: e.target.value }))}
                      style={{ height: 38, fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Follow-up Notes & Conversation Summary */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>
                  📝 Conversation Notes & Client Requirements
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Discussed 3BHK unit pricing and payment milestone plan, sent brochure on WhatsApp, callback scheduled for tomorrow 11 AM"
                  value={followUpForm.notes}
                  onChange={e => setFollowUpForm(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ resize: 'vertical', fontSize: 13 }}
                />

                {/* Quick Note Snippets */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {[
                    '+ Sent Brochure on WhatsApp',
                    '+ Interested in 3BHK East Unit',
                    '+ Wants Weekend Site Visit',
                    '+ Needs Home Loan Sanction Help',
                    '+ Ringing, Sent WhatsApp Intro'
                  ].map((snip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFollowUpForm(prev => ({ ...prev, notes: prev.notes ? `${prev.notes}. ${snip.replace('+ ', '')}` : snip.replace('+ ', '') }))}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 600,
                        background: '#f1f5f9',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {snip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    showNotification(`Opening WhatsApp chat with ${selectedFollowUpLead.name}`);
                    setShowFollowUpModal(false);
                    navigate('/communication/whatsapp');
                  }}
                  style={{ color: '#16a34a', borderColor: '#bbf7d0', gap: 6 }}
                >
                  <MessageSquare size={14} /> Open WhatsApp
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowFollowUpModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ gap: 6 }}>
                    <CheckCircle size={15} /> Save Re-Follow Note & Sync
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
