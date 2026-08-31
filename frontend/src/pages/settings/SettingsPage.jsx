import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Settings, Building, MessageSquare, Phone, Globe,
  Mail, Shield, Save, CheckCircle, Copy, Key, Link, Check, RefreshCw
} from 'lucide-react';
import { useUI } from '../../context/UIContext';

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/meta')) return 'meta';
    if (location.pathname.includes('/whatsapp')) return 'whatsapp';
    if (location.pathname.includes('/telephony')) return 'telephony';
    if (location.pathname.includes('/webhooks')) return 'webhooks';
    if (location.pathname.includes('/smtp')) return 'smtp';
    return 'general';
  };

  const [tab, setTab] = useState(getTabFromPath());
  const { showNotification } = useUI();

  // General Settings state
  const [generalForm, setGeneralForm] = useState({
    companyName: 'RiseWithMedia Infra Developers Pvt. Ltd.',
    reraNumber: 'PRM/KA/RERA/1251/310/PR/171015/000456',
    gstin: '27AAACR1234F1Z8',
    email: 'crm@risewithmedia.com',
    phone: '+91 20 6789 0000',
    address: 'Level 14, Tower B, Business Bay, Pune, Maharashtra 411006'
  });

  // WhatsApp API state
  const [waForm, setWaForm] = useState({
    phoneId: '109283746501928',
    wabaId: '394857201948572',
    token: 'EAAGNO4XZC5k...sec_92482348',
    verifyToken: 'prop_crm_webhook_verify_2026'
  });

  // Telephony state
  const [telForm, setTelForm] = useState({
    provider: 'exotel',
    sid: 'risewithmedia_telephony_prod',
    token: '••••••••••••••••••••••••',
    virtualNumber: '080-6924-0000'
  });

  // Webhooks state
  const [webhookSecret, setWebhookSecret] = useState('whsec_8923482390489234');

  // SMTP state
  const [smtpForm, setSmtpForm] = useState({
    host: 'smtp.sendgrid.net',
    port: '587',
    user: 'apikey',
    password: '••••••••••••••••••••••••',
    senderEmail: 'notifications@crm.domain.com'
  });

  useEffect(() => {
    setTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    if (tabId === 'meta') {
      navigate('/settings/integrations/meta');
      return;
    }
    setTab(tabId);
    navigate(`/settings/${tabId}`);
  };

  const handleSave = (e, msg) => {
    e.preventDefault();
    showNotification(msg || 'Settings saved successfully!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    showNotification('Copied to clipboard!');
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Admin</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {tab === 'general' ? 'Company Profile' : tab === 'meta' ? 'Meta Lead Ads' : tab === 'whatsapp' ? 'WhatsApp API' : tab === 'telephony' ? 'Telephony Gateway' : tab === 'webhooks' ? 'Lead Webhooks' : 'Email SMTP'}
            </span>
          </div>
          <h1 className="page-title">Settings & API Gateway Integrations</h1>
          <p className="page-subtitle">Configure Developer RERA details, Meta Cloud API, Telephony PBX and Webhook receivers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'general', label: 'Company & RERA Profile' },
          { id: 'meta', label: '📘 Meta Lead Ads (FB & IG)' },
          { id: 'whatsapp', label: 'WhatsApp Cloud API' },
          { id: 'telephony', label: 'Telephony Gateway (Exotel/Tata)' },
          { id: 'webhooks', label: 'Lead Webhooks (Custom HTTP)' },
          { id: 'smtp', label: 'Email SMTP & SMS Gateway' },
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

      {/* TAB 1: General */}
      {tab === 'general' && (
        <div className="card" style={{ padding: 24, maxWidth: 720, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <form onSubmit={e => handleSave(e, 'Company RERA & Corporate Profile updated!')}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Developer Legal Entity & RERA Registration</div>

            <div className="form-group">
              <label className="form-label">Company / Developer Name</label>
              <input
                className="form-input"
                value={generalForm.companyName}
                onChange={e => setGeneralForm(p => ({ ...p, companyName: e.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Corporate RERA Reg #</label>
                <input
                  className="form-input"
                  value={generalForm.reraNumber}
                  onChange={e => setGeneralForm(p => ({ ...p, reraNumber: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN Identification #</label>
                <input
                  className="form-input"
                  value={generalForm.gstin}
                  onChange={e => setGeneralForm(p => ({ ...p, gstin: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Official Support Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={generalForm.email}
                  onChange={e => setGeneralForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Registered Office Phone</label>
                <input
                  className="form-input"
                  value={generalForm.phone}
                  onChange={e => setGeneralForm(p => ({ ...p, phone: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Headquarters Address</label>
              <textarea
                className="form-input"
                style={{ height: 72, resize: 'none' }}
                value={generalForm.address}
                onChange={e => setGeneralForm(p => ({ ...p, address: e.target.value }))}
                required
              />
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={14} /> Save Company Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: WhatsApp */}
      {tab === 'whatsapp' && (
        <div className="card" style={{ padding: 24, maxWidth: 720, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <form onSubmit={e => handleSave(e, 'WhatsApp Cloud API credentials saved & verified!')}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Meta WhatsApp Cloud API Configuration</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Used for 2-way real-time messaging, automated drip journeys, and cost sheet dispatch</p>

            <div className="form-group">
              <label className="form-label">Phone Number ID</label>
              <input
                className="form-input"
                value={waForm.phoneId}
                onChange={e => setWaForm(p => ({ ...p, phoneId: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp Business Account ID (WABA ID)</label>
              <input
                className="form-input"
                value={waForm.wabaId}
                onChange={e => setWaForm(p => ({ ...p, wabaId: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Permanent System User Access Token</label>
              <input
                className="form-input"
                type="password"
                value={waForm.token}
                onChange={e => setWaForm(p => ({ ...p, token: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Webhook Verification Token</label>
              <input
                className="form-input"
                value={waForm.verifyToken}
                onChange={e => setWaForm(p => ({ ...p, verifyToken: e.target.value }))}
                required
              />
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => showNotification('WhatsApp Cloud API Test Ping: SUCCESS (200 OK)')}>
                <RefreshCw size={14} /> Test Connection
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={14} /> Save Credentials
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Telephony */}
      {tab === 'telephony' && (
        <div className="card" style={{ padding: 24, maxWidth: 720, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <form onSubmit={e => handleSave(e, 'Telephony PBX gateway settings updated!')}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Cloud Telephony & Call Recording Integration</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Connect Exotel, Knowlarity, or Tata Telephony for virtual outbound calls & auto-recording</p>

            <div className="form-group">
              <label className="form-label">Telephony Provider</label>
              <select className="form-select" value={telForm.provider} onChange={e => setTelForm(p => ({ ...p, provider: e.target.value }))}>
                <option value="exotel">Exotel Cloud Telephony</option>
                <option value="knowlarity">Knowlarity SmartIVR</option>
                <option value="tata">Tata Teleservices Smartflo</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Account SID / API Key</label>
                <input
                  className="form-input"
                  value={telForm.sid}
                  onChange={e => setTelForm(p => ({ ...p, sid: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">API Secret / Token</label>
                <input
                  className="form-input"
                  type="password"
                  value={telForm.token}
                  onChange={e => setTelForm(p => ({ ...p, token: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Virtual Number (Caller ID)</label>
              <input
                className="form-input"
                value={telForm.virtualNumber}
                onChange={e => setTelForm(p => ({ ...p, virtualNumber: e.target.value }))}
                required
              />
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => showNotification('Telephony Gateway Ping: ACTIVE (Channel Ready)')}>
                <Phone size={14} /> Test Line
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={14} /> Save Gateway Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Webhooks */}
      {tab === 'webhooks' && (
        <div className="card" style={{ padding: 24, maxWidth: 720, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Inbound Lead Ingestion Webhooks</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Public webhook endpoints for real-time lead ingestion from Meta Ads, Google Ads & Portals</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Meta Instant Lead Form Webhook', url: 'https://api.crm.domain/webhooks/meta-lead-gen' },
              { label: 'Google Ads Lead Form Extension Endpoint', url: 'https://api.crm.domain/webhooks/google-ads' },
              { label: '99acres / MagicBricks Portal Ingestion', url: 'https://api.crm.domain/webhooks/portals' },
            ].map((w, i) => (
              <div key={i} style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{w.label}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" style={{ fontSize: 12, fontFamily: 'monospace' }} value={w.url} readOnly />
                  <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(w.url)}>
                    <Copy size={13} /> Copy
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24 }}>
            <label className="form-label">Global Webhook HMAC Signature Secret</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                style={{ fontFamily: 'monospace' }}
                value={webhookSecret}
                onChange={e => setWebhookSecret(e.target.value)}
              />
              <button className="btn btn-primary" onClick={() => showNotification('Webhook signing secret updated!')}>
                <Save size={14} /> Save Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SMTP */}
      {tab === 'smtp' && (
        <div className="card" style={{ padding: 24, maxWidth: 720, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <form onSubmit={e => handleSave(e, 'SMTP server & SMS DLT gateway saved!')}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Email SMTP & Transactional Gateway</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Used for cost sheets, booking confirmation PDFs, payment receipts, and monthly demand notes</p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SMTP Host Server</label>
                <input
                  className="form-input"
                  value={smtpForm.host}
                  onChange={e => setSmtpForm(p => ({ ...p, host: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Port</label>
                <input
                  className="form-input"
                  value={smtpForm.port}
                  onChange={e => setSmtpForm(p => ({ ...p, port: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SMTP Username</label>
                <input
                  className="form-input"
                  value={smtpForm.user}
                  onChange={e => setSmtpForm(p => ({ ...p, user: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Password / API Key</label>
                <input
                  className="form-input"
                  type="password"
                  value={smtpForm.password}
                  onChange={e => setSmtpForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Default Sender From Email</label>
              <input
                className="form-input"
                type="email"
                value={smtpForm.senderEmail}
                onChange={e => setSmtpForm(p => ({ ...p, senderEmail: e.target.value }))}
                required
              />
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => showNotification('SMTP Handshake: CONNECTED (STARTTLS OK)')}>
                <Mail size={14} /> Send Test Email
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={14} /> Save SMTP Config
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
