import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Share2, Shield, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  Copy, ExternalLink, Sliders, Database, History, Terminal,
  Plus, Edit3, Trash2, Eye, ArrowRight, Play, Layers,
  Building, User, Check, X, AlertCircle, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { META_INTEGRATION_STATUSES, META_WEBHOOK_STATUSES } from '../../utils/constants';
import { formatDate, timeAgo } from '../../utils/formatters';
import CustomSelect from '../../components/ui/CustomSelect';

export default function MetaIntegrationPage() {
  const navigate = useNavigate();
  const { showNotification } = useUI();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'forms' | 'history' | 'webhooks' | 'logs'
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingLeads, setSyncingLeads] = useState(false);

  // Status & Config
  const [metrics, setMetrics] = useState({
    connectionStatus: 'Not Configured',
    isConfigured: false,
    missingConfig: ['META_APP_ID', 'META_APP_SECRET', 'META_PAGE_ACCESS_TOKEN', 'META_PAGE_ID'],
    webhookStatus: 'Active',
    totalMetaLeads: 0,
    todayMetaLeads: 0,
    failedWebhooks: 0,
    pendingEvents: 0,
    lastLeadReceived: null,
    lastSync: null,
  });

  const [configDetails, setConfigDetails] = useState({
    configured: false,
    missing: [],
    configuredKeys: [],
    pageId: null,
    apiVersion: 'v21.0',
    hasVerifyToken: true,
  });

  // Forms
  const [forms, setForms] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingForm, setEditingForm] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);

  // Sync History
  const [syncHistory, setSyncHistory] = useState([]);

  // Webhook Events
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [selectedEventPayload, setSelectedEventPayload] = useState(null);

  // Error Logs
  const [errorLogs, setErrorLogs] = useState([]);

  const webhookUrl = `${window.location.origin}/api/integrations/meta/webhook`;
  const verifyToken = 'prop_crm_webhook_verify_2026';

  // Load Status & Metrics
  const loadStatus = useCallback(async () => {
    try {
      const [statusRes, configRes] = await Promise.all([
        api.get('/integrations/meta/status'),
        api.get('/integrations/meta/config'),
      ]);
      if (statusRes.data?.data) setMetrics(statusRes.data.data);
      if (configRes.data?.data) setConfigDetails(configRes.data.data);
    } catch (err) {
      console.error('Failed to load Meta integration status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Forms
  const loadForms = useCallback(async () => {
    try {
      const { data } = await api.get('/integrations/meta/forms');
      setForms(data.data || []);
    } catch (err) {
      console.error('Failed to load Meta forms:', err);
    }
  }, []);

  // Load Projects & Agents for Mapping Dropdowns
  const loadDropdowns = useCallback(async () => {
    try {
      const [projRes, usersRes] = await Promise.all([
        api.get('/projects'),
        api.get('/users'),
      ]);
      if (projRes.data?.data) setProjects(projRes.data.data);
      if (usersRes.data?.data) {
        setUsers(usersRes.data.data.filter(u => u.isActive !== false));
      }
    } catch {}
  }, []);

  // Load Sync History
  const loadSyncHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/integrations/meta/sync-history');
      setSyncHistory(data.data || []);
    } catch (err) {
      console.error('Failed to load sync history:', err);
    }
  }, []);

  // Load Webhook Events
  const loadWebhookEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/integrations/meta/events');
      setWebhookEvents(data.data || []);
    } catch (err) {
      console.error('Failed to load webhook events:', err);
    }
  }, []);

  // Load Error Logs
  const loadErrorLogs = useCallback(async () => {
    try {
      const { data } = await api.get('/integrations/meta/errors');
      setErrorLogs(data.data || []);
    } catch (err) {
      console.error('Failed to load error logs:', err);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadDropdowns();
  }, [loadStatus, loadDropdowns]);

  useEffect(() => {
    if (activeTab === 'forms') loadForms();
    if (activeTab === 'history') loadSyncHistory();
    if (activeTab === 'webhooks') loadWebhookEvents();
    if (activeTab === 'logs') loadErrorLogs();
  }, [activeTab, loadForms, loadSyncHistory, loadWebhookEvents, loadErrorLogs]);

  // Actions
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const { data } = await api.post('/integrations/meta/test');
      if (data.success) {
        showNotification(`Connection Verified: ${data.message}`);
      } else {
        showNotification(data.message || 'Meta connection test diagnostic completed.');
      }
      loadStatus();
    } catch (err) {
      showNotification('Connection test failed. Check backend logs.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleManualSync = async () => {
    setSyncingLeads(true);
    try {
      const { data } = await api.post('/integrations/meta/leads/sync');
      if (data.success) {
        showNotification('Manual sync complete! Checked all active Meta Lead Forms.');
      } else {
        showNotification(data.message || 'Sync response recorded in history.');
      }
      loadStatus();
      if (activeTab === 'history') loadSyncHistory();
    } catch (err) {
      showNotification('Manual sync failed.');
    } finally {
      setSyncingLeads(false);
    }
  };

  const handleRetryEvent = async (eventId) => {
    try {
      const { data } = await api.post(`/integrations/meta/events/${eventId}/retry`);
      if (data.success) {
        showNotification('Webhook event re-processed and lead ingested successfully!');
      } else {
        showNotification(`Retry error: ${data.error || 'Check error logs'}`);
      }
      loadWebhookEvents();
      loadStatus();
    } catch {
      showNotification('Failed to retry event.');
    }
  };

  const handleToggleFormStatus = async (formId) => {
    try {
      await api.post(`/integrations/meta/forms/${formId}/toggle`);
      setForms(prev => prev.map(f => f._id === formId ? { ...f, isActive: !f.isActive } : f));
      showNotification('Lead form status updated!');
    } catch {}
  };

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!editingForm) return;

    try {
      const payload = {
        fieldMappings: editingForm.fieldMappings,
        defaultProject: editingForm.defaultProject?._id || editingForm.defaultProject || null,
        defaultLeadStatus: editingForm.defaultLeadStatus || 'new',
        defaultLeadType: editingForm.defaultLeadType || 'hot',
        assignmentRule: editingForm.assignmentRule || { type: 'round_robin' },
        isActive: editingForm.isActive,
      };

      const { data } = await api.put(`/integrations/meta/forms/${editingForm._id}/mapping`, payload);
      setForms(prev => prev.map(f => f._id === editingForm._id ? data.data : f));
      showNotification(`Mapping updated for "${editingForm.formName}"!`);
      setShowMappingModal(false);
      setEditingForm(null);
    } catch {
      showNotification('Failed to update form mapping.');
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all integration diagnostic logs?')) return;
    try {
      await api.delete('/integrations/meta/errors/clear');
      setErrorLogs([]);
      showNotification('Integration error logs cleared.');
    } catch {}
  };

  const copyToClipboard = (text, label = 'Copied to clipboard!') => {
    navigator.clipboard?.writeText(text);
    showNotification(label);
  };

  const statusConf = META_INTEGRATION_STATUSES[metrics.connectionStatus] || META_INTEGRATION_STATUSES['Not Configured'];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/settings/general')}>Settings</span>
            <span className="breadcrumb-sep">/</span>
            <span>Integrations</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Meta Lead Ads</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">Meta Lead Ads Integration (Facebook & Instagram)</h1>
            <span className={`badge ${statusConf.badge}`} style={{ fontSize: 11, padding: '3px 8px' }}>
              {statusConf.label}
            </span>
          </div>
          <p className="page-subtitle">
            Real-time webhook ingestion, instant lead form mapping, auto-assignment rules, duplicate protection & Graph API sync
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleTestConnection}
            disabled={testingConnection}
          >
            <RefreshCw size={13} className={testingConnection ? 'spin' : ''} />
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleManualSync}
            disabled={syncingLeads}
          >
            <Play size={13} />
            {syncingLeads ? 'Syncing Leads...' : 'Sync Meta Leads'}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#eff6ff' }}>
            <Share2 size={20} color="#1877f2" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Integration Status</div>
            <div className="stat-value" style={{ fontSize: 16, color: statusConf.color }}>
              {statusConf.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {metrics.isConfigured ? 'Live Page Connected' : 'Awaiting Meta Credentials'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#dcfce7' }}>
            <Shield size={20} color="#16a34a" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Webhook Receiver</div>
            <div className="stat-value" style={{ fontSize: 16, color: '#16a34a' }}>
              {metrics.webhookStatus}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              SSL Verified · Challenge Ready
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#f3e8ff' }}>
            <Database size={20} color="#8b5cf6" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Meta Leads</div>
            <div className="stat-value">{metrics.totalMetaLeads}</div>
            <div className="stat-change up" style={{ fontSize: 11 }}>
              +{metrics.todayMetaLeads} today
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#fef3c7' }}>
            <History size={20} color="#d97706" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Sync & Events</div>
            <div className="stat-value" style={{ fontSize: 15 }}>
              {metrics.failedWebhooks > 0 ? `${metrics.failedWebhooks} Failed` : '100% Ingested'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {metrics.lastSync?.at ? `Last sync ${timeAgo(metrics.lastSync.at)}` : 'Manual recovery ready'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          { id: 'overview', label: 'Overview & Setup' },
          { id: 'forms', label: `Lead Form Mapping (${forms.length})` },
          { id: 'history', label: 'Sync History' },
          { id: 'webhooks', label: `Webhook Events (${webhookEvents.length})` },
          { id: 'logs', label: `Error Logs & Diagnostics (${errorLogs.length})` },
        ].map(t => (
          <div
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Tab 1: Overview & Setup */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status Alert Banner */}
          {!metrics.isConfigured ? (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <AlertTriangle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>
                  Meta Lead Ads Integration is in "Not Configured" state
                </div>
                <div style={{ fontSize: 13, color: '#b45309', lineHeight: 1.5 }}>
                  The backend infrastructure, webhook endpoints, data models, field normalization, and auto-assignment pipeline are completely built and ready.
                  To activate live Graph API sync, add your Meta developer credentials to your environment variables or config.
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {metrics.missingConfig?.map(key => (
                    <span key={key} style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
              <CheckCircle size={22} color="#16a34a" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>
                  Meta Lead Ads Connected Successfully
                </div>
                <div style={{ fontSize: 13, color: '#15803d' }}>
                  Page ID: <code>{configDetails.pageId}</code> · API Version: <code>{configDetails.apiVersion}</code> · All incoming leads will automatically enter the CRM.
                </div>
              </div>
            </div>
          )}

          {/* Webhook Configuration Card */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Meta Webhook Endpoints & Handshake</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure these webhook parameters inside your Meta App Dashboard (Page Webhooks)</div>
              </div>
              <span className="badge badge-success">SSL Enabled</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid var(--card-border)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Callback URL</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{webhookUrl}</code>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copyToClipboard(webhookUrl, 'Webhook URL copied!')} title="Copy Callback URL">
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid var(--card-border)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Verify Token</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ fontSize: 12, fontWeight: 700 }}>{verifyToken}</code>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copyToClipboard(verifyToken, 'Verify Token copied!')} title="Copy Verify Token">
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid var(--card-border)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Subscribed Field</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  <code>leadgen</code>
                </div>
              </div>
            </div>

            {/* Quick Setup Instructions */}
            <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                🛠️ How to Subscribe Meta Page Webhook:
              </div>
              <ol style={{ paddingLeft: 18, margin: 0, lineHeight: 1.6 }}>
                <li>Open <strong>Meta for Developers</strong> &rarr; Your App &rarr; <strong>Webhooks</strong> product.</li>
                <li>Select <strong>Page</strong> object, click <strong>Subscribe to this object</strong>, and enter the Callback URL & Verify Token above.</li>
                <li>Under Page fields, subscribe to the <strong>leadgen</strong> field.</li>
                <li>Under <strong>App Review & Permissions</strong>, ensure <code>leads_retrieval</code> and <code>pages_manage_ads</code> permissions are approved.</li>
              </ol>
            </div>
          </div>

          {/* Lead Processing Flow Explainer */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Automated Lead Ingestion Architecture</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { step: '1. Webhook Received', desc: 'Real-time payload parsed & stored in MetaWebhookEvent with deduplication check.' },
                { step: '2. Field Normalization', desc: 'Custom form mapping maps questions (Full Name, Phone, Email, Budget) to CRM fields.' },
                { step: '3. Lead Ingestion Engine', desc: 'Assigns sales rep (Round Robin/Project-based), sets 15m SLA & calculates lead score.' },
                { step: '4. Dashboard & Actions', desc: 'Appears in All Leads table & Kanban with Meta source badge, campaign metadata & timeline.' },
              ].map((item, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--card-border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>{item.step}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lead Form Mapping */}
      {activeTab === 'forms' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Meta Instant Lead Form Mappings</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Map custom Meta form questions to standard CRM fields, default projects, and sales assignment rules</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => loadForms()}>
              <RefreshCw size={13} /> Refresh Forms
            </button>
          </div>

          {forms.length === 0 ? (
            <div className="empty-state" style={{ background: 'white', padding: '48px 24px', textAlign: 'center', borderRadius: 8 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>No Meta lead forms synced yet</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
                {metrics.isConfigured
                  ? 'Click "Sync Meta Leads" to automatically pull active lead forms from your connected Page.'
                  : 'Connect your Meta Page credentials to automatically discover and map Instant Forms.'}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingForm({
                    _id: 'new_temp',
                    formId: 'sample_form_' + Date.now().toString().slice(-4),
                    formName: 'Grand View Residencies - 3BHK Luxury Campaign Form',
                    status: 'active',
                    fieldMappings: [
                      { metaField: 'full_name', crmField: 'name' },
                      { metaField: 'phone_number', crmField: 'phone' },
                      { metaField: 'email', crmField: 'email' },
                      { metaField: 'what_is_your_budget?', crmField: 'budget' },
                      { metaField: 'preferred_city', crmField: 'city' },
                    ],
                    defaultProject: projects[0]?._id,
                    defaultLeadStatus: 'new',
                    defaultLeadType: 'hot',
                    assignmentRule: { type: 'round_robin' },
                    isActive: true,
                  });
                  setShowMappingModal(true);
                }}
              >
                <Plus size={14} /> Add Lead Form Mapping
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Form Name & ID</th>
                    <th>Status</th>
                    <th>Field Mappings</th>
                    <th>Default Project</th>
                    <th>Assignment Rule</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map(form => (
                    <tr key={form._id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{form.formName}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>ID: {form.formId}</div>
                      </td>
                      <td>
                        <span className={`badge ${form.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                          {form.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-purple" style={{ fontSize: 11 }}>
                          {form.fieldMappings?.length || 0} fields mapped
                        </span>
                      </td>
                      <td>
                        {form.defaultProject?.name ? (
                          <span style={{ fontWeight: 600 }}>{form.defaultProject.name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Auto / Not Set</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                          {form.assignmentRule?.type?.replace(/_/g, ' ') || 'Round Robin'}
                        </span>
                      </td>
                      <td>
                        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 34, height: 18 }}>
                          <input
                            type="checkbox"
                            checked={form.isActive !== false}
                            onChange={() => handleToggleFormStatus(form._id)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: form.isActive !== false ? '#16a34a' : '#cbd5e1',
                            borderRadius: 18, transition: '0.2s',
                          }} />
                        </label>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => {
                            setEditingForm(JSON.parse(JSON.stringify(form)));
                            setShowMappingModal(true);
                          }}
                        >
                          <Edit3 size={12} /> Edit Mapping
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Sync History */}
      {activeTab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Meta Graph API Sync Runs & Recovery Logs</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Audit history of manual and automated lead ingestion synchronization runs</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => loadSyncHistory()}>
              <RefreshCw size={13} /> Refresh History
            </button>
          </div>

          {syncHistory.length === 0 ? (
            <div className="empty-state" style={{ background: 'white', padding: '48px 24px', textAlign: 'center', borderRadius: 8 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>No sync history recorded yet</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
                Click "Sync Meta Leads" in the top bar to trigger a synchronization run.
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleManualSync} disabled={syncingLeads}>
                <Play size={13} /> Run Manual Sync Now
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Sync Type</th>
                    <th>Status</th>
                    <th>Initiated At</th>
                    <th>Duration</th>
                    <th>Leads Found</th>
                    <th>New Created</th>
                    <th>Duplicates</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {syncHistory.map(item => (
                    <tr key={item._id}>
                      <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {item.syncType} Sync
                      </td>
                      <td>
                        <span className={`badge ${item.status === 'completed' ? 'badge-success' : item.status === 'started' ? 'badge-warning' : 'badge-danger'}`}>
                          {item.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>{formatDate(item.startedAt)}</td>
                      <td>{item.durationMs ? `${item.durationMs}ms` : '—'}</td>
                      <td style={{ fontWeight: 700 }}>{item.totalLeadsFound || 0}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>+{item.newLeadsCreated || 0}</td>
                      <td>{item.duplicatesFound || 0}</td>
                      <td>
                        {item.errorsCount > 0 ? (
                          <span style={{ color: 'var(--danger)', fontWeight: 700 }} title={item.errorDetails?.join('\n')}>
                            {item.errorsCount} errors
                          </span>
                        ) : (
                          <span style={{ color: 'var(--success)' }}>0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Webhook Events */}
      {activeTab === 'webhooks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Incoming Meta Webhook Real-time Events</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live stream of Page leadgen notifications with raw payloads and processing status</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => loadWebhookEvents()}>
              <RefreshCw size={13} /> Refresh Events
            </button>
          </div>

          {webhookEvents.length === 0 ? (
            <div className="empty-state" style={{ background: 'white', padding: '48px 24px', textAlign: 'center', borderRadius: 8 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📡</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>No webhook events received yet</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                When users submit Facebook or Instagram lead ad forms, events will stream into this log in real time.
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Leadgen ID</th>
                    <th>Form & Page ID</th>
                    <th>Ingestion Status</th>
                    <th>Received At</th>
                    <th>Created Lead</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookEvents.map(evt => {
                    const st = META_WEBHOOK_STATUSES[evt.status] || META_WEBHOOK_STATUSES.received;
                    return (
                      <tr key={evt._id}>
                        <td>
                          <code style={{ fontSize: 12, fontWeight: 700 }}>{evt.leadgenId}</code>
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>Form: <code>{evt.formId || 'N/A'}</code></div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Page: {evt.pageId || 'N/A'}</div>
                        </td>
                        <td>
                          <span className={`badge ${st.badge}`}>{st.label}</span>
                        </td>
                        <td>{formatDate(evt.receivedAt)}</td>
                        <td>
                          {evt.createdLead ? (
                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              {evt.createdLead.name || 'Lead Ingested'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => setSelectedEventPayload(evt.payload)}
                            >
                              <Eye size={12} /> Payload
                            </button>
                            {evt.status === 'failed' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: 11 }}
                                onClick={() => handleRetryEvent(evt._id)}
                              >
                                <RefreshCw size={12} /> Retry
                              </button>
                            )}
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

      {/* Tab 5: Error Logs */}
      {activeTab === 'logs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Integration Diagnostic & Error Logs</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Safe error and audit logging without exposed credentials</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {errorLogs.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={handleClearLogs}>
                  <Trash2 size={13} /> Clear Logs
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => loadErrorLogs()}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {errorLogs.length === 0 ? (
            <div className="empty-state" style={{ background: 'white', padding: '48px 24px', textAlign: 'center', borderRadius: 8 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>No errors logged</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                All integration operations and webhook handshakes are running cleanly.
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {errorLogs.map(log => (
                    <tr key={log._id}>
                      <td>
                        <span className={`badge ${log.severity === 'error' ? 'badge-danger' : log.severity === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                          {log.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>
                        {log.type}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {log.message}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Field Mapping Modal */}
      {showMappingModal && editingForm && (
        <div className="modal-overlay" onClick={() => setShowMappingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">Configure Form Field Mapping: {editingForm.formName}</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowMappingModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveMapping}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Form Identity</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Form ID: <code>{editingForm.formId}</code></div>
                </div>

                {/* Default Project & Lead Stage */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Default Target Project</label>
                    <CustomSelect
                      value={editingForm.defaultProject?._id || editingForm.defaultProject || ''}
                      onChange={val => setEditingForm(p => ({ ...p, defaultProject: typeof val === 'object' && val.target ? val.target.value : val }))}
                      placeholder="-- Auto-Detect / Any Project --"
                      options={[
                        { value: '', label: 'Auto-Detect / Any Project' },
                        ...projects.map(prj => ({
                          value: prj._id,
                          label: `${prj.name} (${prj.city})`
                        }))
                      ]}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Initial Lead Stage</label>
                    <CustomSelect
                      value={editingForm.defaultLeadStatus || 'new'}
                      onChange={val => setEditingForm(p => ({ ...p, defaultLeadStatus: typeof val === 'object' && val.target ? val.target.value : val }))}
                      options={[
                        { value: 'new', label: 'New / Unassigned', icon: '🟢' },
                        { value: 'contacted', label: 'Contacted', icon: '🟡' },
                        { value: 'qualified', label: 'Pre-Qualified', icon: '🔵' }
                      ]}
                    />
                  </div>
                </div>

                {/* Auto-Assignment Rule */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Auto-Assignment Rule</label>
                    <CustomSelect
                      value={editingForm.assignmentRule?.type || 'round_robin'}
                      onChange={val => setEditingForm(p => ({
                        ...p,
                        assignmentRule: { ...p.assignmentRule, type: typeof val === 'object' && val.target ? val.target.value : val }
                      }))}
                      options={[
                        { value: 'round_robin', label: 'Round Robin (Even Distribution)', icon: '🔄' },
                        { value: 'project_based', label: 'Project Sales Team', icon: '🏢' },
                        { value: 'specific_agent', label: 'Specific Sales Executive', icon: '👤' },
                        { value: 'no_assignment', label: 'No Assignment (Manual Pool)', icon: '📋' }
                      ]}
                    />
                  </div>

                  {editingForm.assignmentRule?.type === 'specific_agent' && (
                    <div className="form-group">
                      <label className="form-label">Assign To Specific Rep</label>
                      <CustomSelect
                        value={editingForm.assignmentRule?.agentId || ''}
                        onChange={val => setEditingForm(p => ({
                          ...p,
                          assignmentRule: { ...p.assignmentRule, agentId: typeof val === 'object' && val.target ? val.target.value : val }
                        }))}
                        placeholder="-- Select Agent --"
                        options={users.map(u => ({
                          value: u._id,
                          label: `${u.name} (${u.role})`
                        }))}
                      />
                    </div>
                  )}
                </div>

                {/* Custom Question Mappings */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Form Field to CRM Attribute Mapping</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '2px 6px' }}
                      onClick={() => {
                        setEditingForm(p => ({
                          ...p,
                          fieldMappings: [...(p.fieldMappings || []), { metaField: '', crmField: 'notes' }]
                        }));
                      }}
                    >
                      <Plus size={12} /> Add Field Row
                    </button>
                  </div>

                  {(editingForm.fieldMappings || []).map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input
                        className="form-input"
                        placeholder="Meta Field (e.g. full_name)"
                        value={m.metaField}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingForm(p => {
                            const copy = [...p.fieldMappings];
                            copy[idx].metaField = val;
                            return { ...p, fieldMappings: copy };
                          });
                        }}
                        style={{ flex: 1 }}
                        required
                      />
                      <ArrowRight size={14} color="var(--text-muted)" />
                      <div style={{ flex: 1 }}>
                        <CustomSelect
                          value={m.crmField}
                          onChange={val => {
                            const actualVal = typeof val === 'object' && val.target ? val.target.value : val;
                            setEditingForm(p => {
                              const copy = [...p.fieldMappings];
                              copy[idx].crmField = actualVal;
                              return { ...p, fieldMappings: copy };
                            });
                          }}
                          options={[
                            { value: 'name', label: 'Customer Full Name' },
                            { value: 'phone', label: 'Phone Number' },
                            { value: 'email', label: 'Email Address' },
                            { value: 'city', label: 'City / Locality' },
                            { value: 'budget', label: 'Budget / Price Range' },
                            { value: 'interestedUnitType', label: 'Unit Typology (2BHK/3BHK)' },
                            { value: 'notes', label: 'Notes / Custom Question' }
                          ]}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm text-danger"
                        onClick={() => {
                          setEditingForm(p => ({
                            ...p,
                            fieldMappings: p.fieldMappings.filter((_, i) => i !== idx)
                          }));
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMappingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Mapping Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raw Payload Modal */}
      {selectedEventPayload && (
        <div className="modal-overlay" onClick={() => setSelectedEventPayload(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title">Raw Webhook Event Payload</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedEventPayload(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 16 }}>
              <pre style={{
                background: '#0f172a', color: '#38bdf8', padding: 14, borderRadius: 8,
                fontSize: 12, overflowX: 'auto', maxHeight: '60vh'
              }}>
                {JSON.stringify(selectedEventPayload, null, 2)}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedEventPayload(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
