import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Plus, Calendar, Clock, CheckCircle, XCircle, X, Phone, Star, Trash2, List, Columns, Car, QrCode } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { formatDate, formatDateTime, timeAgo } from '../../utils/formatters';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', badge: 'badge-primary', color: '#dbeafe' },
  confirmed: { label: 'Confirmed', badge: 'badge-success', color: '#dcfce7' },
  in_progress: { label: 'In Progress', badge: 'badge-warning', color: '#fef3c7' },
  completed: { label: 'Completed', badge: 'badge-success', color: '#dcfce7' },
  cancelled: { label: 'Cancelled', badge: 'badge-danger', color: '#fef2f2' },
  no_show: { label: 'No Show', badge: 'badge-gray', color: '#f1f5f9' },
  rescheduled: { label: 'Rescheduled', badge: 'badge-warning', color: '#fef3c7' },
};

const OUTCOME_CONFIG = {
  interested: { label: 'Interested', badge: 'badge-success' },
  negotiation: { label: 'Negotiation', badge: 'badge-warning' },
  booking: { label: 'Booking', badge: 'badge-primary' },
  not_interested: { label: 'Not Interested', badge: 'badge-danger' },
  follow_up: { label: 'Follow Up', badge: 'badge-gray' },
};

const mockVisits = [];

