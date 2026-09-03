import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, Plus, Search, Filter, Phone, MessageSquare,
  Building, MapPin, DollarSign, Calendar, CheckCircle2,
  Clock, ArrowRight, User, Eye, Edit3, Trash2, Download,
  Layers, Compass, Droplet, Shield, RefreshCw, X, ChevronDown,
  CheckSquare, FileText, UserCheck, Flame
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/ui/CustomSelect';
import { formatCurrency, formatDate, timeAgo, getInitials } from '../../utils/formatters';

const REQUIREMENT_STATUSES = {
  new_inquiry: { label: 'New Demand', color: 'badge-new', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  sourcing_in_progress: { label: 'Sourcing Lands', color: 'badge-warning', bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  properties_shortlisted: { label: 'Shortlisted Plots', color: 'badge-purple', bg: '#f3e8ff', border: '#e9d5ff', text: '#6b21a8' },
  site_visit_arranged: { label: 'Site Visit Booked', color: 'badge-info', bg: '#e0f2fe', border: '#bae6fd', text: '#0369a1' },
  in_negotiation: { label: 'In Negotiation', color: 'badge-orange', bg: '#ffedd5', border: '#fed7aa', text: '#c2410c' },
  deal_closed: { label: 'Deal Won & Closed', color: 'badge-success', bg: '#dcfce7', border: '#bbf7d0', text: '#15803d' },
  dropped: { label: 'Dropped / Not Feasible', color: 'badge-gray', bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' }
};

const PROPERTY_CATEGORIES = {
  farmland: { label: '🌳 Managed Farmlands', icon: '🌳' },
  agricultural_land: { label: '🌾 Raw Agricultural Land', icon: '🌾' },
  residential_plot: { label: '📐 Residential Gated Plot', icon: '📐' },
  commercial_land: { label: '🏬 Commercial / Highway Land', icon: '🏬' },
  villa_farmhouse: { label: '🏡 Farmhouse / Estate Villa', icon: '🏡' },
  industrial_warehouse: { label: '🏭 Industrial / Logistics Land', icon: '🏭' },
  resort_plot: { label: '🏖️ Resort / Hill View Plot', icon: '🏖️' },
  other: { label: '✨ Custom Special Request', icon: '✨' }
};

const SOIL_TYPES = {
  red_soil: { label: 'Fertile Red Soil', icon: '🔴' },
  black_cotton: { label: 'Black Cotton Soil', icon: '⚫' },
  alluvial_loam: { label: 'Rich Alluvial Loam', icon: '🌾' },
  sandy_loam: { label: 'Sandy Loam', icon: '🏖️' },
  any: { label: 'Any Soil Type', icon: '🌱' }
};

export default function BuyerRequirementsPage() {
  const { user } = useAuth();
  const { showNotification } = useUI();

  const [requirements, setRequirements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Filters & State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [view, setView] = useState('kanban'); // 'kanban' | 'table'

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [matchingModalItem, setMatchingModalItem] = useState(null);
  const [matchedUnits, setMatchedUnits] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Form State
  const initialForm = {
    customerName: '',
    phone: '',
    email: '',
    city: '',
    category: 'farmland',
    purpose: 'weekend_farmhouse',
    preferredLocations: '',
    preferredSoil: 'red_soil',
    waterSourceRequired: 'borewell',
    minRoadWidth: '30',
    facingPreference: 'any',
    minExtent: '',
    maxExtent: '',
    extentUnit: 'Acres',
    budgetMin: '',
    budgetMax: '',
    fundingSource: 'self_funded_cash',
    purchaseTimeline: 'within_1_month',
    priority: 'hot',
    assignedTo: user?._id || '',
    notes: ''
  };
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchRequirements = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [resReq, resStats, resUsers, resLeads] = await Promise.all([
        api.get('/buyer-requirements', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/buyer-requirements/stats').catch(() => ({ data: { data: null } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get('/leads?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);

      setRequirements(resReq.data?.data || []);
      setStats(resStats.data?.data || null);
      setUsersList(resUsers.data?.data || resUsers.data || []);
      setLeadsList(resLeads.data?.data || resLeads.data || []);
    } catch (err) {
      console.error('Failed to fetch buyer requirements:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, priorityFilter]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  const availableLocations = useMemo(() => {
    const defaultZones = [
      'Kanakapura Road',
      'Sarjapur Road',
      'Devanahalli / Airport Belt',
      'Shankarpally Highway',
      'Mysore Road / Bidadi',
      'Chikkaballapur',
      'Hosur / Denkanikottai',
      'Mulshi / Pune Belt',
      'Bangalore South',
      'Bangalore North',
      'Hyderabad Outskirts',
      'Pune Outskirts'
    ];
    const extracted = new Set(defaultZones);
    (requirements || []).forEach(r => {
      (r.preferredLocations || []).forEach(l => l && extracted.add(l.trim()));
      if (r.city) extracted.add(r.city.trim());
    });
    return Array.from(extracted).filter(Boolean);
  }, [requirements]);

  const displayRequirements = useMemo(() => {
    return requirements.filter(r => {
      if (locationFilter) {
        const matchesLoc = (r.preferredLocations || []).some(l => l.toLowerCase().includes(locationFilter.toLowerCase())) ||
                           (r.city && r.city.toLowerCase().includes(locationFilter.toLowerCase()));
        if (!matchesLoc) return false;
      }
      return true;
    });
  }, [requirements, locationFilter]);

  const handleSelectLead = (leadId) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;
    const selected = leadsList.find(l => l._id === leadId);
    if (selected) {
      setForm(prev => ({
        ...prev,
        customerName: selected.name || prev.customerName,
        phone: selected.phone || prev.phone,
        email: selected.email || prev.email,
        city: selected.city || prev.city,
        budgetMin: selected.budget?.min || prev.budgetMin,
        budgetMax: selected.budget?.max || prev.budgetMax,
        notes: selected.notes ? (prev.notes ? `${prev.notes}\n${selected.notes}` : selected.notes) : prev.notes,
        assignedTo: selected.assignedTo?._id || selected.assignedTo || prev.assignedTo
      }));
      setFormErrors(prev => ({
        ...prev,
        customerName: undefined,
        phone: undefined,
        budgetMax: undefined
      }));
      showNotification(`✨ Autofilled prospect details from lead: ${selected.name}`);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setSelectedLeadId('');
    setForm(initialForm);
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      customerName: item.customerName || '',
      phone: item.phone || '',
      email: item.email || '',
      city: item.city || '',
      category: item.category || 'farmland',
      purpose: item.purpose || 'weekend_farmhouse',
      preferredLocations: Array.isArray(item.preferredLocations) ? item.preferredLocations.join(', ') : (item.preferredLocations || ''),
      preferredSoil: item.preferredSoil || 'red_soil',
      waterSourceRequired: item.waterSourceRequired || 'borewell',
      minRoadWidth: item.minRoadWidth || '30',
      facingPreference: item.facingPreference || 'any',
      minExtent: item.minExtent || '',
      maxExtent: item.maxExtent || '',
      extentUnit: item.extentUnit || 'Acres',
      budgetMin: item.budgetMin || '',
      budgetMax: item.budgetMax || '',
      fundingSource: item.fundingSource || 'self_funded_cash',
      purchaseTimeline: item.purchaseTimeline || 'within_1_month',
      priority: item.priority || 'hot',
      assignedTo: item.assignedTo?._id || item.assignedTo || '',
      notes: item.notes || ''
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleSaveRequirement = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.customerName.trim()) errors.customerName = 'Customer name is required';
    if (!form.phone.trim()) errors.phone = 'Phone number is required';
    if (!form.budgetMax) errors.budgetMax = 'Maximum budget is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    const locArray = form.preferredLocations.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      ...form,
      preferredLocations: locArray,
      minExtent: Number(form.minExtent) || 0,
      maxExtent: Number(form.maxExtent) || 0,
      minRoadWidth: Number(form.minRoadWidth) || 30,
      budgetMin: Number(form.budgetMin) || 0,
      budgetMax: Number(form.budgetMax) || 0
    };

    try {
      if (editingItem) {
        const { data } = await api.put(`/buyer-requirements/${editingItem._id}`, payload);
        setRequirements(prev => prev.map(r => r._id === editingItem._id ? data.data : r));
        showNotification(`✅ Buyer requirement for ${form.customerName} updated!`);
      } else {
        const { data } = await api.post('/buyer-requirements', payload);
        setRequirements(prev => [data.data, ...prev]);
        showNotification(`🎯 Custom requirement for ${form.customerName} recorded!`);
      }
      setShowCreateModal(false);
      fetchRequirements();
    } catch (err) {
      console.error('Save requirement error:', err);
      showNotification(`Failed to save: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (reqId, newStatus) => {
    const item = requirements.find(r => r._id === reqId);
    if (!item || item.status === newStatus) return;

    const oldLabel = REQUIREMENT_STATUSES[item.status]?.label || item.status;
    const newLabel = REQUIREMENT_STATUSES[newStatus]?.label || newStatus;

    setRequirements(prev => prev.map(r => r._id === reqId ? { ...r, status: newStatus } : r));
    if (selectedItem?._id === reqId) setSelectedItem(prev => ({ ...prev, status: newStatus }));

    try {
      await api.put(`/buyer-requirements/${reqId}`, { status: newStatus });
      showNotification(`Requirement for "${item.customerName}" moved to ${newLabel}!`);
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleQuickAssign = async (reqId, newUserId) => {
    const targetUser = usersList.find(u => u._id === newUserId);
    setRequirements(prev => prev.map(r => r._id === reqId ? {
      ...r,
      assignedTo: targetUser ? { _id: targetUser._id, name: targetUser.name, avatar: targetUser.avatar, role: targetUser.role } : null
    } : r));

    try {
      await api.put(`/buyer-requirements/${reqId}`, { assignedTo: newUserId || null });
      showNotification(`Assigned to ${targetUser ? targetUser.name : 'Unassigned'}!`);
    } catch (err) {
      console.error('Assign error:', err);
    }
  };

  const handleDelete = async (reqId, name) => {
    if (!window.confirm(`Delete buyer requirement for "${name}"?`)) return;
    try {
      await api.delete(`/buyer-requirements/${reqId}`);
      setRequirements(prev => prev.filter(r => r._id !== reqId));
      if (selectedItem?._id === reqId) setSelectedItem(null);
      showNotification(`Requirement for "${name}" deleted.`);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleOpenMatching = async (item) => {
    setMatchingModalItem(item);
    setMatchedUnits([]);
    setLoadingMatches(true);
    try {
      const { data } = await api.get(`/buyer-requirements/${item._id}/match-inventory`);
      setMatchedUnits(data.data || []);
    } catch (err) {
      console.error('Failed to match inventory:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleExportCSV = () => {
    if (!requirements.length) return;
    const headers = ['Customer Name', 'Phone', 'Email', 'Category', 'Purpose', 'Locations', 'Min Extent', 'Max Extent', 'Unit', 'Budget Max', 'Soil', 'Status', 'Priority', 'Assigned To'];
    const rows = requirements.map(r => [
      `"${r.customerName || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.category || ''}"`,
      `"${r.purpose || ''}"`,
      `"${(r.preferredLocations || []).join(', ')}"`,
      r.minExtent || 0,
      r.maxExtent || 0,
      r.extentUnit || 'Acres',
      r.budgetMax || 0,
      r.preferredSoil || '',
      r.status || '',
      r.priority || '',
      `"${r.assignedTo?.name || 'Unassigned'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Buyer_Requirements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Exported Buyer Requirements Register CSV!');
  };

  return (
    <div style={{ padding: '0 4px 40px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Sales & Sourcing</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Custom Buyer Inquiries</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="var(--primary)" />
            </div>
            <div>
              <h1 className="page-title">Custom Buyer Requirements Dashboard</h1>
              <p className="page-subtitle">Capture bespoke customer demands, manage land sourcing pipelines & match with CRM inventory</p>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenCreate} style={{ gap: 6 }}>
            <Plus size={15} /> Record Custom Requirement
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
        <div className="card" style={{ padding: 16, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL BUYER DEMANDS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats?.totalRequirements || requirements.length}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Bespoke inquiries recorded</div>
        </div>
        <div className="card" style={{ padding: 16, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#c2410c', marginBottom: 4 }}>🔥 HOT BUYERS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#ea580c' }}>{stats?.hotBuyers || requirements.filter(r => r.priority === 'hot').length}</div>
          <div style={{ fontSize: 11, color: '#9a3412', marginTop: 4 }}>Immediate purchase timeline</div>
        </div>
        <div className="card" style={{ padding: 16, background: '#fefce8', border: '1px solid #fef08a', borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#a16207', marginBottom: 4 }}>🔍 SOURCING ACTIVE</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#ca8a04' }}>{stats?.sourcingInProgress || requirements.filter(r => r.status === 'sourcing_in_progress').length}</div>
          <div style={{ fontSize: 11, color: '#854d0e', marginTop: 4 }}>Lands currently being evaluated</div>
        </div>
        <div className="card" style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>🤝 NEGOTIATIONS / VISITS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{stats?.activeNegotiations || requirements.filter(r => ['properties_shortlisted', 'site_visit_arranged', 'in_negotiation'].includes(r.status)).length}</div>
          <div style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>High probability deals</div>
        </div>
        <div className="card" style={{ padding: 16, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>💰 TOTAL BUDGET POOL</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0284c7' }}>
            {formatCurrency(stats?.totalBudgetPool || requirements.reduce((acc, r) => acc + (r.budgetMax || 0), 0))}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Combined buyer investment pool</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-search" style={{ flex: 1.5 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            placeholder="Search buyer name, phone, email, preferred location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <CustomSelect
          variant="filter"
          value={locationFilter}
          onChange={val => setLocationFilter(val)}
          searchable={true}
          placeholder="📍 All Locations & Zones"
          options={[
            { value: '', label: '📍 All Locations & Zones', icon: '📍' },
            ...availableLocations.map(loc => ({ value: loc, label: loc, icon: '📍' }))
          ]}
        />

        <CustomSelect
          variant="filter"
          value={categoryFilter}
          onChange={val => setCategoryFilter(val)}
          options={[
            { value: '', label: 'All Property Types', icon: '📂' },
            ...Object.entries(PROPERTY_CATEGORIES).map(([k, v]) => ({ value: k, label: v.label, icon: v.icon }))
          ]}
        />

        <CustomSelect
          variant="filter"
          value={statusFilter}
          onChange={val => setStatusFilter(val)}
          options={[
            { value: '', label: 'All Sourcing Stages', icon: '📊' },
            ...Object.entries(REQUIREMENT_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))
          ]}
        />

        <CustomSelect
          variant="filter"
          value={priorityFilter}
          onChange={val => setPriorityFilter(val)}
          options={[
            { value: '', label: 'All Buyer Priorities' },
            { value: 'hot', label: '🔥 Hot Priority' },
            { value: 'warm', label: '⚡ Warm Priority' },
            { value: 'cold', label: '❄️ Cold Priority' }
          ]}
        />

        {/* View Switcher */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: 12, height: 30 }}
            onClick={() => setView('kanban')}
          >
            Pipeline Board
          </button>
          <button
            type="button"
            className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: 12, height: 30 }}
            onClick={() => setView('table')}
          >
            Detailed Ledger
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading Custom Buyer Inquiries...</div>
        </div>
      ) : displayRequirements.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 14 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Sparkles size={26} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No Custom Buyer Demands Found</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 18px' }}>
            {locationFilter ? `No active buyer inquiries found matching location "${locationFilter}".` : 'When a prospective client is not interested in standard projects and requests custom farmland, acreages, or specific land parameters, record their requirements here.'}
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={15} /> Record Custom Demand
          </button>
        </div>
      ) : view === 'kanban' ? (
        /* KANBAN BOARD */
        <div className="kanban-board">
          {Object.entries(REQUIREMENT_STATUSES).map(([stageKey, stageConf]) => {
            const stageItems = displayRequirements.filter(r => r.status === stageKey);
            return (
              <div key={stageKey} className="kanban-column">
                <div className="kanban-col-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="kanban-col-title" style={{ color: stageConf.text }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: stageConf.text, flexShrink: 0 }} />
                    {stageConf.label}
                  </div>
                  <span className="kanban-col-count" style={{ background: stageConf.bg, color: stageConf.text, border: `1px solid ${stageConf.border}` }}>
                    {stageItems.length}
                  </span>
                </div>

                <div className="kanban-col-body" style={{ minHeight: 300 }}>
                  {stageItems.map(item => (
                    <div
                      key={item._id}
                      className="kanban-card"
                      style={{
                        padding: 14,
                        marginBottom: 10,
                        borderLeft: item.priority === 'hot' ? '3.5px solid #ef4444' : '3.5px solid var(--primary)',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>{item.customerName}</div>
                        <span className={`badge ${item.priority === 'hot' ? 'badge-hot' : item.priority === 'warm' ? 'badge-warm' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                          {item.priority === 'hot' ? '🔥 HOT' : item.priority.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {PROPERTY_CATEGORIES[item.category]?.icon} {PROPERTY_CATEGORIES[item.category]?.label || item.category}
                      </div>

                      {/* Extent & Budget Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                          📐 {item.minExtent || 0} - {item.maxExtent || 0} {item.extentUnit || 'Acres'}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                          💰 Max: {formatCurrency(item.budgetMax)}
                        </span>
                      </div>

                      {/* Locations */}
                      {item.preferredLocations?.length > 0 && (
                        <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                          <MapPin size={12} color="var(--primary)" />
                          <span className="truncate">{item.preferredLocations.join(', ')}</span>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="avatar avatar-sm" style={{ width: 22, height: 22, fontSize: 9 }}>
                            {getInitials(item.assignedTo?.name || 'Admin')}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.assignedTo?.name?.split(' ')[0] || 'Unassigned'}</span>
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: '3px 8px', height: 24, gap: 4, background: '#f8fafc' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMatching(item);
                          }}
                          title="Match against active CRM Inventory"
                        >
                          <Sparkles size={11} color="var(--primary)" /> Match
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Category / Purpose</th>
                <th>Desired Land Extent</th>
                <th>Budget Limit (₹)</th>
                <th>Preferred Zones / Soil</th>
                <th>Sourcing Status</th>
                <th>Assigned Rep</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRequirements.map(item => (
                <tr key={item._id} onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{item.customerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.phone} · {item.city || '—'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{PROPERTY_CATEGORIES[item.category]?.label || item.category}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.purpose?.replace(/_/g, ' ')}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: '#166534' }}>
                      {item.minExtent || 0} - {item.maxExtent || 0} {item.extentUnit || 'Acres'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#0284c7' }}>{formatCurrency(item.budgetMax)}</div>
                    {item.budgetMin > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Min: {formatCurrency(item.budgetMin)}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: 11.5, fontWeight: 600 }}>{item.preferredLocations?.join(', ') || 'Any Area'}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>🌱 {SOIL_TYPES[item.preferredSoil]?.label || item.preferredSoil}</div>
                  </td>
                  <td onClick={e => e.stopPropagation()} style={{ minWidth: 160 }}>
                    <CustomSelect
                      value={item.status}
                      onChange={val => handleStatusChange(item._id, val)}
                      options={Object.entries(REQUIREMENT_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))}
                    />
                  </td>
                  <td onClick={e => e.stopPropagation()} style={{ minWidth: 150 }}>
                    <CustomSelect
                      value={item.assignedTo?._id || item.assignedTo || ''}
                      onChange={val => handleQuickAssign(item._id, val)}
                      placeholder="Assign Rep..."
                      options={[
                        { value: '', label: '👤 Unassigned' },
                        ...usersList.map(u => ({ value: u._id, label: u.name, subtext: u.role?.replace(/_/g, ' ') }))
                      ]}
                    />
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Match CRM Inventory"
                        style={{ color: 'var(--primary)' }}
                        onClick={() => handleOpenMatching(item)}
                      >
                        <Sparkles size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Edit Requirement"
                        style={{ color: '#0284c7' }}
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Delete Requirement"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(item._id, item.customerName)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color="var(--primary)" />
                </div>
                <div>
                  <div className="modal-title">{editingItem ? 'Edit Buyer Requirement' : 'Record Custom Buyer Requirement'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Capture client-specific land parameters, soil, budget & location</div>
                </div>
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowCreateModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveRequirement}>
              <div className="modal-body" style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
                {/* 1. Client Identity */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 12.5, color: '#1e293b' }}>1. PROSPECT DETAILS</div>
                  {leadsList.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                      ⚡ Select lead to auto-fill or type below
                    </span>
                  )}
                </div>

                {/* Lead Dropdown Select */}
                {leadsList.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <CustomSelect
                      label="Select from Existing CRM Leads"
                      value={selectedLeadId}
                      onChange={val => handleSelectLead(val)}
                      searchable={true}
                      placeholder="-- Search & select from CRM Leads database... --"
                      options={[
                        { value: '', label: '✍️ Enter New Prospect Details Manually', icon: '✍️' },
                        ...leadsList.map(l => ({
                          value: l._id,
                          label: `${l.name} (${l.phone || 'No Phone'})`,
                          subtext: `${l.interestedProject?.name || l.city || 'Lead'} · ${l.stage || 'new'}`,
                          icon: '👤'
                        }))
                      ]}
                    />
                  </div>
                )}

                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Client Full Name <span className="required">*</span></label>
                    <input
                      className={`form-input ${formErrors.customerName ? 'input-error' : ''}`}
                      value={form.customerName}
                      onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                      placeholder="e.g. Anand Mahindra / Dr. Rajesh"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Mobile Number <span className="required">*</span></label>
                    <input
                      className={`form-input ${formErrors.phone ? 'input-error' : ''}`}
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="e.g. +91 9876543210"
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Email Address</label>
                    <input
                      className="form-input"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="e.g. buyer@gmail.com"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Current Residence City</label>
                    <input
                      className="form-input"
                      value={form.city}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                      placeholder="e.g. Bangalore / Hyderabad / Pune"
                    />
                  </div>
                </div>

                {/* 2. Property Category & Purpose */}
                <div style={{ fontWeight: 800, fontSize: 12.5, color: '#1e293b', marginBottom: 10 }}>2. DESIRED PROPERTY PARAMETERS</div>
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div>
                    <CustomSelect
                      label="Looking For Category"
                      value={form.category}
                      onChange={val => setForm(p => ({ ...p, category: val }))}
                      options={Object.entries(PROPERTY_CATEGORIES).map(([k, v]) => ({ value: k, label: v.label, icon: v.icon }))}
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label="Intended Land Purpose"
                      value={form.purpose}
                      onChange={val => setForm(p => ({ ...p, purpose: val }))}
                      options={[
                        { value: 'weekend_farmhouse', label: '🏡 Weekend Farmhouse & Retreat' },
                        { value: 'long_term_investment', label: '📈 Long-Term Capital Appreciation' },
                        { value: 'organic_farming', label: '🌾 Organic Farming & Plantation' },
                        { value: 'commercial_development', label: '🏬 Commercial / Highway Venture' },
                        { value: 'self_construction', label: '🔨 Self Construction Villa / Estate' },
                        { value: 'other', label: '✨ Other Custom Use' }
                      ]}
                    />
                  </div>
                </div>

                {/* Land Extent */}
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Min Land Extent</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={form.minExtent}
                      onChange={e => setForm(p => ({ ...p, minExtent: e.target.value }))}
                      placeholder="e.g. 0.5, 1"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Max Land Extent</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={form.maxExtent}
                      onChange={e => setForm(p => ({ ...p, maxExtent: e.target.value }))}
                      placeholder="e.g. 2.5, 5"
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label="Measurement Unit"
                      value={form.extentUnit}
                      onChange={val => setForm(p => ({ ...p, extentUnit: val }))}
                      options={[
                        { value: 'Acres', label: 'Acres' },
                        { value: 'Gunthas', label: 'Gunthas' },
                        { value: 'Cents', label: 'Cents' },
                        { value: 'Sq.Yards', label: 'Sq.Yards' },
                        { value: 'Sq.Ft', label: 'Sq.Ft' },
                        { value: 'Bighas', label: 'Bighas' }
                      ]}
                    />
                  </div>
                </div>

                {/* 3. Soil, Water, Location */}
                <div style={{ fontWeight: 800, fontSize: 12.5, color: '#1e293b', marginBottom: 10 }}>3. LOCATION & CHARACTERISTICS</div>
                
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div>
                    <CustomSelect
                      label="Select Target Location Preset"
                      searchable={true}
                      placeholder="-- Pick Target Zone / Highway --"
                      value=""
                      onChange={val => {
                        if (!val) return;
                        const current = form.preferredLocations.split(',').map(s => s.trim()).filter(Boolean);
                        if (!current.includes(val)) {
                          const updated = current.length ? `${form.preferredLocations}, ${val}` : val;
                          setForm(p => ({ ...p, preferredLocations: updated }));
                        }
                      }}
                      options={[
                        { value: '', label: '📍 Select Target Zone Preset...', icon: '📍' },
                        ...availableLocations.map(loc => ({ value: loc, label: loc, icon: '📍' }))
                      ]}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Custom Preferred Locations (comma separated)</label>
                    <input
                      className="form-input"
                      value={form.preferredLocations}
                      onChange={e => setForm(p => ({ ...p, preferredLocations: e.target.value }))}
                      placeholder="e.g. Kanakapura Road, Sarjapur, Shankarpally Highway, Mulshi"
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div>
                    <CustomSelect
                      label="Preferred Soil Type"
                      value={form.preferredSoil}
                      onChange={val => setForm(p => ({ ...p, preferredSoil: val }))}
                      options={Object.entries(SOIL_TYPES).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))}
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label="Water Source Requirement"
                      value={form.waterSourceRequired}
                      onChange={val => setForm(p => ({ ...p, waterSourceRequired: val }))}
                      options={[
                        { value: 'borewell', label: '💧 Borewell Yield Required' },
                        { value: 'open_well', label: '🌊 Open Well / Canal Nearby' },
                        { value: 'lake_proximity', label: '🏞️ Lake Proximity' },
                        { value: 'any', label: '🌱 Any Suitable Source' }
                      ]}
                    />
                  </div>
                </div>

                {/* 4. Budget & Timeline */}
                <div style={{ fontWeight: 800, fontSize: 12.5, color: '#1e293b', marginBottom: 10 }}>4. FINANCIALS & TIMELINE</div>
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Min Budget (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.budgetMin}
                      onChange={e => setForm(p => ({ ...p, budgetMin: e.target.value }))}
                      placeholder="e.g. 2500000"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Max Budget (₹) <span className="required">*</span></label>
                    <input
                      type="number"
                      className={`form-input ${formErrors.budgetMax ? 'input-error' : ''}`}
                      value={form.budgetMax}
                      onChange={e => setForm(p => ({ ...p, budgetMax: e.target.value }))}
                      placeholder="e.g. 7500000"
                      required
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label="Buyer Temperature"
                      value={form.priority}
                      onChange={val => setForm(p => ({ ...p, priority: val }))}
                      options={[
                        { value: 'hot', label: '🔥 Hot (Ready Buyer)' },
                        { value: 'warm', label: '⚡ Warm (1-3 Mo)' },
                        { value: 'cold', label: '❄️ Cold (Exploring)' }
                      ]}
                    />
                  </div>
                </div>

                {/* Discussion Notes */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>Spoken Discussion Notes & Criteria</label>
                  <textarea
                    className="form-input"
                    style={{ height: 60, resize: 'none' }}
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Specific requests, vastu preferences, fencing requirement, payment schedule..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Update Requirement' : 'Save Custom Demand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MATCHING INVENTORY MODAL */}
      {matchingModalItem && (
        <div className="modal-overlay" onClick={() => setMatchingModalItem(null)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color="#d97706" />
                </div>
                <div>
                  <div className="modal-title">Matching CRM Inventory for {matchingModalItem.customerName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Budget: Max {formatCurrency(matchingModalItem.budgetMax)} · Extent: {matchingModalItem.minExtent || 0} - {matchingModalItem.maxExtent || 0} {matchingModalItem.extentUnit}
                  </div>
                </div>
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setMatchingModalItem(null)}><X size={16} /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: 'calc(75vh - 100px)', overflowY: 'auto' }}>
              {loadingMatches ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Scanning active CRM plots and land inventory...</div>
                </div>
              ) : matchedUnits.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>No Direct Matched Inventory Found</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 400, margin: '4px auto 0' }}>
                    No active unsold units match this exact budget and extent. Keep this inquiry in <strong>Sourcing Lands</strong> stage while your land team evaluates new parcels.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                    🎯 Found {matchedUnits.length} Available CRM Units Matching Budget & Criteria:
                  </div>
                  {matchedUnits.map(unit => (
                    <div
                      key={unit._id}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                          {unit.unitNumber} ({unit.type})
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          📍 {unit.project?.name || 'Active Project'} · {unit.project?.city || ''}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#f0fdf4', color: '#15803d' }}>
                            📐 {unit.area?.extent || 0} {unit.area?.unit || 'Acres'} ({unit.area?.sqft?.toLocaleString() || 0} sq.ft)
                          </span>
                          {unit.agriculturalDetails?.treesCount > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#ecfdf5', color: '#065f46' }}>
                              🌳 {unit.agriculturalDetails.treesCount} Trees ({unit.agriculturalDetails.treesType || 'Plantation'})
                            </span>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#eff6ff', color: '#1e40af' }}>
                            💰 {formatCurrency(unit.pricing?.totalPrice || unit.totalPrice || 0)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: 11.5, padding: '6px 12px', whiteSpace: 'nowrap' }}
                        onClick={() => {
                          showNotification(`✅ Shortlisted Unit ${unit.unitNumber} for ${matchingModalItem.customerName}!`);
                          setMatchingModalItem(null);
                        }}
                      >
                        Shortlist Unit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setMatchingModalItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {selectedItem && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedItem(null)} />
          <div className="drawer" style={{ width: 480, maxWidth: '92vw' }}>
            <div className="drawer-header">
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedItem.customerName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selectedItem.phone} · {selectedItem.city || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { handleOpenEdit(selectedItem); setSelectedItem(null); }}>
                  <Edit3 size={13} /> Edit
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedItem(null)}><X size={16} /></button>
              </div>
            </div>

            <div className="drawer-body">
              {/* Status Header */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span className={`badge ${REQUIREMENT_STATUSES[selectedItem.status]?.color || 'badge-gray'}`}>
                  {REQUIREMENT_STATUSES[selectedItem.status]?.label || selectedItem.status}
                </span>
                <span className={`badge ${selectedItem.priority === 'hot' ? 'badge-hot' : 'badge-warm'}`}>
                  {selectedItem.priority?.toUpperCase()} PRIORITY
                </span>
              </div>

              {/* Status Updater */}
              <div style={{ marginBottom: 16 }}>
                <CustomSelect
                  label="Update Sourcing Pipeline Stage"
                  value={selectedItem.status}
                  onChange={val => handleStatusChange(selectedItem._id, val)}
                  options={Object.entries(REQUIREMENT_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))}
                />
              </div>

              {/* Specs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>PROPERTY TYPE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{PROPERTY_CATEGORIES[selectedItem.category]?.label || selectedItem.category}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>MAX BUDGET</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>{formatCurrency(selectedItem.budgetMax)}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>DESIRED EXTENT</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', marginTop: 2 }}>
                    {selectedItem.minExtent || 0} - {selectedItem.maxExtent || 0} {selectedItem.extentUnit}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>PREFERRED SOIL</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{SOIL_TYPES[selectedItem.preferredSoil]?.label || selectedItem.preferredSoil}</div>
                </div>
              </div>

              {/* Preferred Locations */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>📍 TARGET LOCATIONS & ZONES</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedItem.preferredLocations?.join(', ') || 'Any preferred location'}</div>
              </div>

              {/* Discussion Notes */}
              {selectedItem.notes && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 14px', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>📜 CLIENT DISCUSSION NOTES</div>
                  <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.5 }}>{selectedItem.notes}</div>
                </div>
              )}

              {/* Action */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: 6, fontWeight: 700 }}
                onClick={() => {
                  handleOpenMatching(selectedItem);
                }}
              >
                <Sparkles size={14} /> Scan & Match Active Inventory
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
