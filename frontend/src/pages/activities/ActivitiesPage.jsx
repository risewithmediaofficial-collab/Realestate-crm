import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, Plus, Clock, Phone, MapPin, Calendar, Check, Trash2, X, AlertCircle, Edit, List, Columns, User } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { TASK_TYPES, TASK_STATUSES, TASK_PRIORITIES } from '../../utils/constants';
import { formatDateTime, timeAgo, isOverdue } from '../../utils/formatters';

const mockTasks = [];

const TaskModal = ({ initialTask, onClose, onSaved }) => {
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);

  const [form, setForm] = useState({
    title: initialTask?.title || '',
    type: initialTask?.type || 'call',
    priority: initialTask?.priority || 'medium',
    dueDate: initialTask?.dueDate ? new Date(initialTask.dueDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    description: initialTask?.description || '',
    assignedTo: initialTask?.assignedTo?._id || '',
    assignedToName: initialTask?.assignedTo?.name || '',
    leadId: initialTask?.lead?._id || '',
    leadName: initialTask?.lead?.name || ''
  });
  const { showNotification } = useUI();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    const loadData = async () => {
      try {
        const [usersRes, leadsRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/leads?limit=50').catch(() => ({ data: { data: [] } })),
        ]);
        const usersList = (usersRes.data?.data || []).filter(u => u.isActive !== false);
        const leadsList = leadsRes.data?.data || [];
        setUsers(usersList);
        setLeads(leadsList);
        if (usersList.length > 0 && !form.assignedTo) {
          setForm(p => ({ ...p, assignedTo: usersList[0]._id, assignedToName: usersList[0].name }));
        }
      } catch {}
    };
    loadData();
    return () => document.body.classList.remove('no-scroll');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const selectedUserObj = users.find(u => u._id === form.assignedTo);
    const selectedLeadObj = leads.find(l => l._id === form.leadId);

    const payload = {
      title: form.title,
      type: form.type,
      priority: form.priority,
      dueDate: new Date(form.dueDate),
      description: form.description,
      assignedTo: form.assignedTo || undefined,
      lead: form.leadId || undefined
    };

    if (initialTask) {
      try {
        const { data } = await api.put(`/activities/${initialTask._id}`, payload);
        onSaved(data.data || {
          ...initialTask,
          ...payload,
          assignedTo: selectedUserObj || { name: form.assignedToName },
          lead: selectedLeadObj || { name: form.leadName }
        });
      } catch {
        onSaved({
          ...initialTask,
          ...payload,
          assignedTo: selectedUserObj || { name: form.assignedToName },
          lead: selectedLeadObj || { name: form.leadName }
        });
      }
      showNotification('Task updated successfully!');
    } else {
      try {
        const { data } = await api.post('/activities', payload);
        onSaved(data.data || {
          ...payload,
          _id: Date.now().toString(),
          status: 'pending',
          createdAt: new Date(),
          assignedTo: selectedUserObj || { name: form.assignedToName },
          lead: selectedLeadObj || { name: form.leadName, phone: '9800000000' }
        });
      } catch {
        onSaved({
          ...payload,
          _id: Date.now().toString(),
          status: 'pending',
          createdAt: new Date(),
          assignedTo: selectedUserObj || { name: form.assignedToName },
          lead: selectedLeadObj || { name: form.leadName, phone: '9800000000' }
        });
      }
      showNotification('New task created!');
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{initialTask ? 'Edit Task / Activity' : 'Create Activity / Task'}</div>
          <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Task Title <span className="required">*</span></label>
              <input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Follow-up call for booking token" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Activity Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Due Date & Time <span className="required">*</span></label>
                <input type="datetime-local" className="form-input" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Executive</label>
                <select
                  className="form-select"
                  value={form.assignedTo}
                  onChange={e => {
                    const uId = e.target.value;
                    const uObj = users.find(u => u._id === uId);
                    setForm(p => ({ ...p, assignedTo: uId, assignedToName: uObj?.name || p.assignedToName }));
                  }}
                >
                  {users.length === 0 ? (
                    <option value="">Loading sales reps...</option>
                  ) : (
                    users.map(u => (
                      <option key={u._id} value={u._id}>{u.name} ({u.role?.replace(/_/g, ' ')})</option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Related Lead</label>
              <select
                className="form-select"
                value={form.leadId}
                onChange={e => {
                  const lId = e.target.value;
                  const lObj = leads.find(l => l._id === lId);
                  setForm(p => ({ ...p, leadId: lId, leadName: lObj?.name || p.leadName }));
                }}
              >
                <option value="">-- General Task / Select Lead --</option>
                {leads.map(l => (
                  <option key={l._id} value={l._id}>{l.name} ({l.phone}) - {l.interestedProject?.name || 'General'}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Instructions</label>
              <textarea className="form-input" style={{ height: 70, resize: 'none' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Specific talking points or context..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : initialTask ? 'Save Changes' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Tasks Kanban View Component ───────────────────
const TasksKanbanView = ({ tasks, onEditTask, onDeleteTask, onToggleTask, onStatusChange }) => {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columns = [
    { id: 'pending', title: 'To Do / Pending', color: '#3b82f6', bg: '#eff6ff', icon: '📋' },
    { id: 'in_progress', title: 'In Progress', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
    { id: 'completed', title: 'Completed', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
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
        const colTasks = tasks.filter(t => (t.status || 'pending') === col.id);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={e => handleDragLeave(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            style={{
              flex: '0 0 320px',
              background: '#f8fafc',
              borderRadius: 10,
              border: isOver ? `2px dashed ${col.color}` : '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isOver ? `0 0 0 4px ${col.color}20` : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Column Header */}
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
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Column Body */}
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
              {colTasks.length === 0 ? (
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
                  Drag tasks here to mark as {col.title}
                </div>
              ) : (
                colTasks.map(t => {
                  const overdue = t.status !== 'completed' && isOverdue(t.dueDate);
                  const typeConf = TASK_TYPES[t.type] || { icon: '📋', label: t.type };
                  const priorityConf = TASK_PRIORITIES[t.priority] || { label: t.priority, badge: 'badge-gray' };
                  const isDragging = draggedId === t._id;

                  return (
                    <div
                      key={t._id}
                      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, t._id)}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{typeConf.icon}</span>
                          <span className={`badge ${priorityConf.badge}`} style={{ fontSize: 10 }}>{priorityConf.label}</span>
                          {overdue && <span className="badge badge-danger" style={{ fontSize: 10, padding: '1px 5px' }}>Overdue</span>}
                        </div>

                        <div style={{ display: 'flex', gap: 2 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 20, width: 20, color: 'var(--text-secondary)' }}
                            title="Edit Task"
                            onClick={() => onEditTask(t)}
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 20, width: 20, color: 'var(--danger)' }}
                            title="Delete Task"
                            onClick={() => onDeleteTask(t._id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>
                        {t.title}
                      </div>

                      {t.lead && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          👤 <strong>{t.lead.name}</strong> {t.lead.phone ? `(${t.lead.phone})` : ''}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--text-muted)', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                        <span><Clock size={10} style={{ display: 'inline', marginRight: 2 }} /> {formatDateTime(t.dueDate)}</span>
                        {t.assignedTo && <span>{t.assignedTo.name}</span>}
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

export default function ActivitiesPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getFilterFromPath = () => {
    if (location.pathname.includes('/call')) return 'call';
    if (location.pathname.includes('/meeting')) return 'meeting';
    if (location.pathname.includes('/overdue')) return 'overdue';
    return 'all';
  };

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [filter, setFilter] = useState(getFilterFromPath());
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const { showNotification } = useUI();

  useEffect(() => {
    setFilter(getFilterFromPath());
  }, [location.pathname]);

  const handleFilterChange = (f) => {
    setFilter(f);
    navigate(`/activities/${f}`);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/activities');
      setTasks(data.data || []);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setTasks([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTask = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      if (nextStatus === 'completed') await api.put(`/activities/${id}/complete`);
      else await api.put(`/activities/${id}`, { status: nextStatus });
    } catch { }
    setTasks(prev => prev.map(t => t._id === id ? { ...t, status: nextStatus, completedAt: nextStatus === 'completed' ? new Date() : null } : t));
    showNotification(`Task marked as ${nextStatus}!`);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      if (newStatus === 'completed') await api.put(`/activities/${id}/complete`);
      else await api.put(`/activities/${id}`, { status: newStatus });
    } catch { }
    setTasks(prev => prev.map(t => t._id === id ? { ...t, status: newStatus, completedAt: newStatus === 'completed' ? new Date() : null } : t));
    showNotification(`Task moved to ${newStatus.replace('_', ' ').toUpperCase()}!`);
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try { await api.delete(`/activities/${id}`); } catch { }
    setTasks(prev => prev.filter(t => t._id !== id));
    showNotification('Task deleted successfully!');
  };

  const handleTaskSaved = (savedTask) => {
    if (editingTask) {
      setTasks(prev => prev.map(t => t._id === savedTask._id ? savedTask : t));
    } else {
      setTasks(prev => [savedTask, ...prev]);
    }
  };

  const filtered = tasks.filter(t => {
    if (filter === 'overdue') return t.status !== 'completed' && isOverdue(t.dueDate);
    if (filter === 'call') return t.type === 'call';
    if (filter === 'meeting') return t.type === 'meeting' || t.type === 'site_visit';
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Sales</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {filter === 'call' ? 'Follow-up Calls' : filter === 'meeting' ? 'Meetings & Site Visits' : filter === 'overdue' ? 'Overdue Tasks' : 'All Tasks'}
            </span>
          </div>
          <h1 className="page-title">Tasks & Sales Activities</h1>
          <p className="page-subtitle">Track follow-ups, calls, appointments, and SLA task completion</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowModal(true); }}><Plus size={14} /> New Task</button>
        </div>
      </div>

      {/* Filter and View Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[
            { k: 'all', l: 'All Tasks' },
            { k: 'call', l: 'Follow-up Calls' },
            { k: 'overdue', l: 'Overdue SLA Tasks', badge: tasks.filter(t => t.status !== 'completed' && isOverdue(t.dueDate)).length },
            { k: 'meeting', l: 'Meetings' },
          ].map(t => (
            <div
              key={t.k}
              className={`tab ${filter === t.k ? 'active' : ''}`}
              onClick={() => handleFilterChange(t.k)}
            >
              {t.l} {t.badge ? <span className="badge badge-danger" style={{ marginLeft: 4 }}>{t.badge}</span> : null}
            </div>
          ))}
        </div>

        {/* View Switcher: List vs Kanban */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2 }}>
          <button
            className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
            onClick={() => setView('list')}
            title="List / Table View"
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

      {/* Task Content */}
      {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
        filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon"><CheckSquare size={28} /></div><div className="empty-state-title">No tasks in this category</div><button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowModal(true); }}><Plus size={14} /> Create Task</button></div></div>
        ) : view === 'kanban' ? (
          <TasksKanbanView
            tasks={filtered}
            onEditTask={t => { setEditingTask(t); setShowModal(true); }}
            onDeleteTask={deleteTask}
            onToggleTask={toggleTask}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(t => {
              const overdue = t.status !== 'completed' && isOverdue(t.dueDate);
              const typeConf = TASK_TYPES[t.type] || { icon: '📋', label: t.type };
              const priorityConf = TASK_PRIORITIES[t.priority] || { label: t.priority, badge: 'badge-gray' };

              return (
                <div key={t._id} className="card" style={{ padding: '12px 16px', background: t.status === 'completed' ? '#f8fafc' : 'white', opacity: t.status === 'completed' ? 0.75 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input type="checkbox" checked={t.status === 'completed'} onChange={() => toggleTask(t._id, t.status)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                    <div style={{ fontSize: 20 }}>{typeConf.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title}</span>
                        <span className={`badge ${priorityConf.badge}`}>{priorityConf.label}</span>
                        {overdue && <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: 3 }}><AlertCircle size={10} /> Overdue</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {t.lead && <span>👤 <strong>{t.lead.name}</strong> ({t.lead.phone})</span>}
                        <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />Due: {formatDateTime(t.dueDate)}</span>
                        {t.assignedTo && <span>Assignee: {t.assignedTo.name}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingTask(t); setShowModal(true); }} style={{ color: 'var(--text-secondary)' }} title="Edit Task"><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteTask(t._id)} style={{ color: 'var(--text-muted)' }} title="Delete Task"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {showModal && <TaskModal initialTask={editingTask} onClose={() => { setShowModal(false); setEditingTask(null); }} onSaved={handleTaskSaved} />}
    </div>
  );
}

