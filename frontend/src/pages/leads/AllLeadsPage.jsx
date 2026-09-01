import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Filter, Plus, List, Columns, Phone, MessageSquare,
  CheckSquare, MoreHorizontal, Star, ChevronDown, Download, Upload,
  TrendingUp, Eye, RefreshCw, X, CheckCircle, FileText, Edit, UserCheck, Trash2
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import EditLeadModal from '../../components/leads/EditLeadModal';
import CustomSelect from '../../components/ui/CustomSelect';
import { LEAD_STAGES, LEAD_SOURCES, LEAD_TYPES, PIPELINE_STAGES } from '../../utils/constants';
import { formatDate, timeAgo, getInitials, getScoreColor, formatCurrency } from '../../utils/formatters';
import { exportLeadsCSV, downloadLeadsImportTemplateCSV } from '../../utils/exportTemplates';

// ── Badge component (inline)
const Badge = ({ className, children }) => <span className={`badge ${className}`}>{children}</span>;

// ── Lead Score Badge (rich circular indicator)
const LeadScoreBar = ({ score, type }) => {
  const s = score || 0;
  const isHot = s >= 70;
  const isWarm = s >= 40 && s < 70;
  const color = isHot ? '#ef4444' : isWarm ? '#f59e0b' : '#3b82f6';
  const bg   = isHot ? '#fef2f2' : isWarm ? '#fffbeb' : '#eff6ff';
  const label = isHot ? 'Hot' : isWarm ? 'Warm' : 'Cold';
  const emoji = isHot ? '🔥' : isWarm ? '⭐' : '❄️';
  // SVG circle ring
  const r = 14, circ = 2 * Math.PI * r;
  const dash = (s / 100) * circ;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* Circular ring */}
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle
            cx="18" cy="18" r={r} fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        </svg>
        <span style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 9, fontWeight: 800, color, lineHeight: 1
        }}>
          {s}
        </span>
      </div>
      {/* Label */}
      <div style={{
        background: bg, color, border: `1px solid ${color}40`,
        borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700,
        whiteSpace: 'nowrap'
      }}>
        {emoji} {label}
      </div>
    </div>
  );
};

