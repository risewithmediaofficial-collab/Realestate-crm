import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CreditCard, DollarSign, Plus, CheckCircle, AlertCircle,
  FileText, Download, Printer, Send, Search, Filter, X, Edit, Trash2,
  Building, User, Phone, Check, Receipt, Calendar, ArrowRight, ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportFinanceReportCSV } from '../../utils/exportTemplates';
import CustomSelect from '../../components/ui/CustomSelect';

const PAYMENT_METHODS = [
  { id: 'bank_transfer', label: '🏦 Bank Transfer (NEFT / RTGS / IMPS)', short: 'Bank Transfer' },
  { id: 'upi', label: '📱 UPI / QR (GPay / PhonePe / Paytm)', short: 'UPI' },
  { id: 'cheque', label: '📝 Bank Cheque / Demand Draft (DD)', short: 'Cheque' },
  { id: 'cash', label: '💵 Cash Payment Receipt', short: 'Cash' },
  { id: 'loan_disbursement', label: '🏛️ Home Loan Bank Disbursement', short: 'Home Loan' },
  { id: 'card', label: '💳 Credit / Debit Card (POS / Gateway)', short: 'Card' },
  { id: 'other', label: '🔄 Other / Ledger Adjustment', short: 'Other' }
];

const MILESTONE_STAGES = [
  '1. Booking Token & Advance (10%)',
  '2. Agreement Execution & Registration (10%)',
  '3. Foundation & Plinth Completion (15%)',
  '4. Ground Floor Slab (10%)',
  '5. 1st Floor Slab (10%)',
  '6. 2nd Floor Slab (10%)',
  '7. Top Floor Slab Structure (10%)',
  '8. Brickwork & Internal Plastering (10%)',
  '9. Flooring, Tiling & Painting (10%)',
  '10. Final Handover & Possession (5%)',
  'Custom Milestone (Manual Entry)'
];

const StatusBadge = ({ status }) => {
  switch (status) {
    case 'paid':
      return <span className="badge badge-success">✓ Paid & Cleared</span>;
    case 'partial':
      return <span className="badge badge-warning">⏳ Partial Payment</span>;
    case 'overdue':
      return <span className="badge badge-danger">⚠️ Overdue</span>;
    case 'waived':
      return <span className="badge badge-gray">Waived</span>;
    default:
      return <span className="badge badge-info">Pending Collection</span>;
  }
};

