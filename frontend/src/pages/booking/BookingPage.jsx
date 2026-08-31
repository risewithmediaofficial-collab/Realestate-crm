import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Plus, Check, X, Eye, AlertCircle, DollarSign, Building, Trash2, List, Columns, User } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { formatCurrency, formatDate, formatArea, getInitials } from '../../utils/formatters';

const STATUS_CONFIG = {
  pending_approval: { label: 'Pending Approval', badge: 'badge-warning', color: '#fef3c7' },
  approved: { label: 'Approved', badge: 'badge-success', color: '#dcfce7' },
  agreement_signed: { label: 'Agreement Signed', badge: 'badge-primary', color: '#dbeafe' },
  registered: { label: 'Registered', badge: 'badge-purple', color: '#f3e8ff' },
  cancelled: { label: 'Cancelled', badge: 'badge-danger', color: '#fef2f2' },
  transferred: { label: 'Transferred', badge: 'badge-gray', color: '#f1f5f9' },
};

const mockBookings = [];

// ─── Booking Kanban View Component ───────────────
const BookingKanbanView = ({ bookings, onApprove, onCancel, onDeleteBooking, onStatusChange, onViewDetails }) => {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columns = [
    { id: 'pending_approval', title: 'Pending Approval', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
    { id: 'approved', title: 'Approved', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
    { id: 'agreement_signed', title: 'Agreement Signed', color: '#3b82f6', bg: '#eff6ff', icon: '📝' },
    { id: 'registered', title: 'Registered / Closed', color: '#8b5cf6', bg: '#f5f3ff', icon: '🏛️' },
    { id: 'cancelled', title: 'Cancelled', color: '#ef4444', bg: '#fef2f2', icon: '❌' },
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
        const colBookings = bookings.filter(b => (b.status || 'pending_approval') === col.id);
        const colValue = colBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={e => handleDragLeave(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            style={{
              flex: '0 0 310px',
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
                  {colBookings.length}
                </span>
              </div>
              {colBookings.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {formatCurrency(colValue)}
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
              {colBookings.length === 0 ? (
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
                  Drag bookings here to mark as {col.title}
                </div>
              ) : (
                colBookings.map(b => {
                  const statusConf = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending_approval;
                  const isDragging = draggedId === b._id;

                  return (
                    <div
                      key={b._id}
                      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, b._id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onViewDetails(b)}
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
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                            {b.customerName}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {b.bookingNumber || 'BK-2026-LIVE'}
                          </div>
                        </div>
                        <span className={`badge ${statusConf.badge}`} style={{ fontSize: 9 }}>
                          {statusConf.label}
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                        📞 {b.customerPhone}
                      </div>

                      {/* Unit & Project Box */}
                      <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>
                          {b.unit?.unitNumber} · {b.unit?.type || '3BHK'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {b.project?.name}
                        </span>
                      </div>

                      {/* Financials */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Deal</div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{formatCurrency(b.totalAmount)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Token Paid</div>
                          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--success)' }}>{formatCurrency(b.tokenAmount)}</div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          👤 {b.handledBy?.name || 'Amit Singh'}
                        </span>

                        <div style={{ display: 'flex', gap: 4 }}>
                          {b.status === 'pending_approval' && (
                            <button
                              className="btn btn-success btn-sm"
                              style={{ padding: '2px 6px', fontSize: 10 }}
                              onClick={() => onApprove(b._id)}
                              title="Approve Booking"
                            >
                              <Check size={11} /> Approve
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 20, width: 20, color: 'var(--primary)' }}
                            title="View Agreement & Details"
                            onClick={() => onViewDetails(b)}
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 20, width: 20, color: 'var(--danger)' }}
                            title="Delete Booking"
                            onClick={() => onDeleteBooking(b._id, b.customerName)}
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

// ─── Co-Applicant Relationships ─────────────────────────────
const CO_APPLICANT_RELATIONS = [
  { value: 'Spouse', label: '💍 Spouse (Wife / Husband)' },
  { value: 'Father', label: '👨 Father' },
  { value: 'Mother', label: '👩 Mother' },
  { value: 'Son', label: '👦 Son' },
  { value: 'Daughter', label: '👧 Daughter' },
  { value: 'Brother', label: '🧑 Brother' },
  { value: 'Sister', label: '👱‍♀️ Sister' },
  { value: 'Business Partner', label: '💼 Business Partner' },
  { value: 'Co-Owner / Investor', label: '🤝 Co-Owner / Co-Investor' },
  { value: 'Father-in-law', label: '👴 Father-in-law' },
  { value: 'Mother-in-law', label: '👵 Mother-in-law' },
  { value: 'Other Family Member', label: '👥 Other Family / Legal Entity' }
];

const defaultLeads = [];

// ─── Create Booking Modal ─────────────────────────
const CreateBookingModal = ({ onClose, onCreated, initialBooking }) => {
  const [projects, setProjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const [form, setForm] = useState({
    selectedLeadId: '',
    customerName: initialBooking?.customerName || '',
    customerPhone: initialBooking?.customerPhone || '',
    customerEmail: initialBooking?.customerEmail || '',
    customerPAN: initialBooking?.customerPAN || '',
    customerAadhaar: initialBooking?.customerAadhaar || '',
    customerAddress: initialBooking?.customerAddress || '',
    project: initialBooking?.project?._id || initialBooking?.project || '',
    unit: initialBooking?.unit?._id || initialBooking?.unit?.unitNumber || '',
    totalAmount: initialBooking?.totalAmount?.toString() || '',
    tokenAmount: initialBooking?.tokenAmount?.toString() || '',
    paymentPlan: initialBooking?.paymentPlan || 'construction_linked',
    loanRequired: false, loanAmount: '', bankName: '',
    coApplicantName: '', coApplicantPhone: '', coApplicantEmail: '',
    coApplicantPan: '', coApplicantAadhaar: '', coApplicantRelation: 'Spouse',
    channelPartner: '', cpCommission: '',
    notes: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projRes, leadsRes] = await Promise.allSettled([
          api.get('/projects'),
          api.get('/leads?limit=200')
        ]);
        if (projRes.status === 'fulfilled' && projRes.value.data?.data) {
          const projList = projRes.value.data.data;
          setProjects(projList);
          if (projList.length > 0 && !form.project) {
            setForm(p => ({ ...p, project: projList[0]._id }));
          }
        }
        if (leadsRes.status === 'fulfilled' && leadsRes.value.data?.data?.length > 0) {
          setLeadsList(leadsRes.value.data.data);
        } else {
          setLeadsList(defaultLeads);
        }
      } catch (err) {
        console.error('Failed to load modal data:', err);
        setLeadsList(defaultLeads);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    loadData();
  }, []);

  const handleLeadSelect = (leadId) => {
    if (!leadId) {
      setForm(p => ({
        ...p,
        selectedLeadId: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerPAN: '',
        customerAadhaar: '',
        customerAddress: ''
      }));
      return;
    }
    const lead = leadsList.find(l => l._id === leadId);
    if (lead) {
      setForm(p => ({
        ...p,
        selectedLeadId: leadId,
        customerName: lead.name || '',
        customerPhone: lead.phone || '',
        customerEmail: lead.email || '',
        customerPAN: lead.panNumber || '',
        customerAadhaar: lead.aadharNumber || '',
        customerAddress: lead.address || (lead.city ? `${lead.city}` : ''),
        project: lead.interestedProject?._id || lead.interestedProject || p.project
      }));
    }
  };

  useEffect(() => {
    if (!form.project) return;
    const loadUnits = async () => {
      try {
        const { data } = await api.get(`/inventory?project=${form.project}&status=available`);
        setUnits(data.data || []);
        if (data.data?.length > 0 && !form.unit) {
          const firstUnit = data.data[0];
          setForm(p => ({
            ...p,
            unit: firstUnit._id,
            totalAmount: firstUnit.pricing?.totalPrice?.toString() || p.totalAmount
          }));
        }
      } catch {
        setUnits([]);
      }
    };
    loadUnits();
  }, [form.project]);

  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const { showNotification } = useUI();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      lead: form.selectedLeadId || undefined,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      customerPAN: form.customerPAN,
      customerAadhaar: form.customerAadhaar,
      customerAddress: form.customerAddress,
      project: form.project,
      unit: form.unit,
      totalAmount: Number(form.totalAmount) || 0,
      tokenAmount: Number(form.tokenAmount) || 0,
      bookingAmount: Number(form.tokenAmount) || 0,
      bookingAmountMode: form.paymentMode ? form.paymentMode.toLowerCase() : 'cheque',
      paymentPlan: form.paymentPlan,
      coApplicants: form.coApplicantName ? [{
        name: form.coApplicantName,
        phone: form.coApplicantPhone,
        email: form.coApplicantEmail,
        relation: form.coApplicantRelation,
        panNumber: form.coApplicantPan,
        aadharNumber: form.coApplicantAadhaar
      }] : []
    };

    try {
      const { data } = await api.post('/bookings', payload);
      if (data?.data) {
        onCreated(data.data);
        const msg = data.data.status === 'approved'
          ? '🎉 Booking confirmed & approved by Admin!'
          : '⏳ Booking application submitted for Admin approval!';
        showNotification(msg);
      }
    } catch (err) {
      console.error('Failed to submit booking:', err);
      showNotification(err.response?.data?.message || 'Failed to submit booking application');
    } finally {
      setSaving(false);
      onClose();
    }
  };

  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">New Booking Application</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Step {step} of 3</div>
          </div>
          <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Progress steps */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--card-border)', padding: '0 24px' }}>
          {['Customer Details', 'Unit & Finance', 'Review'].map((s, i) => (
            <div key={i} onClick={() => setStep(i + 1)} style={{ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderBottom: step === i + 1 ? '2px solid var(--primary)' : '2px solid transparent', color: step === i + 1 ? 'var(--primary)' : step > i + 1 ? 'var(--success)' : 'var(--text-muted)' }}>
              {step > i + 1 ? '✓ ' : `${i + 1}. `}{s}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '20px 24px' }}>
            {step === 1 && (
              <>
                {/* Section 1: Lead Auto-Population Dropdown */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={15} color="#2563eb" /> Select Buyer / Prospect from Leads Database
                  </div>
                  <select
                    className="form-select"
                    value={form.selectedLeadId}
                    onChange={e => handleLeadSelect(e.target.value)}
                    style={{ background: 'white', fontWeight: 600 }}
                  >
                    <option value="">-- ➕ Enter New Customer (Manual KYC) --</option>
                    {leadsList.map(lead => (
                      <option key={lead._id} value={lead._id}>
                        {lead.name} ({lead.phone}) — {lead.stage ? lead.stage.replace(/_/g, ' ').toUpperCase() : 'LEAD'} • {lead.source || 'Direct'}
                      </option>
                    ))}
                  </select>
                  {form.selectedLeadId && (
                    <div style={{ fontSize: 11, color: '#15803d', marginTop: 6, fontWeight: 700 }}>
                      ✓ Auto-populated KYC details from CRM database
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 10 }}>
                  1. Primary Applicant Legal Information
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Legal Name <span className="required">*</span></label>
                    <input className="form-input" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder="Full legal name" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number <span className="required">*</span></label>
                    <input className="form-input" value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} placeholder="Mobile number" required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address <span className="required">*</span></label>
                    <input type="email" className="form-input" value={form.customerEmail} onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))} placeholder="email@domain.com" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN Number <span className="required">*</span></label>
                    <input className="form-input" value={form.customerPAN} onChange={e => setForm(p => ({ ...p, customerPAN: e.target.value.toUpperCase() }))} placeholder="ABCDE1234F" maxLength={10} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Aadhaar / National ID</label>
                    <input className="form-input" value={form.customerAadhaar || ''} onChange={e => setForm(p => ({ ...p, customerAadhaar: e.target.value }))} placeholder="1234 5678 9012" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Permanent Residential Address</label>
                    <input className="form-input" value={form.customerAddress || ''} onChange={e => setForm(p => ({ ...p, customerAddress: e.target.value }))} placeholder="Street, Flat #, City, Pin Code" />
                  </div>
                </div>

                {/* Section 2: Co-Applicant Details with Full Relationships */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, margin: '18px 0 0' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 10 }}>
                    2. Co-Applicant / Joint Ownership (Optional)
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Co-Applicant Name</label>
                      <input className="form-input" value={form.coApplicantName} onChange={e => setForm(p => ({ ...p, coApplicantName: e.target.value }))} placeholder="e.g. Sneha R. Kulkarni" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Relationship</label>
                      <select
                        className="form-select"
                        value={form.coApplicantRelation}
                        onChange={e => setForm(p => ({ ...p, coApplicantRelation: e.target.value }))}
                      >
                        {CO_APPLICANT_RELATIONS.map(rel => (
                          <option key={rel.value} value={rel.value}>{rel.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Co-Applicant Phone</label>
                      <input className="form-input" value={form.coApplicantPhone} onChange={e => setForm(p => ({ ...p, coApplicantPhone: e.target.value }))} placeholder="+91 98765 00000" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Co-Applicant Email / PAN</label>
                      <input className="form-input" value={form.coApplicantEmail} onChange={e => setForm(p => ({ ...p, coApplicantEmail: e.target.value }))} placeholder="Email or PAN" />
                    </div>
                  </div>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Project <span className="required">*</span></label>
                    <select
                      className="form-select"
                      value={form.project}
                      onChange={e => setForm(p => ({ ...p, project: e.target.value, unit: '' }))}
                      required
                    >
                      {projects.length === 0 ? (
                        <option value="">Loading projects...</option>
                      ) : (
                        projects.map(prj => (
                          <option key={prj._id} value={prj._id}>{prj.name} ({prj.city})</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Number <span className="required">*</span></label>
                    {units.length > 0 ? (
                      <select
                        className="form-select"
                        value={form.unit}
                        onChange={e => {
                          const uId = e.target.value;
                          const uObj = units.find(u => u._id === uId);
                          setForm(p => ({
                            ...p,
                            unit: uId,
                            totalAmount: uObj?.pricing?.totalPrice ? uObj.pricing.totalPrice.toString() : p.totalAmount
                          }));
                        }}
                        required
                      >
                        <option value="">-- Select Available Unit --</option>
                        {units.map(u => (
                          <option key={u._id} value={u._id}>
                            Unit {u.unitNumber} ({u.type} · Floor {u.floor}) — {formatCurrency(u.pricing?.totalPrice || 0)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="form-input"
                        value={form.unit}
                        onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                        placeholder="e.g. A-501"
                        required
                      />
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Total Agreement Value (₹) <span className="required">*</span></label>
                    <input type="number" className="form-input" value={form.totalAmount} onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))} placeholder="Total cost" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Token Advance (₹) <span className="required">*</span></label>
                    <input type="number" className="form-input" value={form.tokenAmount} onChange={e => setForm(p => ({ ...p, tokenAmount: e.target.value }))} placeholder="Booking token" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-select" value={form.paymentMode || 'Cheque'} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))}>
                      <option value="Cheque">Cheque / Demand Draft</option>
                      <option value="NEFT/RTGS">NEFT / RTGS Bank Transfer</option>
                      <option value="UPI">UPI / QR Payment</option>
                      <option value="Card">Debit / Credit Card</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cheque / Transaction Ref No.</label>
                    <input className="form-input" value={form.transactionRef || ''} onChange={e => setForm(p => ({ ...p, transactionRef: e.target.value }))} placeholder="e.g. HDFC-CHK-99120" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Plan Schedule</label>
                  <select className="form-select" value={form.paymentPlan} onChange={e => setForm(p => ({ ...p, paymentPlan: e.target.value }))}>
                    <option value="construction_linked">Construction Linked Plan (CLP)</option>
                    <option value="down_payment">Down Payment Plan</option>
                    <option value="subvention">Subvention Scheme</option>
                  </select>
                </div>
              </>
            )}
            {step === 3 && (
              <div>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Booking Summary</div>
                  {[
                    { label: 'Customer Name', value: form.customerName || '—' },
                    { label: 'Phone', value: form.customerPhone || '—' },
                    { label: 'Project', value: projects.find(p => p._id === form.project)?.name || 'Selected Project' },
                    { label: 'Unit', value: units.find(u => u._id === form.unit)?.unitNumber || form.unit || '—' },
                    { label: 'Total Amount', value: formatCurrency(Number(form.totalAmount)) },
                    { label: 'Token Amount', value: formatCurrency(Number(form.tokenAmount)) },
                    { label: 'Payment Plan', value: form.paymentPlan.replace(/_/g, ' ') },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < 6 ? '1px solid #e2e8f0' : 'none', padding: '8px 0' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            {step > 1 && <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>}
            {step < 3 && <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next →</button>}
            {step === 3 && <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit Booking'}</button>}
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Booking Card ────────────────────────────────
const BookingCard = ({ booking, onApprove, onCancel, onDeleteBooking }) => {
  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending_approval;

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{booking.customerName}</span>
            <span className={`badge ${statusConf.badge}`}>{statusConf.label}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{booking.customerPhone} · {booking.customerEmail}</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Unit</div>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{booking.unit?.unitNumber} · {booking.unit?.type || '3BHK'}</div>
            </div>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Project</div>
              <div style={{ fontWeight: 600 }}>{booking.project?.name}</div>
            </div>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Total Amount</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{formatCurrency(booking.totalAmount)}</div>
            </div>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Token Paid</div>
              <div style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(booking.tokenAmount)}</div>
            </div>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Handled By</div>
              <div style={{ fontWeight: 500 }}>{booking.handledBy?.name || 'Amit Singh'}</div>
            </div>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {booking.status === 'pending_approval' && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => onApprove(booking._id)}><Check size={13} /> Approve</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onCancel(booking._id)}><X size={13} /> Reject</button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => alert(`Showing digital agreement for Booking #${booking.bookingNumber || '001'}`)}><Eye size={13} /> View Details</button>
          <button className="btn btn-ghost btn-sm text-danger" style={{ color: 'var(--danger)' }} onClick={() => onDeleteBooking(booking._id, booking.customerName)}><Trash2 size={13} /> Delete</button>
        </div>
      </div>
    </div>
  );
};

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/pending')) return 'pending_approval';
    if (location.pathname.includes('/approved')) return 'approved';
    if (location.pathname.includes('/agreements')) return 'agreement_signed';
    return 'all';
  };

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [stats, setStats] = useState({});
  const { showNotification } = useUI();

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/booking/${tabId}`);
  };

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bookings');
      setBookings(data.data || []);
      const { data: s } = await api.get('/bookings/stats');
      setStats(s.data || { total: 0, todayCount: 0, pending: 0, approved: 0 });
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setBookings([]);
      setStats({ total: 0, todayCount: 0, pending: 0, approved: 0 });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleApprove = async (id) => {
    try {
      const { data } = await api.put(`/bookings/${id}/approve`);
      if (data?.data) {
        setBookings(prev => prev.map(b => b._id === id ? { ...b, ...data.data } : b));
      } else {
        setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'approved' } : b));
      }
      showNotification('🎉 Booking application approved and unit marked as booked!');
      fetchBookings();
    } catch (err) {
      console.error('Failed to approve booking:', err);
      showNotification(err.response?.data?.message || 'Failed to approve booking');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      if (status === 'approved') await api.put(`/bookings/${id}/approve`);
      else await api.put(`/bookings/${id}`, { status });
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status } : b));
      showNotification(`Booking moved to ${status.replace('_', ' ').toUpperCase()}!`);
      fetchBookings();
    } catch (err) {
      console.error('Failed to change booking status:', err);
      showNotification('Failed to change booking status');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to reject this booking application? The allocated unit will be released back to available.')) return;
    try {
      const { data } = await api.put(`/bookings/${id}/cancel`, { reason: 'Rejected by Admin' });
      if (data?.data) {
        setBookings(prev => prev.map(b => b._id === id ? { ...b, ...data.data } : b));
      } else {
        setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
      }
      showNotification('Booking application rejected and unit released.');
      fetchBookings();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      showNotification(err.response?.data?.message || 'Failed to reject booking');
    }
  };

  const handleDeleteBooking = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the booking application for "${name || 'this customer'}"? This action cannot be undone and will release the allocated unit.`)) return;
    
    // Instant optimistic UI removal
    setBookings(prev => prev.filter(b => b._id !== id && b.id !== id));
    showNotification('Booking application deleted and unit released.');

    try {
      await api.delete(`/bookings/${id}`);
      const { data: s } = await api.get('/bookings/stats');
      if (s?.data) setStats(s.data);
    } catch (err) {
      console.warn('Backend delete response:', err);
    }
  };

  const filtered = bookings.filter(b => {
    if (activeTab !== 'all') return b.status === activeTab;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Bookings</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {activeTab === 'pending_approval' ? 'Pending Approval' : activeTab === 'approved' ? 'Approved Bookings' : activeTab === 'agreement_signed' ? 'Signed Agreements' : 'All Bookings'}
            </span>
          </div>
          <h1 className="page-title">Booking Management & Approvals</h1>
          <p className="page-subtitle">Track applications, approvals, digital agreement deeds and unit allocations</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={14} /> New Booking</button>
        </div>
      </div>

      {/* Tabs & View Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[
            { k: 'all', l: 'All Bookings' },
            { k: 'pending_approval', l: 'Pending Approval' },
            { k: 'approved', l: 'Approved' },
            { k: 'agreement_signed', l: 'Agreement Signed' },
          ].map(tab => (
            <div
              key={tab.k}
              className={`tab ${activeTab === tab.k ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.k)}
            >
              {tab.l}
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

      {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
        filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon"><FileText size={28} /></div><div className="empty-state-title">No bookings found in this view</div><button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> New Booking</button></div></div>
        ) : view === 'kanban' ? (
          <BookingKanbanView
            bookings={filtered}
            onApprove={handleApprove}
            onCancel={handleCancel}
            onDeleteBooking={handleDeleteBooking}
            onStatusChange={handleStatusChange}
            onViewDetails={b => alert(`Showing digital agreement for Booking #${b.bookingNumber || '001'}`)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(b => <BookingCard key={b._id} booking={b} onApprove={handleApprove} onCancel={handleCancel} onDeleteBooking={handleDeleteBooking} />)}
          </div>
        )}

      {showNew && <CreateBookingModal onClose={() => setShowNew(false)} onCreated={b => setBookings(p => [b, ...p])} />}
    </div>
  );
}
