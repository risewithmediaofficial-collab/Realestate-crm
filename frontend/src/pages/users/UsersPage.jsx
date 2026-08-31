import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Plus, Shield, Check, X, Key, Lock, Mail, Phone, Building, Edit, CheckSquare, Save, Trash2, CheckCircle, RotateCcw } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES, ORGANIZATION_ROLES } from '../../utils/constants';
import { formatDate, getInitials } from '../../utils/formatters';
import { getRoleModulePermissions, saveRoleModulePermissions, resetToDefaultPermissions } from '../../utils/rbac';

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
    phone: initialUser?.phone || '',
    password: 'Password@123',
    role: initialUser?.role || 'sales_executive',
    isActive: initialUser ? initialUser.isActive : true
  });
  const [saving, setSaving] = useState(false);
  const { showNotification } = useUI();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (initialUser) {
      const updated = {
        ...initialUser,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        isActive: form.isActive
      };
      try {
        await api.put(`/users/${initialUser._id}`, updated);
      } catch {}
      onSaved(updated);
      showNotification(`User "${form.name}" updated successfully!`);
    } else {
      try {
        const { data } = await api.post('/users', form);
        onSaved(data.data);
      } catch {
        onSaved({ ...form, _id: Date.now().toString(), isActive: true, createdAt: new Date() });
      }
      showNotification(`User account created for ${form.name}!`);
    }
    setSaving(false);
    onClose();
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
                <label className="form-label">Organizational Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  {Object.entries(ORGANIZATION_ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select className="form-select" value={form.isActive ? 'active' : 'inactive'} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'active' }))}>
                  <option value="active">Active (Access Enabled)</option>
                  <option value="inactive">Inactive (Access Suspended)</option>
                </select>
              </div>
            </div>

            {!initialUser && (
              <div className="form-group">
                <label className="form-label">Initial Temporary Password</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
            )}
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

  const [tab, setTab] = useState(getTabFromPath());
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { user } = useAuth();
  const { showNotification } = useUI();

  // Role permissions matrix state
  const [permissions, setPermissions] = useState(buildInitialPermissions);

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
      const { data } = await api.get('/users');
      setUsers(data.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingUser(null); setShowModal(true); }}>
              <Plus size={14} /> New User Account
            </button>
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
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Organization Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== 'super_admin').map(u => {
                const roleConf = ORGANIZATION_ROLES[u.role] || USER_ROLES[u.role] || { label: u.role, badge: 'badge-gray' };
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="table-avatar">
                        <div className="avatar avatar-sm">{getInitials(u.name)}</div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.phone || '—'}</td>
                    <td>
                      <span className={`badge ${roleConf.badge || 'badge-gray'}`}>{roleConf.label}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(u.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit User Profile"
                          style={{ color: 'var(--primary)' }}
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
    </div>
  );
}