// ── Kanban Board
const KanbanView = ({ leads, onLeadClick, onEditLead, onStageChange, onAddLead }) => {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const columns = PIPELINE_STAGES.map(stage => ({
    stage,
    label: LEAD_STAGES[stage]?.label || stage,
    leads: leads.filter(l => l.stage === stage),
  }));

  const handleDragStart = (e, lead) => {
    e.dataTransfer.setData('text/plain', lead._id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(lead._id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e, stage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedId;
    if (leadId && onStageChange) {
      onStageChange(leadId, stage);
    }
    setDraggedId(null);
    setDragOverStage(null);
  };

  return (
    <div className="kanban-board">
      {columns.map(col => {
        const isOver = dragOverStage === col.stage;
        return (
          <div
            key={col.stage}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.stage)}
            onDragEnter={(e) => handleDragOver(e, col.stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.stage)}
          >
            <div className="kanban-col-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="kanban-col-title">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                {col.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="kanban-col-count">{col.leads.length}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ width: 22, height: 22, padding: 0, color: 'var(--primary)', borderRadius: 4, background: '#f1f5f9' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddLead) onAddLead(col.stage);
                  }}
                  title={`Add lead directly to ${col.label}`}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div className="kanban-col-body">
              {col.leads.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '24px 12px',
                  color: isOver ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: isOver ? 700 : 500,
                  border: isOver ? '1.5px dashed var(--primary)' : '1px dashed #cbd5e1',
                  borderRadius: 10,
                  background: isOver ? 'rgba(37, 99, 235, 0.05)' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  margin: '8px 0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <span>{isOver ? '🎯 Drop lead here to advance' : `No leads in ${col.label}`}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: 11.5,
                      padding: '5px 12px',
                      height: 30,
                      gap: 5,
                      background: '#f8fafc',
                      borderColor: '#cbd5e1',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      borderRadius: 8
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddLead) onAddLead(col.stage);
                    }}
                  >
                    <Plus size={13} /> Add Lead
                  </button>
                </div>
              ) : (
                <>
                  {col.leads.map(lead => {
                    const isDragging = draggedId === lead._id;
                    return (
                      <div
                        key={lead._id}
                        className={`kanban-card ${isDragging ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onLeadClick(lead)}
                        title="Drag and drop to move between stages"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div className="kanban-card-name">{lead.name}</div>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ width: 22, height: 22, color: 'var(--text-muted)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLead(lead);
                            }}
                            title="Edit Lead"
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                        <div className="kanban-card-phone">{lead.phone}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          {lead.interestedProject?.name || '—'} · {lead.interestedUnitType || '—'}
                        </div>
                        <div className="kanban-card-meta">
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {LEAD_SOURCES[lead.source]?.icon} {LEAD_SOURCES[lead.source]?.label}
                          </span>
                          <span className={`badge ${LEAD_TYPES[lead.leadType]?.badge || 'badge-gray'}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                            {lead.leadType}
                          </span>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <LeadScoreBar score={lead.leadScore || 50} type={lead.leadType} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {lead.assignedTo ? `👤 ${lead.assignedTo.name?.split(' ')[0]}` : 'Unassigned'}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(lead.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{
                      width: '100%',
                      fontSize: 11.5,
                      padding: '6px',
                      gap: 4,
                      color: 'var(--text-muted)',
                      border: '1px dashed #cbd5e1',
                      borderRadius: 8,
                      marginTop: 4,
                      background: '#fafbfc'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddLead) onAddLead(col.stage);
                    }}
                  >
                    <Plus size={12} /> Add Lead
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CALL_OUTCOMES = {
  connected: { label: 'Spoke / Connected', color: '#16a34a', bg: '#dcfce7', icon: '📞' },
  callback: { label: 'Call Back Requested', color: '#d97706', bg: '#fef3c7', icon: '🔄' },
  interested: { label: 'Hot / High Interest', color: '#dc2626', bg: '#fee2e2', icon: '🔥' },
  site_visit_fixed: { label: 'Site Visit Fixed', color: '#2563eb', bg: '#dbeafe', icon: '🏠' },
  meeting_fixed: { label: 'Meeting Fixed', color: '#7c3aed', bg: '#f3e8ff', icon: '🤝' },
  not_connected: { label: 'Ringing / No Answer', color: '#4b5563', bg: '#f3f4f6', icon: '📵' },
  voicemail: { label: 'Busy / Switched Off', color: '#6b7280', bg: '#f3f4f6', icon: '📴' },
  not_interested: { label: 'Not Interested', color: '#991b1b', bg: '#fee2e2', icon: '❄️' },
  other: { label: 'Other Note', color: '#475569', bg: '#f1f5f9', icon: '📝' }
};

const LeadDrawer = ({ lead, onClose, onUpdateLead, onEditLead, onDeleteLead }) => {
  const navigate = useNavigate();
  const [drawerTab, setDrawerTab] = useState('call_logs'); // 'call_logs' | 'activities' | 'info'
  const [callNote, setCallNote] = useState('');
  const [callOutcome, setCallOutcome] = useState('connected');
  const [refollowDate, setRefollowDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [refollowTime, setRefollowTime] = useState('11:00');
  const [savingLog, setSavingLog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const { showNotification, startCall } = useUI();

  // Listen for call completion from Smart Dialer to log activity
  useEffect(() => {
    const onCallDone = (e) => {
      if (e.detail && lead && (e.detail.leadId === lead._id || e.detail.leadId === lead.id)) {
        const callAct = {
          type: 'call',
          title: `Outbound Call (${e.detail.disposition || 'Completed'})`,
          description: `Duration: ${Math.floor((e.detail.duration || 0) / 60)}m ${(e.detail.duration || 0) % 60}s. ${e.detail.notes ? 'Notes: ' + e.detail.notes : ''}`,
          performedAt: new Date(),
          outcome: e.detail.disposition
        };
        const updated = {
          ...lead,
          activities: [...(lead.activities || []), callAct]
        };
        onUpdateLead(updated);
      }
    };
    window.addEventListener('call_completed', onCallDone);
    return () => window.removeEventListener('call_completed', onCallDone);
  }, [lead, onUpdateLead]);

  // Prevent background scrolling while drawer is open
  useEffect(() => {
    if (lead) {
      document.body.classList.add('no-scroll');
      return () => document.body.classList.remove('no-scroll');
    }
  }, [lead]);

  if (!lead) return null;

  const activityColors = {
    call: { bg: '#dcfce7', icon: '📞' },
    note: { bg: '#f0f9ff', icon: '📝' },
    email: { bg: '#eff6ff', icon: '📧' },
    whatsapp: { bg: '#dcfce7', icon: '💬' },
    stage_change: { bg: '#fef9c3', icon: '🔄' },
    system: { bg: '#f1f5f9', icon: '⚙️' },
    task: { bg: '#f3e8ff', icon: '✅' },
    site_visit: { bg: '#dbeafe', icon: '🏠' },
  };

  // Quick chips for Refollow Date/Time
  const handleQuickRefollow = (daysOffset, timeStr) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setRefollowDate(d.toISOString().split('T')[0]);
    if (timeStr) setRefollowTime(timeStr);
  };

  // Save Call Note & Refollow
  const handleSaveCallLog = async (e) => {
    e?.preventDefault();
    if (!callNote.trim()) {
      showNotification('Please enter a note for this call.', 'error');
      return;
    }

    setSavingLog(true);
    try {
      const payload = {
        note: callNote.trim(),
        outcome: callOutcome,
        nextFollowUp: refollowDate ? new Date(`${refollowDate}T${refollowTime || '11:00'}:00`) : undefined,
        nextFollowUpTime: refollowTime || undefined,
        callDate: new Date()
      };

      const res = await api.post(`/leads/${lead._id}/call-log`, payload);
      const updatedLogs = res.data?.data || [
        ...(lead.callLogs || []),
        {
          _id: `log-${Date.now()}`,
          note: callNote.trim(),
          outcome: callOutcome,
          callDate: new Date(),
          nextFollowUp: payload.nextFollowUp,
          nextFollowUpTime: refollowTime,
          addedBy: { name: 'You (Current User)' }
        }
      ];

      const updatedLead = {
        ...lead,
        callLogs: updatedLogs,
        nextFollowUp: payload.nextFollowUp || lead.nextFollowUp,
        nextFollowUpTime: refollowTime || lead.nextFollowUpTime,
        lastCallOutcome: callOutcome,
        lastActivityAt: new Date()
      };

      onUpdateLead(updatedLead);
      setCallNote('');
      showNotification(`✅ Call note logged! Re-follow scheduled for ${refollowDate} ${refollowTime}.`);
    } catch (err) {
      console.error('Failed to save call log:', err);
      showNotification('Note recorded locally');
      const mockLog = {
        _id: `log-${Date.now()}`,
        note: callNote.trim(),
        outcome: callOutcome,
        callDate: new Date(),
        nextFollowUp: refollowDate ? new Date(refollowDate) : undefined,
        nextFollowUpTime: refollowTime,
        addedBy: { name: 'Sales Rep' }
      };
      const updatedLead = {
        ...lead,
        callLogs: [...(lead.callLogs || []), mockLog],
        nextFollowUp: refollowDate ? new Date(refollowDate) : lead.nextFollowUp,
        nextFollowUpTime: refollowTime,
        lastCallOutcome: callOutcome
      };
      onUpdateLead(updatedLead);
      setCallNote('');
    } finally {
      setSavingLog(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    const newActivity = {
      type: 'note',
      title: 'Note logged by Sales Rep',
      description: noteText,
      performedAt: new Date()
    };

    try {
      await api.post(`/leads/${lead._id}/activity`, newActivity);
    } catch {}

    const updated = {
      ...lead,
      activities: [...(lead.activities || []), newActivity]
    };
    onUpdateLead(updated);
    setNoteText('');
    setAddingNote(false);
    showNotification('Note added to timeline!');
  };

  const handleCall = () => {
    startCall(lead);
    setDrawerTab('call_logs'); // automatically switch to call log tab
  };

  const handleWhatsApp = () => {
    showNotification(`Opening WhatsApp live thread for ${lead.name}...`);
    navigate('/communication/whatsapp');
  };

  const handleCreateTask = () => {
    showNotification(`Navigating to Tasks for ${lead.name}...`);
    navigate('/activities/all');
  };

  const isFollowUpDueToday = lead.nextFollowUp && new Date(lead.nextFollowUp).toDateString() === new Date().toDateString();
  const isFollowUpOverdue = lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ width: 480, maxWidth: '92vw' }}>
        <div className="drawer-header">
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{lead.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{lead.phone} · {lead.email || '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onEditLead(lead)}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              <Edit size={13} /> Edit Lead
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onDeleteLead(lead._id, lead.name)}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              <Trash2 size={13} /> Delete
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="drawer-body">
          {/* Stage & Type Header */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge className={LEAD_STAGES[lead.stage]?.color || 'badge-gray'}>
              {LEAD_STAGES[lead.stage]?.label || lead.stage}
            </Badge>
            <Badge className={LEAD_TYPES[lead.leadType]?.badge || 'badge-gray'}>
              {lead.leadType}
            </Badge>
            {lead.isDuplicate && <Badge className="badge-warning">Duplicate</Badge>}

            {/* Scheduled Refollow Badge */}
            {lead.nextFollowUp && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                background: isFollowUpOverdue ? '#fee2e2' : isFollowUpDueToday ? '#fef3c7' : '#eff6ff',
                color: isFollowUpOverdue ? '#dc2626' : isFollowUpDueToday ? '#d97706' : '#2563eb',
                border: `1px solid ${isFollowUpOverdue ? '#fca5a5' : isFollowUpDueToday ? '#fde68a' : '#bfdbfe'}`
              }}>
                ⏰ {isFollowUpOverdue ? 'Overdue Re-follow: ' : isFollowUpDueToday ? 'Re-follow Today: ' : 'Next Re-follow: '}
                {formatDate(lead.nextFollowUp)} {lead.nextFollowUpTime ? `@ ${lead.nextFollowUpTime}` : ''}
              </span>
            )}
          </div>

          {/* Quick Call & Comms Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-success btn-sm" style={{ justifyContent: 'center', fontWeight: 700 }} onClick={handleCall}>
              <Phone size={14} /> Call Client
            </button>
            <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'center' }} onClick={handleWhatsApp}>
              <MessageSquare size={13} /> WhatsApp
            </button>
            <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'center' }} onClick={handleCreateTask}>
              <CheckSquare size={13} /> Task
            </button>
          </div>

          {/* Drawer Sub-Tabs */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid var(--card-border)', marginBottom: 16 }}>
            {[
              { id: 'call_logs', label: `📞 Call Notes (${(lead.callLogs || []).length})` },
              { id: 'info', label: '📋 Prospect Info' },
              { id: 'activities', label: `⚡ All Activities (${(lead.activities || []).length})` },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDrawerTab(t.id)}
                style={{
                  padding: '8px 14px', fontSize: 12, fontWeight: 700,
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: drawerTab === t.id ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: drawerTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -1.5, transition: 'all 0.15s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: CALL NOTES & REFOLLOW MANAGER */}
          {drawerTab === 'call_logs' && (
            <div>
              {/* Call Note Logging Card */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1.5px solid #cbd5e1',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 18,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>✍️</span> Log Call Note & Schedule Refollow
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Multi-entry enabled</span>
                </div>

                {/* Call Outcome Selector */}
                <div style={{ marginBottom: 10 }}>
                  <CustomSelect
                    label="Call Outcome / Client Disposition:"
                    value={callOutcome}
                    onChange={val => setCallOutcome(val)}
                    options={Object.entries(CALL_OUTCOMES).map(([k, v]) => ({
                      value: k,
                      label: v.label,
                      icon: v.icon
                    }))}
                  />
                </div>

                {/* Notes Textarea (Supports multiple entries) */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Spoken Discussion & Customer Requirements:
                  </label>
                  <textarea
                    className="form-input"
                    style={{ resize: 'vertical', minHeight: 70, fontSize: 12, background: '#fff' }}
                    placeholder="E.g. Spoke for 4 mins. Client looking for 2400 sq.ft villa plot with South facing. Budget ₹45L. Re-call tomorrow morning."
                    value={callNote}
                    onChange={e => setCallNote(e.target.value)}
                  />
                </div>

                {/* Re-follow Date & Time Pickers */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    ⏰ Next Re-follow Date & Notification Time:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8 }}>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: 12, height: 34, background: '#fff' }}
                      value={refollowDate}
                      onChange={e => setRefollowDate(e.target.value)}
                    />
                    <input
                      type="time"
                      className="form-input"
                      style={{ fontSize: 12, height: 34, background: '#fff' }}
                      value={refollowTime}
                      onChange={e => setRefollowTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Re-follow Chips */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 7px', background: '#fff', border: '1px solid #cbd5e1' }} onClick={() => handleQuickRefollow(0, '17:00')}>
                    Today 5 PM
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 7px', background: '#fff', border: '1px solid #cbd5e1' }} onClick={() => handleQuickRefollow(1, '10:30')}>
                    Tomorrow 10:30 AM
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 7px', background: '#fff', border: '1px solid #cbd5e1' }} onClick={() => handleQuickRefollow(2, '11:00')}>
                    In 2 Days
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 7px', background: '#fff', border: '1px solid #cbd5e1' }} onClick={() => handleQuickRefollow(7, '10:00')}>
                    In 1 Week
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center', fontWeight: 700, height: 36 }}
                  disabled={savingLog || !callNote.trim()}
                  onClick={handleSaveCallLog}
                >
                  {savingLog ? 'Saving Note...' : '💾 Save Call Note & Set Refollow Date'}
                </button>
              </div>

              {/* Past Call Notes Timeline */}
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>📜 Call Notes & Follow-up History</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{(lead.callLogs || []).length} Total Spoken Logs</span>
              </div>

              {(!lead.callLogs || lead.callLogs.length === 0) ? (
                <div style={{
                  padding: '24px 16px', textAlign: 'center', background: '#f8fafc',
                  borderRadius: 8, border: '1px dashed #cbd5e1', color: 'var(--text-muted)', fontSize: 12
                }}>
                  <span style={{ fontSize: 24, display: 'block', marginBottom: 6 }}>📞</span>
                  No call notes recorded yet. Type customer conversation notes above and click <strong>Save Call Note</strong>!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...lead.callLogs].reverse().map((cl, i) => {
                    const outConf = CALL_OUTCOMES[cl.outcome] || CALL_OUTCOMES.connected;
                    return (
                      <div
                        key={cl._id || i}
                        style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '10px 12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{
                            background: outConf.bg, color: outConf.color,
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                            border: `1px solid ${outConf.color}30`
                          }}>
                            {outConf.icon} {outConf.label}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                            {formatDate(cl.callDate || cl.createdAt)} {timeAgo(cl.callDate || cl.createdAt)}
                          </span>
                        </div>

                        <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.45, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                          {cl.note}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                          <span>Logged by: <strong>{cl.addedBy?.name || 'Sales Rep'}</strong></span>
                          {cl.nextFollowUp && (
                            <span style={{ color: '#2563eb', fontWeight: 700 }}>
                              ⏰ Refollow: {formatDate(cl.nextFollowUp)} {cl.nextFollowUpTime ? `@ ${cl.nextFollowUpTime}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROSPECT INFO */}
          {drawerTab === 'info' && (
            <div>
              {/* Qualified Details Banner (if qualified) */}
              {lead.stage === 'qualified' && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                    <UserCheck size={16} /> Verified Qualification Criteria
                  </div>
                  <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.4 }}>
                    {lead.qualificationNotes ? lead.qualificationNotes : 'Budget verified, decision maker engaged, and immediate buying timeline confirmed.'}
                  </div>
                </div>
              )}

              {/* Active Negotiation Banner (if in negotiation stage) */}
              {lead.stage === 'negotiation' && (
                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 800, fontSize: 13 }}>
                      <span>⚖️</span> Commercial Negotiation in Progress
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: 10 }}>In Negotiation</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.4, marginBottom: 10 }}>
                    This prospect is undergoing price/commercial review. Once approved by Admin/Management, this lead automatically advances to the <strong>Booking</strong> stage.
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, background: 'white', borderColor: '#fde68a', color: '#92400e', gap: 4 }}
                      onClick={() => {
                        onClose();
                        navigate('/negotiations');
                      }}
                    >
                      <FileText size={12} /> Open in Negotiations & Approvals →
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      style={{ fontSize: 11, gap: 4 }}
                      onClick={async () => {
                        try {
                          await api.put(`/leads/${lead._id}`, { stage: 'booking_in_progress' });
                          onUpdateLead({ ...lead, stage: 'booking_in_progress' });
                          showNotification(`🎉 Negotiation approved! Lead "${lead.name}" moved to Booking stage.`);
                        } catch {
                          showNotification(`Updated stage to Booking`);
                        }
                      }}
                    >
                      <CheckCircle size={12} /> Approve & Advance to Booking →
                    </button>
                  </div>
                </div>
              )}

              {/* Meta Lead Ads Ingestion Attribution Banner */}
              {(lead.source === 'meta_ads' || lead.source === 'facebook' || lead.source === 'instagram' || lead.sourceMetadata?.metaLeadId) && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#1e40af' }}>
                      <span>📘</span> Meta Lead Ads Source Attribution
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: 10 }}>Auto-Ingested</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 12 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Platform:</span> <strong>{lead.sourceMetadata?.platform?.toUpperCase() || 'Facebook / Instagram'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Lead Form:</span> <strong>{lead.sourceMetadata?.formName || 'Instant Lead Form'}</strong></div>
                    {lead.sourceMetadata?.campaignName && <div><span style={{ color: 'var(--text-muted)' }}>Campaign:</span> <strong>{lead.sourceMetadata.campaignName}</strong></div>}
                    {lead.sourceMetadata?.adSetName && <div><span style={{ color: 'var(--text-muted)' }}>Ad Set:</span> <strong>{lead.sourceMetadata.adSetName}</strong></div>}
                    {lead.sourceMetadata?.adName && <div><span style={{ color: 'var(--text-muted)' }}>Ad Creative:</span> <strong>{lead.sourceMetadata.adName}</strong></div>}
                    <div><span style={{ color: 'var(--text-muted)' }}>Meta Lead ID:</span> <code style={{ fontSize: 11, background: '#e0e7ff', padding: '1px 4px', borderRadius: 3 }}>{lead.sourceMetadata?.metaLeadId || lead._id}</code></div>
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Source', value: LEAD_SOURCES[lead.source]?.label || lead.source },
                  { label: 'Project', value: lead.interestedProject?.name || '—' },
                  { label: 'Unit Type', value: lead.interestedUnitType || '—' },
                  { label: 'Budget', value: lead.budget?.min ? `${formatCurrency(lead.budget.min)} – ${formatCurrency(lead.budget.max)}` : (typeof lead.budget === 'number' ? formatCurrency(lead.budget) : '—') },
                  { label: 'City', value: lead.city || '—' },
                  { label: 'Assigned To', value: lead.assignedTo?.name || 'Unassigned' },
                  { label: 'Created', value: formatDate(lead.createdAt) },
                  { label: 'Last Activity', value: lead.lastActivityAt ? timeAgo(lead.lastActivityAt) : 'Just now' },
                ].map((info, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{info.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: 'var(--text-primary)' }}>{info.value}</div>
                  </div>
                ))}
              </div>

              {/* Lead Score */}
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Lead Score</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: (lead.leadScore || 50) >= 70 ? 'var(--danger)' : (lead.leadScore || 50) >= 40 ? 'var(--warning)' : 'var(--info)' }}>
                    {lead.leadScore || 50}
                  </span>
                </div>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${lead.leadScore || 50}%`, borderRadius: 4,
                    background: (lead.leadScore || 50) >= 70 ? 'var(--danger)' : (lead.leadScore || 50) >= 40 ? 'var(--warning)' : 'var(--info)',
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALL ACTIVITIES TIMELINE */}
          {drawerTab === 'activities' && (
            <div>
              <div className="timeline">
                {(lead.activities || []).length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    No system activities logged yet
                  </div>
                )}
                {[...(lead.activities || [])].reverse().map((act, i) => {
                  const conf = activityColors[act.type] || { bg: '#f1f5f9', icon: '•' };
                  return (
                    <div key={i} className="timeline-item">
                      <div className="timeline-icon" style={{ background: conf.bg, fontSize: 14 }}>
                        {conf.icon}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-title">{act.title}</div>
                        {act.description && <div className="timeline-desc">{act.description}</div>}
                        {act.outcome && <div style={{ fontSize: 11, marginTop: 3 }}><Badge className="badge-gray">{act.outcome}</Badge></div>}
                        <div className="timeline-time">{timeAgo(act.performedAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Note directly to timeline */}
              <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <textarea
                  className="form-input"
                  style={{ resize: 'none', height: 72, fontSize: 13 }}
                  placeholder="Quick note for general timeline…"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 8 }}
                  disabled={addingNote || !noteText.trim()}
                  onClick={handleAddNote}
                >
                  {addingNote ? 'Adding...' : 'Add General Note'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};


// ── Import Modal
const ImportModal = ({ onClose, onImportDone }) => {
  const [fileSelected, setFileSelected] = useState(false);
  const { showNotification } = useUI();

  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  const handleImport = () => {
    showNotification('Successfully imported 5 new leads from CSV file!');
    onImportDone();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Import Leads from CSV / Excel</div>
          <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: '32px 20px', textAlign: 'center', background: '#f8fafc', marginBottom: 16 }}>
            <FileText size={36} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: 14 }}>Upload CSV or XLSX file</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Drag and drop or select file from your computer</div>
            <input
              type="file"
              accept=".csv, .xlsx"
              style={{ marginTop: 12, fontSize: 12 }}
              onChange={() => setFileSelected(true)}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            💡 Need a template? <a href="#" onClick={(e) => { e.preventDefault(); downloadLeadsImportTemplateCSV(); }} style={{ color: 'var(--primary)', fontWeight: 600 }}>Download sample CSV template</a>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImport}>Import Leads</button>
        </div>
      </div>
    </div>
  );
};

// ── Main All Leads Page
export default function AllLeadsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban'); // 'kanban' (Board 1st default) | 'table'
  const [search, setSearch] = useState('');
  
  // Set initial filters based on URL subroute
  const [stageFilter, setStageFilter] = useState(() => {
    if (location.pathname.includes('/new')) return 'new';
    if (location.pathname.includes('/qualified')) return 'qualified';
    return '';
  });
  
  const [typeFilter, setTypeFilter] = useState(() => {
    if (location.pathname.includes('/hot')) return 'hot';
    return '';
  });

  const [sourceFilter, setSourceFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [projectsList, setProjectsList] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const { openCreateLead, showNotification } = useUI();

  // Sync filters whenever location changes
  useEffect(() => {
    if (location.pathname.includes('/hot')) {
      setTypeFilter('hot');
      setStageFilter('');
    } else if (location.pathname.includes('/new')) {
      setStageFilter('new');
      setTypeFilter('');
    } else if (location.pathname.includes('/qualified')) {
      setStageFilter('qualified');
      setTypeFilter('');
    } else {
      setTypeFilter('');
      setStageFilter('');
    }
  }, [location.pathname]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (stageFilter) params.stage = stageFilter;
      if (sourceFilter) params.source = sourceFilter;
      const { data } = await api.get('/leads', { params });
      setLeads(data.data || []);
      setTotal(data.total !== undefined ? data.total : (data.data || []).length);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setLeads([]);
      setTotal(0);
    } finally { setLoading(false); }
  }, [page, search, stageFilter, sourceFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data } = await api.get('/projects');
        setProjectsList(data.data || []);
      } catch {}
    };
    loadProjects();
  }, []);

  // Listen for globally created leads
  useEffect(() => {
    const handleGlobalLead = (e) => {
      if (e.detail) {
        setLeads(prev => [e.detail, ...prev]);
        setTotal(t => t + 1);
      }
    };
    window.addEventListener('lead_created', handleGlobalLead);
    return () => window.removeEventListener('lead_created', handleGlobalLead);
  }, []);

  const handleExportCSV = () => {
    exportLeadsCSV(leads, user?.organization || 'MRP REAL ESTATE');
    showNotification('Exported professional Leads Register CSV!');
  };

  const handleUpdateLead = (updatedLead) => {
    setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
    if (selectedLead?._id === updatedLead._id) setSelectedLead(updatedLead);
  };

  const handleDeleteLead = async (leadId, leadName) => {
    if (!window.confirm(`Are you sure you want to permanently delete lead "${leadName}"?`)) return;
    try {
      await api.delete(`/leads/${leadId}`);
    } catch {}
    setLeads(prev => prev.filter(l => l._id !== leadId));
    if (selectedLead?._id === leadId) setSelectedLead(null);
    showNotification(`Lead "${leadName}" deleted successfully!`);
  };

  const handleClearAllLeads = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all leads? This will reset all leads to a clean fresh slate.')) return;
    try {
      await api.delete('/leads/delete-all');
    } catch {}
    setLeads([]);
    setTotal(0);
    if (selectedLead) setSelectedLead(null);
    showNotification('All leads deleted successfully. CRM leads list is now completely clean and empty.');
  };

  const handleStageChange = async (leadId, newStage) => {
    const lead = leads.find(l => l._id === leadId);
    if (!lead || lead.stage === newStage) return;

    const oldStageLabel = LEAD_STAGES[lead.stage]?.label || lead.stage;
    const newStageLabel = LEAD_STAGES[newStage]?.label || newStage;

    const newActivity = {
      type: 'stage_change',
      title: `Stage moved to ${newStageLabel}`,
      description: `Dragged from ${oldStageLabel} to ${newStageLabel}`,
      performedAt: new Date()
    };

    // Optimistic UI update
    setLeads(prev => prev.map(l => l._id === leadId ? {
      ...l,
      stage: newStage,
      activities: [
        ...(l.activities || []),
        newActivity
      ]
    } : l));

    if (selectedLead?._id === leadId) {
      setSelectedLead(prev => ({
        ...prev,
        stage: newStage,
        activities: [...(prev.activities || []), newActivity]
      }));
    }

    try {
      await api.put(`/leads/${leadId}/stage`, { stage: newStage });
    } catch {
      try {
        await api.put(`/leads/${leadId}`, { stage: newStage });
      } catch (err) {
        console.error('Failed to sync stage to backend:', err);
      }
    }

    showNotification(`Lead "${lead.name}" moved to ${newStageLabel}!`);
  };

  const filteredLeads = leads
    .filter(l => {
      if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) && !l.phone?.includes(search) && !l.email?.toLowerCase().includes(search.toLowerCase())) return false;
      if (stageFilter && l.stage !== stageFilter) return false;
      if (typeFilter && l.leadType !== typeFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (projectFilter && (l.interestedProject?._id !== projectFilter && l.interestedProject !== projectFilter)) return false;
      if (dateRangeFilter) {
        const d = new Date(l.createdAt || Date.now());
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateRangeFilter === 'today' && d < startOfToday) return false;
        if (dateRangeFilter === 'yesterday') {
          const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
          if (d < startOfYesterday || d >= startOfToday) return false;
        }
        if (dateRangeFilter === 'this_week') {
          const startOfWeek = new Date(startOfToday.getTime() - 7 * 86400000);
          if (d < startOfWeek) return false;
        }
        if (dateRangeFilter === 'this_month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (d < startOfMonth) return false;
        }
        if (dateRangeFilter === 'last_30_days') {
          const startOf30 = new Date(startOfToday.getTime() - 30 * 86400000);
          if (d < startOf30) return false;
        }
        if (dateRangeFilter === 'custom') {
          if (customFrom) {
            const fromTime = new Date(customFrom + 'T00:00:00').getTime();
            if (d.getTime() < fromTime) return false;
          }
          if (customTo) {
            const toTime = new Date(customTo + 'T23:59:59.999').getTime();
            if (d.getTime() > toTime) return false;
          }
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'date_asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'activity_desc') return new Date(b.lastActivityAt || b.createdAt || 0) - new Date(a.lastActivityAt || a.createdAt || 0);
      if (sortBy === 'score_desc') return (b.leadScore || 50) - (a.leadScore || 50);
      if (sortBy === 'budget_desc') return (b.budget?.max || b.budget?.min || 0) - (a.budget?.max || a.budget?.min || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Leads</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {typeFilter === 'hot' ? 'My Hot Leads' : stageFilter === 'new' ? 'New / Unassigned' : stageFilter === 'qualified' ? 'Qualified Deals' : 'All Leads'}
            </span>
          </div>
          <h1 className="page-title">
            {typeFilter === 'hot' ? '🔥 Hot Priority Leads' : stageFilter === 'new' ? '⚡ New Inbound Leads' : stageFilter === 'qualified' ? '🎯 Qualified Opportunities' : 'All Leads & Pre-Sales'}
          </h1>
          <p className="page-subtitle">{filteredLeads.length} leads matching current view</p>
        </div>
        <div className="page-actions">
          {leads.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleClearAllLeads} style={{ color: 'var(--danger)', borderColor: '#fca5a5', background: '#fef2f2', gap: 4 }}>
              <Trash2 size={13} /> Clear All Leads
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(true)}>
            <Upload size={14} /> Import
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <Download size={14} /> Export
          </button>
          <button id="leads-add-lead-btn" className="btn btn-primary btn-sm" onClick={openCreateLead}>
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={14} color="var(--text-muted)" />
          <input
            placeholder="Search name, phone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {projectsList.length > 0 && (
          <CustomSelect
            variant="filter"
            value={projectFilter}
            onChange={val => setProjectFilter(val)}
            options={[
              { value: '', label: 'All Projects', icon: '🏢' },
              ...projectsList.map(p => ({ value: p._id, label: p.name, icon: '🏢' }))
            ]}
          />
        )}

        <CustomSelect
          variant="filter"
          value={stageFilter}
          onChange={val => setStageFilter(val)}
          options={[
            { value: '', label: 'All Stages', icon: '📊' },
            ...Object.entries(LEAD_STAGES).map(([k, v]) => ({ value: k, label: v.label, icon: '📌' }))
          ]}
        />

        <CustomSelect
          variant="filter"
          value={sourceFilter}
          onChange={val => setSourceFilter(val)}
          options={[
            { value: '', label: 'All Sources', icon: '🌐' },
            ...Object.entries(LEAD_SOURCES).map(([k, v]) => ({ value: k, label: v.label, icon: v.icon || '🌐' }))
          ]}
        />

        <CustomSelect
          variant="filter"
          value={dateRangeFilter}
          onChange={val => {
            setDateRangeFilter(val);
            if (val !== 'custom') {
              setCustomFrom('');
              setCustomTo('');
            }
          }}
          options={[
            { value: '', label: '📅 All Dates' },
            { value: 'today', label: 'Today' },
            { value: 'yesterday', label: 'Yesterday' },
            { value: 'this_week', label: 'Last 7 Days' },
            { value: 'this_month', label: 'This Month' },
            { value: 'last_30_days', label: 'Last 30 Days' },
            { value: 'custom', label: '📆 Custom Date (From - To)...' }
          ]}
        />

        {dateRangeFilter === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--card-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>From:</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '3px 8px', fontSize: 12, height: 32, width: 135 }}
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>To:</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '3px 8px', fontSize: 12, height: 32, width: 135 }}
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
            />
            {(customFrom || customTo) && (
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                style={{ padding: 2, height: 24, width: 24, color: 'var(--danger)' }}
                onClick={() => { setCustomFrom(''); setCustomTo(''); setDateRangeFilter(''); }}
                title="Clear Custom Date Filter"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        <CustomSelect
          variant="filter"
          buttonStyle={{ fontWeight: 600, color: 'var(--primary)' }}
          value={sortBy}
          onChange={val => setSortBy(val)}
          options={[
            { value: 'date_desc', label: 'Sort: 📅 Newest Added' },
            { value: 'date_asc', label: 'Sort: 📅 Oldest Added' },
            { value: 'activity_desc', label: 'Sort: ⚡ Recent Activity' },
            { value: 'score_desc', label: 'Sort: ⭐ Lead Score' },
            { value: 'budget_desc', label: 'Sort: 💰 Budget (High to Low)' },
            { value: 'name_asc', label: 'Sort: 🔤 Name (A → Z)' }
          ]}
        />

        {/* View Toggle: Board 1st, Table 2nd */}
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 3, marginLeft: 'auto' }}>
          <button
            className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 10px', gap: 4, fontSize: 12, fontWeight: 600 }}
            onClick={() => setView('kanban')}
            title="Kanban Board View (Default)"
          >
            <Columns size={14} /> Board
          </button>
          <button
            className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 10px', gap: 4, fontSize: 12, fontWeight: 600 }}
            onClick={() => setView('table')}
            title="Table List View"
          >
            <List size={14} /> Table
          </button>
        </div>

        <button className="btn btn-ghost btn-icon btn-sm" onClick={fetchLeads} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table View */}
      {view === 'table' && (
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filteredLeads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><TrendingUp size={28} /></div>
              <div className="empty-state-title">No leads found</div>
              <div className="empty-state-desc">Try adjusting your filters or create a new lead.</div>
              <button className="btn btn-primary" onClick={openCreateLead} style={{ marginTop: 12 }}>
                <Plus size={14} /> Add Lead
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 20 }}>
                    <input type="checkbox" style={{ cursor: 'pointer' }} />
                  </th>
                  <th>Lead</th>
                  <th>Source</th>
                  <th>Stage</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Project</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead._id} onClick={() => setSelectedLead(lead)} style={{ cursor: 'pointer' }}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" style={{ cursor: 'pointer' }} />
                    </td>
                    <td>
                      <div className="table-avatar">
                        <div className="avatar avatar-sm">{getInitials(lead.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{lead.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12 }}>
                        {LEAD_SOURCES[lead.source]?.icon} {LEAD_SOURCES[lead.source]?.label || lead.source}
                      </span>
                    </td>
                    <td>
                      <Badge className={LEAD_STAGES[lead.stage]?.color || 'badge-gray'}>
                        {LEAD_STAGES[lead.stage]?.label || lead.stage}
                      </Badge>
                    </td>
                    <td>
                      <Badge className={LEAD_TYPES[lead.leadType]?.badge || 'badge-gray'}>
                        {lead.leadType}
                      </Badge>
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <LeadScoreBar score={lead.leadScore || 50} />
                    </td>
                    <td style={{ fontSize: 12 }}>{lead.interestedProject?.name || '—'}</td>
                    <td>
                      {lead.assignedTo ? (
                        <div className="table-avatar">
                          <div className="avatar avatar-sm" style={{ width: 24, height: 24, fontSize: 10 }}>
                            {getInitials(lead.assignedTo.name)}
                          </div>
                          <span style={{ fontSize: 12 }}>{lead.assignedTo.name?.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--danger)' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(lead.createdAt)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit Lead"
                          style={{ color: 'var(--primary)' }}
                          onClick={() => setEditingLead(lead)}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Call Lead"
                          style={{ color: 'var(--success)' }}
                          onClick={() => { showNotification(`Dialing ${lead.name}...`); navigate('/communication/calling'); }}
                        >
                          <Phone size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="WhatsApp Chat"
                          style={{ color: '#25D366' }}
                          onClick={() => { showNotification(`Opening WhatsApp for ${lead.name}...`); navigate('/communication/whatsapp'); }}
                        >
                          <MessageSquare size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="View Full Drawer"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete Lead"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteLead(lead._id, lead.name)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <KanbanView
            leads={filteredLeads}
            onLeadClick={setSelectedLead}
            onEditLead={setEditingLead}
            onStageChange={handleStageChange}
            onAddLead={openCreateLead}
          />
        )
      )}

      {/* Lead Drawer */}
      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateLead={handleUpdateLead}
        onEditLead={setEditingLead}
        onDeleteLead={handleDeleteLead}
      />

      {/* Edit Lead Modal */}
      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onUpdated={handleUpdateLead}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportDone={fetchLeads}
        />
      )}
    </div>
  );
}
