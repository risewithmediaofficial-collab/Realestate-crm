import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Phone, PhoneCall, PhoneOff, MessageSquare, Mail, Send,
  Play, Pause, Mic, CheckCircle, Clock, Search, Plus,
  FileText, User, ChevronRight, CornerDownLeft, Sparkles, Filter,
  Trash2, X, AlertTriangle, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatPhone, timeAgo, getInitials } from '../../utils/formatters';
import { exportCallLogsCSV } from '../../utils/exportTemplates';

const mockCalls = [];

const mockWhatsappThreads = [];

const mockTemplates = [
  { title: 'Brochure & Welcome Pitch', channel: 'WhatsApp', text: 'Hello {{1}}, thank you for inquiring about {{2}}. Here is the official project brochure and pricing sheet: {{3}}. When can we schedule your VIP tour?' },
  { title: 'Site Visit Confirmation Reminder', channel: 'WhatsApp / SMS', text: 'Dear {{1}}, your site visit for {{2}} is confirmed for {{3}} at {{4}}. Location: {{5}}. Contact your executive at {{6}}.' },
  { title: 'Post-Visit Cost Sheet Followup', channel: 'Email', text: 'Dear {{1}}, thank you for visiting {{2}} today. Attached is the customized cost sheet for unit {{3}}. Please let us know if you need assistance with home loans.' },
];

