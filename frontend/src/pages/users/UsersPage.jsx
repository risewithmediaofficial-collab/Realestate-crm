import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Plus, Shield, Check, X, Key, Lock, Mail, Phone, Building, Edit, CheckSquare, Save, Trash2, CheckCircle, RotateCcw, Eye, EyeOff, Search, Download, LayoutDashboard, BarChart2 } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES, ORGANIZATION_ROLES } from '../../utils/constants';
import { formatDate, getInitials, formatCurrency } from '../../utils/formatters';
import { getRoleModulePermissions, saveRoleModulePermissions, resetToDefaultPermissions } from '../../utils/rbac';
import { exportTeamScorecardCSV } from '../../utils/exportTemplates';
import UserDashboardModal from '../../components/users/UserDashboardModal';
import CustomSelect from '../../components/ui/CustomSelect';

const MODULE_COLUMNS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'leads', label: 'Leads' },
  { key: 'communication', label: 'Calling / WA' },
  { key: 'activities', label: 'Activities' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'projects', label: 'Projects' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'sitevisits', label: 'Site Visits' },
  { key: 'negotiations', label: 'Negotiations' },
  { key: 'booking', label: 'Booking' },
  { key: 'payments', label: 'Payments' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'reports', label: 'Reports' },
  { key: 'users', label: 'Users' },
  { key: 'settings', label: 'Settings' }
];

const buildInitialPermissions = () => {
  const map = {};
  const currentRolePerms = getRoleModulePermissions();
  Object.keys(ORGANIZATION_ROLES).forEach(role => {
    map[role] = {};
    const allowed = currentRolePerms[role] || [];
    MODULE_COLUMNS.forEach(col => {
      map[role][col.key] = allowed.includes('*') || allowed.includes(col.key);
    });
  });
  return map;
};

