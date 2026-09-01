import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Zap, Play, Pause, Plus, CheckCircle, Clock, ArrowRight, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import CustomSelect from '../../components/ui/CustomSelect';

const mockRules = [
  { id: '1', name: 'Auto-Assign High Intent Meta Leads to Senior Sales Reps', trigger: 'Lead Created (Source: Meta Ads & Score >= 70)', condition: 'City = Pune AND Budget >= 1.0 Cr', action: 'Assign to Amit Singh + Send WhatsApp Brochure + Schedule Call Task in 15m', active: true, executedCount: 142, lastRun: '12m ago' },
  { id: '2', name: 'Instant WhatsApp Welcome Brochure on Webhook Ingest', trigger: 'Lead Ingestion from 99acres / MagicBricks', condition: 'Valid Phone Number', action: 'Trigger WhatsApp Template "brochure_welcome_v2" with Project PDF link', active: true, executedCount: 384, lastRun: '2m ago' },
  { id: '3', name: 'Manager SLA Escalation on Uncontacted Hot Leads', trigger: 'Lead in "New" stage > 30 minutes without disposition', condition: 'Lead Type = Hot', action: 'Send Slack Notification to VP Sales + Reassign to next available executive', active: true, executedCount: 19, lastRun: '1h ago' },
  { id: '4', name: 'Post-Site Visit Feedback & Demand Notice Drip', trigger: 'Site Visit Status updated to "Completed"', condition: 'Outcome = Interested', action: 'Send automated thank-you note + Generate unit cost sheet link', active: true, executedCount: 57, lastRun: '4h ago' },
  { id: '5', name: 'Payment Overdue Interest Calculation & Auto-Reminder', trigger: 'Milestone Demand Overdue > 7 Days', condition: 'Balance Amount > 0', action: 'Send WhatsApp reminder with payment link + Create collection task for accounts', active: false, executedCount: 8, lastRun: '2 days ago' },
];

const mockLogs = [];

export default function AutomationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/logs')) return 'logs';
    return 'rules';
  };

  const [tab, setTab] = useState(getTabFromPath());
  const [rules, setRules] = useState(mockRules);
  const [showModal, setShowModal] = useState(false);
  const { showNotification } = useUI();

  const [form, setForm] = useState({
    name: '', trigger: 'Lead Created (Any Source)', condition: 'Lead Score >= 50', action: 'Assign round-robin + Send WhatsApp Greeting'
  });

  useEffect(() => {
    setTab(getTabFromPath());
  }, [location.pathname]);

  useEffect(() => {
    if (showModal) {
      document.body.classList.add('no-scroll');
      return () => document.body.classList.remove('no-scroll');
    }
  }, [showModal]);

  const handleTabChange = (tabId) => {
    setTab(tabId);
    navigate(`/automation/${tabId}`);
  };

  const toggleRule = (id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    showNotification('Rule status toggled!');
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const newR = { ...form, id: Date.now().toString(), active: true, executedCount: 0, lastRun: 'Never' };
    setRules(p => [newR, ...p]);
    setShowModal(false);
    showNotification('Automation workflow rule deployed!');
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Operations</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{tab === 'rules' ? 'Workflow Rules' : 'Execution Logs'}</span>
          </div>
          <h1 className="page-title">Sales Automation & Workflow Builder</h1>
          <p className="page-subtitle">Event-driven triggers, lead distribution engines, SLA escalations and WhatsApp bots</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> New Workflow
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'rules', label: 'Active Workflow Rules', count: rules.length },
          { id: 'logs', label: 'Live Execution Logs', count: mockLogs.length },
        ].map(t => (
          <div
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label} <span className="badge badge-gray" style={{ marginLeft: 4 }}>{t.count}</span>
          </div>
        ))}
      </div>

      {tab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rules.map(r => (
            <div key={r.id} className="card" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 320 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
                    <span className={`badge ${r.active ? 'badge-success' : 'badge-gray'}`}>
                      {r.active ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  {/* Flow Steps */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '12px 0', fontSize: 12 }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: 6, color: '#1e40af', fontWeight: 600 }}>
                      ⚡ {r.trigger}
                    </div>
                    <ArrowRight size={14} color="var(--text-muted)" />
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: 6, color: '#92400e', fontWeight: 600 }}>
                      🔍 IF: {r.condition}
                    </div>
                    <ArrowRight size={14} color="var(--text-muted)" />
                    <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', padding: '6px 10px', borderRadius: 6, color: '#166534', fontWeight: 600 }}>
                      🚀 THEN: {r.action}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Total Runs: <strong>{r.executedCount} times</strong> • Last run: {r.lastRun}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignSelf: 'center' }}>
                  <button
                    className={`btn btn-sm ${r.active ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => toggleRule(r.id)}
                  >
                    {r.active ? <Pause size={13} /> : <Play size={13} />}
                    {r.active ? 'Pause' : 'Enable'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => alert(`Testing trigger for rule: ${r.name}`)}>Test Trigger</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'logs' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Workflow Name</th>
                <th>Target Lead</th>
                <th>Status</th>
                <th>Execution Payload / Details</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 700 }}>{l.rule}</td>
                  <td style={{ fontWeight: 600 }}>{l.lead}</td>
                  <td>
                    <span className={`badge ${l.status === 'success' ? 'badge-success' : 'badge-warning'}`}>
                      {l.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{l.details}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Workflow Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create Workflow Automation Rule</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Workflow Name <span className="required">*</span></label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. VIP NRI Lead Escalation"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Trigger Event <span className="required">*</span></label>
                  <CustomSelect
                    value={form.trigger}
                    onChange={val => setForm(p => ({ ...p, trigger: typeof val === 'object' && val.target ? val.target.value : val }))}
                    options={[
                      { value: 'Lead Created (Source: Meta / Google / Webhook)', label: 'Lead Created (Source: Meta / Google / Webhook)', icon: '⚡' },
                      { value: 'Site Visit Completed', label: 'Site Visit Completed', icon: '🚗' },
                      { value: 'Booking Application Submitted', label: 'Booking Application Submitted', icon: '📝' },
                      { value: 'Milestone Payment Demand Due', label: 'Milestone Payment Demand Due', icon: '💳' },
                      { value: 'SLA Breached (No call for 30m)', label: 'SLA Breached (No call for 30m)', icon: '⏱️' }
                    ]}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Filter Condition (IF)</label>
                  <input
                    className="form-input"
                    value={form.condition}
                    onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
                    placeholder="e.g. Budget >= 1.5 Cr AND City = Mumbai"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Automated Action (THEN) <span className="required">*</span></label>
                  <input
                    className="form-input"
                    value={form.action}
                    onChange={e => setForm(p => ({ ...p, action: e.target.value }))}
                    placeholder="e.g. Send WhatsApp Template + Assign to Sales Head"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Deploy Workflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