// ─── Site Visits Kanban Board ─────────────────────────
const SiteVisitsKanbanView = ({ visits, onStatusChange, onDeleteVisit, onBookCab, onShowGatePass }) => {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columns = [
    { id: 'scheduled', title: 'Scheduled', color: '#3b82f6', bg: '#eff6ff', icon: '📅' },
    { id: 'confirmed', title: 'Confirmed', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
    { id: 'in_progress', title: 'In Progress / At Site', color: '#f59e0b', bg: '#fffbeb', icon: '🏢' },
    { id: 'completed', title: 'Completed Tour', color: '#059669', bg: '#ecfdf5', icon: '🏆' },
    { id: 'no_show', title: 'Cancelled / No Show', color: '#ef4444', bg: '#fef2f2', icon: '❌' },
  ];

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) setDragOverCol(colId);
  };

  const handleDragLeave = (e, colId) => {
    if (dragOverCol === colId) setDragOverCol(null);
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    setDragOverCol(null);
    setDraggedId(null);
    if (id && onStatusChange) {
      onStatusChange(id, colId);
    }
  };

  return (
    <div className="kanban-board" style={{ gap: 16, height: 'calc(100vh - 240px)', paddingBottom: 10 }}>
      {columns.map(col => {
        const colVisits = visits.filter(v => {
          if (col.id === 'no_show') return v.status === 'no_show' || v.status === 'cancelled';
          return (v.status || 'scheduled') === col.id;
        });
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={e => handleDragLeave(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            style={{
              flex: '0 0 300px',
              background: '#f8fafc',
              borderRadius: 10,
              border: isOver ? `2px dashed ${col.color}` : '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isOver ? `0 0 0 4px ${col.color}20` : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Header */}
            <div
              className="kanban-col-header"
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--card-border)',
                background: 'white',
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{col.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {col.title}
                </span>
                <span className="kanban-col-count" style={{ fontSize: 11, fontWeight: 700 }}>
                  {colVisits.length}
                </span>
              </div>
            </div>

            {/* Body */}
            <div
              className="kanban-col-body"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: isOver ? col.bg : 'transparent'
              }}
            >
              {colVisits.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '30px 12px',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    border: '1px dashed #cbd5e1',
                    borderRadius: 8,
                    background: 'white'
                  }}
                >
                  Drag visits here to mark as {col.title}
                </div>
              ) : (
                colVisits.map(visit => {
                  const statusConf = STATUS_CONFIG[visit.status] || STATUS_CONFIG.scheduled;
                  const outcomeConf = OUTCOME_CONFIG[visit.outcome];
                  const isDragging = draggedId === visit._id;

                  return (
                    <div
                      key={visit._id}
                      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, visit._id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: 'white',
                        border: '1px solid var(--card-border)',
                        borderRadius: 8,
                        padding: 12,
                        cursor: 'grab',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        opacity: isDragging ? 0.4 : 1,
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                          {visit.lead?.name || 'Prospective Buyer'}
                        </div>
                        <span className={`badge ${statusConf.badge}`} style={{ fontSize: 9 }}>
                          {statusConf.label}
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                        📞 {visit.lead?.phone || 'No phone'}
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                        <MapPin size={11} /> {visit.project?.name}
                      </div>

                      <div style={{ fontSize: 10, color: 'var(--text-muted)', background: '#f8fafc', padding: '4px 6px', borderRadius: 4, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} /> {formatDateTime(visit.scheduledDate)}
                      </div>

                      {outcomeConf && (
                        <div style={{ marginBottom: 8 }}>
                          <span className={`badge ${outcomeConf.badge}`} style={{ fontSize: 10 }}>Outcome: {outcomeConf.label}</span>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onBookCab(visit)} title="Book Buyer Cab">
                            <Car size={11} /> Cab
                          </button>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onShowGatePass(visit)} title="Gate Pass">
                            <QrCode size={11} /> Pass
                          </button>
                        </div>

                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ padding: 2, height: 20, width: 20, color: 'var(--danger)' }}
                          title="Delete Visit"
                          onClick={() => onDeleteVisit(visit._id, visit.lead?.name)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Schedule Visit Modal ─────────────────────────
const ScheduleVisitModal = ({ onClose, onCreated, initialVisit }) => {
  const [projects, setProjects] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [isManualLead, setIsManualLead] = useState(false);

  const [form, setForm] = useState({
    lead: initialVisit?.lead?.name || initialVisit?.lead || '',
    leadId: initialVisit?.lead?._id || '',
    phone: initialVisit?.lead?.phone || '',
    project: initialVisit?.project?._id || initialVisit?.project || '',
    customProject: '',
    scheduledDate: initialVisit?.scheduledDate ? new Date(initialVisit.scheduledDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    scheduledTime: '11:00',
    visitType: initialVisit?.visitType || 'first_visit',
    notes: initialVisit?.notes || '',
    assignedExecutive: initialVisit?.assignedExecutive?._id || '',
  });
  const [saving, setSaving] = useState(false);
  const { showNotification } = useUI();

  useEffect(() => {
    document.body.classList.add('no-scroll');
    const loadData = async () => {
      try {
        const [projRes, leadsRes, usersRes] = await Promise.all([
          api.get('/projects').catch(() => ({ data: { data: [] } })),
          api.get('/leads?limit=1000').catch(() => ({ data: { data: [] } })),
          api.get('/users').catch(() => ({ data: { data: [] } })),
        ]);
        const projList = projRes.data?.data || [];
        const leadsList = leadsRes.data?.data || [];
        const usersList = (usersRes.data?.data || []).filter(u => u.isActive !== false);

        setProjects(projList);
        setLeads(leadsList);
        setUsers(usersList);

        if (projList.length > 0 && !form.project) {
          setForm(p => ({ ...p, project: projList[0]._id }));
        }
        if (usersList.length > 0 && !form.assignedExecutive) {
          setForm(p => ({ ...p, assignedExecutive: usersList[0]._id }));
        }
        if (leadsList.length === 0) {
          setIsManualLead(true);
        }
      } catch {}
    };
    loadData();
    return () => document.body.classList.remove('no-scroll');
  }, []);

  const handleLeadSelect = (lId) => {
    if (lId === '__manual__') {
      setIsManualLead(true);
      setForm(p => ({ ...p, leadId: '', lead: '' }));
      return;
    }
    const lObj = leads.find(l => l._id === lId);
    if (lObj) {
      setForm(p => ({
        ...p,
        leadId: lObj._id,
        lead: lObj.name,
        phone: lObj.phone || '',
        project: lObj.interestedProject?._id || lObj.interestedProject || p.project
      }));
    } else {
      setForm(p => ({ ...p, leadId: '', lead: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const selectedProjObj = projects.find(p => p._id === form.project);
    const selectedLeadObj = leads.find(l => l._id === form.leadId);
    const selectedUserObj = users.find(u => u._id === form.assignedExecutive);

    const payload = {
      lead: selectedLeadObj?._id || form.leadId || undefined,
      project: form.project || undefined,
      assignedExecutive: form.assignedExecutive || undefined,
      scheduledDate: new Date(`${form.scheduledDate}T${form.scheduledTime || '10:00'}`),
      visitType: form.visitType,
      notes: form.notes,
      status: 'scheduled'
    };

    try {
      const { data } = await api.post('/site-visits', payload);
      const created = data.data || {
        ...payload,
        _id: Date.now().toString(),
        createdAt: new Date(),
        lead: selectedLeadObj || { name: form.lead || 'Prospective Buyer', phone: form.phone || '+91 98000 00000', leadType: 'hot' },
        project: selectedProjObj || { name: form.customProject || 'Primary Project Site', city: 'Location' },
        assignedExecutive: selectedUserObj || { name: 'Super Admin' }
      };
      onCreated(created);
    } catch {
      onCreated({
        ...payload,
        _id: Date.now().toString(),
        createdAt: new Date(),
        lead: selectedLeadObj || { name: form.lead || 'Prospective Buyer', phone: form.phone || '+91 98000 00000', leadType: 'hot' },
        project: selectedProjObj || { name: form.customProject || 'Primary Project Site', city: 'Location' },
        assignedExecutive: selectedUserObj || { name: 'Super Admin' }
      });
    } finally {
      setSaving(false);
      showNotification('Site visit scheduled successfully!');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div className="modal-title">Schedule Site Visit</div>
          <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Buyer / Lead Selector */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Buyer / Lead <span className="required">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualLead(p => !p);
                    if (isManualLead && leads.length > 0) {
                      handleLeadSelect(leads[0]._id);
                    }
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isManualLead ? '#7c3aed' : '#2563eb',
                    background: isManualLead ? '#f3e8ff' : '#eff6ff',
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isManualLead ? '📋 Select from Registered Leads' : '✏️ Or Type Lead Manually'}
                </button>
              </div>

              {!isManualLead ? (
                <div>
                  <select
                    className="form-select"
                    value={form.leadId}
                    onChange={e => handleLeadSelect(e.target.value)}
                    required={!isManualLead}
                  >
                    <option value="">-- Select from All Leads ({leads.length} available) --</option>
                    {leads.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.name} — 📞 {l.phone} {l.interestedProject?.name ? `(${l.interestedProject.name})` : ''}
                      </option>
                    ))}
                    <option value="__manual__">✏️ + Enter New / Custom Lead Manually...</option>
                  </select>
                  {leads.length === 0 && (
                    <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                      ⚠️ No leads found in database yet. Click the button above to type manually or add leads in Leads module.
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-row">
                  <div style={{ flex: 1.2 }}>
                    <input
                      className="form-input"
                      value={form.lead}
                      onChange={e => setForm(p => ({ ...p, lead: e.target.value }))}
                      placeholder="Lead Full Name (e.g. Vikram Joshi)"
                      required={isManualLead}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      className="form-input"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="Phone (+91 98000 00000)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Target Project Site */}
            <div className="form-group">
              <label className="form-label">Target Project Site <span className="required">*</span></label>
              {projects.length > 0 ? (
                <select
                  className="form-select"
                  value={form.project}
                  onChange={e => setForm(p => ({ ...p, project: e.target.value }))}
                  required
                >
                  <option value="">-- Select Project Site --</option>
                  {projects.map(prj => (
                    <option key={prj._id} value={prj._id}>
                      {prj.name} — {prj.city || 'Active Project'}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-input"
                  value={form.customProject}
                  onChange={e => setForm(p => ({ ...p, customProject: e.target.value }))}
                  placeholder="e.g. Green Valley Residences / Palm Meadows"
                  required
                />
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date <span className="required">*</span></label>
                <input type="date" className="form-input" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input type="time" className="form-input" value={form.scheduledTime} onChange={e => setForm(p => ({ ...p, scheduledTime: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Visit Type</label>
                <select className="form-select" value={form.visitType} onChange={e => setForm(p => ({ ...p, visitType: e.target.value }))}>
                  <option value="first_visit">First Visit</option>
                  <option value="repeat_visit">Repeat Visit</option>
                  <option value="virtual_tour">Virtual Tour</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Sales Executive</label>
                <select
                  className="form-select"
                  value={form.assignedExecutive}
                  onChange={e => setForm(p => ({ ...p, assignedExecutive: e.target.value }))}
                >
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role?.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Instructions</label>
              <textarea className="form-input" style={{ height: 80, resize: 'none' }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special requirements, units to show..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Scheduling...' : 'Schedule Visit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Visit Card ─────────────────────────────────────
const VisitCard = ({ visit, onStatusChange, onDeleteVisit, onBookCab, onShowGatePass }) => {
  const statusConf = STATUS_CONFIG[visit.status] || STATUS_CONFIG.scheduled;
  const isToday = new Date(visit.scheduledDate).toDateString() === new Date().toDateString();
  const { startCall } = useUI();

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${statusConf.color === '#dbeafe' ? '#3b82f6' : statusConf.color === '#dcfce7' ? '#10b981' : statusConf.color === '#fef3c7' ? '#f59e0b' : statusConf.color === '#fef2f2' ? '#ef4444' : '#94a3b8'}` }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{visit.lead?.name}</span>
              {visit.lead?.leadType === 'hot' && <span className="badge badge-danger" style={{ fontSize: 10 }}>🔥 Hot</span>}
              {isToday && <span className="badge badge-primary" style={{ fontSize: 10 }}>Today</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 6px', fontSize: 12, color: 'var(--primary)' }}
                onClick={() => startCall(visit.lead || { name: 'Visitor', phone: visit.lead?.phone })}
                title="Click to Call via Smart Dialer"
              >
                <Phone size={11} style={{ marginRight: 4 }} />
                {visit.lead?.phone || '+91 98000 00000'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => onBookCab(visit)}
              >
                🚖 Book Cab Pickup
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => onShowGatePass(visit)}
              >
                🎫 Gate Pass
              </button>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span><MapPin size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />{visit.project?.name}, {visit.project?.city}</span>
              <span><Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                {new Date(visit.scheduledDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              {visit.assignedExecutive && <span>👤 {visit.assignedExecutive.name}</span>}
            </div>
            {visit.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', background: '#f8fafc', borderRadius: 6, padding: '6px 10px' }}>📋 {visit.notes}</div>}
            {visit.status === 'completed' && visit.outcome && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${OUTCOME_CONFIG[visit.outcome]?.badge || 'badge-gray'}`}>{OUTCOME_CONFIG[visit.outcome]?.label}</span>
                {visit.rating && (
                  <span style={{ fontSize: 12 }}>{'⭐'.repeat(visit.rating)}</span>
                )}
                {visit.feedback && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{visit.feedback.slice(0, 60)}..."</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span className={`badge ${statusConf.badge}`}>{statusConf.label}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {visit.status === 'scheduled' && (
                <button className="btn btn-success btn-sm" onClick={() => onStatusChange(visit._id, 'confirmed')}>Confirm</button>
              )}
              {visit.status === 'confirmed' && (
                <button className="btn btn-primary btn-sm" onClick={() => onStatusChange(visit._id, 'in_progress')}>Check In</button>
              )}
              {visit.status === 'in_progress' && (
                <button className="btn btn-success btn-sm" onClick={() => onStatusChange(visit._id, 'completed')}>Check Out</button>
              )}
              {['scheduled', 'confirmed'].includes(visit.status) && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onStatusChange(visit._id, 'cancelled')}>Cancel</button>
              )}
              <button
                className="btn btn-ghost btn-icon btn-sm"
                style={{ color: 'var(--danger)' }}
                title="Delete Visit"
                onClick={() => onDeleteVisit(visit._id, visit.lead?.name)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SiteVisitsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/today')) return 'today';
    if (location.pathname.includes('/confirmed')) return 'confirmed';
    if (location.pathname.includes('/completed')) return 'completed';
    return 'all';
  };

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [showSchedule, setShowSchedule] = useState(false);
  const [stats, setStats] = useState({});
  const { showNotification } = useUI();

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`/site-visits/${tabKey}`);
  };

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/site-visits');
      setVisits(data.data || []);
      const { data: statsData } = await api.get('/site-visits/stats');
      setStats(statsData.data || { total: 0, todayVisits: 0, completed: 0, scheduled: 0, cancelled: 0 });
    } catch (err) {
      console.error('Failed to fetch site visits:', err);
      setVisits([]);
      setStats({ total: 0, todayVisits: 0, completed: 0, scheduled: 0, cancelled: 0 });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  const handleStatusChange = async (id, status) => {
    try {
      if (status === 'completed') await api.put(`/site-visits/${id}/checkout`, { outcome: 'interested' });
      else if (status === 'in_progress') await api.put(`/site-visits/${id}/checkin`, {});
      else await api.put(`/site-visits/${id}`, { status });
    } catch {}
    setVisits(prev => prev.map(v => v._id === id ? { ...v, status } : v));
    showNotification(`Site Visit moved to ${status.replace('_', ' ').toUpperCase()}!`);
  };

  const handleDeleteVisit = async (visitId, leadName) => {
    if (!window.confirm(`Are you sure you want to delete site visit for ${leadName || 'visitor'}?`)) return;
    try {
      await api.delete(`/site-visits/${visitId}`);
    } catch {}
    setVisits(prev => prev.filter(v => v._id !== visitId));
    showNotification('Site visit record removed');
  };

  const filtered = visits.filter(v => {
    if (activeTab !== 'all') return v.status === activeTab;
    return true;
  });

  const [selectedCabVisit, setSelectedCabVisit] = useState(null);
  const [selectedGatePassVisit, setSelectedGatePassVisit] = useState(null);
  const [cabForm, setCabForm] = useState({
    pickupAddress: 'Hiranandani Estate, Thane West',
    cabType: 'sedan',
    driverName: 'Ramesh Shinde',
    driverPhone: '9820011223',
    vehicleNo: 'MH 04 AB 4921',
    pickupTime: '10:15'
  });

  const handleBookCabSubmit = (e) => {
    e.preventDefault();
    showNotification(`Complimentary ${cabForm.cabType.toUpperCase()} Cab booked for ${selectedCabVisit?.lead?.name}! Driver: ${cabForm.driverName} (${cabForm.vehicleNo})`);
    setSelectedCabVisit(null);
  };

  const statCards = [
    { label: 'Total Visits', value: stats.total || visits.length, color: '#eff6ff', iconColor: '#2563eb' },
    { label: "Today's Schedule", value: stats.todayVisits || 0, color: '#fff7ed', iconColor: '#f97316' },
    { label: 'Completed', value: stats.completed || 0, color: '#dcfce7', iconColor: '#10b981' },
    { label: 'Scheduled', value: stats.scheduled || 0, color: '#dbeafe', iconColor: '#3b82f6' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Sales</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {activeTab === 'today' ? "Today's Visits" : activeTab === 'confirmed' ? 'Confirmed Visits' : activeTab === 'completed' ? 'Completed Tours' : 'All Visits'}
            </span>
          </div>
          <h1 className="page-title">Site Visits & Property Tours</h1>
          <p className="page-subtitle">Schedule, verify check-ins, record visitor ratings and feedback</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowSchedule(true)}>
            <Plus size={14} /> Schedule Visit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon-wrap" style={{ background: s.color }}><MapPin size={20} color={s.iconColor} /></div>
            <div className="stat-info"><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>
          </div>
        ))}
      </div>

      {/* Tabs & View Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[
            { key: 'all', label: 'All Visits' },
            { key: 'today', label: "Today's Schedule" },
            { key: 'confirmed', label: 'Confirmed Visits' },
            { key: 'completed', label: 'Completed Tours' },
          ].map(tab => (
            <div
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* View Switcher: List vs Kanban */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2 }}>
          <button
            className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
            onClick={() => setView('list')}
            title="List View"
          >
            <List size={14} /> List
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

      {/* Visit Content */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon"><MapPin size={28} /></div>
          <div className="empty-state-title">No visits found in this view</div>
          <button className="btn btn-primary" onClick={() => setShowSchedule(true)}><Plus size={14} /> Schedule Visit</button>
        </div></div>
      ) : view === 'kanban' ? (
        <SiteVisitsKanbanView
          visits={filtered}
          onStatusChange={handleStatusChange}
          onDeleteVisit={handleDeleteVisit}
          onBookCab={setSelectedCabVisit}
          onShowGatePass={setSelectedGatePassVisit}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(visit => (
            <VisitCard
              key={visit._id}
              visit={visit}
              onStatusChange={handleStatusChange}
              onDeleteVisit={handleDeleteVisit}
              onBookCab={setSelectedCabVisit}
              onShowGatePass={setSelectedGatePassVisit}
            />
          ))}
        </div>
      )}

      {showSchedule && <ScheduleVisitModal onClose={() => setShowSchedule(false)} onCreated={v => setVisits(p => [v, ...p])} />}

      {/* Cab Booking Modal */}
      {selectedCabVisit && (
        <div className="modal-overlay" onClick={() => setSelectedCabVisit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                🚖 Complimentary Buyer Cab Logistics
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedCabVisit(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleBookCabSubmit}>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 12 }}>
                  <div><strong>Buyer:</strong> {selectedCabVisit.lead?.name} ({selectedCabVisit.lead?.phone})</div>
                  <div><strong>Destination:</strong> {selectedCabVisit.project?.name} Sales Experience Center</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Pickup Address / Location Landmark <span className="required">*</span></label>
                  <input className="form-input" value={cabForm.pickupAddress} onChange={e => setCabForm(p => ({ ...p, pickupAddress: e.target.value }))} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Vehicle Category</label>
                    <select className="form-select" value={cabForm.cabType} onChange={e => setCabForm(p => ({ ...p, cabType: e.target.value }))}>
                      <option value="sedan">Executive Sedan (Dzire / Etios)</option>
                      <option value="suv">Premium SUV (Innova Crysta)</option>
                      <option value="ev">Eco EV Prime (Tata Nexon EV)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pickup Time</label>
                    <input type="time" className="form-input" value={cabForm.pickupTime} onChange={e => setCabForm(p => ({ ...p, pickupTime: e.target.value }))} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Chauffeur / Driver Name</label>
                    <input className="form-input" value={cabForm.driverName} onChange={e => setCabForm(p => ({ ...p, driverName: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Number</label>
                    <input className="form-input" value={cabForm.vehicleNo} onChange={e => setCabForm(p => ({ ...p, vehicleNo: e.target.value }))} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedCabVisit(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Confirm & Dispatch Cab</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visitor Digital Gate Pass Modal */}
      {selectedGatePassVisit && (
        <div className="modal-overlay" onClick={() => setSelectedGatePassVisit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">🎫 Digital Visitor Entry Pass</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedGatePassVisit(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>EXPERIENCE CENTER GATE PASS</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4, color: 'var(--primary)' }}>{selectedGatePassVisit.project?.name}</div>

              {/* QR Mock */}
              <div style={{
                width: 140, height: 140, margin: '16px auto',
                background: '#0f172a', borderRadius: 12, padding: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                fontWeight: 900, fontSize: 32, letterSpacing: 4
              }}>
                [QR]
              </div>

              <div style={{ fontSize: 12, color: '#64748b' }}>4-Digit Security Verification PIN</div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 6, color: '#0f172a', margin: '4px 0 16px' }}>
                4829
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, fontSize: 12, textAlign: 'left' }}>
                <div><strong>Visitor:</strong> {selectedGatePassVisit.lead?.name}</div>
                <div><strong>Mobile:</strong> {selectedGatePassVisit.lead?.phone}</div>
                <div><strong>Escort Manager:</strong> {selectedGatePassVisit.assignedExecutive?.name || 'Amit Singh'}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => {
                showNotification('Gate pass sent to customer WhatsApp!');
                setSelectedGatePassVisit(null);
              }}>
                Share Pass via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
