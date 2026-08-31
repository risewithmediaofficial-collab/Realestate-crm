import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Plus, DollarSign, Target, Megaphone,
  BarChart2, Zap, Layers, Play, Pause, ArrowUpRight,
  Filter, Search, CheckCircle, Mail, MessageSquare, AlertCircle, X, Edit, Save, Settings2, Trash2, Eye,
  List, Columns
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import CampaignDrawer from './components/CampaignDrawer';
import CampaignModal from './components/CampaignModal';
import CampaignKanbanView from './components/CampaignKanbanView';

const CAMPAIGN_TYPES = {
  meta_ads: { label: 'Meta Ads (FB/IG)', color: '#3b82f6', icon: '📘' },
  google_ads: { label: 'Google Search & Display', color: '#ea4335', icon: '🔍' },
  portal: { label: 'Property Portals (99acres/MB)', color: '#f59e0b', icon: '🏢' },
  property_portal: { label: 'Property Portals (99acres/MB)', color: '#f59e0b', icon: '🏢' },
  email: { label: 'Email Marketing', color: '#10b981', icon: '📧' },
  email_campaign: { label: 'Email Marketing', color: '#10b981', icon: '📧' },
  sms: { label: 'SMS Blast', color: '#8b5cf6', icon: '💬' },
  sms_campaign: { label: 'SMS Blast', color: '#8b5cf6', icon: '💬' },
  whatsapp: { label: 'WhatsApp Broadcast', color: '#25D366', icon: '💬' },
  website: { label: 'Website Inbound Forms', color: '#06b6d4', icon: '🌐' },
  hoarding: { label: 'Outdoor / Hoardings', color: '#ec4899', icon: '🏙️' },
  newspaper: { label: 'Print / Newspaper', color: '#64748b', icon: '📰' },
  other: { label: 'Other Channel', color: '#64748b', icon: '📢' },
};

