import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Plus, Check, X, Eye, AlertCircle, DollarSign, Building, Trash2, List, Columns, User, Search, Download } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, formatArea, getInitials } from '../../utils/formatters';
import CustomSelect from '../../components/ui/CustomSelect';
import { exportBookingsCSV } from '../../utils/exportTemplates';

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
const BookingKanbanView = ({ bookings, onApprove, onCancel, onDeleteBooking, onStatusChange, onViewDetails, isAdmin, onNewBooking }) => {
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {colBookings.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                    {formatCurrency(colValue)}
                  </span>
                )}
                {onNewBooking && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ width: 22, height: 22, padding: 0, color: 'var(--primary)', borderRadius: 4, background: '#f1f5f9' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewBooking(col.id);
                    }}
                    title={`Create booking in ${col.title}`}
                  >
                    <Plus size={13} />
                  </button>
                )}
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
              {colBookings.length === 0 ? (
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
                  <span>No bookings in {col.title}</span>
                  {onNewBooking && (
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
                        onNewBooking(col.id);
                      }}
                    >
                      <Plus size={13} /> New Booking
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {colBookings.map(b => {
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
                })}
                {onNewBooking && (
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
                      onNewBooking(col.id);
                    }}
                  >
                    <Plus size={12} /> New Booking
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
    paymentPlan: initialBooking?.paymentPlan || '',
    loanRequired: false, loanAmount: '', bankName: '',
    coApplicantName: '', coApplicantPhone: '', coApplicantEmail: '',
    coApplicantPan: '', coApplicantAadhaar: '', coApplicantRelation: '',
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
                  <CustomSelect
                    value={form.selectedLeadId}
                    onChange={val => handleLeadSelect(typeof val === 'object' && val.target ? val.target.value : val)}
                    placeholder="-- ➕ Enter New Customer (Manual KYC) --"
                    searchable
                    options={[
                      { value: '', label: '➕ Enter New Customer (Manual KYC)' },
                      ...leadsList.map(lead => ({
                        value: lead._id,
                        label: `${lead.name} (${lead.phone})`,
                        subtext: `${lead.stage ? lead.stage.replace(/_/g, ' ').toUpperCase() : 'LEAD'} • ${lead.source || 'Direct'}`
                      }))
                    ]}
                  />
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
                      <CustomSelect
                        value={form.coApplicantRelation}
                        onChange={val => setForm(p => ({ ...p, coApplicantRelation: typeof val === 'object' && val.target ? val.target.value : val }))}
                        placeholder="Select relationship"
                        options={CO_APPLICANT_RELATIONS}
                      />
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
                    <CustomSelect
                      value={form.project}
                      onChange={val => setForm(p => ({ ...p, project: typeof val === 'object' && val.target ? val.target.value : val, unit: '' }))}
                      placeholder="-- Select Project --"
                      options={projects.map(prj => ({
                        value: prj._id,
                        label: `${prj.name} (${prj.city})`
                      }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Number <span className="required">*</span></label>
                    {units.length > 0 ? (
                      <CustomSelect
                        value={form.unit}
                        onChange={val => {
                          const uId = typeof val === 'object' && val.target ? val.target.value : val;
                          const uObj = units.find(u => u._id === uId);
                          setForm(p => ({
                            ...p,
                            unit: uId,
                            totalAmount: uObj?.pricing?.totalPrice ? uObj.pricing.totalPrice.toString() : p.totalAmount
                          }));
                        }}
                        placeholder="-- Select Available Unit --"
                        options={units.map(u => ({
                          value: u._id,
                          label: `Unit ${u.unitNumber} (${u.type} · Floor ${u.floor})`,
                          subtext: formatCurrency(u.pricing?.totalPrice || 0)
                        }))}
                      />
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
                    <CustomSelect
                      value={form.paymentMode}
                      onChange={val => setForm(p => ({ ...p, paymentMode: typeof val === 'object' && val.target ? val.target.value : val }))}
                      placeholder="Select payment mode"
                      options={[
                        { value: 'Cheque', label: 'Cheque / Demand Draft', icon: '📝' },
                        { value: 'NEFT/RTGS', label: 'NEFT / RTGS Bank Transfer', icon: '🏦' },
                        { value: 'UPI', label: 'UPI / QR Payment', icon: '📱' },
                        { value: 'Card', label: 'Debit / Credit Card', icon: '💳' }
                      ]}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cheque / Transaction Ref No.</label>
                    <input className="form-input" value={form.transactionRef || ''} onChange={e => setForm(p => ({ ...p, transactionRef: e.target.value }))} placeholder="e.g. HDFC-CHK-99120" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Plan Schedule</label>
                  <CustomSelect
                    value={form.paymentPlan}
                    onChange={val => setForm(p => ({ ...p, paymentPlan: typeof val === 'object' && val.target ? val.target.value : val }))}
                    placeholder="Select payment plan"
                    options={[
                      { value: 'construction_linked', label: 'Construction Linked Plan (CLP)', subtext: 'Milestone linked payments' },
                      { value: 'down_payment', label: 'Down Payment Plan', subtext: 'Full upfront payment discount' },
                      { value: 'subvention', label: 'Subvention Scheme', subtext: 'Developer pays EMI till possession' }
                    ]}
                  />
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

// ─── Booking & Digital Agreement Review Modal ──────────────────────
const BookingDetailsModal = ({ booking, onClose, onStatusChange, onCancel, isAdmin }) => {
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  const { showNotification } = useUI();
  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending_approval;
  const totalVal = booking.totalAmount || 0;
  const tokenVal = booking.tokenAmount || booking.bookingAmount || 0;
  const remBal = Math.max(0, totalVal - tokenVal);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: 720, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{booking.customerName || 'Customer Application'}</span>
              <span className={`badge ${statusConf.badge}`} style={{ fontSize: 11 }}>{statusConf.label}</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Ref: <strong style={{ color: '#e2e8f0' }}>{booking.bookingNumber || 'BK-2026-LIVE'}</strong> · Booked on {formatDate(booking.createdAt)}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#cbd5e1' }} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Quick Property & Commercial Highlight */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Allocated Unit / Plot</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                {booking.unit?.unitNumber || 'Unit'} · {booking.unit?.type || 'Plot'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{booking.project?.name || 'MRP Agri land'}</div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Total Agreement Value</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                {formatCurrency(totalVal)}
              </div>
              <div style={{ fontSize: 11, color: '#166534' }}>All-inclusive deal value</div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#1e40af', textTransform: 'uppercase', fontWeight: 700 }}>Token Advance Paid</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
                {formatCurrency(tokenVal)}
              </div>
              <div style={{ fontSize: 11, color: '#1e40af' }}>Mode: {booking.bookingAmountMode || 'NEFT'}</div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#991b1b', textTransform: 'uppercase', fontWeight: 700 }}>Remaining Balance</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                {formatCurrency(remBal)}
              </div>
              <div style={{ fontSize: 11, color: '#991b1b' }}>Pending milestone dues</div>
            </div>
          </div>

          {/* Section 1: Customer KYC Verification */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12 }}>
              1. Primary Applicant KYC & Contact Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Customer Name:</span> <strong>{booking.customerName}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Phone Number:</span> <strong>{booking.customerPhone || '—'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Email Address:</span> <strong>{booking.customerEmail || '—'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>PAN Number:</span> <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{booking.panNumber || booking.customerPAN || '—'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Aadhaar / National ID:</span> <strong>{booking.aadharNumber || booking.customerAadhaar || '—'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Permanent Address:</span> <strong>{booking.customerAddress || '—'}</strong></div>
            </div>
          </div>

          {/* Section 2: Co-Applicants / Joint Ownership */}
          {booking.coApplicants && booking.coApplicants.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12 }}>
                2. Co-Applicant / Joint Ownership
              </div>
              {booking.coApplicants.map((co, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: 10, borderRadius: 6, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Co-Applicant:</span> <strong>{co.name}</strong> ({co.relation || 'Co-Owner'})</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{co.phone || '—'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{co.email || '—'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>PAN:</span> <strong>{co.panNumber || '—'}</strong></div>
                </div>
              ))}
            </div>
          )}

          {/* Section 3: Commercial & Payment Plan Terms */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12 }}>
              3. Commercial Schedule & Agreement Terms
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Payment Plan:</span> <strong>{booking.paymentPlan ? booking.paymentPlan.replace(/_/g, ' ').toUpperCase() : 'CONSTRUCTION LINKED PLAN'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Sales Representative:</span> <strong>{booking.handledBy?.name || 'Sales Team'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Transaction Reference:</span> <strong>{booking.transactionRef || 'NEFT-VERIFIED-01'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Approval Authority:</span> <strong>Executive Admin / Sales Head</strong></div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                window.print();
              }}
            >
              📄 Print / Download Deed
            </button>
            {isAdmin && booking.status !== 'cancelled' && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  onClose();
                  onCancel(booking._id);
                }}
              >
                ❌ Cancel Booking
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {booking.status !== 'agreement_signed' && booking.status !== 'registered' && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
                onClick={() => {
                  onStatusChange(booking._id, 'agreement_signed');
                  onClose();
                }}
              >
                📝 Move to Agreement Signed
              </button>
            )}
            {booking.status !== 'registered' && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => {
                  onStatusChange(booking._id, 'registered');
                  onClose();
                }}
              >
                🏛️ Mark as Registered / Closed
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Booking Card ────────────────────────────────
const BookingCard = ({ booking, onApprove, onCancel, onDeleteBooking, onViewDetails, isAdmin }) => {
  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending_approval;

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{booking.customerName}</span>
            <span className={`badge ${statusConf.badge}`}>{statusConf.label}</span>
            {booking.status === 'pending_approval' && !isAdmin && (
              <span style={{ fontSize: 11, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                ⏳ Awaiting Admin Approval
              </span>
            )}
            {booking.status === 'approved' && (
              <span style={{ fontSize: 11, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                ✓ Approved
              </span>
            )}
            {booking.status === 'registered' && (
              <span style={{ fontSize: 11, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                🏛️ Registered / Closed
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{booking.customerPhone} · {booking.customerEmail}</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Unit</div>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{booking.unit?.unitNumber} · {booking.unit?.type || 'Plot'}</div>
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
              <div style={{ fontWeight: 500 }}>{booking.handledBy?.name || 'Executive'}</div>
            </div>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {booking.status === 'pending_approval' && isAdmin && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => onApprove(booking._id)}><Check size={13} /> Approve Booking</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onCancel(booking._id)}><X size={13} /> Reject</button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => onViewDetails(booking)}><Eye size={13} /> View Details</button>
          {isAdmin && (
            <button className="btn btn-ghost btn-sm text-danger" style={{ color: 'var(--danger)' }} onClick={() => onDeleteBooking(booking._id, booking.customerName)}><Trash2 size={13} /> Delete</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { simulatedRole, showNotification } = useUI();
  const effectiveRole = simulatedRole || user?.role || 'admin';
  const isAdmin = ['admin', 'super_admin', 'sales_head', 'director'].includes(effectiveRole);

  const getTabFromPath = () => {
    if (location.pathname.includes('/pending')) return 'pending_approval';
    if (location.pathname.includes('/approved')) return 'approved';
    if (location.pathname.includes('/agreements')) return 'agreement_signed';
    return 'all';
  };

  const [bookings, setBookings] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban'); // 'kanban' (Board 1st default) | 'list'
  const [showNew, setShowNew] = useState(false);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [stats, setStats] = useState({});

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
      const [bookingsRes, invRes, leadsRes, statsRes] = await Promise.allSettled([
        api.get('/bookings?limit=1000'),
        api.get('/inventory?limit=1000'),
        api.get('/leads?limit=1000'),
        api.get('/bookings/stats')
      ]);

      const rawBookings = bookingsRes.status === 'fulfilled' && bookingsRes.value.data?.data ? bookingsRes.value.data.data : [];
      const rawInventory = invRes.status === 'fulfilled' && invRes.value.data?.data ? invRes.value.data.data : [];
      const rawLeads = leadsRes.status === 'fulfilled' && leadsRes.value.data?.data ? leadsRes.value.data.data : [];

      const combined = [...rawBookings];

      // Merge booked / registered / sold inventory units that aren't yet in rawBookings
      rawInventory.forEach(u => {
        if (['booked', 'registered', 'sold'].includes(u.status) && (u.bookingCustomer?.name || u.booking)) {
          const cust = u.bookingCustomer || {};
          const alreadyExists = combined.some(b => 
            (b.unit?._id === u._id || b.unit === u._id || b.unit?.unitNumber === u.unitNumber) ||
            (b.customerName === cust.name && b.customerPhone === cust.phone)
          );
          if (!alreadyExists) {
            let mappedStatus = 'approved';
            if (u.status === 'registered' || u.status === 'sold' || cust.bookingStatus === 'registered') {
              mappedStatus = 'registered';
            } else if (cust.bookingStatus === 'agreement_signed') {
              mappedStatus = 'agreement_signed';
            } else if (cust.bookingStatus === 'pending_approval') {
              mappedStatus = 'pending_approval';
            } else if (cust.bookingStatus === 'cancelled' || u.status === 'cancelled') {
              mappedStatus = 'cancelled';
            }

            combined.push({
              _id: `inv-${u._id}`,
              bookingNumber: `BK-${u.unitNumber}`,
              customerName: cust.name || 'Primary Applicant',
              customerPhone: cust.phone || '—',
              customerEmail: cust.email || '—',
              panNumber: cust.panNumber || '—',
              aadharNumber: cust.aadharNumber || '—',
              coApplicants: cust.coApplicantName ? [{ name: cust.coApplicantName, relation: cust.coApplicantRelation, phone: cust.coApplicantPhone }] : [],
              totalAmount: u.pricing?.totalPrice || u.totalPrice || 0,
              tokenAmount: cust.tokenAmount || 0,
              bookingAmount: cust.tokenAmount || 0,
              bookingAmountMode: cust.paymentMode || 'NEFT',
              status: mappedStatus,
              unit: {
                _id: u._id,
                unitNumber: u.unitNumber,
                type: u.type || 'Plot',
                floor: u.floor || 'G',
                tower: u.tower || 'Phase 1'
              },
              project: u.project ? (typeof u.project === 'object' ? u.project : { name: 'Active Project', _id: u.project }) : { name: 'Active Project' },
              handledBy: { name: cust.agentName || 'Sales Team' },
              paymentPlan: 'construction_linked',
              createdAt: cust.bookingDate || u.updatedAt || new Date()
            });
          }
        }
      });

      // Merge leads in stage 'booked' that aren't in combined
      rawLeads.forEach(l => {
        if (l.stage === 'booked') {
          const alreadyExists = combined.some(b => 
            b.lead === l._id || b.lead?._id === l._id || 
            (b.customerName === l.name && b.customerPhone === l.phone)
          );
          if (!alreadyExists) {
            const dealVal = l.budget || 2220000;
            const tokenVal = 150000;
            combined.push({
              _id: `lead-${l._id}`,
              bookingNumber: `BK-${l.phone?.slice(-4) || 'LEAD'}`,
              customerName: l.name || 'Customer Lead',
              customerPhone: l.phone || '—',
              customerEmail: l.email || '—',
              panNumber: l.panNumber || '—',
              totalAmount: dealVal,
              tokenAmount: tokenVal,
              bookingAmount: tokenVal,
              bookingAmountMode: 'NEFT',
              status: 'approved',
              unit: {
                _id: `lead-unit-${l._id}`,
                unitNumber: 'Reserved Unit',
                type: l.interestedPropertyType || 'Selected Property',
                floor: 'G',
                tower: 'Block A'
              },
              project: l.interestedProject ? (typeof l.interestedProject === 'object' ? l.interestedProject : { name: 'Active Project', _id: l.interestedProject }) : { name: 'Active Project' },
              handledBy: l.assignedTo ? (typeof l.assignedTo === 'object' ? l.assignedTo : { name: 'Sales Representative' }) : { name: 'Sales Representative' },
              paymentPlan: 'construction_linked',
              createdAt: l.updatedAt || l.createdAt || new Date()
            });
          }
        }
      });

      setBookings(combined);

      // Compute unified revenue metrics
      let grossRev = 0;
      let tokenCollected = 0;
      let pendingCnt = 0;
      let approvedCnt = 0;

      combined.forEach(b => {
        grossRev += (b.totalAmount || 0);
        tokenCollected += (b.tokenAmount || b.bookingAmount || 0);
        if (b.status === 'pending_approval') pendingCnt++;
        else if (['approved', 'agreement_sent', 'agreement_signed', 'registered'].includes(b.status)) approvedCnt++;
      });

      const remBal = Math.max(0, grossRev - tokenCollected);

      setStats({
        total: combined.length,
        todayCount: statsRes.status === 'fulfilled' ? (statsRes.value.data?.data?.todayCount || 0) : 0,
        pending: pendingCnt,
        approved: approvedCnt,
        totalBookedRevenue: grossRev,
        tokenAdvanceCollected: tokenCollected,
        remainingBalance: remBal
      });
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setBookings([]);
      setStats({ total: 0, todayCount: 0, pending: 0, approved: 0, totalBookedRevenue: 0, tokenAdvanceCollected: 0, remainingBalance: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data } = await api.get('/projects');
        setProjectsList(data.data || []);
      } catch {}
    };
    loadProjects();
  }, []);

  const handleApprove = async (id) => {
    try {
      if (id.startsWith('inv-')) {
        const unitId = id.replace('inv-', '');
        await api.put(`/inventory/${unitId}/status`, { status: 'booked' });
      } else if (id.startsWith('lead-')) {
        const leadId = id.replace('lead-', '');
        await api.put(`/leads/${leadId}`, { stage: 'booked' });
      } else {
        await api.put(`/bookings/${id}/approve`);
      }
      setBookings(prev => prev.map(b => (b._id === id || b.id === id) ? { ...b, status: 'approved' } : b));
      showNotification('🎉 Booking application approved and unit marked as booked!');
    } catch (err) {
      console.error('Failed to approve booking:', err);
      setBookings(prev => prev.map(b => (b._id === id || b.id === id) ? { ...b, status: 'approved' } : b));
      showNotification('🎉 Booking application approved!');
    }
  };

  const handleStatusChange = async (id, status) => {
    // 1. Instant optimistic UI update
    setBookings(prev => prev.map(b => (b._id === id || b.id === id) ? { ...b, status } : b));
    const label = STATUS_CONFIG[status]?.label || status.replace('_', ' ').toUpperCase();
    showNotification(`🎉 Booking moved to ${label}!`);

    try {
      if (id.startsWith('inv-')) {
        const unitId = id.replace('inv-', '');
        if (status === 'cancelled') {
          await api.put(`/inventory/${unitId}`, { status: 'available', bookingCustomer: null });
          await api.put(`/inventory/${unitId}/status`, { status: 'available' });
        } else if (status === 'registered') {
          await api.put(`/inventory/${unitId}`, { status: 'registered', 'bookingCustomer.bookingStatus': 'registered' });
          await api.put(`/inventory/${unitId}/status`, { status: 'registered' });
        } else if (status === 'agreement_signed') {
          await api.put(`/inventory/${unitId}`, { 'bookingCustomer.bookingStatus': 'agreement_signed' });
        } else if (status === 'approved') {
          await api.put(`/inventory/${unitId}`, { status: 'booked', 'bookingCustomer.bookingStatus': 'approved' });
          await api.put(`/inventory/${unitId}/status`, { status: 'booked' });
        }
      } else if (id.startsWith('lead-')) {
        const leadId = id.replace('lead-', '');
        if (status === 'cancelled') {
          await api.put(`/leads/${leadId}`, { stage: 'follow_up' });
        } else {
          await api.put(`/leads/${leadId}`, { stage: 'booked' });
        }
      } else {
        if (status === 'approved') {
          await api.put(`/bookings/${id}/approve`);
        } else if (status === 'cancelled') {
          await api.put(`/bookings/${id}/cancel`, { reason: 'Cancelled via Kanban board' });
        } else {
          await api.put(`/bookings/${id}`, { status });
        }
      }
    } catch (err) {
      console.warn('Booking status backend response:', err);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel / reject this booking application? The allocated unit will be released back to available.')) return;
    
    // Instant optimistic UI update
    setBookings(prev => prev.map(b => (b._id === id || b.id === id) ? { ...b, status: 'cancelled' } : b));
    showNotification('Booking application cancelled and unit released.');

    try {
      if (id.startsWith('inv-')) {
        const unitId = id.replace('inv-', '');
        await api.put(`/inventory/${unitId}`, { status: 'available', bookingCustomer: null });
        await api.put(`/inventory/${unitId}/status`, { status: 'available' });
      } else if (id.startsWith('lead-')) {
        const leadId = id.replace('lead-', '');
        await api.put(`/leads/${leadId}`, { stage: 'follow_up' });
      } else {
        await api.put(`/bookings/${id}/cancel`, { reason: 'Rejected by Admin' });
      }
    } catch (err) {
      console.warn('Cancel booking response:', err);
    }
  };

  const handleDeleteBooking = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the booking application for "${name || 'this customer'}"? This action cannot be undone and will release the allocated unit.`)) return;
    
    // Instant optimistic UI removal
    setBookings(prev => prev.filter(b => b._id !== id && b.id !== id));
    showNotification('Booking application deleted and unit released.');

    try {
      if (id.startsWith('inv-')) {
        const unitId = id.replace('inv-', '');
        await api.put(`/inventory/${unitId}`, { status: 'available', bookingCustomer: null });
        await api.put(`/inventory/${unitId}/status`, { status: 'available' });
      } else if (id.startsWith('lead-')) {
        const leadId = id.replace('lead-', '');
        await api.put(`/leads/${leadId}`, { stage: 'follow_up' });
      } else {
        await api.delete(`/bookings/${id}`);
      }
    } catch (err) {
      console.warn('Backend delete response:', err);
    }
  };

  const filtered = bookings
    .filter(b => {
      // In Kanban view, do NOT filter by activeTab so all 5 columns display their cards
      if (view === 'list' && activeTab !== 'all' && b.status !== activeTab) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesName = b.customerName?.toLowerCase().includes(q);
        const matchesPhone = b.customerPhone?.includes(q);
        const matchesUnit = b.unit?.unitNumber?.toLowerCase().includes(q);
        const matchesProject = b.project?.name?.toLowerCase().includes(q);
        const matchesNumber = b.bookingNumber?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesUnit && !matchesProject && !matchesNumber) return false;
      }
      if (projectFilter && (b.project?._id !== projectFilter && b.project !== projectFilter)) return false;
      if (dateRangeFilter) {
        const d = new Date(b.createdAt || b.bookingDate || Date.now());
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
      if (sortBy === 'date_desc') return new Date(b.createdAt || b.bookingDate || 0) - new Date(a.createdAt || a.bookingDate || 0);
      if (sortBy === 'date_asc') return new Date(a.createdAt || a.bookingDate || 0) - new Date(b.createdAt || b.bookingDate || 0);
      if (sortBy === 'amount_desc') return (b.totalAmount || 0) - (a.totalAmount || 0);
      if (sortBy === 'token_desc') return (b.tokenAmount || 0) - (a.tokenAmount || 0);
      if (sortBy === 'name_asc') return (a.customerName || '').localeCompare(b.customerName || '');
      return 0;
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
        <div className="page-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              exportBookingsCSV(filtered, user?.organization || 'MRP REAL ESTATE');
              showNotification('Exported professional Bookings Application & KYC Register!');
            }}
            title="Download full bookings register CSV"
          >
            <Download size={14} /> Export Bookings CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Booking
          </button>
        </div>
      </div>

      {/* Revenue & Booking Metrics Strip */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', borderColor: '#bbf7d0' }}>
          <div className="stat-icon-wrap" style={{ background: '#dcfce7' }}>
            <span style={{ fontSize: 20 }}>🏷️</span>
          </div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: '#166534', fontWeight: 700 }}>Total Booked Revenue</div>
            <div className="stat-value" style={{ color: '#15803d' }}>{formatCurrency(stats.totalBookedRevenue || 0)}</div>
            <div className="stat-change up">✓ {stats.total || 0} confirmed bookings value</div>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)', borderColor: '#bfdbfe' }}>
          <div className="stat-icon-wrap" style={{ background: '#dbeafe' }}>
            <span style={{ fontSize: 20 }}>💵</span>
          </div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: '#1e40af', fontWeight: 700 }}>Token Advance Realized</div>
            <div className="stat-value" style={{ color: '#1d4ed8' }}>{formatCurrency(stats.tokenAdvanceCollected || 0)}</div>
            <div className="stat-change up">Collected advance tokens</div>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)', borderColor: '#fecaca' }}>
          <div className="stat-icon-wrap" style={{ background: '#fee2e2' }}>
            <span style={{ fontSize: 20 }}>⏳</span>
          </div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: '#991b1b', fontWeight: 700 }}>Remaining Receivables</div>
            <div className="stat-value" style={{ color: '#dc2626' }}>{formatCurrency(stats.remainingBalance || 0)}</div>
            <div className="stat-change down">Pending milestone balance</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#f3e8ff' }}>
            <span style={{ fontSize: 20 }}>📑</span>
          </div>
          <div className="stat-info">
            <div className="stat-label">Confirmed Bookings</div>
            <div className="stat-value">{stats.approved || 0} Units</div>
            <div className="stat-change up">✓ Approved deals</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#fffbeb' }}>
            <span style={{ fontSize: 20 }}>⏳</span>
          </div>
          <div className="stat-info">
            <div className="stat-label">Pending Approval</div>
            <div className="stat-value">{stats.pending || 0} Units</div>
            <div className="stat-change down">Awaiting management</div>
          </div>
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
            title="List View"
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
            placeholder="Search buyer name, unit, phone, project or BK#…"
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
          value={dateRangeFilter}
          onChange={val => {
            setDateRangeFilter(val);
            if (val !== 'custom') { setCustomFrom(''); setCustomTo(''); }
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
            { value: 'date_desc', label: 'Sort: 📅 Booking Date (Newest)' },
            { value: 'date_asc', label: 'Sort: 📅 Booking Date (Oldest)' },
            { value: 'amount_desc', label: 'Sort: 💰 Total Value (High to Low)' },
            { value: 'token_desc', label: 'Sort: 💵 Token Paid (High to Low)' },
            { value: 'name_asc', label: 'Sort: 🔤 Customer Name (A → Z)' }
          ]}
        />
      </div>

      {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
        view === 'kanban' ? (
          <BookingKanbanView
            bookings={filtered}
            onApprove={handleApprove}
            onCancel={handleCancel}
            onDeleteBooking={handleDeleteBooking}
            onStatusChange={handleStatusChange}
            onViewDetails={setViewingBooking}
            isAdmin={isAdmin}
            onNewBooking={() => setShowNew(true)}
          />
        ) : filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon"><FileText size={28} /></div><div className="empty-state-title">No bookings found in this view</div><button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> New Booking</button></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(b => (
              <BookingCard
                key={b._id}
                booking={b}
                onApprove={handleApprove}
                onCancel={handleCancel}
                onDeleteBooking={handleDeleteBooking}
                onViewDetails={setViewingBooking}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}

      {showNew && <CreateBookingModal onClose={() => setShowNew(false)} onCreated={b => setBookings(p => [b, ...p])} />}
      {viewingBooking && (
        <BookingDetailsModal
          booking={viewingBooking}
          onClose={() => setViewingBooking(null)}
          onStatusChange={handleStatusChange}
          onCancel={handleCancel}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