// ─── Create / Edit User Modal ──────────────────────────────
const UserModal = ({ initialUser, onClose, onSaved }) => {
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  const [form, setForm] = useState({
    name: initialUser?.name || '',
    email: initialUser?.email || '',
    username: initialUser?.username || '',
    phone: initialUser?.phone || '',
    password: '',
    role: initialUser?.role || 'telecaller',
    isActive: initialUser ? initialUser.isActive : true
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showNotification } = useUI();
  const { user: authUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const username = form.username.trim();
    const cleanRole = typeof form.role === 'object' && form.role ? (form.role.value || form.role.target?.value || 'telecaller') : (form.role || 'telecaller');

    if (!initialUser && (!username || !form.password.trim())) {
      showNotification('Please enter a username and temporary password for the new employee account.');
      setSaving(false);
      return;
    }

    if (initialUser) {
      const updated = {
        ...initialUser,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        username: username.toLowerCase() || initialUser.username || '',
        phone: form.phone.trim(),
        role: cleanRole,
        isActive: form.isActive,
        ...(form.password.trim() ? { password: form.password } : {})
      };
      try {
        const { data } = await api.put(`/users/${initialUser._id}`, updated);
        onSaved(data?.data || updated);
        showNotification(`User "${form.name}" updated successfully!`);
        setSaving(false);
        onClose();
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to update user';
        showNotification(`Error updating user: ${errMsg}`);
        setSaving(false);
      }
    } else {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        username: username.toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: cleanRole,
        organization: authUser?.organization || 'MRP REAL ESTATE',
        city: '',
        isApproved: true,
        approvalStatus: 'approved',
        isActive: form.isActive !== false
      };
      try {
        const { data } = await api.post('/users', payload);
        if (data?.data) {
          onSaved(data.data);
          showNotification(`User account created for ${form.name}! (${data.data.role})`);
          setSaving(false);
          onClose();
        } else {
          throw new Error('No user data returned from server');
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to create user account';
        showNotification(`Error: ${errMsg}`);
        setSaving(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{initialUser ? `Edit Account — ${initialUser.name}` : 'Create Organization Team Account'}</div>
          <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rahul Mehta" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email Address <span className="required">*</span></label>
                <input type="email" className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="rahul@company.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number <span className="required">*</span></label>
                <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Mobile number" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Username <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="e.g. rahul.mehta"
                  required
                />
              </div>
              <div className="form-group">
                <CustomSelect
                  label="Account Status"
                  value={form.isActive ? 'active' : 'inactive'}
                  onChange={val => setForm(p => ({ ...p, isActive: val === 'active' }))}
                  options={[
                    { value: 'active', label: 'Active (Access Enabled)', icon: '🟢' },
                    { value: 'inactive', label: 'Inactive (Access Suspended)', icon: '🔴' }
                  ]}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <CustomSelect
                  label="Organizational Role"
                  value={form.role}
                  onChange={val => setForm(p => ({ ...p, role: val }))}
                  options={Object.entries(ORGANIZATION_ROLES).map(([k, v]) => ({ value: k, label: v.label, icon: '💼' }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{initialUser ? 'New Password (optional)' : 'Initial Temporary Password'} <span className="required">{initialUser ? '' : '*'}</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={initialUser ? 'Leave blank to keep current password' : 'Enter temporary password'}
                    required={!initialUser}
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : initialUser ? 'Save & Update User' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function UsersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/roles')) return 'roles';
    if (location.pathname.includes('/hierarchy')) return 'hierarchy';
    return 'users';
  };

  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [teamStats, setTeamStats] = useState({ totalRevenue: 0, totalTokens: 0, remainingBalance: 0, totalDeals: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(getTabFromPath());
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [permissions, setPermissions] = useState(buildInitialPermissions());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedUserDashboard, setSelectedUserDashboard] = useState(null);
  const { showNotification } = useUI();

  useEffect(() => {
    setTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setTab(tabId);
    navigate(`/users/${tabId}`);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, leadsRes, bookingsRes, invRes, statsRes] = await Promise.allSettled([
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get('/leads?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/bookings?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/inventory?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/leads/stats/by-user').catch(() => ({ data: { data: {} } }))
      ]);

      const rawUsers = usersRes.status === 'fulfilled' && usersRes.value.data?.data ? usersRes.value.data.data : [];
      const rawLeads = leadsRes.status === 'fulfilled' && leadsRes.value.data?.data ? leadsRes.value.data.data : [];
      const rawBookings = bookingsRes.status === 'fulfilled' && bookingsRes.value.data?.data ? bookingsRes.value.data.data : [];
      const rawInv = invRes.status === 'fulfilled' && invRes.value.data?.data ? invRes.value.data.data : [];
      const backendUserStats = statsRes.status === 'fulfilled' && statsRes.value.data?.data ? statsRes.value.data.data : {};

      const allBookings = [...rawBookings];
      rawInv.forEach(u => {
        if (['booked', 'registered', 'sold'].includes(u.status) && u.bookingCustomer) {
          const exists = allBookings.some(b => b.unit?._id === u._id || b.customerName === u.bookingCustomer?.name);
          if (!exists) {
            allBookings.push({
              _id: `inv-${u._id}`,
              customerName: u.bookingCustomer.name,
              totalAmount: u.pricing?.totalPrice || u.totalPrice || 0,
              tokenAmount: u.bookingCustomer.tokenAmount || 0,
              handledBy: { name: u.bookingCustomer.agentName || 'Sales Team' }
            });
          }
        }
      });

      // Also merge leads in stage 'booked'
      rawLeads.forEach(l => {
        if (l.stage === 'booked') {
          const exists = allBookings.some(b => b.customerName === l.name || (b.customerPhone && l.phone && b.customerPhone === l.phone));
          if (!exists) {
            const leadBudget = (typeof l.budget === 'object' ? (l.budget?.max || l.budget?.min) : Number(l.budget)) || 2220000;
            allBookings.push({
              _id: `lead-${l._id}`,
              customerName: l.name,
              totalAmount: leadBudget,
              tokenAmount: 100000,
              handledBy: l.assignedTo ? (typeof l.assignedTo === 'object' ? l.assignedTo : { name: 'Sales Representative' }) : { name: 'Sales Representative' }
            });
          }
        }
      });

      setUsers(rawUsers);
      setLeads(rawLeads);
      setBookings(allBookings);

      let totalRev = 0;
      let totalTok = 0;
      allBookings.forEach(b => {
        totalRev += (b.totalAmount || 0);
        totalTok += (b.tokenAmount || b.bookingAmount || 0);
      });

      let totalPipeline = 0;
      let totalCalls = 0;
      rawLeads.forEach(l => {
        const bgVal = (typeof l.budget === 'object' ? (l.budget?.max || l.budget?.min) : Number(l.budget)) || 0;
        totalPipeline += bgVal;
        const callEntries = (l.callLogs?.length || 0) + (l.activities?.filter(a => a.type === 'call')?.length || 0);
        totalCalls += callEntries;
      });

      setTeamStats({
        totalRevenue: totalRev,
        totalTokens: totalTok,
        remainingBalance: Math.max(0, totalRev - totalTok),
        totalDeals: allBookings.length,
        totalPipeline: totalPipeline,
        totalCalls: totalCalls
      });
    } catch (err) {
      console.error('Failed to fetch users & performance data:', err);
      setUsers([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const getUserMetrics = (u) => {
    const uId = u._id?.toString();
    const uName = (u.name || '').trim().toLowerCase();

    // 1. Leads assigned to user
    const userLeads = leads.filter(l => {
      const aId = l.assignedTo?._id?.toString() || l.assignedTo?.toString();
      if (aId && aId === uId) return true;
      const lName = (l.assignedTo?.name || '').trim().toLowerCase();
      return lName && uName && (lName === uName || lName.includes(uName) || uName.includes(lName));
    });

    // 2. Pipeline value of assigned leads (budget max / project price)
    const pipelineVal = userLeads.reduce((sum, l) => {
      const val = (typeof l.budget === 'object' ? (l.budget?.max || l.budget?.min) : Number(l.budget)) || (l.interestedProject?.pricing?.basePrice) || 0;
      return sum + Number(val || 0);
    }, 0);

    // 3. Calls / Note logs made by this user
    let callsCount = 0;
    leads.forEach(l => {
      // Check callLogs array
      (l.callLogs || []).forEach(cl => {
        const addedById = cl.addedBy?._id?.toString() || cl.addedBy?.toString();
        if (addedById === uId) callsCount++;
      });
      // Check activities
      (l.activities || []).forEach(act => {
        const perfId = act.performedBy?._id?.toString() || act.performedBy?.toString();
        if (act.type === 'call' && (perfId === uId || (!perfId && userLeads.some(ul => ul._id === l._id)))) {
          callsCount++;
        }
      });
    });

    // If telecaller has leads assigned but 0 logs yet, show call activity count
    if (callsCount === 0 && userLeads.length > 0) {
      callsCount = userLeads.reduce((acc, l) => acc + (l.callLogs?.length || 0) + (l.lastCallOutcome ? 1 : 0), 0);
    }

    // 4. Bookings won / converted
    const userBookings = bookings.filter(b => {
      const hId = b.handledBy?._id?.toString() || b.handledBy?.toString() || b.assignedAgent?.toString();
      if (hId && hId === uId) return true;
      const bName = (b.handledBy?.name || b.agentName || '').trim().toLowerCase();
      if (bName && uName && (bName === uName || bName.includes(uName) || uName.includes(bName))) return true;
      // Also match if booking customer phone matches a lead assigned to this user
      if (b.customerPhone && userLeads.some(ul => ul.phone === b.customerPhone)) return true;
      if (b.customerName && userLeads.some(ul => ul.name?.toLowerCase() === b.customerName?.toLowerCase())) return true;
      return false;
    });

    const bookedRev = userBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const tokenAdv = userBookings.reduce((sum, b) => sum + (b.tokenAmount || b.bookingAmount || 0), 0);
    const remBal = Math.max(0, bookedRev - tokenAdv);
    const convRate = userLeads.length > 0 ? ((userBookings.length / userLeads.length) * 100).toFixed(1) : (userBookings.length > 0 ? 100 : 0);

    return {
      leadsCount: userLeads.length,
      pipelineValue: pipelineVal,
      callsMade: callsCount,
      bookingsCount: userBookings.length,
      bookedRevenue: bookedRev,
      tokenAdvance: tokenAdv,
      remainingBalance: remBal,
      conversionRate: convRate
    };
  };

  const handleUserSaved = (savedUser) => {
    if (editingUser) {
      setUsers(prev => prev.map(u => u._id === savedUser._id ? savedUser : u));
    } else {
      setUsers(prev => [savedUser, ...prev]);
    }
  };

  const togglePermission = (roleKey, moduleKey) => {
    if (roleKey === 'super_admin') return; // Super admin always has universal access
    setPermissions(prev => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        [moduleKey]: !prev[roleKey]?.[moduleKey]
      }
    }));
  };

  const handleGrantAllForRole = (roleKey) => {
    if (roleKey === 'super_admin') return;
    const allTrue = {};
    MODULE_COLUMNS.forEach(col => { allTrue[col.key] = true; });
    setPermissions(prev => ({
      ...prev,
      [roleKey]: allTrue
    }));
    showNotification(`Granted all page access for ${USER_ROLES[roleKey]?.label || roleKey}`);
  };

  const handleClearAllForRole = (roleKey) => {
    if (roleKey === 'super_admin') return;
    const allFalse = {};
    MODULE_COLUMNS.forEach(col => { allFalse[col.key] = false; });
    setPermissions(prev => ({
      ...prev,
      [roleKey]: allFalse
    }));
    showNotification(`Revoked all module access for ${USER_ROLES[roleKey]?.label || roleKey}`);
  };

  const handleResetDefaults = () => {
    resetToDefaultPermissions();
    setPermissions(buildInitialPermissions());
    showNotification('Permissions reset to system defaults!');
  };

  const handleSavePermissions = () => {
    const formatted = {};
    Object.keys(permissions).forEach(role => {
      if (role === 'super_admin') {
        formatted[role] = ['*'];
      } else {
        formatted[role] = MODULE_COLUMNS
          .filter(col => permissions[role]?.[col.key])
          .map(col => col.key);
      }
    });
    saveRoleModulePermissions(formatted);
    showNotification('🎉 Role module permissions matrix saved & synchronized across CRM!');
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete user account "${name}"?`)) return;
    try { await api.delete(`/users/${id}`); } catch {}
    setUsers(prev => prev.filter(u => u._id !== id));
    showNotification(`User account "${name}" deleted!`);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Settings & Access</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {tab === 'roles' ? 'Role Permissions (RBAC)' : tab === 'hierarchy' ? 'Reporting Hierarchy' : 'User Accounts'}
            </span>
          </div>
          <h1 className="page-title">Users & Access Control</h1>
          <p className="page-subtitle">Manage organization accounts, role-based security, and reporting structure</p>
        </div>
        <div className="page-actions">
          {tab === 'roles' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleResetDefaults} title="Reset to standard defaults">
                <RotateCcw size={14} /> Reset Defaults
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSavePermissions} title="Save permissions to dynamic CRM store">
                <Save size={14} /> Save Permissions Matrix
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const scorecardData = users.filter(u => u.role !== 'super_admin').map(u => {
                    const m = getUserMetrics(u);
                    return {
                      name: u.name,
                      role: ORGANIZATION_ROLES[u.role]?.label || u.role,
                      assignedLeads: m.leadsCount,
                      connectedCalls: m.callsMade,
                      siteVisitsDone: 0,
                      bookingsClosed: m.bookingsCount,
                      revenue: m.bookedRevenue,
                      achievement: `${m.conversionRate}%`
                    };
                  });
                  exportTeamScorecardCSV(scorecardData, user?.organization || 'MRP REAL ESTATE');
                  showNotification('Exported Team Performance & Directory CSV!');
                }}
                title="Download employee directory and revenue performance"
              >
                <Download size={14} /> Export Directory CSV
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingUser(null); setShowModal(true); }}>
                <Plus size={14} /> New User Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'users', label: 'User Directory' },
          { id: 'roles', label: 'Role Permissions (RBAC)' },
          { id: 'hierarchy', label: 'Reporting Hierarchy' },
        ].map(t => (
          <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => handleTabChange(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Tab 1: User Directory */}
      {tab === 'users' && (
        <div>
          {/* Telecaller & Team Revenue Performance Strip */}
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', borderColor: '#bbf7d0' }}>
              <div className="stat-icon-wrap" style={{ background: '#dcfce7' }}>
                <span style={{ fontSize: 20 }}>🏷️</span>
              </div>
              <div className="stat-info">
                <div className="stat-label" style={{ color: '#166534', fontWeight: 700 }}>Total Team Booked Revenue</div>
                <div className="stat-value" style={{ color: '#15803d' }}>{formatCurrency(teamStats.totalRevenue || 0)}</div>
                <div className="stat-change up">✓ {teamStats.totalDeals || 0} Deals closed</div>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)', borderColor: '#bfdbfe' }}>
              <div className="stat-icon-wrap" style={{ background: '#dbeafe' }}>
                <span style={{ fontSize: 20 }}>📈</span>
              </div>
              <div className="stat-info">
                <div className="stat-label" style={{ color: '#1e40af', fontWeight: 700 }}>Active Prospect Pipeline</div>
                <div className="stat-value" style={{ color: '#1d4ed8' }}>{formatCurrency(teamStats.totalPipeline || 0)}</div>
                <div className="stat-change up">Leads budget under follow-up</div>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)', borderColor: '#e9d5ff' }}>
              <div className="stat-icon-wrap" style={{ background: '#f3e8ff' }}>
                <span style={{ fontSize: 20 }}>📞</span>
              </div>
              <div className="stat-info">
                <div className="stat-label" style={{ color: '#6b21a8', fontWeight: 700 }}>Telecalling Logs Spoken</div>
                <div className="stat-value" style={{ color: '#7e22ce' }}>{teamStats.totalCalls || 0} Calls</div>
                <div className="stat-change up">Customer notes & follow-ups</div>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)', borderColor: '#fecaca' }}>
              <div className="stat-icon-wrap" style={{ background: '#fee2e2' }}>
                <span style={{ fontSize: 20 }}>💵</span>
              </div>
              <div className="stat-info">
                <div className="stat-label" style={{ color: '#991b1b', fontWeight: 700 }}>Realized Advance Tokens</div>
                <div className="stat-value" style={{ color: '#dc2626' }}>{formatCurrency(teamStats.totalTokens || 0)}</div>
                <div className="stat-change up">Collected advance receipts</div>
              </div>
            </div>
          </div>

          <div className="filter-bar">
            <div className="filter-search">
              <Search size={14} color="var(--text-muted)" />
              <input
                placeholder="Search staff name, email, phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <CustomSelect
              variant="filter"
              value={roleFilter}
              onChange={val => setRoleFilter(val)}
              options={[
                { value: '', label: 'All Roles', icon: '👥' },
                ...Object.entries(ORGANIZATION_ROLES).map(([k, v]) => ({ value: k, label: v.label, icon: '💼' }))
              ]}
            />

            <CustomSelect
              variant="filter"
              value={statusFilter}
              onChange={val => setStatusFilter(val)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active', icon: '🟢' },
                { value: 'inactive', label: 'Inactive', icon: '🔴' }
              ]}
            />

            <CustomSelect
              variant="filter"
              buttonStyle={{ fontWeight: 600, color: 'var(--primary)' }}
              value={sortBy}
              onChange={val => setSortBy(val)}
              options={[
                { value: 'date_desc', label: 'Sort: 📅 Joining Date (Newest)' },
                { value: 'date_asc', label: 'Sort: 📅 Joining Date (Oldest)' },
                { value: 'name_asc', label: 'Sort: 🔤 Name (A → Z)' },
                { value: 'role_asc', label: 'Sort: 👔 Role Hierarchy' }
              ]}
            />
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee / User</th>
                  <th>Role</th>
                  <th>Leads Assigned</th>
                  <th>Pipeline Value (₹)</th>
                  <th>Calls Spoken</th>
                  <th>Bookings Won</th>
                  <th>Converted Revenue (₹)</th>
                  <th>Token Collected</th>
                  <th>Conversion %</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(u => {
                    if (u.role === 'super_admin') return false;
                    if (roleFilter && u.role !== roleFilter) return false;
                    if (statusFilter === 'active' && u.isActive === false) return false;
                    if (statusFilter === 'inactive' && u.isActive !== false) return false;
                    if (search) {
                      const q = search.toLowerCase();
                      const matchesName = u.name?.toLowerCase().includes(q);
                      const matchesEmail = u.email?.toLowerCase().includes(q);
                      const matchesPhone = u.phone?.includes(q);
                      if (!matchesName && !matchesEmail && !matchesPhone) return false;
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    if (sortBy === 'date_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                    if (sortBy === 'date_asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
                    if (sortBy === 'role_asc') return (a.role || '').localeCompare(b.role || '');
                    return 0;
                  })
                  .map(u => {
                    const roleConf = ORGANIZATION_ROLES[u.role] || USER_ROLES[u.role] || { label: u.role, badge: 'badge-gray' };
                    const m = getUserMetrics(u);
                return (
                  <tr
                    key={u._id}
                    style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                    className="table-row-hover"
                    onClick={() => setSelectedUserDashboard(u)}
                    title={`Click to view ${u.name}'s User Dashboard`}
                  >
                    <td>
                      <div className="table-avatar">
                        <div className="avatar avatar-sm">{getInitials(u.name)}</div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleConf.badge || 'badge-gray'}`}>{roleConf.label}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.leadsCount} Leads
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: m.pipelineValue > 0 ? '#1d4ed8' : 'var(--text-muted)' }}>
                        {formatCurrency(m.pipelineValue)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 13 }}>📞</span>
                        <span style={{ fontWeight: 700, color: m.callsMade > 0 ? '#7e22ce' : 'var(--text-muted)' }}>
                          {m.callsMade} Spoken
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${m.bookingsCount > 0 ? 'badge-success' : 'badge-gray'}`}>
                        {m.bookingsCount} Won
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: m.bookedRevenue > 0 ? '#15803d' : 'var(--text-primary)' }}>
                        {formatCurrency(m.bookedRevenue)}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                      {formatCurrency(m.tokenAdvance)}
                    </td>
                    <td>
                      <span className={`badge ${Number(m.conversionRate) > 0 ? 'badge-info' : 'badge-gray'}`} style={{ fontWeight: 700 }}>
                        {m.conversionRate}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title={`View ${u.name}'s Dashboard`}
                          style={{ color: 'var(--primary)', background: '#eff6ff', border: '1px solid #dbeafe' }}
                          onClick={() => setSelectedUserDashboard(u)}
                        >
                          <LayoutDashboard size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit User Profile"
                          style={{ color: 'var(--text-secondary)' }}
                          onClick={() => { setEditingUser(u); setShowModal(true); }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--danger)' }}
                          title="Delete User Account"
                          onClick={() => handleDeleteUser(u._id, u.name)}
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
        </div>
      </div>
      )}

      {/* Tab 2: Role Permissions */}
      {tab === 'roles' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Organization Role-Based Access Control (RBAC) Matrix</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure module-level visibility and granular permissions for each role across your organization workspace.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleResetDefaults}>
                <RotateCcw size={13} /> Reset Defaults
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSavePermissions}>
                <Save size={13} /> Save Permissions
              </button>
            </div>
          </div>
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 960 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 180, position: 'sticky', left: 0, background: 'var(--table-header-bg, #f8fafc)', zIndex: 2 }}>Organization Role</th>
                  <th style={{ minWidth: 120, textAlign: 'center', fontSize: 11 }}>Quick Actions</th>
                  {MODULE_COLUMNS.map(col => (
                    <th key={col.key} style={{ textAlign: 'center', fontSize: 11, padding: '8px 6px', whiteSpace: 'nowrap' }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(ORGANIZATION_ROLES).map(([key, conf]) => {
                  const perm = permissions[key] || {};
                  return (
                    <tr key={key}>
                      <td style={{ fontWeight: 700, position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                        <span className={`badge ${conf.badge || 'badge-gray'}`}>{conf.label}</span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '6px 8px' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 10, padding: '2px 6px', height: 22, color: 'var(--primary)' }}
                            onClick={() => handleGrantAllForRole(key)}
                            title="Grant all modules to this role"
                          >
                            Grant All
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 10, padding: '2px 6px', height: 22, color: 'var(--danger)' }}
                            onClick={() => handleClearAllForRole(key)}
                            title="Revoke all modules for this role"
                          >
                            Clear
                          </button>
                        </div>
                      </td>
                      {MODULE_COLUMNS.map(col => (
                        <td key={col.key} style={{ textAlign: 'center', padding: '8px 6px' }}>
                          <input
                            type="checkbox"
                            checked={perm[col.key] || false}
                            onChange={() => togglePermission(key, col.key)}
                            title={`Toggle ${col.label} for ${conf.label}`}
                            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Reporting Hierarchy */}
      {tab === 'hierarchy' && (
        <div className="card" style={{ padding: 24, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Organization Reporting & Operational Hierarchy Tree</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            Visualizes reporting chain from Organization Leadership down to frontline closers, telecallers, and partner networks.
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontWeight: 800, color: '#6d28d9', fontSize: 14 }}>👑 Organization Administrator (Developer / Builder Owner)</div>
              <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>Master Controller • Organization Strategy, Pricing & Unit Allocation Authority</div>
            </div>
            
            <div style={{ marginLeft: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontWeight: 700, color: '#1e40af' }}>🏢 Sales Head / Director</div>
                <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>Oversees Target Quotas & Deal Approvals</div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontWeight: 700, color: '#166534' }}>💳 Finance & Collections Manager</div>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>Demands, Milestone Collections & Invoicing</div>
              </div>
            </div>

            <div style={{ marginLeft: 56, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontWeight: 700 }}>👔 Sales Managers (Project Incharge)</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Oversees On-site Executives & Deal Velocity</div>
              </div>
              <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontWeight: 700, color: '#86198f' }}>📣 Marketing Head</div>
                <div style={{ fontSize: 12, color: '#a21caf', marginTop: 2 }}>Campaign Ingestion & Meta Lead Ads</div>
              </div>
            </div>

            <div style={{ marginLeft: 84, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>🎯 Sales Executives / Closers</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Site tours, negotiations & token bookings</div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>📞 Telecallers & Pre-Sales</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Inbound lead qualification & call logging</div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#b45309' }}>🤝 Channel Partners</div>
                <div style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>External broker network & client referrals</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <UserModal
          initialUser={editingUser}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSaved={handleUserSaved}
        />
      )}

      {selectedUserDashboard && (
        <UserDashboardModal
          user={selectedUserDashboard}
          onClose={() => setSelectedUserDashboard(null)}
          allLeads={leads}
          allBookings={bookings}
        />
      )}
    </div>
  );
}
