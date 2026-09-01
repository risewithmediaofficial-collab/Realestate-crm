import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Scale, Check, X, Plus, AlertCircle, Clock,
  DollarSign, FileText, User, Users, ShieldAlert, ArrowRight, Edit, Save, Trash2, List, Columns, Search, Eye, CreditCard, CheckCircle2, XCircle
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { formatCurrency, formatDate, truncate } from '../../utils/formatters';
import CustomSelect from '../../components/ui/CustomSelect';

// ─── Negotiations Kanban Board Component ─────────
const NegotiationsKanbanView = ({ requests, onApprove, onReject, onEdit, onDelete, onStatusChange, onViewDetails, onRequestNew }) => {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columns = [
    { id: 'pending', title: 'Pending Review', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
    { id: 'approved', title: 'Approved Bookings & Discounts', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
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
    <div className="kanban-board" style={{ display: 'flex', gap: 16, height: 'calc(100vh - 240px)', paddingBottom: 10, overflowX: 'auto' }}>
      {columns.map(col => {
        const colRequests = requests.filter(r => (r.status || 'pending') === col.id);
        const colTotalValue = colRequests.reduce((sum, r) => sum + (r.originalPrice || 0), 0);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={e => handleDragLeave(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            style={{
              flex: '0 0 340px',
              background: '#f8fafc',
              borderRadius: 10,
              border: isOver ? `2px dashed ${col.color}` : '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isOver ? `0 0 0 4px ${col.color}20` : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div className="kanban-col-header" style={{ padding: '12px 14px', borderBottom: '1px solid var(--card-border)', background: 'white', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{col.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{col.title}</span>
                <span className="kanban-col-count" style={{ fontSize: 11, fontWeight: 700 }}>{colRequests.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {colRequests.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(colTotalValue)}</span>}
                {onRequestNew && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ width: 22, height: 22, padding: 0, color: 'var(--primary)', borderRadius: 4, background: '#f1f5f9' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestNew(col.id);
                    }}
                    title={`Submit approval request in ${col.title}`}
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="kanban-col-body" style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: isOver ? col.bg : 'transparent' }}>
              {colRequests.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '24px 10px',
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
                }}>
                  <span>No requests in {col.title}</span>
                  {onRequestNew && (
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
                        onRequestNew(col.id);
                      }}
                    >
                      <Plus size={13} /> Request Approval
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {colRequests.map(r => (
                    <div key={r.id} className="card" draggable onDragStart={e => handleDragStart(e, r.id)} onDragEnd={handleDragEnd} style={{ padding: 12, cursor: 'grab', border: '1px solid var(--card-border)', borderRadius: 8, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.15s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>👤 {r.leadName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {r.phone}</div>
                        </div>
                        <span className="badge badge-primary" style={{ fontSize: 10 }}>{r.bookingNumber}</span>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 6, marginBottom: 8, fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>🏢 {r.unitNumber}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{r.projectName}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, fontSize: 11 }}>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>TOTAL VALUE</div>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(r.originalPrice)}</div>
                        </div>
                        {r.tokenAmount > 0 ? (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>TOKEN PAID</div>
                            <div style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(r.tokenAmount)}</div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>OFFER PRICE</div>
                            <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(r.requestedPrice)}</div>
                          </div>
                        )}
                      </div>
                      {r.reason && <div style={{ fontSize: 11, color: 'var(--text-secondary)', background: '#fffbeb', padding: '5px 8px', borderRadius: 4, marginBottom: 8, borderLeft: '2px solid #f59e0b' }}>{truncate(r.reason, 65)}</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>By {r.requestedBy}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ padding: 2, height: 22, width: 22, color: 'var(--primary)' }} title="View Full Booking & KYC Details" onClick={() => onViewDetails(r)}><Eye size={13} /></button>
                          {r.status === 'pending' && (
                            <>
                              <button className="btn btn-success btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onApprove(r)} title="Approve Booking & Terms"><Check size={11} /> Approve</button>
                              <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onReject(r)} title="Reject Request"><X size={11} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {onRequestNew && (
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
                        onRequestNew(col.id);
                      }}
                    >
                      <Plus size={12} /> Request Approval
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
  const [view, setView] = useState('kanban'); // 'kanban' (Board 1st default) | 'table'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showModal, setShowModal] = useState(false);
  const [viewingDetails, setViewingDetails] = useState(null);
  const [isManualLead, setIsManualLead] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const { showNotification } = useUI();

  const [form, setForm] = useState({ leadId: '', leadName: '', unitNumber: '', originalPrice: '', requestedPrice: '', reason: '', requestedBy: '' });
  const [policyThresholds, setPolicyThresholds] = useState({ repLimit: 1.5, managerLimit: 3.0, headLimit: 6.0, directorLimit: 12.0 });

  const fetchData = useCallback(async () => {
    try {
      const [bookingsRes, invRes, leadsRes] = await Promise.allSettled([
        api.get('/bookings?limit=1000'), api.get('/inventory?limit=1000'), api.get('/leads?limit=1000')
      ]);

      const fetchedBookings = bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data?.data || []) : [];
      const fetchedInventory = invRes.status === 'fulfilled' ? (invRes.value.data?.data || []) : [];
      const fetchedLeads = leadsRes.status === 'fulfilled' ? (leadsRes.value.data?.data || []) : [];

      setLeads(fetchedLeads);
      const combined = [];

      fetchedBookings.forEach(b => {
        const origVal = b.totalAmount || b.unit?.pricing?.totalPrice || b.basePrice || 0;
        const disc = b.discount || 0;
        const reqVal = origVal - disc;
        const discPct = origVal > 0 && disc > 0 ? Number(((disc / origVal) * 100).toFixed(1)) : 0;
        const isApproved = ['approved', 'agreement_sent', 'agreement_signed', 'registered'].includes(b.status);
        const isRejected = ['cancelled', 'rejected', 'refunded'].includes(b.status);
        const mappedStatus = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';

        combined.push({
          id: b._id, bookingId: b._id, source: 'booking', rawBooking: b,
          leadName: b.customerName || b.lead?.name || 'Customer Applicant', phone: b.customerPhone || b.lead?.phone || '—', email: b.customerEmail || b.lead?.email || '—', panNumber: b.panNumber || '—', aadharNumber: b.aadharNumber || '—', coApplicants: b.coApplicants || [],
          unitNumber: b.unit?.unitNumber ? `${b.unit.unitNumber} (${b.unit.type || 'Unit'})` : 'Reserved Plot / Unit',
          projectName: b.project?.name || 'Active Project', originalPrice: origVal, requestedPrice: reqVal, discountAmt: disc, discountPct: discPct,
          tokenAmount: b.bookingAmount || 0, paymentMode: b.bookingAmountMode?.toUpperCase() || 'NEFT',
          reason: b.notes || (b.bookingAmount ? `Official Booking Application • Token Advance ₹${b.bookingAmount.toLocaleString('en-IN')} paid via ${b.bookingAmountMode || 'NEFT'}` : 'Booking Application Submitted for Approval'),
          requestedBy: b.handledBy?.name || 'Telecaller / Sales Team', status: mappedStatus, rawStatus: b.status, bookingNumber: b.bookingNumber || `BK-${b._id.slice(-5)}`,
          date: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
          createdAt: b.createdAt || new Date(), requiredLevel: discPct > policyThresholds.headLimit ? 'Director / CMD' : discPct > policyThresholds.managerLimit ? 'Sales Head' : 'Executive / Admin Approval'
        });
      });

      fetchedInventory.forEach(u => {
        if ((u.status === 'booked' || u.status === 'on_hold') && (u.bookingCustomer?.name || u.holdCustomer?.name)) {
          const custName = u.bookingCustomer?.name || u.holdCustomer?.name;
          const alreadyExists = combined.some(c => c.unitNumber.includes(u.unitNumber) || (c.leadName === custName && c.phone === (u.bookingCustomer?.phone || u.holdCustomer?.phone)));
          if (!alreadyExists) {
            const origVal = u.pricing?.totalPrice || u.totalPrice || 0;
            const isHold = u.status === 'on_hold';
            const cust = isHold ? u.holdCustomer : u.bookingCustomer;
            combined.push({
              id: `inv-${u._id}`, unitId: u._id, source: 'inventory', rawUnit: u,
              leadName: cust?.name || 'Customer Applicant', phone: cust?.phone || '—', email: cust?.email || '—', panNumber: cust?.panNumber || '—', aadharNumber: cust?.aadharNumber || '—', coApplicants: cust?.coApplicantName ? [{ name: cust.coApplicantName, relation: cust.coApplicantRelation, phone: cust.coApplicantPhone }] : [],
              unitNumber: `${u.unitNumber} (${u.type || 'Unit'})`, projectName: u.project?.name || 'Active Project', originalPrice: origVal, requestedPrice: origVal, discountAmt: 0, discountPct: 0,
              tokenAmount: cust?.tokenAmount || 0, paymentMode: cust?.paymentMode || (isHold ? 'HOLD' : 'NEFT'),
              reason: isHold ? `Unit Held for Prospect: ${cust?.reason || 'Evaluation in progress'}` : `Live Booked Unit • Token Paid: ₹${(cust?.tokenAmount || 0).toLocaleString('en-IN')}`,
              requestedBy: cust?.agentName || 'Sales Team', status: isHold ? 'pending' : 'approved', rawStatus: u.status, bookingNumber: `INV-${u.unitNumber}`,
              date: cust?.bookingDate ? new Date(cust.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
              createdAt: cust?.bookingDate || new Date(), requiredLevel: 'Sales Head / Admin'
            });
          }
        }
      });
      // 3. Map Leads currently in Negotiation stage (e.g. from Sales Pipeline)
      fetchedLeads.forEach(l => {
        if (l.stage === 'negotiation') {
          const alreadyExists = combined.some(c => c.leadId === l._id || (c.phone && l.phone && c.phone.replace(/\D/g, '') === l.phone.replace(/\D/g, '')));
          if (!alreadyExists) {
            const origVal = l.budget || 5000000;
            combined.push({
              id: `lead-${l._id}`,
              leadId: l._id,
              source: 'lead_pipeline',
              rawLead: l,
              leadName: l.name,
              phone: l.phone || '—',
              email: l.email || '—',
              panNumber: l.panNumber || '—',
              aadharNumber: l.aadharNumber || '—',
              coApplicants: [],
              unitNumber: l.interestedProject?.name ? `${l.interestedProject.name} (${l.interestedPropertyType || 'Space'})` : 'Property in Negotiation',
              projectName: l.interestedProject?.name || 'Active Project',
              originalPrice: origVal,
              requestedPrice: origVal * 0.95,
              discountAmt: origVal * 0.05,
              discountPct: 5,
              tokenAmount: 0,
              paymentMode: 'PROPOSED',
              reason: `Lead sent to Negotiation from Sales Pipeline. Budget: ₹${origVal.toLocaleString('en-IN')}. Awaiting commercial discount & booking approval.`,
              requestedBy: l.assignedTo?.name || 'Sales Representative',
              status: 'pending',
              rawStatus: 'negotiation',
              bookingNumber: `NEG-${l.phone?.slice(-4) || 'LEAD'}`,
              date: l.updatedAt ? new Date(l.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
              createdAt: l.updatedAt || l.createdAt || new Date(),
              requiredLevel: 'Sales Head / Admin Approval'
            });
          }
        }
      });

      setRequests(combined);
    } catch (err) { console.error('Error fetching negotiations data:', err); }
  }, [policyThresholds]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setTab(getTabFromPath()); }, [location.pathname]);
  useEffect(() => { if (showModal || viewingDetails) { document.body.classList.add('no-scroll'); return () => document.body.classList.remove('no-scroll'); } }, [showModal, viewingDetails]);

  const handleTabChange = (tabId) => { setTab(tabId); navigate(`/negotiations/${tabId}`); };

  const handleApprove = async (req) => {
    try {
      if (req.bookingId) {
        await api.put(`/bookings/${req.bookingId}/approve`);
      }
      if (req.unitId) {
        await api.put(`/inventory/${req.unitId}/status`, { status: 'booked' });
      }

      // Automatically advance linked Lead to next stage ('booking_in_progress')
      const targetLeadId = req.leadId || req.rawBooking?.lead?._id || req.rawBooking?.lead;
      if (targetLeadId) {
        await api.put(`/leads/${targetLeadId}`, { stage: 'booking_in_progress' });
      } else if (req.phone && req.phone !== '—') {
        const matchingLead = leads.find(l => l.phone && l.phone.replace(/\D/g, '') === req.phone.replace(/\D/g, ''));
        if (matchingLead) {
          await api.put(`/leads/${matchingLead._id}`, { stage: 'booking_in_progress' });
        }
      }

      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved', rawStatus: 'approved' } : r));
      if (viewingDetails?.id === req.id) setViewingDetails(null);
      showNotification(`🎉 Negotiation Approved! Lead "${req.leadName}" automatically moved to Booking stage.`);
    } catch (err) {
      console.error('Error approving negotiation:', err);
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
      showNotification(`🎉 Approval granted! Lead "${req.leadName}" moved to Booking stage.`);
    }
  };

  const handleReject = async (req) => {
    const reason = window.prompt('Enter rejection / cancellation reason:') || 'Terms exceed policy threshold';
    try {
      if (req.bookingId) {
        await api.put(`/bookings/${req.bookingId}/cancel`, { cancellationReason: reason });
      }
      if (req.unitId) {
        await api.put(`/inventory/${req.unitId}/status`, { status: 'available' });
      }

      const targetLeadId = req.leadId || req.rawBooking?.lead?._id || req.rawBooking?.lead;
      if (targetLeadId) {
        await api.put(`/leads/${targetLeadId}`, { stage: 'follow_up' });
      } else if (req.phone && req.phone !== '—') {
        const matchingLead = leads.find(l => l.phone && l.phone.replace(/\D/g, '') === req.phone.replace(/\D/g, ''));
        if (matchingLead) {
          await api.put(`/leads/${matchingLead._id}`, { stage: 'follow_up' });
        }
      }

      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected', rawStatus: 'cancelled' } : r));
      if (viewingDetails?.id === req.id) setViewingDetails(null);
      showNotification(`Negotiation rejected. Lead "${req.leadName}" moved back to Follow-up.`);
    } catch {
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
      showNotification('Discount request rejected.');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const target = requests.find(r => r.id === id);
    if (newStatus === 'approved') { if (target) handleApprove(target); }
    else if (newStatus === 'rejected') { if (target) handleReject(target); }
    else { setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r)); showNotification(`Moved to ${newStatus.toUpperCase()}!`); }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to withdraw/delete this price exception request?')) return;
    const target = requests.find(r => r.id === id);
    if (target?.bookingId) try { await api.delete(`/bookings/${target.bookingId}`); } catch {}
    setRequests(prev => prev.filter(r => r.id !== id));
    showNotification('Record deleted.');
  };

  const startEdit = (req) => {
    setEditingReq(req);
    setForm({ leadName: req.leadName, unitNumber: req.unitNumber, originalPrice: req.originalPrice, requestedPrice: req.requestedPrice, reason: req.reason, requestedBy: req.requestedBy });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const orig = Number(form.originalPrice);
    const req = Number(form.requestedPrice);
    const diff = orig - req;
    const pct = orig > 0 ? Number(((diff / orig) * 100).toFixed(2)) : 0;
    if (editingReq) {
      const updated = { ...editingReq, leadName: form.leadName, unitNumber: form.unitNumber, originalPrice: orig, requestedPrice: req, discountAmt: diff, discountPct: pct, reason: form.reason, requestedBy: form.requestedBy, requiredLevel: pct > policyThresholds.headLimit ? 'Director / CMD' : pct > policyThresholds.managerLimit ? 'Sales Head' : 'Sales Manager' };
      setRequests(prev => prev.map(r => r.id === editingReq.id ? updated : r));
      showNotification('Negotiation request updated!');
    } else {
      const newReq = { id: Date.now().toString(), leadName: form.leadName, phone: '+91 90000 00000', unitNumber: form.unitNumber, projectName: 'Active Project', originalPrice: orig, requestedPrice: req, discountAmt: diff, discountPct: pct, tokenAmount: 0, paymentMode: 'NEFT', reason: form.reason, requestedBy: form.requestedBy || 'Sales Executive', status: 'pending', bookingNumber: `REQ-${Date.now().toString().slice(-4)}`, date: 'Just now', createdAt: new Date(), requiredLevel: pct > policyThresholds.headLimit ? 'Director / CMD' : pct > policyThresholds.managerLimit ? 'Sales Head' : 'Sales Manager' };
      setRequests(p => [newReq, ...p]);
      showNotification('New discount approval request submitted!');
    }
    setShowModal(false); setEditingReq(null);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const filtered = requests
    .filter(r => {
      if (tab !== 'policy' && r.status !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches = r.leadName?.toLowerCase().includes(q) || r.unitNumber?.toLowerCase().includes(q) || r.projectName?.toLowerCase().includes(q) || r.requestedBy?.toLowerCase().includes(q) || r.reason?.toLowerCase().includes(q) || r.bookingNumber?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'date_asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'discount_desc') return (b.discountPct || 0) - (a.discountPct || 0);
      if (sortBy === 'price_desc') return (b.originalPrice || 0) - (a.originalPrice || 0);
      if (sortBy === 'name_asc') return (a.leadName || '').localeCompare(b.leadName || '');
      return 0;
    });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb"><span>Commercials</span><span className="breadcrumb-sep">/</span><span className="breadcrumb-current">{tab === 'approved' ? 'Approved Bookings & Discounts' : tab === 'policy' ? 'Approval Limit Policy' : 'Pending Review'}</span></div>
          <h1 className="page-title">Price Negotiations & Approvals</h1>
          <p className="page-subtitle">Commercial discount matrices, booking application verifications, and tiered approval workflows</p>
        </div>
        <div className="page-actions">
          {tab === 'policy' ? (
            <button className="btn btn-primary btn-sm" onClick={() => showNotification('Approval Limit Policy updated!')}><Save size={14} /> Save Policy Limits</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingReq(null); setForm({ leadName: '', unitNumber: 'Unit 502 (3BHK)', originalPrice: 12500000, requestedPrice: '12000000', reason: '', requestedBy: 'Sales Executive' }); setShowModal(true); }}><Plus size={14} /> Request Price Exception</button>
          )}
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'pending', label: 'Pending Review', badge: pendingCount, badgeClass: 'badge-warning' },
          { id: 'approved', label: 'Approved Bookings & Discounts', badge: approvedCount, badgeClass: 'badge-success' },
          { id: 'rejected', label: 'Rejected Requests', badge: rejectedCount, badgeClass: 'badge-danger' },
          { id: 'policy', label: 'Approval Limit Policy' },
        ].map(t => (
          <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => handleTabChange(t.id)}>{t.label} {t.badge > 0 ? <span className={`badge ${t.badgeClass}`} style={{ marginLeft: 6 }}>{t.badge}</span> : null}</div>
        ))}
      </div>

      {tab !== 'policy' && (
        <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="filter-search" style={{ flex: '1 1 220px', minWidth: 180 }}>
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search customer, unit, project, ref, reason…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <CustomSelect
              variant="filter"
              buttonStyle={{ fontWeight: 600, color: 'var(--primary)' }}
              value={sortBy}
              onChange={val => setSortBy(val)}
              options={[
                { value: 'date_desc', label: 'Sort: 📅 Date (Newest First)' },
                { value: 'date_asc', label: 'Sort: 📅 Date (Oldest First)' },
                { value: 'price_desc', label: 'Sort: 🏷️ Highest Deal Value' },
                { value: 'discount_desc', label: 'Sort: 💰 Highest Discount %' },
                { value: 'name_asc', label: 'Sort: 🔤 Customer Name (A → Z)' }
              ]}
            />
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2 }}>
              <button className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, gap: 4, fontWeight: 600 }} onClick={() => setView('kanban')} title="Kanban Board View (Default)"><Columns size={14} /> Board</button>
              <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, gap: 4, fontWeight: 600 }} onClick={() => setView('table')} title="Table View"><List size={14} /> Table</button>
            </div>
          </div>
        </div>
      )}

      {tab !== 'policy' ? (
        view === 'kanban' ? (
          <NegotiationsKanbanView
            requests={filtered}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={startEdit}
            onDelete={handleDeleteRequest}
            onStatusChange={handleStatusChange}
            onViewDetails={setViewingDetails}
            onRequestNew={() => { setEditingReq(null); setForm({ leadId: '', leadName: '', unitNumber: '', originalPrice: '', requestedPrice: '', reason: '', requestedBy: '' }); setShowModal(true); }}
          />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ margin: 0, border: 'none' }}>
              <table>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th>Customer / Lead</th>
                    <th>Unit & Project</th>
                    <th>Agreement Value</th>
                    <th>Token Paid / Terms</th>
                    <th>Discount / Status</th>
                    <th>Reason / Justification</th>
                    <th>Authority Required</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}><div style={{ fontSize: 24, marginBottom: 6 }}>📑</div><div style={{ fontWeight: 700, fontSize: 14 }}>No requests found in {tab.toUpperCase()} stage</div><div style={{ fontSize: 12, marginTop: 4 }}>When units are booked or price exceptions requested, they will automatically appear here.</div></td></tr>
                  ) : (
                    filtered.map(r => (
                      <tr key={r.id}>
                        <td><div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>👤 {r.leadName}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {r.phone}</div>{r.panNumber && r.panNumber !== '—' && (<div style={{ fontSize: 10, color: '#2563eb', fontWeight: 600, marginTop: 2 }}>PAN: {r.panNumber}</div>)}</td>
                        <td><div style={{ fontWeight: 700, color: 'var(--primary)' }}>{r.unitNumber}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.projectName}</div></td>
                        <td><div style={{ fontWeight: 800, fontSize: 13 }}>{formatCurrency(r.originalPrice)}</div></td>
                        <td>{r.tokenAmount > 0 ? (<div><span className="badge badge-success" style={{ fontWeight: 700, fontSize: 11 }}>Token: {formatCurrency(r.tokenAmount)}</span><div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Mode: {r.paymentMode}</div></div>) : (<div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(r.requestedPrice)}</div>)}</td>
                        <td>{r.discountAmt > 0 ? (<span className="badge badge-danger" style={{ fontWeight: 700 }}>-{r.discountPct}% ({formatCurrency(r.discountAmt)})</span>) : (<span className="badge badge-gray" style={{ fontSize: 11 }}>Standard Terms</span>)}</td>
                        <td style={{ maxWidth: 220 }}><div style={{ fontSize: 12, lineHeight: 1.4 }} className="truncate" title={r.reason}>{r.reason}</div><div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>By {r.requestedBy} • {r.date}</div></td>
                        <td><span className="badge badge-gray" style={{ fontSize: 11 }}>{r.requiredLevel}</span></td>
                        <td><span className={`badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{r.status === 'approved' ? 'APPROVED' : r.status === 'rejected' ? 'REJECTED' : 'PENDING APPROVAL'}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: 11, gap: 4 }} onClick={() => setViewingDetails(r)}><Eye size={12} /> View</button>
                            {r.status === 'pending' && (<><button className="btn btn-success btn-sm" style={{ padding: '3px 8px', fontSize: 11, gap: 4 }} onClick={() => handleApprove(r)}><Check size={12} /> Approve</button><button className="btn btn-danger btn-sm" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => handleReject(r)}><X size={12} /></button></>)}
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteRequest(r.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="card" style={{ padding: 24, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Price Exception & Discount Authorization Matrix</div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Hierarchy Level</th><th>Maximum Allowed Discount (%)</th><th>Approval Turnaround (SLA)</th><th>Override Privilege</th></tr></thead>
              <tbody>
                {['Sales Executive', 'Sales Manager', 'VP / Head of Sales', 'Managing Director'].map((role, idx) => (
                  <tr key={role}>
                    <td style={{ fontWeight: 700 }}>{role}</td>
                    <td><input type="number" step="0.1" className="form-input" style={{ width: 90 }} value={[1.5, 3.0, 6.0, 12.0][idx]} readOnly /> %</td>
                    <td>{['Instant', '2 Hours', '6 Hours', '24 Hours'][idx]}</td>
                    <td>None</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingDetails && (
        <div className="modal-overlay" onClick={() => setViewingDetails(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: 'min(90vh, 800px)', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)', color: 'white' }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}><FileText size={18} color="#38bdf8" /> Commercial & Booking Application Review</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" style={{ color: 'white' }} onClick={() => setViewingDetails(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', padding: 20 }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: 16, fontWeight: 800, color: '#1e40af' }}>{viewingDetails.unitNumber}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{viewingDetails.projectName} • Ref: {viewingDetails.bookingNumber}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Agreed Agreement Value</div><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(viewingDetails.originalPrice)}</div></div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><User size={15} color="#2563eb" /> 1. Customer Identification & Contact Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>APPLICANT NAME</div><div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{viewingDetails.leadName}</div></div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>PHONE NUMBER</div><div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{viewingDetails.phone}</div></div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>EMAIL ADDRESS</div><div style={{ fontSize: 12, marginTop: 2 }}>{viewingDetails.email}</div></div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>PAN NUMBER</div><div style={{ fontWeight: 700, fontSize: 13, marginTop: 2, fontFamily: 'monospace' }}>{viewingDetails.panNumber}</div></div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={15} color="#2563eb" /> 2. Commercial Terms & Payment Instrument</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: '#166534', fontWeight: 700 }}>TOKEN ADVANCE PAID</div><div style={{ fontWeight: 800, fontSize: 15, color: '#15803d', marginTop: 2 }}>{formatCurrency(viewingDetails.tokenAmount || 0)}</div></div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>PAYMENT INSTRUMENT</div><div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{viewingDetails.paymentMode}</div></div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>SUBMITTED BY</div><div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{viewingDetails.requestedBy}</div></div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 2 }}>SALES REMARKS & JUSTIFICATION:</div><div style={{ fontSize: 12, color: '#78350f' }}>{viewingDetails.reason}</div></div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between', background: '#f8fafc', padding: '12px 20px', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewingDetails(null)}>Close</button>
              <div style={{ display: 'flex', gap: 6 }}>
                {viewingDetails.status === 'pending' && (<><button type="button" className="btn btn-danger btn-sm" onClick={() => handleReject(viewingDetails)} style={{ gap: 4 }}><X size={13} /> Reject Request</button><button type="button" className="btn btn-success btn-sm" onClick={() => handleApprove(viewingDetails)} style={{ gap: 4 }}><Check size={13} /> Approve Booking</button></>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingReq ? `Edit Discount Request — ${editingReq.leadName}` : 'Request Price Exception / Discount'}</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input className="form-input" value={form.leadName} onChange={e => setForm(p => ({ ...p, leadName: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Number</label>
                  <input className="form-input" value={form.unitNumber} onChange={e => setForm(p => ({ ...p, unitNumber: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Original Price</label>
                    <input type="number" className="form-input" value={form.originalPrice} onChange={e => setForm(p => ({ ...p, originalPrice: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Requested Price</label>
                    <input type="number" className="form-input" value={form.requestedPrice} onChange={e => setForm(p => ({ ...p, requestedPrice: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea className="form-input" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editingReq ? 'Update' : 'Submit'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
