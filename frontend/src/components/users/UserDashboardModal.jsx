import { useState, useEffect, useMemo } from 'react';
import {
  X, User, Phone, Mail, Award, Target, TrendingUp,
  DollarSign, CheckCircle2, Clock, Calendar, MapPin,
  FileText, Activity, AlertCircle, ArrowUpRight, BarChart2,
  Building2, Users, Shield, Sparkles, Filter, ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDateTime, formatDate, getInitials } from '../../utils/formatters';
import { LEAD_STAGES, USER_ROLES, ORGANIZATION_ROLES } from '../../utils/constants';

export default function UserDashboardModal({ user, onClose, allLeads = [], allBookings = [], allSiteVisits = [] }) {
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'activities' | 'bookings' | 'performance'
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [siteVisits, setSiteVisits] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Prevent background scrolling
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  // Fetch real data for this executive
  useEffect(() => {
    if (!user?._id) return;
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const [leadsRes, bookingsRes, visitsRes, actRes] = await Promise.all([
          api.get('/leads?limit=500').catch(() => ({ data: { data: allLeads } })),
          api.get('/bookings').catch(() => ({ data: { data: allBookings } })),
          api.get('/site-visits').catch(() => ({ data: { data: allSiteVisits } })),
          api.get('/activities?limit=100').catch(() => ({ data: { data: [] } })),
        ]);

        const rawLeads = leadsRes.data?.data || allLeads || [];
        const rawBookings = bookingsRes.data?.data || allBookings || [];
        const rawVisits = visitsRes.data?.data || allSiteVisits || [];
        const rawActivities = actRes.data?.data || [];

        // Filter for this executive (by assignedTo _id or name match)
        const uId = String(user._id);
        const uName = (user.name || '').toLowerCase();

        const userLeads = rawLeads.filter(l => {
          const lAssignedId = l.assignedTo?._id || l.assignedTo;
          const lAssignedName = (l.assignedTo?.name || '').toLowerCase();
          return (lAssignedId && String(lAssignedId) === uId) || (lAssignedName && lAssignedName === uName);
        });

        const userBookings = rawBookings.filter(b => {
          const bHandledId = b.handledBy?._id || b.handledBy || b.agent?._id || b.agent;
          const bHandledName = (b.handledBy?.name || b.agent?.name || '').toLowerCase();
          return (bHandledId && String(bHandledId) === uId) || (bHandledName && bHandledName === uName);
        });

        const userVisits = rawVisits.filter(v => {
          const vAssignedId = v.assignedTo?._id || v.assignedTo;
          const vAssignedName = (v.assignedTo?.name || '').toLowerCase();
          return (vAssignedId && String(vAssignedId) === uId) || (vAssignedName && vAssignedName === uName);
        });

        const userActivities = rawActivities.filter(a => {
          const aAssignedId = a.assignedTo?._id || a.assignedTo;
          const aAssignedName = (a.assignedTo?.name || '').toLowerCase();
          return (aAssignedId && String(aAssignedId) === uId) || (aAssignedName && aAssignedName === uName);
        });

        setLeads(userLeads);
        setBookings(userBookings);
        setSiteVisits(userVisits);
        setActivities(userActivities);
      } catch (err) {
        console.error('Failed to load user dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Compute live KPIs for this executive
  const metrics = useMemo(() => {
    const monthlyQuota = user?.monthlyQuota || 50000000; // 5 Cr default target
    
    // Revenue won from approved/registered bookings
    const wonBookings = bookings.filter(b => b.status === 'approved' || b.status === 'registered' || b.status === 'agreement_signed');
    const bookedRevenue = wonBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const tokenCollected = wonBookings.reduce((sum, b) => sum + (b.tokenAmount || 0), 0);

    // Active pipeline value (leads in negotiation, visit done, or prospective budget)
    const pipelineValue = leads.reduce((sum, l) => {
      if (l.stage === 'booked' || l.stage === 'lost' || l.stage === 'junk') return sum;
      return sum + (l.budget?.max || l.budget?.min || 9000000);
    }, 0);

    // Call logs / spoken notes count
    let callsMade = 0;
    leads.forEach(l => {
      if (l.callLogs && Array.isArray(l.callLogs)) callsMade += l.callLogs.length;
      if (l.activities && Array.isArray(l.activities)) {
        callsMade += l.activities.filter(a => a.type === 'call' || a.type === 'note').length;
      }
    });

    const visitsDone = siteVisits.filter(v => v.status === 'completed').length;
    const visitsScheduled = siteVisits.length;

    const conversionRate = leads.length > 0
      ? ((wonBookings.length / leads.length) * 100).toFixed(1)
      : '0.0';

    const quotaPercent = monthlyQuota > 0
      ? Math.min(Math.round((bookedRevenue / monthlyQuota) * 100), 100)
      : 0;

    return {
      monthlyQuota,
      bookedRevenue,
      tokenCollected,
      pipelineValue,
      leadsCount: leads.length,
      wonCount: wonBookings.length,
      callsMade,
      visitsDone,
      visitsScheduled,
      conversionRate,
      quotaPercent
    };
  }, [leads, bookings, siteVisits, user]);

  const roleConf = ORGANIZATION_ROLES[user?.role] || USER_ROLES[user?.role] || {
    label: user?.role?.replace(/_/g, ' ') || 'Executive',
    badge: 'badge-primary'
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal"
        style={{
          width: '95vw',
          maxWidth: '1020px',
          maxHeight: '92vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 14,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              color: 'white',
              fontSize: 20,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              {getInitials(user?.name)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'white' }}>
                  {user?.name}
                </h2>
                <span className={`badge ${roleConf.badge || 'badge-primary'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                  {roleConf.label}
                </span>
                <span className={`badge ${user?.isActive !== false ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>
                  {user?.isActive !== false ? '● Active' : '● Inactive'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} /> {user?.email || 'No email provided'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={12} /> {user?.phone || 'No phone'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} /> Joined: {formatDate(user?.createdAt || new Date())}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-icon"
            style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Real-time KPI Highlights Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          padding: '16px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid var(--card-border)'
        }}>
          {/* Revenue Won */}
          <div style={{ background: 'white', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Award size={13} /> Deals Closed Value
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#166534', marginTop: 4 }}>
              {formatCurrency(metrics.bookedRevenue)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {metrics.wonCount} Bookings Won · {metrics.conversionRate}% Conv.
            </div>
          </div>

          {/* Monthly Target Quota */}
          <div style={{ background: 'white', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Target size={13} /> Monthly Target
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#3730a3', marginTop: 4 }}>
              {metrics.quotaPercent}%
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: 5, background: '#e2e8f0', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${metrics.quotaPercent}%`, height: '100%', background: '#4f46e5', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Target: {formatCurrency(metrics.monthlyQuota)}
            </div>
          </div>

          {/* Active Pipeline */}
          <div style={{ background: 'white', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={13} /> Active Pipeline
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
              {formatCurrency(metrics.pipelineValue)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {metrics.leadsCount} Allocated Inquiries
            </div>
          </div>

          {/* Calling & Site Visits */}
          <div style={{ background: 'white', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Activity size={13} /> Field & Call Activity
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#6b21a8', marginTop: 4 }}>
              {metrics.visitsDone} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Visits Done</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              📞 {metrics.callsMade} Spoken Calls · {metrics.visitsScheduled} Scheduled
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 24px',
          background: 'white',
          borderBottom: '1px solid #e2e8f0'
        }}>
          {[
            { id: 'pipeline', label: `Assigned Leads (${leads.length})`, icon: '👥' },
            { id: 'bookings', label: `Won Bookings (${bookings.length})`, icon: '📑' },
            { id: 'visits', label: `Site Visits (${siteVisits.length})`, icon: '🚗' },
            { id: 'activities', label: `Daily Follow-ups (${activities.length})`, icon: '⏰' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 7,
                padding: '6px 12px',
                gap: 5
              }}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Modal Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', background: '#fafbfc' }}>
          {loading ? (
            <div className="loading-overlay" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : activeTab === 'pipeline' ? (
            <div>
              {/* Pipeline Stage Breakdown Pill Chips */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 14 }}>
                {Object.entries(LEAD_STAGES).map(([stageKey, stageConf]) => {
                  const stageLeads = leads.filter(l => (l.stage || 'new') === stageKey);
                  return (
                    <div
                      key={stageKey}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                        fontSize: 11.5
                      }}
                    >
                      <span className={`badge ${stageConf.badge}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                        {stageLeads.length}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stageConf.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Leads Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrapper" style={{ margin: 0, border: 'none' }}>
                  <table>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th>Lead Name & Contact</th>
                        <th>Project / Configuration</th>
                        <th>Budget</th>
                        <th>Stage</th>
                        <th>Buyer Temperature</th>
                        <th>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                            <Users size={24} style={{ display: 'block', margin: '0 auto 6px', color: '#cbd5e1' }} />
                            No leads are currently assigned to {user?.name}.
                          </td>
                        </tr>
                      ) : (
                        leads.map(lead => {
                          const stageConf = LEAD_STAGES[lead.stage] || { label: lead.stage || 'New', badge: 'badge-gray' };
                          return (
                            <tr key={lead._id}>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>👤 {lead.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {lead.phone}</div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>
                                  🏢 {lead.interestedProject?.name || lead.project || 'Undecided'}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                  {lead.interestedUnitType || '3BHK'}
                                </div>
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                {formatCurrency(lead.budget?.max || lead.budget?.min || 8500000)}
                              </td>
                              <td>
                                <span className={`badge ${stageConf.badge}`} style={{ fontSize: 10 }}>
                                  {stageConf.label}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${lead.leadType === 'hot' ? 'badge-danger' : lead.leadType === 'warm' ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                                  {lead.leadType?.toUpperCase() || 'WARM'}
                                </span>
                              </td>
                              <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {formatDate(lead.updatedAt || lead.createdAt || new Date())}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'bookings' ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrapper" style={{ margin: 0, border: 'none' }}>
                <table>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>Booking #</th>
                      <th>Buyer Name</th>
                      <th>Unit & Project</th>
                      <th>Deal Value (₹)</th>
                      <th>Token Paid (₹)</th>
                      <th>Status</th>
                      <th>Date Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                          <Award size={24} style={{ display: 'block', margin: '0 auto 6px', color: '#cbd5e1' }} />
                          No closed bookings recorded for {user?.name} yet.
                        </td>
                      </tr>
                    ) : (
                      bookings.map(b => (
                        <tr key={b._id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                            {b.bookingNumber || 'BK-2026-LIVE'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{b.customerName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {b.customerPhone}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{b.unit?.unitNumber || 'Unit #304'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.project?.name || 'Project'}</div>
                          </td>
                          <td style={{ fontWeight: 800, color: '#15803d' }}>
                            {formatCurrency(b.totalAmount)}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {formatCurrency(b.tokenAmount)}
                          </td>
                          <td>
                            <span className="badge badge-success" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                              {b.status?.replace(/_/g, ' ') || 'Approved'}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {formatDate(b.bookingDate || b.createdAt || new Date())}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'visits' ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrapper" style={{ margin: 0, border: 'none' }}>
                <table>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>Visitor / Lead</th>
                      <th>Project</th>
                      <th>Visit Date & Time</th>
                      <th>Cab Status</th>
                      <th>Outcome / Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteVisits.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                          <MapPin size={24} style={{ display: 'block', margin: '0 auto 6px', color: '#cbd5e1' }} />
                          No site visits currently assigned to {user?.name}.
                        </td>
                      </tr>
                    ) : (
                      siteVisits.map(v => (
                        <tr key={v._id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>👤 {v.lead?.name || 'Prospective Buyer'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {v.lead?.phone || '—'}</div>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            📍 {v.project?.name || 'Project'}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            ⏰ {formatDateTime(v.scheduledDate)}
                          </td>
                          <td>
                            {v.cabRequired ? (
                              <span className="badge badge-warning" style={{ fontSize: 10 }}>🚕 Cab Arranged</span>
                            ) : (
                              <span className="badge badge-gray" style={{ fontSize: 10 }}>Self-Drive</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${v.status === 'completed' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: 10 }}>
                              {v.status?.toUpperCase() || 'SCHEDULED'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrapper" style={{ margin: 0, border: 'none' }}>
                <table>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>Activity / Task</th>
                      <th>Lead / Customer</th>
                      <th>Due Date</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                          <Clock size={24} style={{ display: 'block', margin: '0 auto 6px', color: '#cbd5e1' }} />
                          No open follow-up activities recorded for {user?.name}.
                        </td>
                      </tr>
                    ) : (
                      activities.map(a => (
                        <tr key={a._id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{a.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.description || 'Follow-up discussion'}</div>
                          </td>
                          <td>
                            {a.lead ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>👤 {a.lead.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {a.lead.phone}</div>
                              </div>
                            ) : '—'}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            ⏰ {formatDateTime(a.dueDate)}
                          </td>
                          <td>
                            <span className={`badge ${a.priority === 'urgent' ? 'badge-danger' : a.priority === 'high' ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                              {a.priority?.toUpperCase() || 'MEDIUM'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${a.status === 'completed' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: 10 }}>
                              {a.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 24px',
          background: 'white',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Viewing live telemetry & activity stream for <strong>{user?.name}</strong>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close User Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
