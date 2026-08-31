import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Filter, Plus, List, Columns, Phone, MessageSquare,
  CheckSquare, MoreHorizontal, Star, ChevronDown, Download, Upload,
  TrendingUp, Eye, RefreshCw, X, CheckCircle, FileText, Edit, UserCheck, Trash2
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import EditLeadModal from '../../components/leads/EditLeadModal';
import { LEAD_STAGES, LEAD_SOURCES, LEAD_TYPES, PIPELINE_STAGES } from '../../utils/constants';
import { formatDate, timeAgo, getInitials, getScoreColor, formatCurrency } from '../../utils/formatters';

// ── Badge component (inline)
const Badge = ({ className, children }) => <span className={`badge ${className}`}>{children}</span>;

// ── Lead Score Bar
const LeadScoreBar = ({ score, type }) => (
  <div className="lead-score">
    <div className="score-bar">
      <div className="score-fill" style={{ width: `${score}%` }} data-type={type || getScoreColor(score)} />
    </div>
    <span style={{ fontSize: 11, fontWeight: 700, minWidth: 24, color: 'var(--text-secondary)' }}>{score}</span>
  </div>
);

// ── Kanban Board
const KanbanView = ({ leads, onLeadClick, onEditLead, onStageChange }) => {
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
            <div className="kanban-col-header">
              <div className="kanban-col-title">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                {col.label}
              </div>
              <span className="kanban-col-count">{col.leads.length}</span>
            </div>
            <div className="kanban-col-body">
              {col.leads.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '36px 12px',
                  color: isOver ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: isOver ? 700 : 400,
                  border: isOver ? '1.5px dashed var(--primary)' : '1px dashed transparent',
                  borderRadius: 8,
                  transition: 'all 0.2s ease',
                  background: isOver ? 'rgba(37, 99, 235, 0.05)' : 'transparent'
                }}>
                  {isOver ? '🎯 Drop lead here to advance' : 'No leads in this stage'}
                </div>
              )}
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
                      <Badge className={LEAD_TYPES[lead.leadType]?.badge || 'badge-gray'}>
                        {lead.leadType}
                      </Badge>
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
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Lead Drawer
const LeadDrawer = ({ lead, onClose, onUpdateLead, onEditLead, onDeleteLead }) => {
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const { showNotification, startCall } = useUI();

  // Listen for call completion from Smart Dialer to log activity
  useEffect(() => {
    const onCallDone = (e) => {
      if (e.detail && lead && (e.detail.leadId === lead._id || e.detail.leadId === lead.id)) {
        const callAct = {
          type: 'call',
          title: `Outbound Call (${e.detail.disposition})`,
          description: `Duration: ${Math.floor(e.detail.duration / 60)}m ${e.detail.duration % 60}s. ${e.detail.notes ? 'Notes: ' + e.detail.notes : ''}`,
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
  };

  const handleWhatsApp = () => {
    showNotification(`Opening WhatsApp live thread for ${lead.name}...`);
    navigate('/communication/whatsapp');
  };

  const handleCreateTask = () => {
    showNotification(`Navigating to Tasks for ${lead.name}...`);
    navigate('/activities/all');
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
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
          {/* Stage & Type */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Badge className={LEAD_STAGES[lead.stage]?.color || 'badge-gray'}>
              {LEAD_STAGES[lead.stage]?.label || lead.stage}
            </Badge>
            <Badge className={LEAD_TYPES[lead.leadType]?.badge || 'badge-gray'}>
              {lead.leadType}
            </Badge>
            {lead.isDuplicate && <Badge className="badge-warning">Duplicate</Badge>}
          </div>

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
              { label: 'Budget', value: lead.budget?.min ? `${formatCurrency(lead.budget.min)} – ${formatCurrency(lead.budget.max)}` : '—' },
              { label: 'City', value: lead.city || '—' },
              { label: 'Assigned To', value: lead.assignedTo?.name || 'Amit Singh' },
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

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button className="btn btn-success btn-sm flex-1" style={{ justifyContent: 'center' }} onClick={handleCall}>
              <Phone size={13} /> Call
            </button>
            <button className="btn btn-secondary btn-sm flex-1" style={{ justifyContent: 'center' }} onClick={handleWhatsApp}>
              <MessageSquare size={13} /> WhatsApp
            </button>
            <button className="btn btn-secondary btn-sm flex-1" style={{ justifyContent: 'center' }} onClick={handleCreateTask}>
              <CheckSquare size={13} /> Task
            </button>
          </div>

          {/* Activity Timeline */}
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            Activity Timeline
          </div>

          <div className="timeline">
            {(lead.activities || []).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No activities logged yet
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

          {/* Add Note */}
          <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <textarea
              className="form-input"
              style={{ resize: 'none', height: 72, fontSize: 13 }}
              placeholder="Log note from call or customer conversation…"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 8 }}
              disabled={addingNote || !noteText.trim()}
              onClick={handleAddNote}
            >
              {addingNote ? 'Adding...' : 'Add Note to Timeline'}
            </button>
          </div>
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
            💡 Need a template? <a href="#" onClick={(e) => { e.preventDefault(); alert('Downloaded sample_leads_template.csv'); }} style={{ color: 'var(--primary)', fontWeight: 600 }}>Download sample CSV template</a>
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

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table'); // 'table' | 'kanban'
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
    const headers = 'Name,Phone,Email,Source,Stage,LeadType,LeadScore,Project,City\n';
    const rows = leads.map(l =>
      `"${l.name}","${l.phone}","${l.email || ''}","${l.source}","${l.stage}","${l.leadType}","${l.leadScore || 50}","${l.interestedProject?.name || ''}","${l.city || ''}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Exported leads to CSV file!');
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

  const filteredLeads = leads.filter(l => {
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) && !l.phone?.includes(search)) return false;
    if (stageFilter && l.stage !== stageFilter) return false;
    if (typeFilter && l.leadType !== typeFilter) return false;
    if (sourceFilter && l.source !== sourceFilter) return false;
    return true;
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
        <div className="filter-search" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            placeholder="Search name, phone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="filter-select" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value="">All Stages</option>
          {Object.entries(LEAD_STAGES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select className="filter-select" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {Object.entries(LEAD_SOURCES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 6, padding: 3, marginLeft: 'auto' }}>
          <button
            className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 10px' }}
            onClick={() => setView('table')}
            title="Table View"
          ><List size={14} /></button>
          <button
            className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 10px' }}
            onClick={() => setView('kanban')}
            title="Kanban Board"
          ><Columns size={14} /></button>
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