export default function CommunicationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/whatsapp')) return 'whatsapp';
    if (location.pathname.includes('/email')) return 'email';
    if (location.pathname.includes('/templates')) return 'templates';
    return 'calling';
  };

  const [tab, setTab] = useState(getTabFromPath());
  const { user } = useAuth();
  
  // Call logs state
  const [callLogs, setCallLogs] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // single log to delete
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Dialer state
  const [dialNumber, setDialNumber] = useState('');
  const [callActive, setCallActive] = useState(false);
  const [callLead, setCallLead] = useState('');

  // WhatsApp state
  const [activeThread, setActiveThread] = useState(null);
  const [msgInput, setMsgInput] = useState('');
  const [threads, setThreads] = useState([]);

  // Email state
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    setTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setTab(tabId);
    navigate(`/communication/${tabId}`);
  };

  const startCall = (num, name = 'Prospective Buyer') => {
    setDialNumber(num);
    setCallLead(name);
    setCallActive(true);
  };

  const endCall = () => {
    setCallActive(false);
  };

  const handleDeleteLog = (logId) => {
    setCallLogs(prev => prev.filter(c => c.id !== logId));
    setDeleteTarget(null);
  };

  const handleClearAll = () => {
    setCallLogs([]);
    setShowClearAllConfirm(false);
  };

  const handleSendWhatsapp = (e) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    const newMsg = { sender: 'agent', text: msgInput, time: 'Just now' };
    const updated = { ...activeThread, messages: [...activeThread.messages, newMsg] };
    setActiveThread(updated);
    setThreads(prev => prev.map(t => t.id === activeThread.id ? updated : t));
    setMsgInput('');
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 4000);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Sales</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {tab === 'calling' ? 'Cloud Dialer & Call Logs' : tab === 'whatsapp' ? 'WhatsApp Live Chat' : tab === 'email' ? 'Email Automation' : 'Message Templates'}
            </span>
          </div>
          <h1 className="page-title">Communication Center</h1>
          <p className="page-subtitle">Cloud Telephony, Official WhatsApp API, Email & SMS Sequences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'calling', label: 'Cloud Calling & Call Logs' },
          { id: 'whatsapp', label: 'WhatsApp Live Chat' },
          { id: 'email', label: 'Email Automation' },
          { id: 'templates', label: 'Message Templates' },
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

      {/* TAB 1: Cloud Calling */}
      {tab === 'calling' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          {/* Virtual Dialer Box */}
          <div className="card" style={{ padding: 24, height: 'fit-content' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>CLOUD VIRTUAL DIALER</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Exotel / Knowlarity / Tata Telephony</div>
            </div>

            {callActive ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <PhoneCall size={32} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{callLead}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{dialNumber || '+91 98111 11111'}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)', marginTop: 12 }}>
                  01:24 <span style={{ fontSize: 12, fontWeight: 500 }}>● REC</span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button className="btn btn-danger w-full" onClick={endCall} style={{ justifyContent: 'center' }}>
                    <PhoneOff size={16} /> End Call & Log Disposition
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  className="form-input"
                  style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', letterSpacing: 1, marginBottom: 16 }}
                  placeholder="+91 00000 00000"
                  value={dialNumber}
                  onChange={e => setDialNumber(e.target.value)}
                />

                {/* Keypad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => (
                    <button
                      key={k}
                      className="btn btn-secondary"
                      style={{ height: 44, fontSize: 16, fontWeight: 700 }}
                      onClick={() => setDialNumber(p => p + k)}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-success w-full btn-lg"
                  style={{ justifyContent: 'center', fontWeight: 700 }}
                  onClick={() => startCall(dialNumber || '+91 98111 11111', 'Arjun Kapoor')}
                >
                  <PhoneCall size={18} /> Call Lead
                </button>
              </div>
            )}
          </div>

          {/* Call Logs Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Recent Call Recordings & Dispositions</div>
                <div className="card-subtitle">Auto-synced from telephony gateway • {callLogs.length} log{callLogs.length !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => exportCallLogsCSV(callLogs, user?.organization || 'MRP REAL ESTATE')}
                  title="Download call recordings & dispositions log CSV"
                >
                  <Download size={13} /> Export Logs CSV
                </button>
                {callLogs.length > 0 && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setShowClearAllConfirm(true)}
                    style={{ gap: 5 }}
                  >
                    <Trash2 size={13} /> Clear All
                  </button>
                )}
              </div>
            </div>
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Lead Name & Phone</th>
                    <th>Sales Rep</th>
                    <th>Call Duration</th>
                    <th>Call Outcome / Disposition</th>
                    <th>Timestamp</th>
                    <th>Recording</th>
                    <th style={{ width: 48, textAlign: 'center' }}>Del</th>
                  </tr>
                </thead>
                <tbody>
                  {callLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <Phone size={28} style={{ opacity: 0.3 }} />
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>No Call Logs</div>
                          <div style={{ fontSize: 12 }}>All logs have been cleared. New calls will appear here automatically.</div>
                        </div>
                      </td>
                    </tr>
                  ) : callLogs.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.lead}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{c.agent}</td>
                      <td>
                        <span className={`badge ${c.duration === '0m 00s' ? 'badge-danger' : 'badge-primary'}`}>
                          {c.duration}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, fontWeight: 500 }}>{c.outcome}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.time}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Play Call Recording"
                          style={{ color: 'var(--primary)' }}
                          onClick={() => alert(`Playing recording for call with ${c.lead}`)}
                        >
                          <Play size={14} />
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete this log"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WhatsApp Live Chat */}
      {tab === 'whatsapp' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 0, height: 600, border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', background: 'white', overflow: 'hidden' }}>
          {/* Contact List */}
          <div style={{ borderRight: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--card-border)', background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>WhatsApp Chats</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Official Meta Business Cloud API</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {threads.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No active WhatsApp chats</div>
                  <div>Incoming buyer messages via WhatsApp Cloud API will stream here automatically.</div>
                </div>
              ) : (
                threads.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setActiveThread(t)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: activeThread?.id === t.id ? '#f0f9ff' : 'transparent',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center'
                    }}
                  >
                    <div className="avatar avatar-sm">{getInitials(t.name || 'U')}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.time}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.messages?.[t.messages.length - 1]?.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Chat Window */}
          {activeThread ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--card-border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar avatar-sm">{getInitials(activeThread.name || 'U')}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{activeThread.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeThread.phone} • WhatsApp Verified</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => startCall(activeThread.phone, activeThread.name)}>
                    <Phone size={13} /> Call
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: '#fdfcfb', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeThread.messages?.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: m.sender === 'agent' ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      background: m.sender === 'agent' ? '#dcfce7' : 'white',
                      padding: '10px 14px',
                      borderRadius: 12,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{m.text}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>{m.time}</div>
                  </div>
                ))}
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSendWhatsapp} style={{ padding: '12px 16px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: 8, background: 'white' }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Type a message or press '/' for templates..."
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                  <Send size={15} /> Send
                </button>
              </form>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#fafbfc', color: 'var(--text-muted)' }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <MessageSquare size={26} color="#94a3b8" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>Select a WhatsApp Thread</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Choose a contact from the left list or wait for incoming client chats</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Email Automation */}
      {tab === 'email' && (
        <div className="card" style={{ padding: 24, maxWidth: 840 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Send Tracked Email with Cost Sheet & Brochure</div>

          {emailSent && (
            <div style={{ background: 'var(--success-light)', color: '#166534', padding: '10px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} /> Email sent successfully with open & link tracking enabled!
            </div>
          )}

          <form onSubmit={handleSendEmail}>
            <div className="form-group">
              <label className="form-label">To (Lead Email)</label>
              <input
                className="form-input"
                value={emailForm.to}
                onChange={e => setEmailForm(p => ({ ...p, to: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                className="form-input"
                value={emailForm.subject}
                onChange={e => setEmailForm(p => ({ ...p, subject: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Message Body</label>
              <textarea
                className="form-input"
                style={{ height: 220, resize: 'vertical', lineHeight: 1.5 }}
                value={emailForm.body}
                onChange={e => setEmailForm(p => ({ ...p, body: e.target.value }))}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                📎 Attachments: <strong>GreenValley_CostSheet_A301.pdf</strong> (1.4 MB)
              </div>
              <button type="submit" className="btn btn-primary">
                <Send size={15} /> Send Tracked Email
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Templates */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {mockTemplates.map((t, i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
                <span className="badge badge-primary">{t.channel}</span>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                {t.text}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Meta / DLT Status: <strong style={{ color: 'var(--success)' }}>Approved</strong></span>
                <button className="btn btn-secondary btn-sm" onClick={() => { setMsgInput(t.text); setTab('whatsapp'); }}>Use Template</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Single Log Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
                <AlertTriangle size={18} /> Delete Call Log
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Are you sure you want to delete the call log for <strong>{deleteTarget.lead}</strong> ({deleteTarget.time})?
                This action cannot be undone.
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#991b1b' }}>
                <strong>Log:</strong> {deleteTarget.outcome} — {deleteTarget.duration}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteLog(deleteTarget.id)}
              >
                <Trash2 size={14} /> Delete Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Logs Confirmation Modal */}
      {showClearAllConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearAllConfirm(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
                <AlertTriangle size={18} /> Clear All Call Logs
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowClearAllConfirm(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                You are about to permanently delete <strong>all {callLogs.length} call logs</strong>. This cannot be undone.
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#991b1b' }}>
                ⚠️ All recordings, dispositions and timestamps will be removed from this view.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowClearAllConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleClearAll}>
                <Trash2 size={14} /> Clear All {callLogs.length} Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