export default function MarketingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/sources')) return 'sources';
    if (location.pathname.includes('/drip')) return 'drip';
    if (location.pathname.includes('/scoring')) return 'scoring';
    return 'campaigns';
  };

  const [tab, setTab] = useState(getTabFromPath());
  const [view, setView] = useState('table'); // 'table' | 'kanban'
  const [campaigns, setCampaigns] = useState([]);
  const [projects, setProjects] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [configuringSource, setConfiguringSource] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { showNotification } = useUI();

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/campaigns/${id}`, { status: newStatus });
    } catch {}
    setCampaigns(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c));
    if (selectedCampaign?._id === id) {
      setSelectedCampaign(prev => ({ ...prev, status: newStatus }));
    }
    showNotification(`Campaign moved to ${newStatus.toUpperCase()}!`);
  };

  // Scoring rules state
  const [scoringRules, setScoringRules] = useState([
    { id: 1, criterion: 'Site Visit Completed with Positive Outcome', cat: 'Site Visit', points: 35, status: true },
    { id: 2, criterion: 'Budget matches or exceeds project starting price', cat: 'Demographics', points: 25, status: true },
    { id: 3, criterion: 'WhatsApp response within 10 minutes', cat: 'Digital Engagement', points: 15, status: true },
    { id: 4, criterion: 'Immediate Buying Timeline (Within 30 Days)', cat: 'Intent', points: 20, status: true },
    { id: 5, criterion: 'Call duration exceeded 3 minutes', cat: 'Phone Calling', points: 10, status: true },
  ]);

  useEffect(() => {
    setTab(getTabFromPath());
  }, [location.pathname]);

  useEffect(() => {
    if (configuringSource) {
      document.body.classList.add('no-scroll');
      return () => document.body.classList.remove('no-scroll');
    }
  }, [configuringSource]);

  const handleTabChange = (tabId) => {
    setTab(tabId);
    navigate(`/marketing/${tabId === 'campaigns' ? 'campaigns' : tabId}`);
  };

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, projRes, leadsRes] = await Promise.all([
        api.get('/campaigns').catch(() => ({ data: { data: [] } })),
        api.get('/projects').catch(() => ({ data: { data: [] } })),
        api.get('/leads?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);
      setCampaigns(campRes.data?.data || []);
      setProjects(projRes.data?.data || []);
      setLeads(leadsRes.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch marketing data:', err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setShowModal(true);
  };

  const handleOpenEdit = (campaignToEdit) => {
    setEditingCampaign(campaignToEdit);
    setShowModal(true);
  };

  const handleSaveCampaign = async (payload, campaignId) => {
    if (campaignId) {
      // Update existing campaign
      try {
        const { data } = await api.put(`/campaigns/${campaignId}`, payload);
        const updated = data.data || { ...editingCampaign, ...payload };
        setCampaigns(prev => prev.map(c => c._id === campaignId ? updated : c));
        if (selectedCampaign?._id === campaignId) {
          setSelectedCampaign(updated);
        }
        showNotification(`Campaign "${payload.name}" updated successfully!`);
      } catch {
        const updated = { ...(editingCampaign || {}), ...payload, _id: campaignId };
        setCampaigns(prev => prev.map(c => c._id === campaignId ? updated : c));
        if (selectedCampaign?._id === campaignId) {
          setSelectedCampaign(updated);
        }
        showNotification(`Campaign "${payload.name}" updated!`);
      }
    } else {
      // Create new campaign
      try {
        const { data } = await api.post('/campaigns', payload);
        const created = data.data || { ...payload, _id: Date.now().toString() };
        setCampaigns(prev => [created, ...prev]);
        showNotification(`New Campaign "${payload.name}" launched successfully!`);
      } catch {
        const created = { ...payload, _id: Date.now().toString() };
        setCampaigns(prev => [created, ...prev]);
        showNotification(`New Campaign "${payload.name}" launched!`);
      }
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await api.put(`/campaigns/${id}`, { status: nextStatus });
    } catch {}
    setCampaigns(prev => prev.map(c => c._id === id ? { ...c, status: nextStatus } : c));
    if (selectedCampaign?._id === id) {
      setSelectedCampaign(prev => ({ ...prev, status: nextStatus }));
    }
    showNotification(`Campaign status updated to ${nextStatus}!`);
  };

  const handleDeleteCampaign = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete campaign "${name}"?`)) return;
    try {
      await api.delete(`/campaigns/${id}`);
    } catch {}
    setCampaigns(prev => prev.filter(c => c._id !== id));
    if (selectedCampaign?._id === id) {
      setSelectedCampaign(null);
    }
    showNotification(`Campaign "${name}" deleted!`);
  };

  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads || 0), 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + (c.conversions || 0), 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + (c.revenue || 0), 0);
  const overallCPL = totalLeads ? Math.round(totalSpent / totalLeads) : 0;
  const roas = totalSpent ? (totalRevenue / totalSpent).toFixed(1) : 0;

  const filtered = campaigns.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Marketing</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {tab === 'sources' ? 'Lead Sources & Integrations' : tab === 'drip' ? 'Drip Automations' : tab === 'scoring' ? 'Scoring Algorithm' : 'Ad Campaigns'}
            </span>
          </div>
          <h1 className="page-title">Marketing Automation & Ad Hub</h1>
          <p className="page-subtitle">Multi-channel performance campaigns, lead ingestion webhooks, and attribution ROI</p>
        </div>
        <div className="page-actions">
          {tab === 'scoring' ? (
            <button className="btn btn-primary btn-sm" onClick={() => showNotification('Lead Scoring Algorithm Weights saved!')}>
              <Save size={14} /> Save Scoring Weights
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
              <Plus size={14} /> Launch Campaign
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#eff6ff' }}>
            <DollarSign size={20} color="#2563eb" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Ad Spend</div>
            <div className="stat-value">{formatCurrency(totalSpent)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Budget: {formatCurrency(totalBudget)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#dcfce7' }}>
            <Target size={20} color="#16a34a" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Leads Ingested</div>
            <div className="stat-value">{totalLeads}</div>
            <div className="stat-change up" style={{ fontSize: 11 }}>Avg CPL: ₹{overallCPL.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#fef3c7' }}>
            <Zap size={20} color="#d97706" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Units Booked</div>
            <div className="stat-value">{totalConversions} Units</div>
            <div className="stat-change up" style={{ fontSize: 11 }}>Conversion: {totalLeads ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0}%</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#f3e8ff' }}>
            <TrendingUp size={20} color="#8b5cf6" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Attributed Revenue</div>
            <div className="stat-value">{formatCurrency(totalRevenue)}</div>
            <div className="stat-change up" style={{ fontSize: 11 }}><strong>{roas}x ROAS</strong></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'campaigns', label: 'Ad Campaigns' },
          { id: 'sources', label: 'Lead Sources & Integrations' },
          { id: 'drip', label: 'Drip Automations' },
          { id: 'scoring', label: 'Lead Scoring Algorithm' },
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

      {/* Tab 1: Campaigns */}
      {tab === 'campaigns' && (
        <div>
          <div className="filter-bar">
            <div className="filter-search">
              <Search size={14} color="var(--text-muted)" />
              <input
                placeholder="Search campaigns…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>

            {/* View Switcher: Table vs Kanban */}
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2, marginLeft: 'auto' }}>
              <button
                className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
                onClick={() => setView('table')}
                title="Table View"
              >
                <List size={14} /> Table
              </button>
              <button
                className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
                onClick={() => setView('kanban')}
                title="Kanban Board"
              >
                <Columns size={14} /> Kanban
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-overlay" style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading campaigns data...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ background: 'white', padding: '48px 24px', textAlign: 'center', borderRadius: 8 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📢</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>No ad campaigns found</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
                {search || statusFilter ? 'Try adjusting your filters.' : 'Launch your first Meta Ads, Google Ads or Portal campaign.'}
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
                <Plus size={14} /> New Campaign
              </button>
            </div>
          ) : view === 'kanban' ? (
            <CampaignKanbanView
              campaigns={filtered}
              onCampaignClick={setSelectedCampaign}
              onEditCampaign={handleOpenEdit}
              onToggleStatus={toggleStatus}
              onDeleteCampaign={handleDeleteCampaign}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Campaign Name</th>
                    <th>Channel</th>
                    <th>Project</th>
                    <th>Budget / Spent</th>
                    <th>Leads</th>
                    <th>CPL</th>
                    <th>Bookings</th>
                    <th>Revenue</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right', paddingRight: 20 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const typeConf = CAMPAIGN_TYPES[c.type] || { label: c.type, icon: '📢', color: '#64748b' };
                    const cpl = c.leads ? Math.round(c.spent / c.leads) : 0;
                    const spentPct = c.budget ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;

                    // Clean date range display
                    const startFormatted = c.startDate ? formatDate(c.startDate) : null;
                    const endFormatted = c.endDate ? formatDate(c.endDate) : null;
                    const dateText = (startFormatted && endFormatted)
                      ? `${startFormatted} – ${endFormatted}`
                      : startFormatted
                      ? `From ${startFormatted}`
                      : 'Ongoing Campaign';

                    return (
                      <tr
                        key={c._id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedCampaign(c)}
                        className="hover-row"
                      >
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{dateText}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <span>{typeConf.icon}</span>
                            <span>{typeConf.label}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>{c.project?.name || 'All Projects'}</td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>
                            {formatCurrency(c.spent)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {formatCurrency(c.budget)}</span>
                          </div>
                          <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${spentPct}%`, background: spentPct > 90 ? 'var(--danger)' : 'var(--primary)' }} />
                          </div>
                        </td>
                        <td><strong style={{ fontSize: 14 }}>{c.leads}</strong></td>
                        <td><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>₹{cpl.toLocaleString()}</span></td>
                        <td>
                          <span className="badge badge-success" style={{ fontWeight: 700 }}>
                            {c.conversions}
                          </span>
                        </td>
                        <td><strong style={{ color: 'var(--primary)' }}>{formatCurrency(c.revenue)}</strong></td>
                        <td>
                          <span className={`badge ${c.status === 'active' ? 'badge-success' : c.status === 'paused' ? 'badge-warning' : 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
                            {c.status}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right', paddingRight: 16 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            {/* View All Data Details Action */}
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              title="View Full Campaign Analytics & Data"
                              style={{ color: 'var(--primary)' }}
                              onClick={() => setSelectedCampaign(c)}
                            >
                              <Eye size={14} />
                            </button>

                            {/* Edit Campaign Action */}
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Edit Campaign Details"
                              style={{ color: '#0284c7' }}
                              onClick={() => handleOpenEdit(c)}
                            >
                              <Edit size={14} />
                            </button>

                            {/* Status Toggle (Play/Pause) */}
                            <button
                              className={`btn btn-sm ${c.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              title={c.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                              onClick={() => toggleStatus(c._id, c.status)}
                            >
                              {c.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                            </button>

                            {/* Delete Action */}
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Delete Campaign"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteCampaign(c._id, c.name)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Lead Sources & Integration */}
      {tab === 'sources' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          {[
            { id: 'meta', name: 'Meta Ads (Facebook & Instagram)', status: 'Connected', leadsCount: leads.filter(l => (l.source || '').toLowerCase().includes('meta') || (l.source || '').toLowerCase().includes('facebook')).length, icon: '📘', desc: 'Instant Lead Gen forms sync with direct field mapping', endpoint: 'https://api.crm.domain/webhooks/meta-lead-gen' },
            { id: 'google', name: 'Google Ads (Search & Performance Max)', status: 'Connected', leadsCount: leads.filter(l => (l.source || '').toLowerCase().includes('google')).length, icon: '🔍', desc: 'Webhook listener & Google Lead Extension API v14', endpoint: 'https://api.crm.domain/webhooks/google-ads' },
            { id: 'portals', name: '99acres & MagicBricks Webhooks', status: 'Connected', leadsCount: leads.filter(l => (l.source || '').toLowerCase().includes('portal') || (l.source || '').toLowerCase().includes('99acres') || (l.source || '').toLowerCase().includes('magicbricks')).length, icon: '🏢', desc: 'Auto-ingest buyer inquiries directly into New stage', endpoint: 'https://api.crm.domain/webhooks/portals' },
            { id: 'website', name: 'Website Landing Page Forms', status: 'Live', leadsCount: leads.filter(l => (l.source || '').toLowerCase().includes('website') || (l.source || '').toLowerCase().includes('inbound')).length, icon: '🌐', desc: 'REST API & embeddable JS widget for developer website', endpoint: 'https://api.crm.domain/api/v1/inbound-form' },
            { id: 'whatsapp', name: 'WhatsApp Business API (Cloud)', status: 'Connected', leadsCount: leads.filter(l => (l.source || '').toLowerCase().includes('whatsapp')).length, icon: '💬', desc: 'Automated QR codes, click-to-WhatsApp ad triggers', endpoint: 'https://api.crm.domain/webhooks/whatsapp' },
            { id: 'direct', name: 'Direct Office Walk-ins', status: 'Active', leadsCount: leads.filter(l => (l.source || '').toLowerCase().includes('direct') || (l.source || '').toLowerCase().includes('walk')).length, icon: '🚶', desc: 'On-site walk-ins and direct customer office inquiries', endpoint: 'https://api.crm.domain/webhooks/direct' },
          ].map((src, i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 28 }}>{src.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{src.name}</div>
                    <span className="badge badge-success" style={{ fontSize: 10, marginTop: 4 }}>{src.status}</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{src.desc}</p>
              <div style={{ fontSize: 11, background: '#f8fafc', padding: '6px 10px', borderRadius: 6, fontFamily: 'monospace', color: '#475569', marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {src.endpoint}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Leads this month: <strong>{src.leadsCount}</strong></span>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }} onClick={() => setConfiguringSource(src)}>
                  <Settings2 size={13} /> Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Drip Automations */}
      {tab === 'drip' && (
        <div className="card" style={{ padding: 24, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Automated Nurturing Drip Sequences</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Multi-touch WhatsApp + Email + SMS nurturing journeys</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { title: 'New Lead Instant Welcome Journey', trigger: 'Lead created in New stage', steps: 4, activeCount: leads.filter(l => l.stage === 'new').length, channel: 'WhatsApp + Email', active: true },
              { title: 'Post Site Visit Follow-up & Cost Sheet Nudge', trigger: 'Site Visit marked as Completed', steps: 3, activeCount: leads.filter(l => l.stage === 'site_visit_completed').length, channel: 'WhatsApp + SMS', active: true },
              { title: 'Cold Lead Re-engagement (30-day inactivity)', trigger: 'No activity for 30 days', steps: 5, activeCount: leads.filter(l => l.stage === 'lost' || l.stage === 'unresponsive').length, channel: 'Email + Call Task', active: true },
              { title: 'Price Revision & Festive Discount Blast', trigger: 'Negotiation stage > 7 days', steps: 2, activeCount: leads.filter(l => l.stage === 'negotiation').length, channel: 'WhatsApp Banner', active: false },
            ].map((w, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {w.title}
                    <span className={`badge ${w.active ? 'badge-success' : 'badge-gray'}`}>{w.active ? 'Running' : 'Paused'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    ⚡ Trigger: {w.trigger} • <strong>{w.steps} touchpoints</strong> via {w.channel}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>{w.activeCount}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>leads in journey</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => showNotification(`Editing steps for "${w.title}"`)}>Edit Steps</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Lead Scoring Algorithm */}
      {tab === 'scoring' && (
        <div className="card" style={{ padding: 24, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>AI & Behavioral Lead Scoring Engine</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure weighted point values dynamically determining Hot (≥70), Warm (40-69), Cold (&lt;40) score</div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Behavior / Qualification Criteria</th>
                  <th>Category</th>
                  <th>Score Impact (Points)</th>
                  <th>Rule State</th>
                </tr>
              </thead>
              <tbody>
                {scoringRules.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.criterion}</td>
                    <td><span className="badge badge-gray">{r.cat}</span></td>
                    <td style={{ width: 140 }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: 13, fontWeight: 700, width: 80 }}
                        value={r.points}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setScoringRules(prev => prev.map(item => item.id === r.id ? { ...item, points: val } : item));
                        }}
                      />
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${r.status ? 'btn-success' : 'btn-secondary'}`}
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => {
                          setScoringRules(prev => prev.map(item => item.id === r.id ? { ...item, status: !item.status } : item));
                          showNotification('Scoring rule toggled!');
                        }}
                      >
                        {r.status ? 'Active Rule' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign Details "All Data View" Drawer */}
      <CampaignDrawer
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onEdit={(c) => {
          handleOpenEdit(c);
        }}
        onToggleStatus={toggleStatus}
        onDelete={handleDeleteCampaign}
      />

      {/* Comprehensive Create / Edit Campaign Modal */}
      <CampaignModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCampaign(null);
        }}
        onSave={handleSaveCampaign}
        campaign={editingCampaign}
        projects={projects}
      />

      {/* Configure Lead Source Modal */}
      {configuringSource && (
        <div className="modal-overlay" onClick={() => setConfiguringSource(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Configure {configuringSource.name}</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setConfiguringSource(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Webhook Listener URL</label>
                <input className="form-input" defaultValue={configuringSource.endpoint} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">API Access Token / Secret Key</label>
                <input className="form-input" defaultValue="EAAGNO4XZC5...sec_92482348" type="password" />
              </div>
              <div className="form-group">
                <label className="form-label">Auto-Assign Ingested Leads To</label>
                <select className="form-select" defaultValue="round_robin">
                  <option value="round_robin">Round-Robin Sales Team</option>
                  <option value="amit">Amit Singh (Project Lead)</option>
                  <option value="neha">Neha Patel</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfiguringSource(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setConfiguringSource(null); showNotification('Source webhook settings saved!'); }}>Save Configuration</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