export default function PaymentsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/pending')) return 'pending';
    if (location.pathname.includes('/overdue')) return 'overdue';
    if (location.pathname.includes('/paid')) return 'paid';
    return 'all';
  };

  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(getTabFromPath());
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [editingDemand, setEditingDemand] = useState(null);
  const { showNotification } = useUI();
  const { user } = useAuth();

  // Record Payment Form State
  const [recordForm, setRecordForm] = useState({
    payingAmount: '',
    paymentMode: 'bank_transfer',
    transactionReference: '',
    bankName: 'HDFC Bank',
    branchName: '',
    paymentDate: new Date().toISOString().split('T')[0],
    tdsDeducted: '0',
    receiptNumber: '',
    notes: ''
  });

  // Demand Notice Form State
  const [demandForm, setDemandForm] = useState({
    bookingId: '',
    isManualCustomer: false,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    unitNumber: '',
    projectName: '',
    milestoneName: MILESTONE_STAGES[0],
    isCustomMilestone: false,
    customMilestoneName: '',
    baseAmount: '500000',
    gstRate: 5,
    includeGst: true,
    tdsRate: 1,
    includeTds: false,
    demandAmount: '525000',
    paidAmount: '0',
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    status: 'pending',
    paymentMode: 'bank_transfer',
    bankName: 'HDFC Bank',
    transactionReference: '',
    notes: ''
  });

  useEffect(() => {
    setTab(getTabFromPath());
  }, [location.pathname]);

  useEffect(() => {
    if (showRecordModal || showEditModal) {
      document.body.classList.add('no-scroll');
      return () => document.body.classList.remove('no-scroll');
    }
  }, [showRecordModal, showEditModal]);

  const handleTabChange = (tabId) => {
    setTab(tabId);
    navigate(`/payments/${tabId}`);
  };

  // Load live data from database
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, bookRes, leadRes, projRes] = await Promise.allSettled([
        api.get('/payments'),
        api.get('/bookings'),
        api.get('/leads?limit=1000'),
        api.get('/projects')
      ]);

      if (payRes.status === 'fulfilled' && payRes.value.data?.data) {
        setPayments(payRes.value.data.data.map(p => ({
          _id: p._id,
          demandNumber: p.demandNumber || `DEM-${p._id.slice(-4)}`,
          customerName: p.customerName || p.booking?.customerName || 'Customer',
          customerPhone: p.customerPhone || p.booking?.customerPhone || '—',
          customerEmail: p.customerEmail || p.booking?.customerEmail || '',
          unitNumber: p.unitNumber || p.unit?.unitNumber || 'Unit',
          unit: p.unit?._id || p.unit,
          project: p.project?._id || p.project,
          booking: p.booking?._id || p.booking,
          projectName: p.projectName || p.project?.name || 'Project',
          milestoneName: p.milestoneName || p.milestoneDescription || 'Milestone Demand',
          baseAmount: p.baseAmount || p.demandAmount || 500000,
          gstAmount: p.gstAmount || 0,
          tdsAmount: p.tdsAmount || 0,
          demandAmount: p.demandAmount || 500000,
          paidAmount: p.paidAmount || 0,
          balanceAmount: p.balanceAmount !== undefined ? p.balanceAmount : Math.max(0, (p.demandAmount || 500000) - (p.paidAmount || 0)),
          dueDate: p.dueDate ? formatDate(p.dueDate) : formatDate(new Date()),
          rawDueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          status: p.status || (p.paidAmount >= p.demandAmount ? 'paid' : p.paidAmount > 0 ? 'partial' : 'pending'),
          paymentMode: p.paymentMode || 'bank_transfer',
          refNumber: p.transactionReference || '—',
          bankName: p.bankName || '',
          notes: p.notes || '',
          transactions: p.transactions || []
        })));
      } else {
        setPayments([]);
      }

      if (bookRes.status === 'fulfilled' && bookRes.value.data?.data) {
        setBookings(bookRes.value.data.data);
      }
      if (leadRes.status === 'fulfilled' && leadRes.value.data?.data) {
        setLeads(leadRes.value.data.data);
      }
      if (projRes.status === 'fulfilled' && projRes.value.data?.data) {
        setProjects(projRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch payments data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Customer / Booking Selection
  const handleBookingSelect = (val) => {
    if (val === '__manual__') {
      setDemandForm(p => ({
        ...p,
        bookingId: '__manual__',
        isManualCustomer: true,
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        unitNumber: '',
        projectName: projects[0]?.name || ''
      }));
      return;
    }

    const booking = bookings.find(b => b._id === val);
    if (booking) {
      setDemandForm(p => ({
        ...p,
        bookingId: booking._id,
        isManualCustomer: false,
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        customerEmail: booking.customerEmail || '',
        unitNumber: booking.unit?.unitNumber || booking.unit || 'Standard Unit',
        projectName: booking.project?.name || booking.project || (projects[0]?.name || 'Active Project')
      }));
      return;
    }

    // Check if lead selected
    const leadId = val.replace('lead_', '');
    const lead = leads.find(l => l._id === leadId);
    if (lead) {
      setDemandForm(p => ({
        ...p,
        bookingId: val,
        isManualCustomer: false,
        customerName: lead.name || '',
        customerPhone: lead.phone || '',
        customerEmail: lead.email || '',
        unitNumber: 'Allocated Unit',
        projectName: lead.interestedProject?.name || (projects[0]?.name || 'Active Project')
      }));
    }
  };

  // Live Auto-Calculation of Net Demanded Amount
  const calculateDemandAmount = (base, withGst, withTds) => {
    const b = Number(base) || 0;
    const gst = withGst ? Math.round(b * 0.05) : 0;
    const tds = withTds ? Math.round(b * 0.01) : 0;
    return {
      base: b,
      gst,
      tds,
      total: b + gst - tds
    };
  };

  const handleBaseAmountChange = (val, withGst = demandForm.includeGst, withTds = demandForm.includeTds) => {
    const calc = calculateDemandAmount(val, withGst, withTds);
    setDemandForm(p => ({
      ...p,
      baseAmount: val,
      includeGst: withGst,
      includeTds: withTds,
      demandAmount: calc.total.toString()
    }));
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingDemand(null);
    const initialBooking = bookings[0];
    const initialCalc = calculateDemandAmount('500000', true, false);

    setDemandForm({
      bookingId: initialBooking?._id || '__manual__',
      isManualCustomer: !initialBooking,
      customerName: initialBooking?.customerName || '',
      customerPhone: initialBooking?.customerPhone || '',
      customerEmail: initialBooking?.customerEmail || '',
      unitNumber: initialBooking?.unit?.unitNumber || initialBooking?.unit || 'Unit A-101',
      projectName: initialBooking?.project?.name || initialBooking?.project || (projects[0]?.name || 'Primary Project Site'),
      milestoneName: MILESTONE_STAGES[0],
      isCustomMilestone: false,
      customMilestoneName: '',
      baseAmount: '500000',
      gstRate: 5,
      includeGst: true,
      tdsRate: 1,
      includeTds: false,
      demandAmount: initialCalc.total.toString(),
      paidAmount: '0',
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      paymentMode: 'bank_transfer',
      bankName: 'HDFC Bank',
      transactionReference: '',
      notes: ''
    });
    setShowEditModal(true);
  };

  // Open Edit Modal
  const startEditDemand = (d) => {
    setEditingDemand(d);
    const isCustom = !MILESTONE_STAGES.includes(d.milestoneName);

    setDemandForm({
      bookingId: '__manual__',
      isManualCustomer: true,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      customerEmail: d.customerEmail || '',
      unitNumber: d.unitNumber,
      projectName: d.projectName,
      milestoneName: isCustom ? 'Custom Milestone (Manual Entry)' : d.milestoneName,
      isCustomMilestone: isCustom,
      customMilestoneName: isCustom ? d.milestoneName : '',
      baseAmount: d.baseAmount?.toString() || d.demandAmount?.toString(),
      gstRate: 5,
      includeGst: (d.gstAmount || 0) > 0,
      tdsRate: 1,
      includeTds: (d.tdsAmount || 0) > 0,
      demandAmount: d.demandAmount?.toString(),
      paidAmount: d.paidAmount?.toString() || '0',
      dueDate: d.rawDueDate || new Date().toISOString().split('T')[0],
      status: d.status,
      paymentMode: d.paymentMode || 'bank_transfer',
      bankName: d.bankName || 'HDFC Bank',
      transactionReference: d.refNumber !== '—' ? d.refNumber : '',
      notes: d.notes || ''
    });
    setShowEditModal(true);
  };

  // Save Demand (Create or Update)
  const handleSaveDemand = async (e) => {
    e.preventDefault();
    const finalMilestone = demandForm.isCustomMilestone || demandForm.milestoneName.includes('Custom')
      ? (demandForm.customMilestoneName || 'Custom Construction Milestone')
      : demandForm.milestoneName;

    const base = Number(demandForm.baseAmount) || 0;
    const calc = calculateDemandAmount(base, demandForm.includeGst, demandForm.includeTds);
    const totalDem = Number(demandForm.demandAmount) || calc.total;
    const paid = Number(demandForm.paidAmount) || 0;
    const bal = Math.max(0, totalDem - paid);
    const finalStatus = bal === 0 && paid > 0 ? 'paid' : paid > 0 ? 'partial' : demandForm.status;

    const payload = {
      customerName: demandForm.customerName,
      customerPhone: demandForm.customerPhone,
      customerEmail: demandForm.customerEmail,
      unitNumber: demandForm.unitNumber,
      projectName: demandForm.projectName,
      milestoneName: finalMilestone,
      baseAmount: calc.base,
      gstAmount: calc.gst,
      tdsAmount: calc.tds,
      demandAmount: totalDem,
      paidAmount: paid,
      balanceAmount: bal,
      dueDate: new Date(demandForm.dueDate),
      status: finalStatus,
      paymentMode: demandForm.paymentMode,
      bankName: demandForm.bankName,
      transactionReference: demandForm.transactionReference,
      notes: demandForm.notes
    };

    if (editingDemand) {
      const updated = {
        ...editingDemand,
        ...payload,
        dueDate: formatDate(payload.dueDate),
        rawDueDate: demandForm.dueDate,
        refNumber: payload.transactionReference || '—'
      };

      setPayments(prev => prev.map(p => p._id === editingDemand._id ? updated : p));
      try {
        await api.put(`/payments/${editingDemand._id}`, payload);
      } catch {}
      showNotification(`Demand Notice "${editingDemand.demandNumber}" updated!`);
    } else {
      const newD = {
        ...payload,
        _id: `dem_${Date.now()}`,
        demandNumber: `DEM-${Date.now().toString().slice(-6)}`,
        dueDate: formatDate(payload.dueDate),
        rawDueDate: demandForm.dueDate,
        refNumber: payload.transactionReference || '—'
      };

      setPayments(prev => [newD, ...prev]);
      try {
        const { data } = await api.post('/payments', payload);
        if (data.data) {
          setPayments(prev => prev.map(p => p._id === newD._id ? { ...newD, ...data.data } : p));
        }
      } catch {}
      showNotification(`Milestone Demand Notice created successfully!`);
    }

    setShowEditModal(false);
    setEditingDemand(null);
  };

  // Open Record Payment Modal
  const startRecordPayment = (d) => {
    setSelectedDemand(d);
    setRecordForm({
      payingAmount: d.balanceAmount > 0 ? d.balanceAmount.toString() : '50000',
      paymentMode: 'bank_transfer',
      transactionReference: '',
      bankName: 'HDFC Bank',
      branchName: 'Main Branch',
      paymentDate: new Date().toISOString().split('T')[0],
      tdsDeducted: '0',
      receiptNumber: `RCP-${Date.now().toString().slice(-5)}`,
      notes: `Collection for ${d.milestoneName}`
    });
    setShowRecordModal(true);
  };

  // Helper to normalize payment mode to valid backend enum
  const cleanPaymentMode = (val) => {
    if (!val) return 'bank_transfer';
    const v = String(val).toLowerCase().trim();
    if (v.includes('upi') || v.includes('gpay') || v.includes('phonepe') || v.includes('paytm')) return 'upi';
    if (v.includes('neft')) return 'neft';
    if (v.includes('rtgs')) return 'rtgs';
    if (v.includes('imps')) return 'imps';
    if (v.includes('cheque') || v.includes('dd')) return 'cheque';
    if (v.includes('cash')) return 'cash';
    if (v.includes('loan')) return 'loan_disbursement';
    if (v.includes('card') || v.includes('pos')) return 'card';
    return 'bank_transfer';
  };

  // Submit Partial / Full Payment Collection
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedDemand) return;

    const paying = Number(recordForm.payingAmount) || 0;
    if (paying <= 0) {
      showNotification('Please enter a valid payment amount.', 'error');
      return;
    }

    const newPaid = (selectedDemand.paidAmount || 0) + paying;
    const newBal = Math.max(0, selectedDemand.demandAmount - newPaid);
    const newStatus = newBal === 0 ? 'paid' : 'partial';
    const cleanMode = cleanPaymentMode(recordForm.paymentMode);

    const recordPayload = {
      paidAmount: paying,
      paymentMode: cleanMode,
      transactionReference: recordForm.transactionReference,
      bankName: recordForm.bankName,
      paymentDate: new Date(recordForm.paymentDate),
      notes: recordForm.notes,
      receiptNumber: recordForm.receiptNumber
    };

    try {
      let targetId = selectedDemand._id;

      // If this is a virtual/synthesized record (inv-pay-*), create a real Payment doc first
      if (typeof targetId === 'string' && targetId.startsWith('inv-pay-')) {
        const unitId = targetId.replace('inv-pay-', '');
        const existingPaid = Number(selectedDemand.paidAmount) || 0;
        const initialBal = Math.max(0, (selectedDemand.demandAmount || 0) - existingPaid);
        const demandMode = cleanPaymentMode(selectedDemand.paymentMode || recordForm.paymentMode);
        const createRes = await api.post('/payments', {
          milestoneName: selectedDemand.milestoneName,
          demandNumber: selectedDemand.demandNumber,
          customerName: selectedDemand.customerName,
          customerPhone: selectedDemand.customerPhone,
          customerEmail: selectedDemand.customerEmail,
          demandAmount: selectedDemand.demandAmount,
          paidAmount: existingPaid,
          balanceAmount: initialBal,
          status: initialBal === 0 ? 'paid' : (existingPaid > 0 ? 'partial' : 'pending'),
          dueDate: selectedDemand.rawDueDate ? new Date(selectedDemand.rawDueDate) : new Date(),
          paymentMode: demandMode,
          unit: unitId,
          project: selectedDemand.project?._id || selectedDemand.project,
          booking: selectedDemand.booking?._id || selectedDemand.booking,
          transactions: selectedDemand.transactions || []
        });
        targetId = createRes.data.data._id;
      }

      // Use the dedicated /record endpoint for proper transaction logging
      await api.put(`/payments/${targetId}/record`, recordPayload);

      setShowRecordModal(false);
      setSelectedDemand(null);

      const clearMsg = newBal === 0
        ? `✅ Full payment of ${formatCurrency(paying)} recorded! Receipt ${recordForm.receiptNumber} generated. Demand ${selectedDemand.demandNumber} is fully cleared and moved to Paid & Cleared.`
        : `✅ Partial payment of ${formatCurrency(paying)} recorded! Receipt ${recordForm.receiptNumber} generated. Balance remaining: ${formatCurrency(newBal)}.`;
      showNotification(clearMsg);

      // Reload from server to get fresh, consistently mapped state
      await fetchData();

    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to record payment';
      showNotification(`❌ ${msg}`, 'error');
      console.error('Record payment error:', err);
    }
  };


  const handleDeleteDemand = async (id, demandNumber) => {
    if (!window.confirm(`Are you sure you want to delete Demand Notice ${demandNumber}?`)) return;
    try { await api.delete(`/payments/${id}`); } catch {}
    setPayments(prev => prev.filter(p => p._id !== id));
    showNotification(`Demand Notice ${demandNumber} deleted!`);
  };

  // Totals & Realization
  const totalDemand = useMemo(() => payments.reduce((acc, p) => acc + (p.demandAmount || 0), 0), [payments]);
  const totalCollected = useMemo(() => payments.reduce((acc, p) => acc + (p.paidAmount || 0), 0), [payments]);
  const totalOutstanding = useMemo(() => payments.reduce((acc, p) => acc + (p.balanceAmount || 0), 0), [payments]);

  // Filtered & Sorted Payments
  const filtered = useMemo(() => {
    let list = payments.filter(p => {
      if (tab === 'pending') {
        if (p.status !== 'pending' && p.status !== 'partial') return false;
      } else if (tab === 'overdue') {
        if (p.status !== 'overdue') return false;
      } else if (tab === 'paid') {
        if (p.status !== 'paid') return false;
      }

      if (methodFilter && p.paymentMode !== methodFilter) return false;

      if (dateRangeFilter) {
        const d = new Date(p.dueDate || p.createdAt || Date.now());
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateRangeFilter === 'this_month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (d < startOfMonth) return false;
        } else if (dateRangeFilter === 'overdue') {
          if (p.status === 'paid' || d >= startOfToday) return false;
        } else if (dateRangeFilter === 'custom') {
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

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.demandNumber?.toLowerCase().includes(q) ||
          p.customerName?.toLowerCase().includes(q) ||
          p.customerPhone?.toLowerCase().includes(q) ||
          p.unitNumber?.toLowerCase().includes(q) ||
          p.projectName?.toLowerCase().includes(q) ||
          p.milestoneName?.toLowerCase().includes(q) ||
          p.paymentMode?.toLowerCase().includes(q) ||
          p.refNumber?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.dueDate || b.createdAt || 0) - new Date(a.dueDate || a.createdAt || 0);
      if (sortBy === 'date_asc') return new Date(a.dueDate || a.createdAt || 0) - new Date(b.dueDate || b.createdAt || 0);
      if (sortBy === 'amount_desc') return (b.demandAmount || 0) - (a.demandAmount || 0);
      if (sortBy === 'amount_asc') return (a.demandAmount || 0) - (b.demandAmount || 0);
      if (sortBy === 'balance_desc') return (b.balanceAmount || 0) - (a.balanceAmount || 0);
      if (sortBy === 'customer_asc') return (a.customerName || '').localeCompare(b.customerName || '');
      return 0;
    });

    return list;
  }, [payments, tab, search, methodFilter, dateRangeFilter, sortBy]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Finance & Collections</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {tab === 'pending' ? 'Pending Collections' : tab === 'overdue' ? 'Overdue Demands' : tab === 'paid' ? 'Paid & Cleared' : 'All Demand Notices'}
            </span>
          </div>
          <h1 className="page-title">Payments & Milestone Collections</h1>
          <p className="page-subtitle">Milestone-linked demand notes, partial payment tracking, bank transfers, cash/UPI receipts, and GST invoices</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              exportFinanceReportCSV(filtered, user?.organization || 'MRP REAL ESTATE');
              showNotification('Exported professional Finance & Milestone Collections Ledger!');
            }}
            title="Download full milestone payments ledger"
          >
            <Download size={14} /> Export Ledger CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={14} /> Raise Milestone Demand
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#eff6ff' }}>
            <FileText size={20} color="#2563eb" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Demands Raised</div>
            <div className="stat-value">{formatCurrency(totalDemand)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{payments.length} Demand Notices</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#dcfce7' }}>
            <CheckCircle size={20} color="#16a34a" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Collected (Paid)</div>
            <div className="stat-value">{formatCurrency(totalCollected)}</div>
            <div className="stat-change up" style={{ fontSize: 11 }}>
              {totalDemand > 0 ? ((totalCollected / totalDemand) * 100).toFixed(1) : 0}% Realization
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#fee2e2' }}>
            <AlertCircle size={20} color="#dc2626" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Outstanding Balance</div>
            <div className="stat-value">{formatCurrency(totalOutstanding)}</div>
            <div className="stat-change down" style={{ fontSize: 11 }}>
              {payments.filter(p => p.status === 'overdue').length} Overdue Notices
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & Tabs Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[
            { id: 'all', label: 'All Demand Notices', count: payments.length },
            { id: 'pending', label: 'Pending & Partial', count: payments.filter(p => p.status === 'pending' || p.status === 'partial').length },
            { id: 'overdue', label: 'Overdue Demands', count: payments.filter(p => p.status === 'overdue').length },
            { id: 'paid', label: 'Paid & Cleared', count: payments.filter(p => p.status === 'paid').length },
          ].map(t => (
            <div
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => handleTabChange(t.id)}
            >
              {t.label} <span className="badge badge-gray" style={{ marginLeft: 4 }}>{t.count}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div className="search-box" style={{ maxWidth: 240, width: '100%' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search customer, DEM #, unit, UTR..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <CustomSelect
            variant="filter"
            value={methodFilter}
            onChange={val => setMethodFilter(val)}
            options={[
              { value: '', label: 'All Payment Modes' },
              ...PAYMENT_METHODS.map(m => ({ value: m.id, label: m.short, icon: '💳' }))
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
              { value: 'this_month', label: 'This Month' },
              { value: 'overdue', label: 'Overdue Notices' },
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
                <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ padding: 2, height: 24, width: 24, color: 'var(--danger)' }} onClick={() => { setCustomFrom(''); setCustomTo(''); setDateRangeFilter(''); }} title="Clear">
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
              { value: 'date_desc', label: 'Sort: 📅 Due Date (Latest First)' },
              { value: 'date_asc', label: 'Sort: 📅 Due Date (Earliest First)' },
              { value: 'amount_desc', label: 'Sort: 💰 Demanded (High to Low)' },
              { value: 'amount_asc', label: 'Sort: 💰 Demanded (Low to High)' },
              { value: 'balance_desc', label: 'Sort: ⚠️ Outstanding Balance' },
              { value: 'customer_asc', label: 'Sort: 🔤 Customer Name (A → Z)' }
            ]}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="table-wrapper">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ background: 'white', padding: '48px 24px', textAlign: 'center', borderRadius: 8 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>No demand notices found</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
              {search || tab !== 'all' ? 'Try adjusting your search query or tab filters.' : 'Milestone demands and partial payment collections will appear here.'}
            </div>
            <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
              <Plus size={14} /> Raise Milestone Demand
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Demand Note #</th>
                <th>Customer Name</th>
                <th>Unit & Project</th>
                <th>Milestone Stage</th>
                <th>Demanded</th>
                <th>Collected (Paid)</th>
                <th>Balance Remaining</th>
                <th>Payment Mode</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const methodConf = PAYMENT_METHODS.find(m => m.id === p.paymentMode) || { label: p.paymentMode, short: p.paymentMode || '—' };
                return (
                  <tr key={p._id}>
                    <td>
                      <strong style={{ color: 'var(--primary)', fontSize: 13 }}>{p.demandNumber}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.customerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {p.customerPhone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.unitNumber}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.projectName}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{p.milestoneName}</div>
                    </td>
                    <td>
                      <strong style={{ fontSize: 13 }}>{formatCurrency(p.demandAmount)}</strong>
                    </td>
                    <td>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>{formatCurrency(p.paidAmount)}</span>
                    </td>
                    <td>
                      <span style={{ color: p.balanceAmount > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                        {formatCurrency(p.balanceAmount)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {methodConf.short}
                      </span>
                      {p.refNumber && p.refNumber !== '—' && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ref: {p.refNumber}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{p.dueDate}</div>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <div className="btn-group" style={{ display: 'flex', gap: 4 }}>
                        {p.status !== 'paid' && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11, gap: 4 }}
                            title="Collect Full or Partial Payment"
                            onClick={() => startRecordPayment(p)}
                          >
                            <CreditCard size={12} /> Record Pay
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--primary)' }}
                          title="Edit Demand Notice"
                          onClick={() => startEditDemand(p)}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--danger)' }}
                          title="Delete Demand Notice"
                          onClick={() => handleDeleteDemand(p._id, p.demandNumber)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Record Payment Modal (Full & Partial Payments) ───────────────── */}
      {showRecordModal && selectedDemand && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">Record Payment Collection — {selectedDemand.demandNumber}</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowRecordModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                {/* Demand Summary Card */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {selectedDemand.customerName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {selectedDemand.unitNumber} • {selectedDemand.projectName}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Demanded: {formatCurrency(selectedDemand.demandAmount)}</div>
                      <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Already Paid: {formatCurrency(selectedDemand.paidAmount)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Current Outstanding:</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>{formatCurrency(selectedDemand.balanceAmount)}</span>
                  </div>
                </div>

                {/* Amount Paying Now & Live Remaining Balance */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1.2 }}>
                    <label className="form-label">Payment Amount Collected Now (₹) <span className="required">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}
                      value={recordForm.payingAmount}
                      onChange={e => setRecordForm(p => ({ ...p, payingAmount: e.target.value }))}
                      placeholder="e.g. 200000"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Balance After This Payment</label>
                    <div style={{
                      padding: '8px 12px',
                      background: '#f1f5f9',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 800,
                      color: Math.max(0, selectedDemand.balanceAmount - (Number(recordForm.payingAmount) || 0)) === 0 ? '#16a34a' : '#ea580c'
                    }}>
                      {formatCurrency(Math.max(0, selectedDemand.balanceAmount - (Number(recordForm.payingAmount) || 0)))}
                      {Math.max(0, selectedDemand.balanceAmount - (Number(recordForm.payingAmount) || 0)) === 0 ? ' (Full Clear ✓)' : ' (Partial)'}
                    </div>
                  </div>
                </div>

                {/* Payment Method / Type Dropdown */}
                <div className="form-group">
                  <label className="form-label">Payment Method / Type <span className="required">*</span></label>
                  <CustomSelect
                    value={recordForm.paymentMode}
                    onChange={val => setRecordForm(p => ({ ...p, paymentMode: typeof val === 'object' && val.target ? val.target.value : val }))}
                    options={PAYMENT_METHODS.map(m => ({
                      value: m.id,
                      label: m.label
                    }))}
                  />
                </div>

                {/* Bank Details & Reference */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name & Branch</label>
                    <input
                      className="form-input"
                      value={recordForm.bankName}
                      onChange={e => setRecordForm(p => ({ ...p, bankName: e.target.value }))}
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Transaction Ref / Cheque No / UTR <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={recordForm.transactionReference}
                      onChange={e => setRecordForm(p => ({ ...p, transactionReference: e.target.value }))}
                      placeholder="e.g. UTR123456789 or CHQ-998822"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Receipt Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={recordForm.paymentDate}
                      onChange={e => setRecordForm(p => ({ ...p, paymentDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Money Receipt Number</label>
                    <input
                      className="form-input"
                      value={recordForm.receiptNumber}
                      onChange={e => setRecordForm(p => ({ ...p, receiptNumber: e.target.value }))}
                      placeholder="e.g. RCP-1002"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Receipt Remarks / Payment Notes</label>
                  <input
                    className="form-input"
                    value={recordForm.notes}
                    onChange={e => setRecordForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="e.g. Cleared via RTGS direct credit to escrow account"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRecordModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Receipt size={14} /> Record Payment & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Raise / Edit Demand Notice Modal (With Customer Dropdown & GST) ─────────────── */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingDemand ? `Edit Demand Notice — ${editingDemand.demandNumber}` : 'Raise Milestone Construction Demand'}
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowEditModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveDemand}>
              <div className="modal-body">
                {/* Customer / Booking Selector with Dropdown */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Select Customer / Unit Booking <span className="required">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDemandForm(p => ({
                          ...p,
                          isManualCustomer: !p.isManualCustomer,
                          bookingId: !p.isManualCustomer ? '__manual__' : (bookings[0]?._id || '')
                        }));
                      }}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: demandForm.isManualCustomer ? '#7c3aed' : '#2563eb',
                        background: demandForm.isManualCustomer ? '#f3e8ff' : '#eff6ff',
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {demandForm.isManualCustomer ? '📋 Select from Registered Bookings' : '✏️ Or Type Customer Manually'}
                    </button>
                  </div>

                  {!demandForm.isManualCustomer ? (
                    <div>
                      <CustomSelect
                        value={demandForm.bookingId}
                        onChange={val => handleBookingSelect(typeof val === 'object' && val.target ? val.target.value : val)}
                        placeholder={`-- Choose Registered Booking (${bookings.length} available) --`}
                        searchable
                        options={[
                          ...bookings.map(b => ({
                            value: b._id,
                            label: `${b.customerName} (${b.bookingNumber})`,
                            subtext: `${b.unit?.unitNumber || 'Unit'} • ${b.project?.name || 'Project'} (📞 ${b.customerPhone})`
                          })),
                          ...leads.map(l => ({
                            value: `lead_${l._id}`,
                            label: `${l.name} (Lead)`,
                            subtext: `📞 ${l.phone} • ${l.interestedProject?.name || 'Prospect'}`
                          })),
                          { value: '__manual__', label: '✏️ + Enter Custom / Offline Customer Details...' }
                        ]}
                      />
                      {bookings.length === 0 && (
                        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                          ⚠️ No bookings created yet. Switch to manual mode above or create bookings in the Bookings module.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="form-row">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input
                          className="form-input"
                          value={demandForm.customerName}
                          onChange={e => setDemandForm(p => ({ ...p, customerName: e.target.value }))}
                          placeholder="Customer Legal Name (e.g. Rahul Varma)"
                          required={demandForm.isManualCustomer}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input
                          className="form-input"
                          value={demandForm.customerPhone}
                          onChange={e => setDemandForm(p => ({ ...p, customerPhone: e.target.value }))}
                          placeholder="Phone (e.g. +91 98765 43210)"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Project & Unit Specifications */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Project Site Name <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={demandForm.projectName}
                      onChange={e => setDemandForm(p => ({ ...p, projectName: e.target.value }))}
                      placeholder="e.g. Green Valley Residences"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Specification / Space # <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={demandForm.unitNumber}
                      onChange={e => setDemandForm(p => ({ ...p, unitNumber: e.target.value }))}
                      placeholder="e.g. Tower A - Unit 302 (2BHK)"
                      required
                    />
                  </div>
                </div>

                {/* Milestone Selection */}
                <div className="form-group">
                  <label className="form-label">Construction Milestone / Payment Stage <span className="required">*</span></label>
                  <CustomSelect
                    value={demandForm.milestoneName}
                    onChange={val => {
                      const actualVal = typeof val === 'object' && val.target ? val.target.value : val;
                      setDemandForm(p => ({
                        ...p,
                        milestoneName: actualVal,
                        isCustomMilestone: actualVal.includes('Custom')
                      }));
                    }}
                    options={MILESTONE_STAGES.map(stg => ({
                      value: stg,
                      label: stg
                    }))}
                  />

                  {(demandForm.isCustomMilestone || demandForm.milestoneName.includes('Custom')) && (
                    <input
                      className="form-input"
                      style={{ marginTop: 8 }}
                      value={demandForm.customMilestoneName}
                      onChange={e => setDemandForm(p => ({ ...p, customMilestoneName: e.target.value }))}
                      placeholder="Specify custom milestone (e.g. Completion of Club House Slab / Terrace Waterproofing)"
                      required
                    />
                  )}
                </div>

                {/* Financial Amounts & GST Breakdown */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, margin: '12px 0', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                    Financials & Tax Calculation
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Base Milestone Amount (₹) <span className="required">*</span></label>
                      <input
                        type="number"
                        className="form-input"
                        value={demandForm.baseAmount}
                        onChange={e => handleBaseAmountChange(e.target.value)}
                        placeholder="e.g. 500000"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Net Demanded Total (₹) <span className="required">*</span></label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ fontWeight: 800, color: 'var(--primary)' }}
                        value={demandForm.demandAmount}
                        onChange={e => setDemandForm(p => ({ ...p, demandAmount: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  {/* Tax Toggles */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={demandForm.includeGst}
                        onChange={e => handleBaseAmountChange(demandForm.baseAmount, e.target.checked, demandForm.includeTds)}
                      />
                      <span>Add 5% GST (+{formatCurrency(Math.round((Number(demandForm.baseAmount) || 0) * 0.05))})</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={demandForm.includeTds}
                        onChange={e => handleBaseAmountChange(demandForm.baseAmount, demandForm.includeGst, e.target.checked)}
                      />
                      <span>Deduct 1% TDS Sec 194-IA (-{formatCurrency(Math.round((Number(demandForm.baseAmount) || 0) * 0.01))})</span>
                    </label>
                  </div>
                </div>

                {/* Due Date & Status */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Due Date <span className="required">*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={demandForm.dueDate}
                      onChange={e => setDemandForm(p => ({ ...p, dueDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Collection Status</label>
                    <CustomSelect
                      value={demandForm.status}
                      onChange={val => setDemandForm(p => ({ ...p, status: typeof val === 'object' && val.target ? val.target.value : val }))}
                      options={[
                        { value: 'pending', label: 'Pending Collection', icon: '⏳', subtext: 'Awaiting payment' },
                        { value: 'partial', label: 'Partial Payment Received', icon: '🟡', subtext: 'Partially cleared' },
                        { value: 'paid', label: 'Fully Paid & Cleared', icon: '✅', subtext: 'Payment received' },
                        { value: 'overdue', label: 'Overdue Notice', icon: '⚠️', subtext: 'Past due date' },
                        { value: 'waived', label: 'Waived', icon: '⚪', subtext: 'Exempted / Void' }
                      ]}
                    />
                  </div>
                </div>

                {/* Paid Amount & Payment Mode */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Already Paid Amount (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={demandForm.paidAmount}
                      onChange={e => setDemandForm(p => ({ ...p, paidAmount: e.target.value }))}
                      placeholder="0 if unpaid"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preferred Payment Mode</label>
                    <CustomSelect
                      value={demandForm.paymentMode}
                      onChange={val => setDemandForm(p => ({ ...p, paymentMode: typeof val === 'object' && val.target ? val.target.value : val }))}
                      options={PAYMENT_METHODS.map(m => ({
                        value: m.id,
                        label: m.label
                      }))}
                    />
                  </div>
                </div>

                {/* Bank & Ref */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Receiving Bank Escrow Account</label>
                    <input
                      className="form-input"
                      value={demandForm.bankName}
                      onChange={e => setDemandForm(p => ({ ...p, bankName: e.target.value }))}
                      placeholder="e.g. HDFC Bank Project Escrow A/C"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment UTR / Cheque Ref (If Paid)</label>
                    <input
                      className="form-input"
                      value={demandForm.transactionReference}
                      onChange={e => setDemandForm(p => ({ ...p, transactionReference: e.target.value }))}
                      placeholder="e.g. UTR-99881122"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingDemand ? 'Save & Update Demand' : 'Issue Milestone Demand Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
