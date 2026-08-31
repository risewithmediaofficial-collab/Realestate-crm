import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Scale, Check, X, Plus, AlertCircle, Clock,
  DollarSign, FileText, User, ShieldAlert, ArrowRight, Edit, Save, Trash2, List, Columns
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { formatCurrency, formatDate, truncate } from '../../utils/formatters';

const mockNegotiations = [];

// ─── Negotiations Kanban Board Component ─────────
const NegotiationsKanbanView = ({ requests, onApprove, onReject, onEdit, onDelete, onStatusChange }) => {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columns = [
    { id: 'pending', title: 'Pending Review', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
    { id: 'approved', title: 'Approved Discounts', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
    { id: 'rejected', title: 'Rejected Requests', color: '#ef4444', bg: '#fef2f2', icon: '❌' },
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
        const colRequests = requests.filter(r => (r.status || 'pending') === col.id);
        const colDiscountTotal = colRequests.reduce((sum, r) => sum + (r.discountAmt || 0), 0);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={e => handleDragLeave(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            style={{
              flex: '0 0 330px',
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
                  {colRequests.length}
                </span>
              </div>
              {colRequests.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--danger)' }}>
                  -{formatCurrency(colDiscountTotal)}
                </span>
              )}
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
              {colRequests.length === 0 ? (
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
                  Drag requests here to mark as {col.title}
                </div>
              ) : (
                colRequests.map(r => {
                  const isDragging = draggedId === r.id;

                  return (
                    <div
                      key={r.id}
                      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, r.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: 'white',
                        border: '1px solid var(--card-border)',
                        borderRadius: 8,
                        padding: 14,
                        cursor: 'grab',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        opacity: isDragging ? 0.4 : 1,
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                          {r.leadName}
                        </div>
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>
                          {r.requiredLevel || 'Sales Head'}
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {r.phone} · By {r.requestedBy}
                      </div>

                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                        Unit: {r.unitNumber}
                      </div>

                      {/* Pricing Comparison */}
                      <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                          <span>Original AV:</span>
                          <del>{formatCurrency(r.originalPrice)}</del>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                          <span>Offer AV:</span>
                          <span style={{ color: 'var(--primary)' }}>{formatCurrency(r.requestedPrice)}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-danger" style={{ fontSize: 10, fontWeight: 700 }}>
                            -{r.discountPct}% ({formatCurrency(r.discountAmt)})
                          </span>
                        </div>
                      </div>

                      {/* Reason */}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10, background: '#fefce8', padding: '6px 8px', borderRadius: 4 }}>
                        💡 {r.reason}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.date}</span>

                        <div style={{ display: 'flex', gap: 4 }}>
                          {r.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                style={{ padding: '2px 6px', fontSize: 10 }}
                                onClick={() => onApprove(r.id)}
                                title="Approve Request"
                              >
                                <Check size={11} /> Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: '2px 6px', fontSize: 10 }}
                                onClick={() => onReject(r.id)}
                                title="Reject Request"
                              >
                                <X size={11} /> Reject
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 20, width: 20, color: 'var(--primary)' }}
                            title="Edit Request"
                            onClick={() => onEdit(r)}
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 20, width: 20, color: 'var(--danger)' }}
                            title="Delete Request"
                            onClick={() => onDelete(r.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
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

export default function NegotiationsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/approved')) return 'approved';
    if (location.pathname.includes('/policy')) return 'policy';
    if (location.pathname.includes('/rejected')) return 'rejected';
    return 'pending';
  };

  const [requests, setRequests] = useState([]);
  const [leads, setLeads] = useState([]);
  const [tab, setTab] = useState(getTabFromPath());
  const [view, setView] = useState('table'); // 'table' | 'kanban'
  const [showModal, setShowModal] = useState(false);
  const [isManualLead, setIsManualLead] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const { showNotification } = useUI();

  const [form, setForm] = useState({
    leadId: '', leadName: '', unitNumber: '', originalPrice: '', requestedPrice: '',
    reason: '', requestedBy: ''
  });

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data } = await api.get('/leads?limit=1000');
        setLeads(data.data || []);
      } catch (e) {
        setLeads([]);
      }
    };
    fetchLeads();
  }, []);

  const handleLeadSelect = (leadId) => {
    if (leadId === '__manual__') {
      setIsManualLead(true);
      setForm(p => ({ ...p, leadId: '', leadName: '' }));
      return;
    }
    const lObj = leads.find(l => l._id === leadId);
    if (lObj) {
      setForm(p => ({
        ...p,
        leadId: lObj._id,
        leadName: lObj.name,
        unitNumber: lObj.interestedProject?.name ? `${lObj.interestedProject.name} Unit` : p.unitNumber
      }));
    } else {
      setForm(p => ({ ...p, leadId: '', leadName: '' }));
    }
  };

  // Configurable policy thresholds
  const [policyThresholds, setPolicyThresholds] = useState({
    repLimit: 1.5,
    managerLimit: 3.0,
    headLimit: 6.0,
    directorLimit: 12.0
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
    navigate(`/negotiations/${tabId}`);
  };

  const handleApprove = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', approvedBy: 'Executive Approval (Approved)' } : r));
    showNotification('Discount approval granted and cost sheet unlocked!');
  };

  const handleReject = (id) => {
    const reason = window.prompt('Enter rejection reason:') || 'Discount request exceeds threshold policy';
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', rejectionReason: reason } : r));
    showNotification('Discount request rejected.');
  };

  const handleStatusChange = (id, newStatus) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    showNotification(`Negotiation request moved to ${newStatus.toUpperCase()}!`);
  };

  const handleDeleteRequest = (id) => {
    if (!window.confirm('Are you sure you want to withdraw/delete this price exception request?')) return;
    setRequests(prev => prev.filter(r => r.id !== id));
    showNotification('Discount request deleted.');
  };

  const startEdit = (req) => {
    setEditingReq(req);
    setForm({
      leadName: req.leadName,
      unitNumber: req.unitNumber,
      originalPrice: req.originalPrice,
      requestedPrice: req.requestedPrice,
      reason: req.reason,
      requestedBy: req.requestedBy
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const orig = Number(form.originalPrice);
    const req = Number(form.requestedPrice);
    const diff = orig - req;
    const pct = Number(((diff / orig) * 100).toFixed(2));

    if (editingReq) {
      const updated = {
        ...editingReq,
        leadName: form.leadName,
        unitNumber: form.unitNumber,
        originalPrice: orig,
        requestedPrice: req,
        discountAmt: diff,
        discountPct: pct,
        reason: form.reason,
        requestedBy: form.requestedBy,
        requiredLevel: pct > policyThresholds.headLimit ? 'Director / CMD' : pct > policyThresholds.managerLimit ? 'Sales Head' : 'Sales Manager'
      };
      setRequests(prev => prev.map(r => r.id === editingReq.id ? updated : r));
      showNotification('Negotiation request updated!');
    } else {
      const newReq = {
        id: Date.now().toString(),
        leadName: form.leadName,
        phone: '+91 90000 00000',
        unitNumber: form.unitNumber,
        originalPrice: orig,
        requestedPrice: req,
        discountAmt: diff,
        discountPct: pct,
        reason: form.reason,
        requestedBy: form.requestedBy,
        status: 'pending',
        date: 'Just now',
        requiredLevel: pct > policyThresholds.headLimit ? 'Director / CMD' : pct > policyThresholds.managerLimit ? 'Sales Head' : 'Sales Manager'
      };
      setRequests(p => [newReq, ...p]);
      showNotification('New discount approval request submitted!');
    }
    setShowModal(false);
    setEditingReq(null);
  };

  const filtered = requests.filter(r => {
    if (tab === 'policy') return true;
    return r.status === tab;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Commercials</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {tab === 'approved' ? 'Approved Discounts' : tab === 'policy' ? 'Approval Limit Policy' : 'Pending Requests'}
            </span>
          </div>
          <h1 className="page-title">Price Negotiations & Approvals</h1>
          <p className="page-subtitle">Commercial discount matrices, tiered approval workflows, and price exception logs</p>
        </div>
        <div className="page-actions">
          {tab === 'policy' ? (
            <button className="btn btn-primary btn-sm" onClick={() => showNotification('Approval Limit Policy updated!')}>
              <Save size={14} /> Save Policy Limits
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingReq(null); setForm({ leadName: '', unitNumber: 'A-501 (3BHK)', originalPrice: 12500000, requestedPrice: '12000000', reason: '', requestedBy: 'Amit Singh' }); setShowModal(true); }}>
              <Plus size={14} /> Request Price Exception
            </button>
          )}
        </div>
      </div>

      {/* Tabs & View Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[
            { id: 'pending', label: 'Pending Review', badge: requests.filter(r => r.status === 'pending').length },
            { id: 'approved', label: 'Approved Discounts' },
            { id: 'rejected', label: 'Rejected Requests' },
            { id: 'policy', label: 'Approval Limit Policy' },
          ].map(t => (
            <div
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => handleTabChange(t.id)}
            >
              {t.label} {t.badge ? <span className="badge badge-warning" style={{ marginLeft: 4 }}>{t.badge}</span> : null}
            </div>
          ))}
        </div>

        {tab !== 'policy' && (
          /* View Switcher: Table vs Kanban */
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2 }}>
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
        )}
      </div>

      {tab !== 'policy' ? (
        view === 'kanban' ? (
          <NegotiationsKanbanView
            requests={filtered}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={startEdit}
            onDelete={handleDeleteRequest}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Customer / Lead</th>
                  <th>Unit</th>
                  <th>Original AV</th>
                  <th>Requested AV</th>
                  <th>Discount %</th>
                  <th>Reason / Justification</th>
                  <th>Authority Required</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.leadName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.phone} · By {r.requestedBy}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.unitNumber}</td>
                    <td>{formatCurrency(r.originalPrice)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(r.requestedPrice)}</td>
                    <td>
                      <span className="badge badge-danger" style={{ fontWeight: 700 }}>
                        -{r.discountPct}% ({formatCurrency(r.discountAmt)})
                      </span>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontSize: 12, lineHeight: 1.4 }} className="truncate" title={r.reason}>{r.reason}</div>
                    </td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>{r.requiredLevel || 'Sales Head'}</span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {r.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit Request"
                          style={{ color: 'var(--primary)' }}
                          onClick={() => startEdit(r)}
                        >
                          <Edit size={14} />
                        </button>
                        {r.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => handleApprove(r.id)}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => handleReject(r.id)}
                            >
                              <X size={12} /> Reject
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete Request"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteRequest(r.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="card" style={{ padding: 24, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Price Exception & Discount Authorization Matrix</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>RERA compliant discount governance enforcing threshold approval limits by hierarchy</p>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Hierarchy Level</th>
                  <th>Maximum Allowed Discount (%)</th>
                  <th>Approval Turnaround (SLA)</th>
                  <th>Override Privilege</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700 }}>Sales Executive / Rep</td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      style={{ width: 90, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}
                      value={policyThresholds.repLimit}
                      onChange={e => setPolicyThresholds(p => ({ ...p, repLimit: Number(e.target.value) }))}
                    /> %
                  </td>
                  <td>Instant / On Spot</td>
                  <td>None</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>Sales Manager (Project Lead)</td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      style={{ width: 90, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}
                      value={policyThresholds.managerLimit}
                      onChange={e => setPolicyThresholds(p => ({ ...p, managerLimit: Number(e.target.value) }))}
                    /> %
                  </td>
                  <td>Within 2 Hours</td>
                  <td>Parking waiver / Floor rise adjustment</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>VP / Head of Sales</td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      style={{ width: 90, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}
                      value={policyThresholds.headLimit}
                      onChange={e => setPolicyThresholds(p => ({ ...p, headLimit: Number(e.target.value) }))}
                    /> %
                  </td>
                  <td>Within 6 Hours</td>
                  <td>Bulk inventory discount / Payment milestone shift</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>Managing Director / CMD</td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      style={{ width: 90, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}
                      value={policyThresholds.directorLimit}
                      onChange={e => setPolicyThresholds(p => ({ ...p, directorLimit: Number(e.target.value) }))}
                    /> %
                  </td>
                  <td>Within 24 Hours</td>
                  <td>Full Discretionary Override</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingReq ? `Edit Discount Request — ${editingReq.leadName}` : 'Request Price Exception / Discount'}</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Lead Selector */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Customer / Lead Name <span className="required">*</span>
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
                    <input
                      className="form-input"
                      value={form.leadName}
                      onChange={e => setForm(p => ({ ...p, leadName: e.target.value }))}
                      placeholder="e.g. Manoj Tiwari"
                      required={isManualLead}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Selected Unit / Project Space <span className="required">*</span></label>
                  <input className="form-input" value={form.unitNumber} onChange={e => setForm(p => ({ ...p, unitNumber: e.target.value }))} placeholder="e.g. Tower A - Unit 502 / Plot 45" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Standard Agreement Value (₹)</label>
                    <input type="number" className="form-input" value={form.originalPrice} onChange={e => setForm(p => ({ ...p, originalPrice: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Proposed Offer Price (₹) <span className="required">*</span></label>
                    <input type="number" className="form-input" value={form.requestedPrice} onChange={e => setForm(p => ({ ...p, requestedPrice: e.target.value }))} placeholder="e.g. 12200000" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Commercial Justification / Reason <span className="required">*</span></label>
                  <textarea className="form-input" style={{ height: 80, resize: 'none' }} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="State reasons like instant token cheque, bulk booking, competitive match..." required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingReq ? 'Update Request' : 'Submit for Authorization'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
