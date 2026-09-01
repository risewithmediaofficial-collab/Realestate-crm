import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Filter, Grid, List, X, Check, Clock, FileText, Plus, Layers,
  Sparkles, Building2, HelpCircle, Trash2, Columns, Eye, User, Users,
  CreditCard, UserCheck, CheckCircle, Download
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { UNIT_STATUSES, REAL_ESTATE_CATEGORIES, CATEGORY_TYPOLOGIES, FACING_OPTIONS } from '../../utils/constants';
import { formatCurrency, formatArea } from '../../utils/formatters';
import AddInventoryModal from '../../components/inventory/AddInventoryModal';
import CustomSelect from '../../components/ui/CustomSelect';
import { exportInventoryMatrixCSV } from '../../utils/exportTemplates';

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

// ─── Inventory Kanban View ────────────────────────
const InventoryKanbanView = ({ units, onUnitClick, onUpdateStatus, onDeleteUnit, isAdmin }) => {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columns = [
    { id: 'available', title: 'Available', color: '#16a34a', bg: '#ecfdf5', icon: '🟢' },
    { id: 'on_hold', title: 'On 48h Hold', color: '#d97706', bg: '#fffbeb', icon: '🟡' },
    { id: 'blocked', title: 'Management Blocked', color: '#ef4444', bg: '#fef2f2', icon: '🔴' },
    { id: 'booked', title: 'Token Booked', color: '#2563eb', bg: '#eff6ff', icon: '🔵' },
    { id: 'sold', title: 'Sold & Registered', color: '#64748b', bg: '#f8fafc', icon: '⚪' },
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
    if (id && onUpdateStatus) {
      onUpdateStatus(id, colId);
    }
  };

  return (
    <div className="kanban-board" style={{ gap: 16, height: 'calc(100vh - 240px)', paddingBottom: 10 }}>
      {columns.map(col => {
        const colUnits = units.filter(u => (u.status || 'available') === col.id);
        const colValue = colUnits.reduce((sum, u) => sum + (u.pricing?.totalPrice || 0), 0);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={e => handleDragLeave(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            style={{
              flex: '0 0 280px',
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
                  {colUnits.length}
                </span>
              </div>
              {colUnits.length > 0 && (
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
              {colUnits.length === 0 ? (
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
                  Drag units here to mark as {col.title}
                </div>
              ) : (
                colUnits.map(unit => {
                  const conf = UNIT_STATUSES[unit.status] || UNIT_STATUSES.available;
                  const isDragging = draggedId === unit._id;

                  return (
                    <div
                      key={unit._id}
                      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, unit._id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onUnitClick(unit)}
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
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                          {unit.unitNumber}
                        </div>
                        <span className={`badge ${conf.badge}`} style={{ fontSize: 9 }}>
                          {unit.type}
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {unit.facing ? `${unit.facing.toUpperCase()} Facing` : 'East Facing'} · {formatArea(unit.area?.superBuiltUp)}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 8px', borderRadius: 4, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>All-Inclusive</span>
                        <strong style={{ fontSize: 13, color: 'var(--primary)' }}>{formatCurrency(unit.pricing?.totalPrice)}</strong>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {unit.status === 'available' && (
                            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onUpdateStatus(unit._id, 'on_hold')}>
                              Hold 48h
                            </button>
                          )}
                          {unit.status === 'on_hold' && (
                            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onUpdateStatus(unit._id, 'available')}>
                              Release
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 2 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 20, width: 20, color: 'var(--primary)' }}
                            title="View Unit Details"
                            onClick={() => onUnitClick(unit)}
                          >
                            <Eye size={12} />
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ padding: 2, height: 20, width: 20, color: 'var(--danger)' }}
                              title="Delete Unit"
                              onClick={() => onDeleteUnit(unit._id, unit.unitNumber)}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
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

const initialMockMatrix = {};

// Unit detail drawer
const UnitPopup = ({ unit, onClose, onOpenHoldModal, onOpenBookingModal, onReleaseHold, onDeleteUnit, isAdmin }) => {
  const navigate = useNavigate();
  const { showNotification } = useUI();

  useEffect(() => {
    if (unit) {
      document.body.classList.add('no-scroll');
      return () => document.body.classList.remove('no-scroll');
    }
  }, [unit]);

  if (!unit) return null;
  const conf = UNIT_STATUSES[unit.status] || UNIT_STATUSES.available;

  const handleCostSheet = () => {
    onClose();
    navigate('/pricing/calculator');
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{unit.unitNumber}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unit Specifications & Live Customer Status</div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm"><X size={16} /></button>
        </div>

        <div className="drawer-body">
          <span className={`badge ${conf?.badge || 'badge-gray'}`} style={{ marginBottom: 14, display: 'inline-block' }}>
            {conf?.label || unit.status}
          </span>

          {/* On-Hold Customer Banner */}
          {unit.status === 'on_hold' && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Clock size={14} /> Unit Currently Held for Prospect
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>
                👤 {unit.holdCustomer?.name || 'Prospective Buyer'}
              </div>
              <div style={{ fontSize: 12, color: '#b45309', marginTop: 3 }}>
                📞 {unit.holdCustomer?.phone || 'No phone provided'}
                {unit.holdCustomer?.email && ` • ✉️ ${unit.holdCustomer.email}`}
              </div>
              {unit.holdCustomer?.reason && (
                <div style={{ fontSize: 11, color: '#78350f', marginTop: 4, fontStyle: 'italic' }}>
                  "{unit.holdCustomer.reason}"
                </div>
              )}
            </div>
          )}

          {/* Booked Customer KYC & Application Banner */}
          {unit.status === 'booked' && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #dbeafe' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={15} color="#2563eb" /> Official Customer Booking Record
                </span>
                <span className="badge badge-primary" style={{ fontSize: 10 }}>Booked</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, fontSize: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>PRIMARY APPLICANT</div>
                  <div style={{ fontWeight: 800, color: '#1e40af', fontSize: 13, marginTop: 1 }}>{unit.bookingCustomer?.name || 'Primary Applicant'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>CONTACT PHONE</div>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 1 }}>📞 {unit.bookingCustomer?.phone || 'No phone'}</div>
                </div>
                {unit.bookingCustomer?.email && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>EMAIL ADDRESS</div>
                    <div style={{ color: '#1e293b', marginTop: 1 }}>✉️ {unit.bookingCustomer.email}</div>
                  </div>
                )}
                {unit.bookingCustomer?.panNumber && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>PAN NUMBER</div>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e293b', marginTop: 1 }}>{unit.bookingCustomer.panNumber}</div>
                  </div>
                )}
                {unit.bookingCustomer?.tokenAmount && (
                  <div style={{ background: '#dcfce7', padding: '6px 8px', borderRadius: 6, gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 10, color: '#15803d', fontWeight: 700 }}>TOKEN ADVANCE PAID</div>
                    <div style={{ fontWeight: 800, color: '#166534', fontSize: 14, marginTop: 1 }}>
                      {formatCurrency(unit.bookingCustomer.tokenAmount)} ({unit.bookingCustomer.paymentMode || 'NEFT'})
                      {unit.bookingCustomer.transactionRef && ` • Ref: ${unit.bookingCustomer.transactionRef}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { l: 'Configuration', v: unit.type },
              { l: 'Facing Direction', v: unit.facing ? `${unit.facing.toUpperCase()} Facing` : 'East Facing' },
              { l: 'Super Built-Up Area', v: formatArea(unit.area?.superBuiltUp || unit.area?.plotArea || unit.area) },
              { l: 'All-Inclusive Total', v: formatCurrency(unit.pricing?.totalPrice) },
              { l: 'Base Selling Price', v: formatCurrency(unit.pricing?.basePrice) },
              { l: 'GST / Taxes', v: formatCurrency(unit.pricing?.gst || 0) },
            ].map((item, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>{item.v}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>✓ Customer KYC & Booking Form</div>
            <div style={{ fontSize: 11, color: '#15803d', lineHeight: 1.4 }}>
              Capture buyer identification (PAN, Aadhaar), co-applicant details, token advance payment instrument and sales hold notes.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {unit.status === 'available' && (
            <>
              <button
                className="btn btn-warning btn-sm"
                onClick={() => {
                  onClose();
                  onOpenHoldModal(unit);
                }}
                style={{ gap: 4 }}
              >
                <Clock size={13} /> Hold for Customer
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onOpenBookingModal(unit);
                }}
                style={{ gap: 4 }}
              >
                <Check size={13} /> Book Property
              </button>
            </>
          )}
          {unit.status === 'on_hold' && (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onOpenBookingModal(unit);
                }}
                style={{ gap: 4 }}
              >
                <Check size={13} /> Convert to Booking
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onReleaseHold(unit._id, unit.unitNumber);
                }}
              >
                Release Hold
              </button>
            </>
          )}
          {unit.status === 'booked' && (
            <button
              className="btn btn-primary btn-sm"
              style={{ gap: 5 }}
              onClick={() => {
                onClose();
                navigate('/bookings');
              }}
            >
              <FileText size={13} /> Open in Bookings Register →
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleCostSheet}>
            <FileText size={13} /> Cost Sheet
          </button>
          {isAdmin && (
            <button className="btn btn-ghost btn-sm text-danger" style={{ color: 'var(--danger)', marginLeft: 'auto' }} onClick={() => onDeleteUnit(unit._id, unit.unitNumber)}>
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default function InventoryPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTowerFromPath = () => {
    if (location.pathname.includes('/tower-b')) return 'B';
    if (location.pathname.includes('/tower-commercial')) return 'Main';
    return 'A';
  };

  const getProjectFromPath = () => {
    if (location.pathname.includes('/tower-commercial')) return '2';
    return '1';
  };

  const [projectsList, setProjectsList] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('matrix'); // 'matrix' | 'kanban' | 'table'
  const [selectedTower, setSelectedTower] = useState('A');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const { user } = useAuth();
  const { simulatedRole, showNotification } = useUI();
  const effectiveRole = simulatedRole || user?.role || 'admin';
  const isAdmin = ['admin', 'super_admin', 'director'].includes(effectiveRole);
  const [leadsList, setLeadsList] = useState([]);

  // Customer Hold & Booking Modals State
  const [holdingUnit, setHoldingUnit] = useState(null);
  const [bookingUnit, setBookingUnit] = useState(null);

  const [holdForm, setHoldForm] = useState({
    selectedLeadId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    durationHours: '',
    holdReason: '',
    agentName: ''
  });

  const [bookingForm, setBookingForm] = useState({
    selectedLeadId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    panNumber: '',
    aadharNumber: '',
    address: '',
    coApplicantName: '',
    coApplicantPhone: '',
    coApplicantEmail: '',
    coApplicantPan: '',
    coApplicantAadhaar: '',
    coApplicantRelation: '',
    tokenAmount: '',
    paymentMode: '',
    transactionRef: '',
    bookingDate: '',
    agentName: '',
    specialNotes: ''
  });

  // Fetch Leads for Auto-Populate
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data } = await api.get('/leads?limit=200');
        if (data.data?.length > 0) setLeadsList(data.data);
        else setLeadsList(defaultLeads);
      } catch {
        setLeadsList(defaultLeads);
      }
    };
    fetchLeads();
  }, []);

  const openHoldModal = (unit) => {
    setHoldingUnit(unit);
    setHoldForm({
      selectedLeadId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      durationHours: '',
      holdReason: '',
      agentName: ''
    });
  };

  const handleHoldLeadSelect = (leadId) => {
    if (!leadId) {
      setHoldForm(p => ({ ...p, selectedLeadId: '', customerName: '', customerPhone: '', customerEmail: '' }));
      return;
    }
    const lead = leadsList.find(l => l._id === leadId);
    if (lead) {
      setHoldForm(p => ({
        ...p,
        selectedLeadId: leadId,
        customerName: lead.name || '',
        customerPhone: lead.phone || '',
        customerEmail: lead.email || '',
        agentName: lead.assignedTo?.name || 'Sales Representative',
        holdReason: `Hold requested for active prospect (${lead.stage?.replace(/_/g, ' ') || 'Hot'})`
      }));
    }
  };

  const openBookingModal = (unit) => {
    setBookingUnit(unit);
    if (unit.holdCustomer?.name) {
      const matchedLead = leadsList.find(l => l.name?.toLowerCase() === unit.holdCustomer.name?.toLowerCase() || l.phone === unit.holdCustomer.phone);
      setBookingForm({
        selectedLeadId: matchedLead?._id || unit.holdCustomer.leadId || '',
        customerName: unit.holdCustomer.name || '',
        customerPhone: unit.holdCustomer.phone || '',
        customerEmail: unit.holdCustomer.email || '',
        panNumber: matchedLead?.panNumber || '',
        aadharNumber: matchedLead?.aadharNumber || '',
        address: matchedLead?.address || '',
        coApplicantName: '',
        coApplicantPhone: '',
        coApplicantEmail: '',
        coApplicantPan: '',
        coApplicantAadhaar: '',
        coApplicantRelation: '',
        tokenAmount: '',
        paymentMode: '',
        transactionRef: '',
        bookingDate: '',
        agentName: unit.holdCustomer.agentName || '',
        specialNotes: unit.holdCustomer.reason || ''
      });
    } else {
      setBookingForm({
        selectedLeadId: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        panNumber: '',
        aadharNumber: '',
        address: '',
        coApplicantName: '',
        coApplicantPhone: '',
        coApplicantEmail: '',
        coApplicantPan: '',
        coApplicantAadhaar: '',
        coApplicantRelation: '',
        tokenAmount: '',
        paymentMode: '',
        transactionRef: '',
        bookingDate: '',
        agentName: '',
        specialNotes: ''
      });
    }
  };

  const handleBookingLeadSelect = (leadId) => {
    if (!leadId) {
      setBookingForm(p => ({
        ...p,
        selectedLeadId: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        panNumber: '',
        aadharNumber: '',
        address: ''
      }));
      return;
    }
    const lead = leadsList.find(l => l._id === leadId);
    if (lead) {
      setBookingForm(p => ({
        ...p,
        selectedLeadId: leadId,
        customerName: lead.name || '',
        customerPhone: lead.phone || '',
        customerEmail: lead.email || '',
        panNumber: lead.panNumber || (lead.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5).padEnd(5, 'A') + '1234' + (lead.name.slice(-1).toUpperCase() || 'F')),
        aadharNumber: lead.aadharNumber || '1234 5678 9012',
        address: lead.address || (lead.city ? `${lead.city}, State` : 'Pune, Maharashtra'),
        agentName: lead.assignedTo?.name || p.agentName || 'Sales Representative',
        specialNotes: `Sourced via ${lead.source || 'Direct Inquiry'} (${lead.stage?.replace(/_/g, ' ') || 'Active Lead'})`
      }));
      showNotification(`✓ Auto-populated KYC details for "${lead.name}"!`);
    }
  };

  const handleConfirmHold = async (e) => {
    e.preventDefault();
    if (!holdingUnit) return;

    const expiresAt = new Date(Date.now() + Number(holdForm.durationHours) * 3600 * 1000);
    const holdPayload = {
      status: 'on_hold',
      holdCustomer: {
        name: holdForm.customerName,
        phone: holdForm.customerPhone,
        email: holdForm.customerEmail,
        durationHours: Number(holdForm.durationHours),
        reason: holdForm.holdReason,
        agentName: holdForm.agentName,
        heldAt: new Date(),
        expiresAt
      }
    };

    try {
      await api.put(`/inventory/${holdingUnit._id}/status`, holdPayload);
    } catch {}

    setMatrix(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      Object.keys(copy).forEach(t => {
        Object.keys(copy[t]).forEach(f => {
          copy[t][f] = copy[t][f].map(u => u._id === holdingUnit._id ? { ...u, status: 'on_hold', holdCustomer: holdPayload.holdCustomer } : u);
        });
      });
      return copy;
    });

    if (selectedUnit?._id === holdingUnit._id) {
      setSelectedUnit(prev => ({ ...prev, status: 'on_hold', holdCustomer: holdPayload.holdCustomer }));
    }

    setHoldingUnit(null);
    showNotification(`Unit ${holdingUnit.unitNumber} held for ${holdForm.customerName} (${holdForm.durationHours} Hours)!`);
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingUnit) return;

    const bookingPayload = {
      status: 'booked',
      bookingCustomer: {
        name: bookingForm.customerName,
        phone: bookingForm.customerPhone,
        email: bookingForm.customerEmail,
        panNumber: bookingForm.panNumber,
        aadharNumber: bookingForm.aadharNumber,
        address: bookingForm.address,
        coApplicantName: bookingForm.coApplicantName,
        coApplicantPhone: bookingForm.coApplicantPhone,
        coApplicantRelation: bookingForm.coApplicantRelation,
        tokenAmount: Number(bookingForm.tokenAmount),
        paymentMode: bookingForm.paymentMode,
        transactionRef: bookingForm.transactionRef,
        bookingDate: new Date(bookingForm.bookingDate)
      }
    };

    try {
      await api.put(`/inventory/${bookingUnit._id}/status`, bookingPayload);
    } catch {}

    try {
      await api.post('/bookings', {
        project: selectedProject || (projectsList[0]?._id),
        unit: bookingUnit._id,
        customerName: bookingForm.customerName,
        customerPhone: bookingForm.customerPhone,
        customerEmail: bookingForm.customerEmail,
        panNumber: bookingForm.panNumber,
        aadharNumber: bookingForm.aadharNumber,
        bookingAmount: Number(bookingForm.tokenAmount),
        bookingAmountMode: bookingForm.paymentMode?.toLowerCase(),
        totalAmount: bookingUnit.pricing?.totalPrice,
        status: 'application_submitted'
      });
    } catch {}

    setMatrix(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      Object.keys(copy).forEach(t => {
        Object.keys(copy[t]).forEach(f => {
          copy[t][f] = copy[t][f].map(u => u._id === bookingUnit._id ? { ...u, status: 'booked', bookingCustomer: bookingPayload.bookingCustomer, holdCustomer: null } : u);
        });
      });
      return copy;
    });

    if (selectedUnit?._id === bookingUnit._id) {
      setSelectedUnit(prev => ({ ...prev, status: 'booked', bookingCustomer: bookingPayload.bookingCustomer, holdCustomer: null }));
    }

    setBookingUnit(null);
    showNotification(`🎉 Booking Confirmed! Unit ${bookingUnit.unitNumber} officially booked for ${bookingForm.customerName}!`);
  };

  const handleReleaseHold = async (unitId, unitNumber) => {
    try {
      await api.put(`/inventory/${unitId}/status`, { status: 'available' });
    } catch {}

    setMatrix(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      Object.keys(copy).forEach(t => {
        Object.keys(copy[t]).forEach(f => {
          copy[t][f] = copy[t][f].map(u => u._id === unitId ? { ...u, status: 'available', holdCustomer: null } : u);
        });
      });
      return copy;
    });

    if (selectedUnit?._id === unitId) {
      setSelectedUnit(prev => ({ ...prev, status: 'available', holdCustomer: null }));
    }

    showNotification(`Unit ${unitNumber} released back to Available!`);
  };

  // Load Projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data } = await api.get('/projects');
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setProjectsList(data.data);
          setSelectedProject(data.data[0]._id);
        } else {
          setProjectsList([]);
          setSelectedProject('');
          setMatrix({});
        }
      } catch (err) {
        console.error('Failed to fetch projects for inventory:', err);
        setProjectsList([]);
        setSelectedProject('');
        setMatrix({});
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  // New Unit Form state
  const [newUnitForm, setNewUnitForm] = useState({
    project: '',
    unitNumber: '',
    tower: '',
    floor: '',
    type: '',
    area: '',
    totalPrice: '',
    basePrice: '',
    facing: '',
    status: 'available'
  });

  useEffect(() => {
    if (showAddUnitModal) {
      document.body.classList.add('no-scroll');
      return () => document.body.classList.remove('no-scroll');
    }
  }, [showAddUnitModal]);

  // Fetch Matrix
  useEffect(() => {
    if (!selectedProject) {
      setMatrix({});
      setLoading(false);
      return;
    }
    const fetchMatrix = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/inventory/matrix', { params: { project: selectedProject } });
        if (data.data && Object.keys(data.data).length > 0) {
          setMatrix(data.data);
          const firstTower = Object.keys(data.data)[0];
          if (firstTower) setSelectedTower(firstTower);
        } else {
          setMatrix({});
        }
      } catch {
        setMatrix({});
      } finally { setLoading(false); }
    };
    fetchMatrix();
  }, [selectedProject]);

  const handleTowerClick = (tower) => {
    setSelectedTower(tower);
  };

  const updateUnitStatus = async (unitId, newStatus) => {
    try {
      await api.put(`/inventory/${unitId}/status`, { status: newStatus });
    } catch {}
    setMatrix(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      Object.keys(copy).forEach(t => {
        Object.keys(copy[t]).forEach(f => {
          copy[t][f] = copy[t][f].map(u => u._id === unitId ? { ...u, status: newStatus } : u);
        });
      });
      return copy;
    });
    if (selectedUnit?._id === unitId) {
      setSelectedUnit(prev => ({ ...prev, status: newStatus }));
    }
    showNotification(`Unit status updated to "${newStatus.replace(/_/g, ' ')}"!`);
  };

  const handleDeleteUnit = async (unitId, unitNumber) => {
    if (!window.confirm(`Are you sure you want to delete unit "${unitNumber}"?`)) return;
    try {
      await api.delete(`/inventory/${unitId}`);
    } catch {}
    setMatrix(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      Object.keys(copy).forEach(t => {
        Object.keys(copy[t]).forEach(f => {
          copy[t][f] = copy[t][f].filter(u => u._id !== unitId);
        });
      });
      return copy;
    });
    setSelectedUnit(null);
    showNotification(`Unit "${unitNumber}" deleted from matrix!`);
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    const targetProject = newUnitForm.project || selectedProject || (projectsList[0]?._id);
    if (!targetProject) {
      showNotification('Please select a project first to add inventory units!', 'error');
      return;
    }

    const tower = newUnitForm.tower;
    const floor = Number(newUnitForm.floor);
    const uNum = newUnitForm.unitNumber || `${tower}-${floor}0${Math.floor(Math.random() * 8) + 1}`;
    const totPrice = Number(newUnitForm.totalPrice);
    const bPrice = Number(newUnitForm.basePrice);

    const payload = {
      project: targetProject,
      unitNumber: uNum,
      tower,
      floor,
      type: newUnitForm.type || '3 BHK',
      status: newUnitForm.status || 'available',
      area: { superBuiltUp: Number(newUnitForm.area) || 1200 },
      pricing: { totalPrice: totPrice, basePrice: bPrice, gst: Math.round(totPrice * 0.05) },
      facing: newUnitForm.facing || 'East'
    };

    try {
      const { data } = await api.post('/inventory', payload);
      const createdUnit = data.data || { ...payload, _id: Date.now().toString() };
      setMatrix(prev => {
        const copy = JSON.parse(JSON.stringify(prev));
        if (!copy[tower]) copy[tower] = {};
        if (!copy[tower][floor]) copy[tower][floor] = [];
        copy[tower][floor].push(createdUnit);
        return copy;
      });
    } catch {
      const createdUnit = { ...payload, _id: Date.now().toString() };
      setMatrix(prev => {
        const copy = JSON.parse(JSON.stringify(prev));
        if (!copy[tower]) copy[tower] = {};
        if (!copy[tower][floor]) copy[tower][floor] = [];
        copy[tower][floor].push(createdUnit);
        return copy;
      });
    }

    showNotification(`Unit ${uNum} added to Tower ${tower} Floor ${floor}!`);
    setShowAddUnitModal(false);
  };

  const towers = Object.keys(matrix);
  const towerMatrix = matrix[selectedTower] || {};
  const floors = Object.keys(towerMatrix).sort((a, b) => Number(b) - Number(a));
  const allUnits = Object.values(matrix).flatMap(t => Object.values(t).flat());

  const [compareUnits, setCompareUnits] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const toggleCompare = (unit, e) => {
    e.stopPropagation();
    if (compareUnits.some(u => u._id === unit._id)) {
      setCompareUnits(prev => prev.filter(u => u._id !== unit._id));
    } else {
      if (compareUnits.length >= 3) {
        showNotification('You can compare up to 3 units simultaneously');
        return;
      }
      setCompareUnits(prev => [...prev, unit]);
      showNotification(`Added ${unit.unitNumber} to Compare`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Inventory Management</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {selectedTower ? `Tower ${selectedTower} Stacking Matrix` : 'Inventory Matrix'}
            </span>
          </div>
          <h1 className="page-title">
            {selectedTower ? `Tower ${selectedTower} Interactive Stacking Matrix` : 'Interactive Stacking Matrix'}
          </h1>
          <p className="page-subtitle">Real-time unit locking, 48h executive hold countdown, floor rise matrix and unit comparisons</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const allUnits = [];
              Object.keys(matrix).forEach(t => {
                Object.keys(matrix[t] || {}).forEach(f => {
                  (matrix[t][f] || []).forEach(u => allUnits.push(u));
                });
              });
              const prjName = projectsList.find(p => p._id === selectedProject)?.name || 'All Projects';
              exportInventoryMatrixCSV(allUnits, user?.organization || 'MRP REAL ESTATE', prjName);
              showNotification('Exported professional Inventory Matrix & Stacking Master!');
            }}
            title="Download complete inventory stacking register CSV"
          >
            <Download size={14} /> Export Inventory CSV
          </button>
          {compareUnits.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCompareModal(true)} style={{ background: '#eff6ff', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 700 }}>
              ⚖️ Compare ({compareUnits.length}) Units
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => { setNewUnitForm(p => ({ ...p, tower: selectedTower || 'A' })); setShowAddUnitModal(true); }}>
              <Plus size={14} /> Add New Unit
            </button>
          )}
          {projectsList.length > 0 && (
            <CustomSelect
              variant="filter"
              value={selectedProject}
              onChange={val => setSelectedProject(val)}
              options={projectsList.map(p => ({
                value: p._id,
                label: p.name,
                subtext: p.city || p.code,
                icon: '🏢'
              }))}
            />
          )}
        </div>
      </div>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Building2 size={20} color="#2563eb" />
          <div style={{ fontSize: 13, color: '#1e40af' }}>
            <strong>What is Inventory?</strong> Each unit below represents an individual apartment or commercial office with its live status (Available, On Hold, Booked, Sold). Click any unit square to lock, hold 48h, or generate a cost sheet.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Status Key:</div>
          {Object.entries(UNIT_STATUSES).map(([key, conf]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div style={{ width: 22, height: 16, borderRadius: 3, background: conf.color, border: '1.5px solid rgba(0,0,0,0.08)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{conf.label}</span>
              <span style={{ fontWeight: 700 }}>({allUnits.filter(u => u.status === key).length})</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            Total in Tower: <strong style={{ color: 'var(--text-primary)' }}>{Object.values(towerMatrix).flat().length} units</strong>
          </div>
        </div>
      </div>

      {/* Tower Selector & View Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {towers.map(tower => (
            <button
              key={tower}
              className={`btn ${selectedTower === tower ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => handleTowerClick(tower)}
            >
              {tower === 'Main' ? 'Main Commercial Tower' : `Tower ${tower}`}
            </button>
          ))}
        </div>

        {/* View Switcher: Matrix vs Kanban vs Table */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2 }}>
          <button
            className={`btn btn-sm ${view === 'matrix' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
            onClick={() => setView('matrix')}
            title="Interactive Stacking Matrix"
          >
            <Grid size={14} /> Matrix
          </button>
          <button
            className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
            onClick={() => setView('kanban')}
            title="Kanban Board View"
          >
            <Columns size={14} /> Kanban
          </button>
          <button
            className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
            onClick={() => setView('table')}
            title="Detailed Unit Table"
          >
            <List size={14} /> Table
          </button>
        </div>
      </div>

      {/* Content Rendering based on View */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner" style={{ width: 40, height: 40 }} /></div>
      ) : view === 'kanban' ? (
        <InventoryKanbanView
          units={allUnits}
          onUnitClick={setSelectedUnit}
          onUpdateStatus={updateUnitStatus}
          onDeleteUnit={handleDeleteUnit}
        />
      ) : view === 'table' ? (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Unit #</th>
                <th>Tower & Floor</th>
                <th>Typology</th>
                <th>Facing</th>
                <th>Super Built-Up Area</th>
                <th>Base Price</th>
                <th>All-Inclusive Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allUnits.map(unit => {
                const conf = UNIT_STATUSES[unit.status] || UNIT_STATUSES.available;
                return (
                  <tr key={unit._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedUnit(unit)}>
                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{unit.unitNumber}</td>
                    <td>Tower {unit.tower || selectedTower || 'A'} · Floor {unit.floor || 1}</td>
                    <td style={{ fontWeight: 600 }}>{unit.type}</td>
                    <td style={{ textTransform: 'capitalize' }}>{unit.facing ? `${unit.facing} Facing` : 'East Facing'}</td>
                    <td>{formatArea(unit.area?.superBuiltUp)}</td>
                    <td>{formatCurrency(unit.pricing?.basePrice)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(unit.pricing?.totalPrice)}</td>
                    <td>
                      <span className={`badge ${conf.badge}`}>{conf.label}</span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--primary)' }}
                          title="View Unit Details"
                          onClick={() => setSelectedUnit(unit)}
                        >
                          <Eye size={14} />
                        </button>
                        {unit.status === 'available' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => updateUnitStatus(unit._id, 'on_hold')}
                          >
                            Hold 48h
                          </button>
                        )}
                        {unit.status === 'on_hold' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => updateUnitStatus(unit._id, 'available')}
                          >
                            Release
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--danger)' }}
                            title="Delete Unit"
                            onClick={() => handleDeleteUnit(unit._id, unit.unitNumber)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ maxHeight: 'calc(100vh - 240px)', overflow: 'auto' }}>
          <div className="card-header" style={{ padding: '12px 18px' }}>
            <div>
              <div className="card-title" style={{ fontSize: 15 }}>{selectedTower === 'Main' ? 'Main Commercial Tower' : `Tower ${selectedTower}`} — Floor Stacking Grid</div>
              <div className="card-subtitle">Click any unit for full pricing, hold options or instant booking</div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 16 }}>
            {floors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>No units in this tower yet</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
                  {isAdmin ? 'Click "+ Add New Unit" to add your first apartment or office suite to this tower.' : 'No units have been added to this tower yet.'}
                </div>
                {isAdmin && (
                  <button className="btn btn-primary btn-sm" onClick={() => { setNewUnitForm(p => ({ ...p, tower: selectedTower || 'A' })); setShowAddUnitModal(true); }}>
                    <Plus size={14} /> Add New Unit
                  </button>
                )}
              </div>
            ) : (
              <div className="inventory-matrix">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 10px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', width: 70 }}>Floor</th>
                      {(towerMatrix[floors[0]] || []).map((unit, i) => (
                        <th key={i} style={{ padding: '6px 10px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Position {i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                  {floors.map(floor => (
                    <tr key={floor}>
                      <td>
                        <div className="matrix-floor-label">{floor === '1' ? '1st Floor' : `Floor ${floor}`}</div>
                      </td>
                      {(towerMatrix[floor] || []).map(unit => {
                        const isCompared = compareUnits.some(u => u._id === unit._id);
                        return (
                          <td key={unit._id} style={{ padding: 3 }}>
                            <div
                              className={`matrix-cell ${unit.status}`}
                              style={{ position: 'relative', outline: isCompared ? '2px solid #2563eb' : 'none' }}
                              onClick={() => setSelectedUnit(unit)}
                              title={`${unit.unitNumber} | ${unit.type} | ${formatCurrency(unit.pricing?.totalPrice)}`}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{unit.unitNumber}</div>
                                <button
                                  type="button"
                                  onClick={(e) => toggleCompare(unit, e)}
                                  style={{
                                    border: 'none', background: isCompared ? '#2563eb' : 'rgba(0,0,0,0.1)',
                                    color: isCompared ? '#ffffff' : 'inherit',
                                    borderRadius: 3, width: 14, height: 14, fontSize: 8, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                                  }}
                                  title="Add to Compare"
                                >
                                  ⚖
                                </button>
                              </div>
                              <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2 }}>{unit.type}</div>
                              {unit.status === 'on_hold' && (
                                <div style={{ fontSize: 8, background: 'rgba(0,0,0,0.25)', color: '#ffffff', borderRadius: 2, padding: '1px 3px', marginTop: 2, fontWeight: 700 }}>
                                  ⏳ 47h left
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Unit Detail Drawer */}
      <UnitPopup
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
        onOpenHoldModal={openHoldModal}
        onOpenBookingModal={openBookingModal}
        onReleaseHold={handleReleaseHold}
        onDeleteUnit={handleDeleteUnit}
        isAdmin={isAdmin}
      />

      {/* Add Unit Drawer */}
      {showAddUnitModal && (
        <div className="modal-overlay" onClick={() => setShowAddUnitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Unit to Tower Inventory</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowAddUnitModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddUnit}>
              <div className="modal-body">
                {/* Step 1: Project Selector */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    1. Select Project <span className="required">*</span>
                  </label>
                  {projectsList.length === 0 ? (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '10px 12px', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                      ⚠️ No projects found in your organization. Please <a href="/projects" style={{ color: '#2563eb', fontWeight: 700 }}>create a project</a> first before adding inventory units.
                    </div>
                  ) : (
                    <CustomSelect
                      value={newUnitForm.project || selectedProject || ''}
                      onChange={val => {
                        const pId = typeof val === 'object' && val.target ? val.target.value : val;
                        setNewUnitForm(p => ({ ...p, project: pId }));
                        setSelectedProject(pId);
                      }}
                      placeholder="-- Choose Project --"
                      options={projectsList.map(prj => ({
                        value: prj._id,
                        label: `${prj.name} (${prj.city})`
                      }))}
                    />
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tower / Wing / Sector <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={newUnitForm.tower}
                      onChange={e => setNewUnitForm(p => ({ ...p, tower: e.target.value }))}
                      placeholder="e.g. Tower A / Sector B"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Floor / Level Number <span className="required">*</span></label>
                    <input type="number" className="form-input" value={newUnitForm.floor} onChange={e => setNewUnitForm(p => ({ ...p, floor: e.target.value }))} placeholder="e.g. 4" required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit / Plot / Shop # <span className="required">*</span></label>
                    <input className="form-input" value={newUnitForm.unitNumber} onChange={e => setNewUnitForm(p => ({ ...p, unitNumber: e.target.value }))} placeholder="e.g. A-401 / Plot 108" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Typology / Configuration</label>
                    <CustomSelect
                      value={newUnitForm.type}
                      onChange={val => setNewUnitForm(p => ({ ...p, type: typeof val === 'object' && val.target ? val.target.value : val }))}
                      placeholder="Select typology"
                      options={['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Penthouse', '30 x 40 ft (1,200 sq.ft)', '30 x 50 ft (1,500 sq.ft)', '40 x 60 ft (2,400 sq.ft)', '3 BHK Villa (G+1)', '4 BHK Luxury Villa (G+2)', 'Office Suite', 'Ground Floor High-Street'].map(typ => ({
                        value: typ,
                        label: typ
                      }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Area (sq.ft) <span className="required">*</span></label>
                    <input type="number" className="form-input" value={newUnitForm.area} onChange={e => setNewUnitForm(p => ({ ...p, area: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Facing Direction</label>
                    <CustomSelect
                      value={newUnitForm.facing}
                      onChange={val => setNewUnitForm(p => ({ ...p, facing: typeof val === 'object' && val.target ? val.target.value : val }))}
                      placeholder="Select facing"
                      options={FACING_OPTIONS.map(f => ({
                        value: f.value,
                        label: f.label
                      }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Base Rate (₹)</label>
                    <input type="number" className="form-input" value={newUnitForm.basePrice} onChange={e => setNewUnitForm(p => ({ ...p, basePrice: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">All-Inclusive Total Package (₹)</label>
                    <input type="number" className="form-input" value={newUnitForm.totalPrice} onChange={e => setNewUnitForm(p => ({ ...p, totalPrice: e.target.value }))} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Availability Status</label>
                  <CustomSelect
                    value={newUnitForm.status}
                    onChange={val => setNewUnitForm(p => ({ ...p, status: typeof val === 'object' && val.target ? val.target.value : val }))}
                    placeholder="Select initial status"
                    options={[
                      { value: 'available', label: 'Available', icon: '🟢', subtext: 'Open for Sale' },
                      { value: 'on_hold', label: 'On Hold', icon: '🟡', subtext: '48h Reservation' },
                      { value: 'blocked', label: 'Blocked', icon: '🔴', subtext: 'Management Hold' },
                      { value: 'booked', label: 'Booked', icon: '🔵', subtext: 'Token Paid' }
                    ]}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUnitModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Unit to Matrix</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Hold Modal */}
      {holdingUnit && (
        <div className="modal-overlay" onClick={() => setHoldingUnit(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 580,
              width: '92%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 14,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              overflow: 'hidden'
            }}
          >
            <div className="modal-header" style={{ background: '#fffbeb', borderBottom: '1px solid #fef3c7', padding: '16px 20px', flexShrink: 0 }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e' }}>
                <Clock size={18} color="#d97706" /> Place Unit {holdingUnit.unitNumber} on Customer Hold
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setHoldingUnit(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleConfirmHold} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{holdingUnit.unitNumber} • {holdingUnit.type}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tower {holdingUnit.tower || 'A'} • Floor {holdingUnit.floor || 1} • 🧭 {holdingUnit.facing}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
                    {formatCurrency(holdingUnit.pricing?.totalPrice || 5000000)}
                  </div>
                </div>

                {/* Lead Auto-Populate Dropdown */}
                <div className="form-group" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <label className="form-label" style={{ color: '#1e40af', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <UserCheck size={14} color="#2563eb" /> Select Buyer / Prospect from Leads Database
                  </label>
                  <CustomSelect
                    value={holdForm.selectedLeadId}
                    onChange={val => handleHoldLeadSelect(typeof val === 'object' && val.target ? val.target.value : val)}
                    placeholder="-- ➕ Enter New Customer Manually --"
                    searchable
                    options={[
                      { value: '', label: '➕ Enter New Customer Manually' },
                      ...leadsList.map(lead => ({
                        value: lead._id,
                        label: `${lead.name} (${lead.phone})`,
                        subtext: `${lead.stage ? lead.stage.replace(/_/g, ' ').toUpperCase() : 'LEAD'} • ${lead.source || 'Direct'}`
                      }))
                    ]}
                  />
                  {holdForm.selectedLeadId && (
                    <div style={{ fontSize: 11, color: '#15803d', marginTop: 6, fontWeight: 600 }}>
                      ✓ Auto-filled prospect details from CRM database
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Customer / Prospect Full Name <span className="required">*</span></label>
                  <input
                    className="form-input"
                    value={holdForm.customerName}
                    onChange={e => setHoldForm(p => ({ ...p, customerName: e.target.value }))}
                    placeholder="e.g. Vikram Malhotra"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Mobile Number <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={holdForm.customerPhone}
                      onChange={e => setHoldForm(p => ({ ...p, customerPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={holdForm.customerEmail}
                      onChange={e => setHoldForm(p => ({ ...p, customerEmail: e.target.value }))}
                      placeholder="vikram@example.com"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Hold Duration (Reservation Window)</label>
                    <CustomSelect
                      value={holdForm.durationHours}
                      onChange={val => setHoldForm(p => ({ ...p, durationHours: typeof val === 'object' && val.target ? val.target.value : val }))}
                      options={[
                        { value: '24', label: '24 Hours', subtext: '1 Day Priority' },
                        { value: '48', label: '48 Hours', subtext: 'Standard Executive Hold' },
                        { value: '72', label: '72 Hours', subtext: 'Weekend Window' },
                        { value: '168', label: '7 Days', subtext: 'Management Approval' }
                      ]}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sales Executive</label>
                    <input
                      className="form-input"
                      value={holdForm.agentName}
                      onChange={e => setHoldForm(p => ({ ...p, agentName: e.target.value }))}
                      placeholder="Agent Name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Sales Notes for Hold</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={holdForm.holdReason}
                    onChange={e => setHoldForm(p => ({ ...p, holdReason: e.target.value }))}
                    placeholder="e.g. Token cheque pickup scheduled for tomorrow afternoon."
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setHoldingUnit(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#d97706', borderColor: '#d97706', gap: 6 }}>
                  <Clock size={14} /> Confirm Customer Hold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Booking Modal */}
      {bookingUnit && (
        <div className="modal-overlay" onClick={() => setBookingUnit(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 780,
              width: '95%',
              maxHeight: 'min(90vh, 760px)',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 14,
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35)',
              overflow: 'hidden'
            }}
          >
            <div
              className="modal-header"
              style={{
                background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
                color: 'white',
                padding: '14px 20px',
                flexShrink: 0
              }}
            >
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', fontSize: 16 }}>
                <Check size={18} color="#38bdf8" /> Official Booking Application — {bookingUnit.unitNumber}
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" style={{ color: 'white' }} onClick={() => setBookingUnit(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleConfirmBooking} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                <div style={{ background: '#eff6ff', padding: '10px 16px', borderRadius: 8, marginBottom: 12, border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>{bookingUnit.unitNumber} • {bookingUnit.type}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tower {bookingUnit.tower || 'A'} • Floor {bookingUnit.floor || 1} • 🧭 {bookingUnit.facing}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Agreement Value</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                      {formatCurrency(bookingUnit.pricing?.totalPrice || 6000000)}
                    </div>
                  </div>
                </div>

                {/* Section 1: Lead Auto-Population Dropdown */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserCheck size={14} color="#2563eb" /> 1. Select Buyer / Prospect from Leads Database
                  </div>
                  <CustomSelect
                    value={bookingForm.selectedLeadId}
                    onChange={val => handleBookingLeadSelect(typeof val === 'object' && val.target ? val.target.value : val)}
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
                  {bookingForm.selectedLeadId && (
                    <div style={{ fontSize: 11, color: '#15803d', marginTop: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={13} /> Sourced & auto-populated from CRM Lead Database
                    </div>
                  )}
                </div>

                {/* Section 2: Primary Applicant KYC */}
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={15} /> 2. Primary Applicant Legal Information
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Full Legal Name (As per PAN / Aadhaar) <span className="required">*</span></label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.customerName}
                      onChange={e => setBookingForm(p => ({ ...p, customerName: e.target.value }))}
                      placeholder="e.g. Rajesh S. Kulkarni"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Mobile Number <span className="required">*</span></label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.customerPhone}
                      onChange={e => setBookingForm(p => ({ ...p, customerPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Email Address <span className="required">*</span></label>
                    <input
                      type="email"
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.customerEmail}
                      onChange={e => setBookingForm(p => ({ ...p, customerEmail: e.target.value }))}
                      placeholder="rajesh.k@gmail.com"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>PAN Number <span className="required">*</span></label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.panNumber}
                      onChange={e => setBookingForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Aadhaar / ID No.</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.aadharNumber}
                      onChange={e => setBookingForm(p => ({ ...p, aadharNumber: e.target.value }))}
                      placeholder="1234 5678 9012"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Permanent Residential Address</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.address}
                      onChange={e => setBookingForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="Flat 402, Royal Palms, Baner Road, Pune"
                    />
                  </div>
                </div>

                {/* Section 3: Co-Applicant Details with Full Relationships */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', margin: '12px 0' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} /> 3. Co-Applicant / Joint Ownership (Optional)
                  </div>

                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant Full Name</label>
                      <input
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantName}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantName: e.target.value }))}
                        placeholder="e.g. Sneha R. Kulkarni"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Relationship to Primary Buyer</label>
                      <CustomSelect
                        value={bookingForm.coApplicantRelation}
                        onChange={val => setBookingForm(p => ({ ...p, coApplicantRelation: typeof val === 'object' && val.target ? val.target.value : val }))}
                        placeholder="Select relationship"
                        options={CO_APPLICANT_RELATIONS}
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant Phone</label>
                      <input
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantPhone}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantPhone: e.target.value }))}
                        placeholder="+91 98765 00000"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant Email</label>
                      <input
                        type="email"
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantEmail}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantEmail: e.target.value }))}
                        placeholder="sneha.k@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant PAN Number</label>
                      <input
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantPan}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantPan: e.target.value.toUpperCase() }))}
                        placeholder="e.g. XYZPQ5678M"
                        maxLength={10}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant Aadhaar Number</label>
                      <input
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantAadhaar}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantAadhaar: e.target.value }))}
                        placeholder="e.g. 9876 5432 1098"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Commercial & Token Payment */}
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={15} /> 4. Commercials & Token Payment Instrument
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Booking Token Amount (₹) <span className="required">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.tokenAmount}
                      onChange={e => setBookingForm(p => ({ ...p, tokenAmount: e.target.value }))}
                      placeholder="e.g. 500000"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Payment Mode</label>
                    <CustomSelect
                      value={bookingForm.paymentMode}
                      onChange={val => setBookingForm(p => ({ ...p, paymentMode: typeof val === 'object' && val.target ? val.target.value : val }))}
                      options={[
                        { value: 'Cheque', label: 'Cheque / Demand Draft', icon: '📝' },
                        { value: 'NEFT/RTGS', label: 'NEFT / RTGS Bank Transfer', icon: '🏦' },
                        { value: 'UPI', label: 'UPI / QR Payment', icon: '📱' },
                        { value: 'Debit/Credit Card', label: 'Debit / Credit Card', icon: '💳' },
                        { value: 'Bank Transfer', label: 'Direct Bank Transfer', icon: '🏛️' }
                      ]}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Transaction / Cheque Ref No.</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.transactionRef}
                      onChange={e => setBookingForm(p => ({ ...p, transactionRef: e.target.value }))}
                      placeholder="e.g. HDFC-CHK-894210"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Booking Date</label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.bookingDate}
                      onChange={e => setBookingForm(p => ({ ...p, bookingDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Sales Executive / Handled By</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.agentName}
                      onChange={e => setBookingForm(p => ({ ...p, agentName: e.target.value }))}
                      placeholder="e.g. Priya Sharma"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Special Sales Remarks / Notes</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.specialNotes}
                      onChange={e => setBookingForm(p => ({ ...p, specialNotes: e.target.value }))}
                      placeholder="e.g. Parking allocated, agreement scheduled next week"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setBookingUnit(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ gap: 6 }}>
                  <Check size={14} /> Confirm Official Booking & Issue Token Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Side-by-Side Unit Comparison Modal */}
      {showCompareModal && (
        <div className="modal-overlay" onClick={() => setShowCompareModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚖️ Side-by-Side Unit Comparison ({compareUnits.length} Units)
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowCompareModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ width: 180 }}>Specification</th>
                      {compareUnits.map(u => (
                        <th key={u._id} style={{ textAlign: 'center', minWidth: 160 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{u.unitNumber}</div>
                          <span className={`badge ${UNIT_STATUSES[u.status]?.badge || 'badge-primary'}`} style={{ fontSize: 10, marginTop: 4 }}>
                            {UNIT_STATUSES[u.status]?.label || u.status}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Typology</td>
                      {compareUnits.map(u => (
                        <td key={u._id} style={{ textAlign: 'center', fontWeight: 700 }}>{u.type}</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Super Built-Up Area</td>
                      {compareUnits.map(u => (
                        <td key={u._id} style={{ textAlign: 'center' }}>{u.area?.superBuiltUp || 1200} sq.ft</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Estimated Carpet Area</td>
                      {compareUnits.map(u => (
                        <td key={u._id} style={{ textAlign: 'center' }}>{Math.round((u.area?.superBuiltUp || 1200) * 0.72)} sq.ft</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Facing / Orientation</td>
                      {compareUnits.map(u => (
                        <td key={u._id} style={{ textAlign: 'center', textTransform: 'capitalize' }}>🧭 {u.facing || 'East'} Facing</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Base Selling Price (BSP)</td>
                      {compareUnits.map(u => (
                        <td key={u._id} style={{ textAlign: 'center' }}>{formatCurrency(u.pricing?.basePrice || 7500000)}</td>
                      ))}
                    </tr>
                    <tr style={{ background: '#eff6ff', fontWeight: 900 }}>
                      <td style={{ color: 'var(--primary)', fontSize: 13 }}>All-Inclusive Total Package</td>
                      {compareUnits.map(u => (
                        <td key={u._id} style={{ textAlign: 'center', color: 'var(--primary)', fontSize: 14 }}>
                          {formatCurrency(u.pricing?.totalPrice || 9800000)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => { setCompareUnits([]); setShowCompareModal(false); }}>
                Clear Comparison
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCompareModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Add Land / Plot / Unit Inventory Modal */}
      {showAddUnitModal && selectedProject && (
        <AddInventoryModal
          project={projectsList.find(p => p._id === selectedProject) || { _id: selectedProject, name: 'Active Project', type: 'residential_apartment' }}
          onClose={() => setShowAddUnitModal(false)}
          onUnitAdded={async (newUnit) => {
            try {
              const { data } = await api.get('/inventory/matrix', { params: { project: selectedProject } });
              if (data.data) {
                setMatrix(data.data);
                const firstSection = Object.keys(data.data)[0];
                if (firstSection && !data.data[selectedTower]) {
                  setSelectedTower(firstSection);
                }
              }
            } catch {}
          }}
        />
      )}
    </div>
  );
}

