import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, Plus, Clock, Phone, MapPin, Calendar, Check, Trash2, X, AlertCircle, Edit, List, Columns, User, Search, Download } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { TASK_TYPES, TASK_STATUSES, TASK_PRIORITIES } from '../../utils/constants';
import { formatDateTime, timeAgo, isOverdue } from '../../utils/formatters';
import CustomSelect from '../../components/ui/CustomSelect';
import { exportActivitiesCSV } from '../../utils/exportTemplates';

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
            <div className="form-row" style={{ marginBottom: 14 }}>
              <CustomSelect
                label="Activity Type"
                value={form.type}
                onChange={val => setForm(p => ({ ...p, type: val }))}
                options={Object.entries(TASK_TYPES).map(([k, v]) => ({ value: k, label: v.label, icon: v.icon }))}
              />
              <CustomSelect
                label="Priority"
                value={form.priority}
                onChange={val => setForm(p => ({ ...p, priority: val }))}
                options={[
                  { value: 'low', label: 'Low', icon: '🟢' },
                  { value: 'medium', label: 'Medium', icon: '🟡' },
                  { value: 'high', label: 'High', icon: '🔴' },
                  { value: 'urgent', label: 'Urgent', icon: '🚨' }
                ]}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Due Date & Time <span className="required">*</span></label>
                <input type="datetime-local" className="form-input" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} required />
              </div>
              <CustomSelect
                label="Assigned Executive"
                value={form.assignedTo}
                onChange={val => {
                  const uObj = users.find(u => u._id === val);
                  setForm(p => ({ ...p, assignedTo: val, assignedToName: uObj?.name || p.assignedToName }));
                }}
                searchable={true}
                placeholder="Loading sales reps..."
                options={users.map(u => ({
                  value: u._id,
                  label: u.name,
                  subtext: u.role?.replace(/_/g, ' '),
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=4f46e5&color=fff&size=64`
                }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <CustomSelect
                label="Related Lead"
                value={form.leadId}
                onChange={val => {
                  const lObj = leads.find(l => l._id === val);
                  setForm(p => ({ ...p, leadId: val, leadName: lObj?.name || p.leadName }));
                }}
                searchable={true}
                placeholder="-- General Task / Select Lead --"
                options={[
                  { value: '', label: '-- General Task / Select Lead --', icon: '📋' },
                  ...leads.map(l => ({
                    value: l._id,
                    label: l.name,
                    subtext: `${l.phone} · ${l.interestedProject?.name || 'General'}`,
                    icon: l.leadType === 'hot' ? '🔥' : '📞'
                  }))
                ]}
              />
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
const TasksKanbanView = ({ tasks, onEditTask, onDeleteTask, onToggleTask, onStatusChange, onAddTask }) => {
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

              {onAddTask && (
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ width: 22, height: 22, padding: 0, color: 'var(--primary)', borderRadius: 4, background: '#f1f5f9' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddTask(col.id);
                  }}
                  title={`Create task in ${col.title}`}
                >
                  <Plus size={13} />
                </button>
              )}
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
                    padding: '24px 12px',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    border: '1.5px dashed #cbd5e1',
                    borderRadius: 10,
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    margin: '4px 0'
                  }}
                >
                  <span>No tasks in {col.title}</span>
                  {onAddTask && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: 11.5,
                        padding: '4px 10px',
                        height: 28,
                        gap: 4,
                        background: '#f8fafc',
                        borderColor: '#cbd5e1',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        borderRadius: 8
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddTask(col.id);
                      }}
                    >
                      <Plus size={13} /> Add Task
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {colTasks.map(t => {
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
                })}
                {onAddTask && (
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
                      onAddTask(col.id);
                    }}
                  >
                    <Plus size={12} /> Add Task
                  </button>
                )}
              </>
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
  const [view, setView] = useState('kanban'); // 'kanban' (Board 1st default) | 'list'
  const [filter, setFilter] = useState(getFilterFromPath());
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState('due_asc');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const { showNotification } = useUI();
  const { user } = useAuth();

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

  const filtered = tasks
    .filter(t => {
      if (filter === 'overdue') {
        if (t.status === 'completed' || !isOverdue(t.dueDate)) return false;
      } else if (filter === 'call') {
        if (t.type !== 'call') return false;
      } else if (filter === 'meeting') {
        if (t.type !== 'meeting' && t.type !== 'site_visit') return false;
      } else if (filter === 'pending') {
        if (t.status !== 'pending') return false;
      } else if (filter === 'completed') {
        if (t.status !== 'completed') return false;
      }

      if (taskTypeFilter && t.type !== taskTypeFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;

      if (dateRangeFilter) {
        const d = new Date(t.dueDate || t.createdAt || Date.now());
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateRangeFilter === 'today') {
          const endOfToday = new Date(startOfToday.getTime() + 86400000);
          if (d < startOfToday || d >= endOfToday) return false;
        }
        if (dateRangeFilter === 'tomorrow') {
          const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);
          const endOfTomorrow = new Date(startOfToday.getTime() + 2 * 86400000);
          if (d < startOfTomorrow || d >= endOfTomorrow) return false;
        }
        if (dateRangeFilter === 'this_week') {
          const endOfWeek = new Date(startOfToday.getTime() + 7 * 86400000);
          if (d < startOfToday || d >= endOfWeek) return false;
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

      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesLead = t.lead?.name?.toLowerCase().includes(q);
        const matchesUser = t.assignedTo?.name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesLead && !matchesUser) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'due_asc') return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
      if (sortBy === 'due_desc') return new Date(b.dueDate || 0) - new Date(a.dueDate || 0);
      if (sortBy === 'created_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'priority_desc') {
        const weight = { high: 3, medium: 2, low: 1 };
        return (weight[b.priority] || 0) - (weight[a.priority] || 0);
      }
      if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      return 0;
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
        <div className="page-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              exportActivitiesCSV(filtered, user?.organization || 'MRP REAL ESTATE');
              showNotification('Exported Sales Activities & SLA Tasks Ledger CSV!');
            }}
            title="Download full tasks and follow-up activities ledger"
          >
            <Download size={14} /> Export Tasks CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowModal(true); }}>
            <Plus size={14} /> New Task
          </button>
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

        {/* View Switcher: Board vs List */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2 }}>
          <button
            className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, gap: 4, fontWeight: 600 }}
            onClick={() => setView('kanban')}
            title="Kanban Board View (Default)"
          >
            <Columns size={14} /> Board
          </button>
          <button
            className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, gap: 4, fontWeight: 600 }}
            onClick={() => setView('list')}
            title="List / Table View"
          >
            <List size={14} /> List
          </button>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={14} color="var(--text-muted)" />
          <input
            placeholder="Search task title, lead, note, or assignee…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <CustomSelect
          variant="filter"
          value={priorityFilter}
          onChange={val => setPriorityFilter(val)}
          options={[
            { value: '', label: 'All Priorities' },
            { value: 'high', label: '🔴 High Priority' },
            { value: 'medium', label: '🟡 Medium Priority' },
            { value: 'low', label: '🟢 Low Priority' }
          ]}
        />

        <CustomSelect
          variant="filter"
          value={taskTypeFilter}
          onChange={val => setTaskTypeFilter(val)}
          options={[
            { value: '', label: 'All Activity Types' },
            { value: 'call', label: '📞 Phone Call' },
            { value: 'meeting', label: '🤝 Meeting' },
            { value: 'site_visit', label: '📍 Site Visit' },
            { value: 'whatsapp', label: '💬 WhatsApp' },
            { value: 'email', label: '📧 Email' }
          ]}
        />

        <CustomSelect
          variant="filter"
          value={dateRangeFilter}
          onChange={val => {
            setDateRangeFilter(val);
            if (val !== 'custom') { setCustomFrom(''); setCustomTo(''); }
          }}
          options={[
            { value: '', label: '📅 All Due Dates' },
            { value: 'today', label: 'Due Today' },
            { value: 'tomorrow', label: 'Due Tomorrow' },
            { value: 'this_week', label: 'Due in 7 Days' },
            { value: 'custom', label: '📆 Custom Date (From - To)...' }
          ]}
        />

        {dateRangeFilter === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--card-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>From:</span>
            <input type="date" className="form-input" style={{ padding: '3px 8px', fontSize: 12, height: 32, width: 135 }} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>To:</span>
            <input type="date" className="form-input" style={{ padding: '3px 8px', fontSize: 12, height: 32, width: 135 }} value={customTo} onChange={e => setCustomTo(e.target.value)} />
            {(customFrom || customTo) && (
              <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ padding: 2, height: 24, width: 24, color: 'var(--danger)' }} onClick={() => { setCustomFrom(''); setCustomTo(''); setDateRangeFilter(''); }} title="Clear Custom Date Filter"><X size={13} /></button>
            )}
          </div>
        )}

        <CustomSelect
          variant="filter"
          buttonStyle={{ fontWeight: 600, color: 'var(--primary)' }}
          value={sortBy}
          onChange={val => setSortBy(val)}
          options={[
            { value: 'due_asc', label: 'Sort: ⏰ Due Date (Earliest / Overdue First)' },
            { value: 'due_desc', label: 'Sort: ⏰ Due Date (Latest First)' },
            { value: 'priority_desc', label: 'Sort: 🔥 Priority (High to Low)' },
            { value: 'created_desc', label: 'Sort: ⚡ Recently Created' },
            { value: 'title_asc', label: 'Sort: 🔤 Title (A → Z)' }
          ]}
        />
      </div>

      {/* Task Content */}
      {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
        view === 'kanban' ? (
          <TasksKanbanView
            tasks={filtered}
            onEditTask={t => { setEditingTask(t); setShowModal(true); }}
            onDeleteTask={deleteTask}
            onToggleTask={toggleTask}
            onStatusChange={handleStatusChange}
            onAddTask={() => { setEditingTask(null); setShowModal(true); }}
          />
        ) : filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon"><CheckSquare size={28} /></div><div className="empty-state-title">No tasks in this category</div><button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowModal(true); }}><Plus size={14} /> Create Task</button></div></div>
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

