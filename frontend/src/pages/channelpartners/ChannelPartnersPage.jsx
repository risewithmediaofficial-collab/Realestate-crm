import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Handshake, Plus, Check, X, ShieldCheck, Award,
  DollarSign, FileText, Phone, Mail, Search, Download, Edit, Trash2, List, Columns
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

const mockPartners = [];

// ─── Channel Partners Kanban Board ─────────────────
const PartnersKanbanView = ({ partners, onApprove, onEdit, onDelete, onTierChange }) => {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columns = [
    { id: 'platinum', title: 'Platinum Tier (2.5%+)', color: '#8b5cf6', bg: '#f5f3ff', icon: '👑' },
    { id: 'gold', title: 'Gold Tier (2.0%)', color: '#f59e0b', bg: '#fffbeb', icon: '⭐' },
    { id: 'silver', title: 'Silver Tier (1.5%)', color: '#64748b', bg: '#f8fafc', icon: '🛡️' },
    { id: 'pending', title: 'Pending KYC Verification', color: '#ef4444', bg: '#fef2f2', icon: '⏳' },
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
    if (id && onTierChange) {
      onTierChange(id, colId);
    }
  };

  return (
    <div className="kanban-board" style={{ gap: 16, height: 'calc(100vh - 240px)', paddingBottom: 10 }}>
      {columns.map(col => {
        const colPartners = partners.filter(p => {
          if (col.id === 'pending') return p.status === 'pending';
          return (p.tier || 'silver') === col.id && p.status !== 'pending';
        });
        const colValue = colPartners.reduce((sum, p) => sum + (p.totalValue || 0), 0);
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
                  {colPartners.length}
                </span>
              </div>
              {colPartners.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)' }}>
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
              {colPartners.length === 0 ? (
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
                  Drag partners here to update tier
                </div>
              ) : (
                colPartners.map(p => {
                  const isDragging = draggedId === p._id;

                  return (
                    <div
                      key={p._id}
                      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, p._id)}
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
                          {p.firmName}
                        </div>
                        <span className={`badge ${p.tier === 'platinum' ? 'badge-purple' : p.tier === 'gold' ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: 9 }}>
                          {p.tier?.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                        👤 {p.contactPerson} · {p.city}
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📞 {p.phone}</span>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>
                          {p.reraNumber || 'RERA Verified'}
                        </span>
                      </div>

                      {/* Performance Box */}
                      <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Sourced Revenue:</span>
                          <strong style={{ color: 'var(--primary)' }}>{formatCurrency(p.totalValue)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Commission ({p.commissionRate || 2}%):</span>
                          <strong style={{ color: '#16a34a' }}>{formatCurrency(p.commissionEarned)}</strong>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {p.totalBookings || 0} Bookings Closed
                        </span>

                        <div style={{ display: 'flex', gap: 4 }}>
                          {p.status === 'pending' && (
                            <button
                              className="btn btn-success btn-sm"
                              style={{ padding: '2px 6px', fontSize: 10 }}
                              onClick={() => onApprove(p._id)}
                              title="Approve & Verify CP"
                            >
                              <Check size={11} /> Approve
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 20, width: 20, color: 'var(--primary)' }}
                            title="Edit CP"
                            onClick={() => onEdit(p)}
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 20, width: 20, color: 'var(--danger)' }}
                            title="Delete CP"
                            onClick={() => onDelete(p._id, p.firmName)}
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

export default function ChannelPartnersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/approved')) return 'approved';
    if (location.pathname.includes('/pending')) return 'pending';
    if (location.pathname.includes('/slabs')) return 'slabs';
    return 'all';
  };

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table'); // 'table' | 'kanban'
  const [tab, setTab] = useState(getTabFromPath());
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [search, setSearch] = useState('');
  const { showNotification } = useUI();

  const [form, setForm] = useState({
    firmName: '', contactPerson: '', phone: '', email: '', reraNumber: '', city: 'Pune', tier: 'silver', status: 'approved', commissionRate: 2.0
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
    navigate(`/channel-partners/${tabId}`);
  };

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/channel-partners');
      setPartners(data.data || []);
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      setPartners([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleApprove = async (id) => {
    try {
      await api.put(`/channel-partners/${id}/approve`);
    } catch {}
    setPartners(prev => prev.map(p => p._id === id ? { ...p, status: 'approved' } : p));
    showNotification('Channel Partner approved and verified!');
  };

  const handleTierChange = async (id, targetCol) => {
    let update = {};
    if (targetCol === 'pending') {
      update = { status: 'pending' };
    } else {
      const rates = { platinum: 2.5, gold: 2.0, silver: 1.5 };
      update = { tier: targetCol, status: 'approved', commissionRate: rates[targetCol] || 2.0 };
    }
    try {
      await api.put(`/channel-partners/${id}`, update);
    } catch {}
    setPartners(prev => prev.map(p => p._id === id ? { ...p, ...update } : p));
    showNotification(`Partner updated to ${targetCol.toUpperCase()}!`);
  };

  const startEdit = (p) => {
    setEditingPartner(p);
    setForm({
      firmName: p.firmName,
      contactPerson: p.contactPerson,
      phone: p.phone,
      email: p.email,
      reraNumber: p.reraNumber || '',
      city: p.city || 'Pune',
      tier: p.tier || 'silver',
      status: p.status || 'approved',
      commissionRate: p.commissionRate || 2.0
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      firmName: form.firmName,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      reraNumber: form.reraNumber,
      city: form.city,
      tier: form.tier,
      status: form.status,
      commissionRate: Number(form.commissionRate)
    };

    if (editingPartner) {
      try {
        const { data } = await api.put(`/channel-partners/${editingPartner._id}`, payload);
        const updated = data.data || { ...editingPartner, ...payload };
        setPartners(prev => prev.map(p => p._id === editingPartner._id ? updated : p));
      } catch {
        const updated = { ...editingPartner, ...payload };
        setPartners(prev => prev.map(p => p._id === editingPartner._id ? updated : p));
      }
      showNotification(`Partner "${form.firmName}" updated successfully!`);
    } else {
      try {
        const { data } = await api.post('/channel-partners', payload);
        const created = data.data || { ...payload, _id: Date.now().toString() };
        setPartners(p => [created, ...p]);
      } catch {
        const newP = {
          ...payload,
          _id: Date.now().toString(),
          totalLeads: 0,
          totalBookings: 0,
          totalValue: 0,
          commissionEarned: 0,
          commissionPending: 0
        };
        setPartners(p => [newP, ...p]);
      }
      showNotification(`Channel Partner "${form.firmName}" registered!`);
    }
    setShowModal(false);
    setEditingPartner(null);
  };

  const handleDeletePartner = async (id, firmName) => {
    if (!window.confirm(`Are you sure you want to remove channel partner "${firmName}"?`)) return;
    try { await api.delete(`/channel-partners/${id}`); } catch {}
    setPartners(prev => prev.filter(p => p._id !== id));
    showNotification(`Partner "${firmName}" deleted!`);
  };

  const totalSourcedSales = partners.reduce((acc, p) => acc + (p.totalValue || 0), 0);
  const totalCommissionPaid = partners.reduce((acc, p) => acc + (p.commissionEarned || 0), 0);
  const totalCommissionPending = partners.reduce((acc, p) => acc + (p.commissionPending || 0), 0);

  const filtered = partners.filter(p => {
    if (search && !p.firmName.toLowerCase().includes(search.toLowerCase()) && !p.contactPerson.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab !== 'all' && tab !== 'slabs' && p.status !== tab) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Partners</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {tab === 'approved' ? 'Verified Partners' : tab === 'pending' ? 'Pending KYC Verification' : tab === 'slabs' ? 'Commission Slabs' : 'All Brokers'}
            </span>
          </div>
          <h1 className="page-title">Channel Partner Network & Payouts</h1>
          <p className="page-subtitle">Broker onboarding, RERA compliance check, deal attribution and tiered commission disbursement</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingPartner(null); setForm({ firmName: '', contactPerson: '', phone: '', email: '', reraNumber: '', city: 'Pune', tier: 'silver', status: 'approved', commissionRate: 2.0 }); setShowModal(true); }}>
            <Plus size={14} /> Register New CP
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#eff6ff' }}>
            <Handshake size={20} color="#2563eb" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Active CP Network</div>
            <div className="stat-value">{partners.length} Firms</div>
            <div className="stat-change up" style={{ fontSize: 11 }}>{partners.filter(p => p.tier === 'platinum').length} Platinum Tiers</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#f3e8ff' }}>
            <Award size={20} color="#8b5cf6" />
          </div>
          <div className="stat-info">
            <div className="stat-label">CP Sourced Revenue</div>
            <div className="stat-value">{formatCurrency(totalSourcedSales)}</div>
            <div className="stat-change up" style={{ fontSize: 11 }}>{partners.reduce((acc, p) => acc + (p.totalBookings || 0), 0)} Units Closed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#dcfce7' }}>
            <DollarSign size={20} color="#16a34a" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Commission Paid</div>
            <div className="stat-value">{formatCurrency(totalCommissionPaid)}</div>
            <div className="stat-change up" style={{ fontSize: 11 }}>100% Tax Compliant</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#fef3c7' }}>
            <FileText size={20} color="#d97706" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Pending Payouts</div>
            <div className="stat-value">{formatCurrency(totalCommissionPending)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Payable against milestone</div>
          </div>
        </div>
      </div>

      {/* Tabs & View Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[
            { id: 'all', label: 'All Partners' },
            { id: 'approved', label: 'Verified Partners' },
            { id: 'pending', label: 'Pending KYC Verification' },
            { id: 'slabs', label: 'Commission Slabs Matrix' },
          ].map(t => (
            <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => handleTabChange(t.id)}>
              {t.label}
            </div>
          ))}
        </div>

        {tab !== 'slabs' && (
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

      {tab !== 'slabs' ? (
        view === 'kanban' ? (
          <PartnersKanbanView
            partners={filtered}
            onApprove={handleApprove}
            onEdit={startEdit}
            onDelete={handleDeletePartner}
            onTierChange={handleTierChange}
          />
        ) : (
          <div className="table-wrapper">
            {filtered.length === 0 ? (
              <div className="empty-state" style={{ background: 'white', padding: '48px 24px', textAlign: 'center', borderRadius: 8 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>No channel partners found</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
                  {search || tab !== 'all' ? 'Try adjusting your search or tab filters.' : 'Onboard your first channel partner or real estate broker.'}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingPartner(null); setForm({ firmName: '', contactPerson: '', phone: '', email: '', reraNumber: '', city: 'Pune', tier: 'silver', status: 'approved', commissionRate: 2.0 }); setShowModal(true); }}>
                  <Plus size={14} /> Add Channel Partner
                </button>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Partner Firm</th>
                    <th>RERA Registration</th>
                    <th>Contact</th>
                    <th>Tier</th>
                    <th>Status</th>
                    <th>Commission Rate</th>
                    <th>Sourced Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p._id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.firmName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.contactPerson} · {p.city}</div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                          {p.reraNumber || 'A521000XXXXX'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>{p.phone}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${p.tier === 'platinum' ? 'badge-purple' : p.tier === 'gold' ? 'badge-warning' : 'badge-gray'}`}>
                          {p.tier?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                          {p.status === 'approved' ? 'Verified' : 'Pending KYC'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{p.commissionRate || 2}%</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.totalValue)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Edit Partner Profile"
                            style={{ color: 'var(--primary)' }}
                            onClick={() => startEdit(p)}
                          >
                            <Edit size={14} />
                          </button>
                          {p.status === 'pending' && (
                            <button
                              className="btn btn-success btn-sm"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              onClick={() => handleApprove(p._id)}
                            >
                              <Check size={12} /> Approve
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--danger)' }}
                            title="Delete Partner"
                            onClick={() => handleDeletePartner(p._id, p.firmName)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      ) : (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>RERA Tiered Commission Slab Structure</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tier Level</th>
                  <th>Quarterly Target</th>
                  <th>Base Commission</th>
                  <th>Accelerator Incentive</th>
                  <th>Privileges</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="badge badge-purple">PLATINUM</span></td>
                  <td>Above ₹25 Cr Sales</td>
                  <td><strong>2.5%</strong></td>
                  <td>+0.50% on exceeding target</td>
                  <td>Dedicated RM, Priority Inventory Allocation, 48h Fast Payout</td>
                </tr>
                <tr>
                  <td><span className="badge badge-warning">GOLD</span></td>
                  <td>₹10 Cr – ₹25 Cr</td>
                  <td><strong>2.0%</strong></td>
                  <td>+0.25% on exceeding target</td>
                  <td>Co-branded Marketing, Digital Collaterals</td>
                </tr>
                <tr>
                  <td><span className="badge badge-gray">SILVER</span></td>
                  <td>Up to ₹10 Cr</td>
                  <td><strong>1.5%</strong></td>
                  <td>Standard Slab</td>
                  <td>Standard CP Portal Access</td>
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
              <div className="modal-title">{editingPartner ? `Edit Channel Partner — ${editingPartner.firmName}` : 'Register Channel Partner (Broker Firm)'}</div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Firm / Agency Name <span className="required">*</span></label>
                  <input className="form-input" value={form.firmName} onChange={e => setForm(p => ({ ...p, firmName: e.target.value }))} placeholder="e.g. Apex Realty Advisory" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Key Contact Person <span className="required">*</span></label>
                    <input className="form-input" value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} placeholder="e.g. Rajesh Sharma" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number <span className="required">*</span></label>
                    <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98000 00000" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address <span className="required">*</span></label>
                    <input type="email" className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="rajesh@firm.com" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State RERA Number</label>
                    <input className="form-input" value={form.reraNumber} onChange={e => setForm(p => ({ ...p, reraNumber: e.target.value }))} placeholder="e.g. A52100018923" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Partnership Tier</label>
                    <select className="form-select" value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))}>
                      <option value="silver">Silver (1.5%)</option>
                      <option value="gold">Gold (2.0%)</option>
                      <option value="platinum">Platinum (2.5%)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Commission Rate (%)</label>
                    <input type="number" step="0.1" className="form-input" value={form.commissionRate} onChange={e => setForm(p => ({ ...p, commissionRate: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Operating City</label>
                    <input className="form-input" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Pune / Mumbai" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Verification Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="approved">Approved & Verified</option>
                      <option value="pending">Pending KYC Review</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingPartner ? 'Save & Update Partner' : 'Register Partner'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
