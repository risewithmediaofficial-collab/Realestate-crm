import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Home, Calendar, CreditCard, Download, FileText,
  CheckCircle, Clock, ShieldCheck, AlertCircle, MessageSquare, Send, Building2, Plus
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function CustomerPortalPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview'); // 'overview' | 'payments' | 'documents' | 'support'
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerBooking = async () => {
      try {
        const { data } = await api.get('/bookings');
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const b = data.data[0];
          setActiveBooking({
            name: b.customerName,
            phone: b.customerPhone,
            email: b.customerEmail || '—',
            bookingId: b.bookingNumber || `BK-${b._id?.slice(-4)}`,
            unit: b.unit?.unitNumber ? `Unit ${b.unit.unitNumber}` : 'Allocated Unit',
            type: b.unit?.type || 'Residential Apartment',
            area: b.unit?.area?.superBuiltUp ? `${b.unit.area.superBuiltUp} sq.ft (Super Built-up)` : 'Standard Layout',
            project: b.project?.name || 'Assigned Project',
            possessionDate: 'As per RERA schedule',
            totalValue: b.totalAmount || 0,
            paidAmount: b.tokenAmount || 0,
            dueAmount: Math.max(0, (b.totalAmount || 0) - (b.tokenAmount || 0)),
            constructionProgress: 25,
          });
        } else {
          setActiveBooking(null);
        }
      } catch (err) {
        setActiveBooking(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerBooking();
  }, []);

  const handleTicket = (e) => {
    e.preventDefault();
    setTicketSent(true);
    setTicketMessage('');
    setTimeout(() => setTicketSent(false), 4000);
  };

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" style={{ width: 36, height: 36 }} /></div>;
  }

  if (!activeBooking) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <div className="breadcrumb">
              <span>Customer Experience</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Buyer Portal</span>
            </div>
            <h1 className="page-title">Customer Self-Service Hub</h1>
            <p className="page-subtitle">Buyer digital portal for milestone tracking, receipts and registered deeds</p>
          </div>
        </div>

        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 640, margin: '40px auto' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏡</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>No Active Buyer Booking Found</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Once a customer booking application is submitted and approved in the <strong>Bookings & Agreements</strong> module, the buyer self-service dashboard with live construction milestones, payments ledger, and RERA allotment letters will be available here.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/booking/all')}>
            <Plus size={14} /> Go to Bookings Module
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Customer Experience</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Buyer Portal</span>
          </div>
          <h1 className="page-title">Customer Self-Service Hub</h1>
          <p className="page-subtitle">Welcome back, {activeBooking.name}! View live construction milestones, payments & download deeds</p>
        </div>
      </div>

      {/* Property Hero Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', color: 'white', padding: '28px 32px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <span className="badge badge-success" style={{ marginBottom: 8, display: 'inline-block' }}>Booking Confirmed & Verified</span>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{activeBooking.unit}</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{activeBooking.type} • {activeBooking.area}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>📍 {activeBooking.project}</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Expected Handover Date</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{activeBooking.possessionDate}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Booking Ref: {activeBooking.bookingId}</div>
          </div>
        </div>

        {/* Construction progress */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
            <span>Project Construction Progress</span>
            <strong style={{ color: '#38bdf8' }}>{activeBooking.constructionProgress}% Completed</strong>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${activeBooking.constructionProgress}%`, background: 'linear-gradient(90deg, #38bdf8, #10b981)', borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'overview', label: 'Payment Ledger & Milestones' },
          { id: 'documents', label: 'Signed Deeds & Documents' },
          { id: 'support', label: 'Customer Support & Snag Tickets' },
        ].map(t => (
          <div
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          {/* Summary Row */}
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-info">
                <div className="stat-label">Total Agreement Value</div>
                <div className="stat-value">{formatCurrency(activeBooking.totalValue)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <div className="stat-label">Total Amount Paid</div>
                <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(activeBooking.paidAmount)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <div className="stat-label">Current Demand Due</div>
                <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(activeBooking.dueAmount)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 8, border: '1px solid var(--card-border)' }}>
          <FileText size={36} color="var(--primary)" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Allotment Letters & Agreements</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Documents generated for this booking will appear here for download.</p>
        </div>
      )}

      {tab === 'support' && (
        <div className="card" style={{ padding: 28, maxWidth: 700 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Submit Customer Query / Snag Rectification Request</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Relationship Manager is available Mon–Sat 9am–7pm</div>

          {ticketSent && (
            <div style={{ background: 'var(--success-light)', color: '#166534', padding: '10px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} /> Ticket created! Your CRM manager will contact you within 24 hours.
            </div>
          )}

          <form onSubmit={handleTicket}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select">
                <option>Payment & Receipt Clarification</option>
                <option>Home Loan Disbursement Assistance</option>
                <option>Possession & Site Inspection Request</option>
                <option>Modification / Snag List Report</option>
                <option>Other Services</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Message / Details</label>
              <textarea
                className="form-input"
                style={{ height: 120, resize: 'vertical' }}
                value={ticketMessage}
                onChange={e => setTicketMessage(e.target.value)}
                placeholder="Describe your request or query in detail..."
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <Send size={14} /> Submit Service Ticket
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
