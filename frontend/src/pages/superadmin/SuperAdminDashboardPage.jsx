import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck, Users, Lock, Unlock, CheckSquare, Square, Save, RotateCcw,
  Search, Plus, Edit, Trash2, Power, Eye, EyeOff, Sparkles, ExternalLink,
  LogOut, Layers, ToggleLeft, ToggleRight, Check, X, AlertTriangle, Key,
  Building, Settings, TrendingUp, DollarSign, MapPin, FileText, CreditCard,
  Zap, BarChart3, MessageSquare, Warehouse, GitBranch, Handshake, UserCheck,
  Shield, Download, Upload, Filter, CheckCircle2, XCircle, Info, RefreshCw,
  HelpCircle, ShieldAlert, Clock, Building2, UserX, Copy, Mail, Phone, Calendar, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { USER_ROLES } from '../../utils/constants';
import { formatDate, getInitials } from '../../utils/formatters';
import {
  ALL_CRM_MODULES,
  DEFAULT_ROLE_MODULE_PERMISSIONS,
  getRoleModulePermissions,
  saveRoleModulePermissions,
  getUserCustomPermissions,
  saveUserCustomPermissions,
  getGloballyDisabledModules,
  saveGloballyDisabledModules,
  resetToDefaultPermissions
} from '../../utils/rbac';
import api from '../../services/api';
import CustomSelect from '../../components/ui/CustomSelect';

// Icon Map for dynamic module rendering
const ICON_MAP = {
  LayoutDashboard: Building,
  TrendingUp: TrendingUp,
  Users: Users,
  MessageSquare: MessageSquare,
  CheckSquare: CheckSquare,
  GitBranch: GitBranch,
  Building: Building,
  Warehouse: Warehouse,
  DollarSign: DollarSign,
  MapPin: MapPin,
  Scale: Shield,
  FileText: FileText,
  CreditCard: CreditCard,
  Handshake: Handshake,
  User: UserCheck,
  Zap: Zap,
  BarChart3: BarChart3,
  Building2: Building,
  Settings: Settings
};

const CATEGORIES = ['ALL', 'MAIN', 'MARKETING', 'SALES', 'INVENTORY', 'BOOKINGS', 'FINANCE', 'PARTNERS', 'PORTAL', 'OPERATIONS', 'ADMIN'];

export default function SuperAdminDashboardPage() {
  const { user, logout } = useAuth();
  const { showNotification } = useUI();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals', 'matrix', 'users', 'global', 'simulator'

  // Role permissions matrix state
  const [rolePermissions, setRolePermissions] = useState(getRoleModulePermissions);

  // User custom permissions state
  const [userCustomPermissions, setUserCustomPermissions] = useState(getUserCustomPermissions);

  // Globally disabled modules state
  const [disabledModules, setDisabledModules] = useState(getGloballyDisabledModules);

  // Filter & Search states
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixCategory, setMatrixCategory] = useState('ALL');

  // Users state
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Approvals & Registrations state
  const [approvalTabFilter, setApprovalTabFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchApproval, setSearchApproval] = useState('');
  const [rejectModalUser, setRejectModalUser] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('Organization registration details require verification.');
  const [viewingApplicantDetails, setViewingApplicantDetails] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
    showNotification(`Copied ${fieldName} to clipboard!`);
  };

  // Simulator State
  const [simulatorRole, setSimulatorRole] = useState('sales_executive');

  // User Module Override Modal State
  const [selectedUserForOverride, setSelectedUserForOverride] = useState(null);
  const [userModalModules, setUserModalModules] = useState([]);

  // Create / Edit User Modal State
  const [editingUserAccount, setEditingUserAccount] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    role: 'sales_executive',
    password: 'Password@123',
    isActive: true
  });

  // Fetch users from API / fallback
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/users');
      if (data?.data && Array.isArray(data.data)) {
        const filtered = data.data.filter(u => u.role !== 'super_admin' && u.email !== 'superadmin@crm.com');
        setUsersList(filtered);
        localStorage.setItem('crm_local_users_cache', JSON.stringify(filtered));
      } else {
        throw new Error('No user data returned');
      }
    } catch (e) {
      // Fallback to locally cached users if backend is temporarily unreachable
      const storedUsers = localStorage.getItem('crm_local_users_cache');
      if (storedUsers) {
        try {
          const parsed = JSON.parse(storedUsers);
          setUsersList(parsed.filter(u => u.role !== 'super_admin' && u.email !== 'superadmin@crm.com'));
          return;
        } catch {}
      }
      setUsersList([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Derived Counts for Approvals
  const pendingApprovalsCount = useMemo(() => {
    return usersList.filter(u => u.role !== 'super_admin' && (u.approvalStatus === 'pending' || (!u.isApproved && u.approvalStatus !== 'approved' && u.approvalStatus !== 'rejected'))).length;
  }, [usersList]);

  const approvedUsersCount = useMemo(() => {
    return usersList.filter(u => u.role !== 'super_admin' && (u.approvalStatus === 'approved' || u.isApproved)).length;
  }, [usersList]);

  const rejectedUsersCount = useMemo(() => {
    return usersList.filter(u => u.role !== 'super_admin' && u.approvalStatus === 'rejected').length;
  }, [usersList]);

  const totalOrganizationsCount = useMemo(() => {
    const orgs = new Set(usersList.filter(u => u.role !== 'super_admin' && u.organization).map(u => u.organization));
    return Math.max(1, orgs.size);
  }, [usersList]);

  // Filtered Approvals List
  const filteredApprovals = useMemo(() => {
    return usersList.filter(u => {
      if (u.role === 'super_admin' || u.email === 'superadmin@crm.com') return false;
      const status = u.approvalStatus || (u.isApproved ? 'approved' : 'pending');
      const matchesFilter = approvalTabFilter === 'all' || status === approvalTabFilter;
      const s = searchApproval.toLowerCase();
      const matchesSearch = !s || u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.organization?.toLowerCase().includes(s) || u.phone?.includes(s) || u.city?.toLowerCase().includes(s);
      return matchesFilter && matchesSearch;
    });
  }, [usersList, approvalTabFilter, searchApproval]);

  // Approval Handlers
  const handleApproveAccount = async (targetUser) => {
    try {
      await api.patch(`/users/${targetUser._id}/approve`);
    } catch {}
    setUsersList(prev => {
      const updated = prev.map(u => u._id === targetUser._id ? {
        ...u,
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        approvedAt: new Date()
      } : u);
      localStorage.setItem('crm_local_users_cache', JSON.stringify(updated));
      return updated;
    });
    showNotification(`🎉 Workspace approved for "${targetUser.name}" (${targetUser.organization || 'Organization'})! User can now sign in.`);
  };

  const handleOpenRejectModal = (targetUser) => {
    setRejectModalUser(targetUser);
    setRejectionReasonInput('Registration details could not be verified.');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalUser) return;
    try {
      await api.patch(`/users/${rejectModalUser._id}/reject`, { reason: rejectionReasonInput });
    } catch {}
    setUsersList(prev => {
      const updated = prev.map(u => u._id === rejectModalUser._id ? {
        ...u,
        approvalStatus: 'rejected',
        isApproved: false,
        isActive: false,
        rejectionReason: rejectionReasonInput
      } : u);
      localStorage.setItem('crm_local_users_cache', JSON.stringify(updated));
      return updated;
    });
    showNotification(`Registration for "${rejectModalUser.name}" rejected.`);
    setRejectModalUser(null);
  };

  const handleRevokeApproval = async (targetUser) => {
    try {
      await api.patch(`/users/${targetUser._id}/revoke`);
    } catch {}
    setUsersList(prev => {
      const updated = prev.map(u => u._id === targetUser._id ? {
        ...u,
        approvalStatus: 'pending',
        isApproved: false,
        isActive: false
      } : u);
      localStorage.setItem('crm_local_users_cache', JSON.stringify(updated));
      return updated;
    });
    showNotification(`Approval revoked for "${targetUser.name}". Moved to Pending Review.`);
  };

  // Filtered Modules for Matrix
  const filteredModules = useMemo(() => {
    return ALL_CRM_MODULES.filter(m => {
      const matchesCat = matrixCategory === 'ALL' || m.category === matrixCategory;
      const matchesSearch = !matrixSearch || m.label.toLowerCase().includes(matrixSearch.toLowerCase()) || m.id.toLowerCase().includes(matrixSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [matrixCategory, matrixSearch]);

  // Filtered Users List (Excludes Super Admin Master so only client & organization accounts are shown)
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      if (u.role === 'super_admin' || u.email === 'superadmin@crm.com') return false;
      const matchesSearch = !searchUser || u.name?.toLowerCase().includes(searchUser.toLowerCase()) || u.email?.toLowerCase().includes(searchUser.toLowerCase()) || u.phone?.includes(searchUser) || u.organization?.toLowerCase().includes(searchUser.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.isActive : !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersList, searchUser, roleFilter, statusFilter]);

  // Handle Role Matrix Toggle
  const toggleRoleModule = (roleKey, moduleId) => {
    if (roleKey === 'super_admin') return; // Super admin always has all permissions

    setRolePermissions(prev => {
      const currentList = prev[roleKey] || [];
      const hasAccess = currentList.includes('*') || currentList.includes(moduleId);
      let updated = [];

      if (hasAccess) {
        if (currentList.includes('*')) {
          updated = ALL_CRM_MODULES.map(m => m.id).filter(id => id !== moduleId);
        } else {
          updated = currentList.filter(id => id !== moduleId);
        }
      } else {
        updated = [...currentList.filter(id => id !== '*'), moduleId];
      }

      const newPerms = {
        ...prev,
        [roleKey]: updated
      };
      saveRoleModulePermissions(newPerms);
      return newPerms;
    });
  };

  // Grant All / Clear All for a Role
  const handleGrantAllForRole = (roleKey) => {
    if (roleKey === 'super_admin') return;
    setRolePermissions(prev => {
      const newPerms = {
        ...prev,
        [roleKey]: ['*']
      };
      saveRoleModulePermissions(newPerms);
      return newPerms;
    });
    showNotification(`Granted all modules for ${USER_ROLES[roleKey]?.label || roleKey}`);
  };

  const handleClearAllForRole = (roleKey) => {
    if (roleKey === 'super_admin') return;
    setRolePermissions(prev => {
      const newPerms = {
        ...prev,
        [roleKey]: []
      };
      saveRoleModulePermissions(newPerms);
      return newPerms;
    });
    showNotification(`Cleared all module permissions for ${USER_ROLES[roleKey]?.label || roleKey}`);
  };

  // Save Role Matrix explicitly
  const handleSaveRoleMatrix = () => {
    saveRoleModulePermissions(rolePermissions);
    showNotification('🎉 Role module permissions matrix saved and synced across CRM!');
  };

  // Open User-Level Override Modal
  const handleOpenUserOverride = (targetUser) => {
    setSelectedUserForOverride(targetUser);
    const existingCustom = userCustomPermissions[targetUser._id];
    if (existingCustom && Array.isArray(existingCustom)) {
      setUserModalModules(existingCustom);
    } else {
      // Default to their role permissions
      const roleMods = rolePermissions[targetUser.role] || DEFAULT_ROLE_MODULE_PERMISSIONS[targetUser.role] || [];
      if (roleMods.includes('*')) {
        setUserModalModules(ALL_CRM_MODULES.map(m => m.id));
      } else {
        setUserModalModules([...roleMods]);
      }
    }
  };

  const handleToggleUserModalModule = (moduleId) => {
    setUserModalModules(prev => {
      if (prev.includes(moduleId)) {
        return prev.filter(m => m !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  const handleSelectAllUserModal = () => {
    setUserModalModules(ALL_CRM_MODULES.map(m => m.id));
  };

  const handleClearAllUserModal = () => {
    setUserModalModules([]);
  };

  const handleSaveUserOverride = () => {
    if (!selectedUserForOverride) return;
    saveUserCustomPermissions(selectedUserForOverride._id, userModalModules);
    setUserCustomPermissions(getUserCustomPermissions());
    setSelectedUserForOverride(null);
    showNotification(`Custom module permissions updated for ${selectedUserForOverride.name}!`);
  };

  const handleRevertUserToRoleDefault = (userId, userName) => {
    saveUserCustomPermissions(userId, null);
    setUserCustomPermissions(getUserCustomPermissions());
    setSelectedUserForOverride(null);
    showNotification(`Reverted ${userName} to role-level default permissions.`);
  };

  // Toggle Global Module
  const handleToggleGlobalModule = (moduleId) => {
    setDisabledModules(prev => {
      let updated;
      if (prev.includes(moduleId)) {
        updated = prev.filter(id => id !== moduleId);
      } else {
        updated = [...prev, moduleId];
      }
      saveGloballyDisabledModules(updated);
      return updated;
    });
    showNotification('System module status updated globally!');
  };

  const handleEnableAllGlobalModules = () => {
    setDisabledModules([]);
    saveGloballyDisabledModules([]);
    showNotification('All 19 CRM modules are now enabled globally!');
  };

  // Reset Everything to Default
  const handleResetAllDefaults = () => {
    if (window.confirm('⚠️ Are you sure you want to reset all role matrices, user overrides, and module registries to system defaults?')) {
      resetToDefaultPermissions();
      setRolePermissions(DEFAULT_ROLE_MODULE_PERMISSIONS);
      setUserCustomPermissions({});
      setDisabledModules([]);
      showNotification('All permissions reset to factory defaults.');
    }
  };

  // Export RBAC Configuration JSON
  const handleExportConfig = () => {
    const config = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      rolePermissions,
      userCustomPermissions,
      disabledModules
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realtyhub_rbac_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('RBAC Configuration exported successfully!');
  };

  // Import RBAC Configuration JSON
  const handleImportConfig = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.rolePermissions) {
          setRolePermissions(parsed.rolePermissions);
          saveRoleModulePermissions(parsed.rolePermissions);
        }
        if (parsed.userCustomPermissions) {
          setUserCustomPermissions(parsed.userCustomPermissions);
          localStorage.setItem('crm_user_custom_permissions', JSON.stringify(parsed.userCustomPermissions));
        }
        if (parsed.disabledModules) {
          setDisabledModules(parsed.disabledModules);
          saveGloballyDisabledModules(parsed.disabledModules);
        }
        showNotification('✅ Configuration restored from backup!');
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Save / Update User Account
  const handleSaveUserAccount = async (e) => {
    e.preventDefault();
    const cleanRole = typeof userFormData.role === 'object' && userFormData.role ? (userFormData.role.value || userFormData.role.target?.value || 'sales_executive') : (userFormData.role || 'sales_executive');
    const normalizedEmail = userFormData.email.trim().toLowerCase();
    const normalizedUsername = userFormData.username ? userFormData.username.trim().toLowerCase() : normalizedEmail.split('@')[0];

    const payload = {
      name: userFormData.name.trim(),
      email: normalizedEmail,
      username: normalizedUsername,
      phone: userFormData.phone ? userFormData.phone.trim() : '',
      organization: userFormData.organization ? userFormData.organization.trim() : 'MRP REAL ESTATE',
      role: cleanRole,
      password: userFormData.password || 'Password@123',
      isApproved: true,
      approvalStatus: 'approved',
      isActive: userFormData.isActive !== false
    };

    if (editingUserAccount) {
      try {
        const { data } = await api.put(`/users/${editingUserAccount._id}`, payload);
        const updatedUser = data?.data || { ...editingUserAccount, ...payload };
        setUsersList(prev => {
          const updated = prev.map(u => u._id === editingUserAccount._id ? updatedUser : u);
          localStorage.setItem('crm_local_users_cache', JSON.stringify(updated));
          return updated;
        });
        showNotification(`User account "${userFormData.name}" updated successfully!`);
        setShowUserModal(false);
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to update user';
        showNotification(`Error: ${errMsg}`);
      }
    } else {
      try {
        const { data } = await api.post('/users', payload);
        if (data?.data) {
          setUsersList(prev => {
            const updated = [data.data, ...prev];
            localStorage.setItem('crm_local_users_cache', JSON.stringify(updated));
            return updated;
          });
          showNotification(`New user "${userFormData.name}" (${cleanRole}) created successfully!`);
          setShowUserModal(false);
        } else {
          throw new Error('No user data returned from server');
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to create user account';
        showNotification(`Error: ${errMsg}`);
      }
    }
  };

  // Toggle User Active Status
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.patch(`/users/${userId}/toggle-status`);
    } catch {}
    setUsersList(prev => {
      const updated = prev.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u);
      localStorage.setItem('crm_local_users_cache', JSON.stringify(updated));
      return updated;
    });
    showNotification(`User account status updated.`);
  };

  // Delete User
  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Permanently remove user "${name}" from CRM?`)) return;
    try {
      await api.delete(`/users/${userId}`);
    } catch {}
    setUsersList(prev => {
      const updated = prev.filter(u => u._id !== userId);
      localStorage.setItem('crm_local_users_cache', JSON.stringify(updated));
      return updated;
    });
    saveUserCustomPermissions(userId, null);
    showNotification(`User "${name}" deleted.`);
  };

  return (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      padding: '24px 32px 64px',
      boxSizing: 'border-box'
    }}>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportConfig}
        accept=".json"
        style={{ display: 'none' }}
      />

      {/* ═══════════════════════════════════════════
          SUPER ADMIN MASTER HEADER (LIGHT THEME)
      ═══════════════════════════════════════════ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0
          }}>
            <ShieldCheck size={30} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Super Admin Root Console
              </h1>
              <span style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#b45309',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                MASTER ACCESS
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>
              Real Estate CRM Module Permission Switchboard & User Access Control
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/')}
            className="btn"
            style={{
              padding: '8px 16px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ExternalLink size={14} /> Open CRM Workspace
          </button>

          <button
            onClick={handleExportConfig}
            title="Export RBAC JSON Backup"
            style={{
              padding: '8px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Download size={14} /> Export
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Restore from JSON Backup"
            style={{
              padding: '8px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Upload size={14} /> Import
          </button>

          <button
            onClick={handleResetAllDefaults}
            title="Reset Permissions to Default"
            style={{
              padding: '8px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <RotateCcw size={14} /> Reset
          </button>

          <button
            onClick={() => { logout(); navigate('/superadmin/login'); }}
            style={{
              padding: '8px 14px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          QUICK KPI STATS (LIGHT CARDS)
      ═══════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div
          onClick={() => { setActiveTab('approvals'); setApprovalTabFilter('pending'); }}
          style={{
            background: pendingApprovalsCount > 0 ? '#fffbeb' : '#ffffff',
            border: pendingApprovalsCount > 0 ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: pendingApprovalsCount > 0 ? '#b45309' : '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Pending Approvals
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: pendingApprovalsCount > 0 ? '#d97706' : '#0f172a', marginTop: '4px' }}>
              {pendingApprovalsCount} <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Requests</span>
            </div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: pendingApprovalsCount > 0 ? '#fef3c7' : '#f1f5f9', color: pendingApprovalsCount > 0 ? '#d97706' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Active Organizations
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
              {totalOrganizationsCount} <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Tenants</span>
            </div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} />
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Registered Accounts
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
              {usersList.filter(u => u.role !== 'super_admin' && u.email !== 'superadmin@crm.com').length} <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Accounts</span>
            </div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Active CRM Modules
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
              {ALL_CRM_MODULES.length - disabledModules.length} <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>/ {ALL_CRM_MODULES.length}</span>
            </div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          NAVIGATION TABS
      ═══════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('approvals')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'approvals' ? '#fffbeb' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'approvals' ? '2px solid #d97706' : '2px solid transparent',
            color: activeTab === 'approvals' ? '#b45309' : '#64748b',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '6px 6px 0 0',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          <Clock size={16} color={activeTab === 'approvals' ? '#d97706' : '#64748b'} />
          <span>1. Account Approvals & Registrations</span>
          {pendingApprovalsCount > 0 && (
            <span style={{
              background: '#dc2626',
              color: 'white',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              lineHeight: 1
            }}>
              {pendingApprovalsCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'matrix' ? '#eff6ff' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'matrix' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'matrix' ? '#1d4ed8' : '#64748b',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '6px 6px 0 0',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          <Layers size={16} /> 2. Role-Level Module Matrix
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'users' ? '#eff6ff' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'users' ? '#1d4ed8' : '#64748b',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '6px 6px 0 0',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          <Users size={16} /> 3. User Accounts & Custom Overrides
        </button>

        <button
          onClick={() => setActiveTab('global')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'global' ? '#eff6ff' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'global' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'global' ? '#1d4ed8' : '#64748b',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '6px 6px 0 0',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          <ToggleLeft size={16} /> 4. System Global Switches
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'simulator' ? '#eff6ff' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'simulator' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'simulator' ? '#1d4ed8' : '#64748b',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '6px 6px 0 0',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          <Key size={16} /> 5. Live Role Simulator
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          TAB 1: ACCOUNT APPROVALS & REGISTRATIONS
      ═══════════════════════════════════════════ */}
      {activeTab === 'approvals' && (
        <div>
          {/* Header Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={20} color="#d97706" /> Inbound RealtyHub Registrations & Approvals
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, maxWidth: '800px' }}>
                All new RealtyHub organization registrations require Super Admin review and approval before they can sign in. Once approved, the user can log in with their email and password to access their isolated workspace with zero seeded data.
              </p>
            </div>

            <button
              onClick={fetchUsers}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={loadingUsers ? 'spin' : ''} /> Refresh List
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            background: '#ffffff',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setApprovalTabFilter('pending')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: approvalTabFilter === 'pending' ? '#fef3c7' : '#f1f5f9',
                  color: approvalTabFilter === 'pending' ? '#92400e' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={13} /> Pending Review ({pendingApprovalsCount})
              </button>

              <button
                onClick={() => setApprovalTabFilter('approved')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: approvalTabFilter === 'approved' ? '#dcfce7' : '#f1f5f9',
                  color: approvalTabFilter === 'approved' ? '#15803d' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={13} /> Approved ({approvedUsersCount})
              </button>

              <button
                onClick={() => setApprovalTabFilter('rejected')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: approvalTabFilter === 'rejected' ? '#fee2e2' : '#f1f5f9',
                  color: approvalTabFilter === 'rejected' ? '#b91c1c' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <XCircle size={13} /> Rejected ({rejectedUsersCount})
              </button>

              <button
                onClick={() => setApprovalTabFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: approvalTabFilter === 'all' ? '#eff6ff' : '#f1f5f9',
                  color: approvalTabFilter === 'all' ? '#1d4ed8' : '#64748b'
                }}
              >
                All ({usersList.filter(u => u.role !== 'super_admin').length})
              </button>
            </div>

            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by name, email, org, city..."
                value={searchApproval}
                onChange={e => setSearchApproval(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          {/* Approvals Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#334155' }}>ORGANIZATION & APPLICANT</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#334155' }}>ROLE & CONTACT</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#334155' }}>SUBMITTED DATE</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#334155' }}>APPROVAL STATUS</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#334155', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#94a3b8' }}>
                        <CheckCircle2 size={24} />
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        No registrations found
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        {approvalTabFilter === 'pending' ? 'Great news! All inbound workspace registrations have been reviewed.' : 'No accounts match the current filter.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredApprovals.map((u, idx) => {
                    const status = u.approvalStatus || (u.isApproved ? 'approved' : 'pending');
                    const isPending = status === 'pending';
                    const isApproved = status === 'approved';
                    const isRejected = status === 'rejected';

                    return (
                      <tr
                        key={u._id}
                        onClick={() => setViewingApplicantDetails(u)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isPending ? '#fffdfa' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = isPending ? '#fef9ee' : '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = isPending ? '#fffdfa' : idx % 2 === 0 ? '#ffffff' : '#f8fafc'}
                        title="Click to view all submitted application details"
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: isPending ? 'linear-gradient(135deg, #f59e0b, #d97706)' : isApproved ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 800,
                              color: 'white',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                            }}>
                              <Building2 size={20} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                  {u.organization || 'RealtyHub Organization'}
                                </span>
                                {u.city && (
                                  <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                                    📍 {u.city}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                {u.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ marginBottom: 4 }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}>
                              {USER_ROLES[u.role]?.label || u.role}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            📞 {u.phone || 'No phone provided'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                            {formatDate(u.createdAt || new Date())}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {new Date(u.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          {isPending && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a'
                            }}>
                              <Clock size={13} /> Pending Super Admin
                            </span>
                          )}

                          {isApproved && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac'
                            }}>
                              <CheckCircle2 size={13} /> Approved & Active
                            </span>
                          )}

                          {isRejected && (
                            <div>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5'
                              }}>
                                <XCircle size={13} /> Rejected
                              </span>
                              {u.rejectionReason && (
                                <div style={{ fontSize: '11px', color: '#991b1b', marginTop: 4, fontStyle: 'italic', maxWidth: 200 }}>
                                  "{u.rejectionReason}"
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {/* Dedicated View Details Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingApplicantDetails(u);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s'
                              }}
                              title="Inspect full applicant & organization details"
                            >
                              <Eye size={13} color="#2563eb" /> View Details
                            </button>

                            {isPending && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApproveAccount(u);
                                  }}
                                  className="btn"
                                  style={{
                                    padding: '6px 14px',
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  <Check size={14} /> Approve Workspace
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRejectModal(u);
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    border: '1px solid #fecaca',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  <X size={14} /> Reject
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevokeApproval(u);
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    color: '#64748b',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Revoke
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('users');
                                    handleOpenUserOverride(u);
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: '#1d4ed8',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Key size={13} /> Permissions
                                </button>
                              </>
                            )}

                            {isRejected && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApproveAccount(u);
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    border: '1px solid #86efac',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Re-Approve
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(u._id, u.name);
                                  }}
                                  style={{
                                    padding: '5px 8px',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#dc2626',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                  title="Delete Request"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 2: ROLE-LEVEL MODULE MATRIX (LIGHT THEME)
      ═══════════════════════════════════════════ */}
      {activeTab === 'matrix' && (
        <div>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
                Role-Based Module Access Switchboard
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Click any cell to grant or revoke real-time access. Changes take effect immediately across all active users.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleSaveRoleMatrix}
                style={{
                  padding: '9px 18px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Save size={15} /> Save Role Matrix
              </button>
            </div>
          </div>

          {/* Search & Category Filter Pills */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
                placeholder="Filter module name..."
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Category:</span>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setMatrixCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: matrixCategory === cat ? '#2563eb' : '#e2e8f0',
                    background: matrixCategory === cat ? '#eff6ff' : '#ffffff',
                    color: matrixCategory === cat ? '#1d4ed8' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.1s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'auto',
            maxHeight: 'calc(100vh - 350px)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 20, minWidth: '240px' }}>
                    CRM MODULE / CAPABILITY
                  </th>
                  {Object.entries(USER_ROLES).map(([roleKey, roleConf]) => (
                    <th key={roleKey} style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#334155', textAlign: 'center', minWidth: '115px' }}>
                      <div style={{ whiteSpace: 'nowrap' }}>{roleConf.label}</div>
                      {roleKey !== 'super_admin' ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                          <button
                            title="Grant All"
                            onClick={() => handleGrantAllForRole(roleKey)}
                            style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: '4px', fontSize: '10px', fontWeight: 700, padding: '1px 6px', cursor: 'pointer' }}
                          >
                            All
                          </button>
                          <button
                            title="Clear All"
                            onClick={() => handleClearAllForRole(roleKey)}
                            style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '4px', fontSize: '10px', fontWeight: 700, padding: '1px 6px', cursor: 'pointer' }}
                          >
                            None
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 700, marginTop: '4px' }}>
                          🔒 Universal Root
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredModules.map((mod, idx) => {
                  const isGloballyOff = disabledModules.includes(mod.id);
                  const IconComp = ICON_MAP[mod.icon] || Building;

                  return (
                    <tr
                      key={mod.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isGloballyOff ? '#fff1f2' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        transition: 'background 0.1s'
                      }}
                    >
                      <td style={{
                        padding: '10px 16px',
                        position: 'sticky',
                        left: 0,
                        background: isGloballyOff ? '#fff1f2' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        zIndex: 10,
                        borderRight: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isGloballyOff ? '#fee2e2' : '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isGloballyOff ? '#dc2626' : '#2563eb',
                            flexShrink: 0
                          }}>
                            <IconComp size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: isGloballyOff ? '#991b1b' : '#0f172a' }}>
                              {mod.label}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {mod.category} {isGloballyOff && <strong style={{ color: '#dc2626' }}>• GLOBALLY DISABLED</strong>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {Object.keys(USER_ROLES).map(roleKey => {
                        const currentRoleMods = rolePermissions[roleKey] || [];
                        const isGranted = currentRoleMods.includes('*') || currentRoleMods.includes(mod.id);
                        const isSuper = roleKey === 'super_admin';

                        return (
                          <td key={roleKey} style={{ padding: '8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              disabled={isSuper || isGloballyOff}
                              onClick={() => toggleRoleModule(roleKey, mod.id)}
                              title={isSuper ? 'Super Admin always has full access' : isGloballyOff ? 'Module is globally disabled in System Switches' : isGranted ? 'Click to Revoke' : 'Click to Grant'}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: isSuper
                                  ? '#fde68a'
                                  : isGloballyOff
                                  ? '#fecaca'
                                  : isGranted
                                  ? '#86efac'
                                  : '#e2e8f0',
                                background: isSuper
                                  ? '#fffbeb'
                                  : isGloballyOff
                                  ? '#fee2e2'
                                  : isGranted
                                  ? '#ecfdf5'
                                  : '#ffffff',
                                color: isSuper
                                  ? '#d97706'
                                  : isGloballyOff
                                  ? '#dc2626'
                                  : isGranted
                                  ? '#059669'
                                  : '#94a3b8',
                                cursor: isSuper || isGloballyOff ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s'
                              }}
                            >
                              {isSuper ? (
                                <Lock size={14} color="#d97706" />
                              ) : isGloballyOff ? (
                                <Power size={13} color="#dc2626" />
                              ) : isGranted ? (
                                <Check size={16} strokeWidth={3} />
                              ) : (
                                <X size={13} strokeWidth={2} />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 2: USER DIRECTORY & CUSTOM OVERRIDES (LIGHT THEME)
      ═══════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div>
          {/* Header Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
                User Accounts & Custom Module Overrides
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Grant specialized individual module permissions to specific team members without modifying their base organizational role.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingUserAccount(null);
                setUserFormData({
                  name: '',
                  email: '',
                  phone: '',
                  role: 'sales_executive',
                  password: 'Password@123',
                  isActive: true
                });
                setShowUserModal(true);
              }}
              style={{
                padding: '9px 16px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Plus size={16} /> Create User Account
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                placeholder="Search user by name, email, or phone..."
                style={{
                  width: '100%',
                  padding: '8px 14px 8px 36px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ minWidth: 200 }}>
              <CustomSelect
                value={roleFilter}
                onChange={val => setRoleFilter(typeof val === 'object' && val.target ? val.target.value : val)}
                options={[
                  { value: 'all', label: 'All Organization Roles' },
                  ...Object.entries(USER_ROLES).filter(([k]) => k !== 'super_admin').map(([k, v]) => ({
                    value: k,
                    label: v.label
                  }))
                ]}
              />
            </div>

            <div style={{ minWidth: 150 }}>
              <CustomSelect
                value={statusFilter}
                onChange={val => setStatusFilter(typeof val === 'object' && val.target ? val.target.value : val)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active Only', icon: '🟢' },
                  { value: 'inactive', label: 'Inactive Only', icon: '🔴' }
                ]}
              />
            </div>
          </div>

          {/* Users Table */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#334155' }}>USER ACCOUNT</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#334155' }}>ROLE & STATUS</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#334155' }}>MODULE ACCESS LEVEL</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#334155', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const hasCustomOverride = userCustomPermissions[u._id] && Array.isArray(userCustomPermissions[u._id]);
                    const customCount = hasCustomOverride ? userCustomPermissions[u._id].length : 0;

                    return (
                      <tr key={u._id} style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                      }}>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 800,
                              color: 'white',
                              flexShrink: 0
                            }}>
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>{u.email} • {u.phone || 'No phone'}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}>
                              {USER_ROLES[u.role]?.label || u.role}
                            </span>

                            <button
                              onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: u.isActive ? '#dcfce7' : '#fee2e2',
                                color: u.isActive ? '#15803d' : '#b91c1c',
                                border: `1px solid ${u.isActive ? '#86efac' : '#fca5a5'}`,
                                cursor: 'pointer'
                              }}
                            >
                              {u.isActive ? '🟢 Active' : '🔴 Inactive'}
                            </button>
                          </div>
                        </td>

                        <td style={{ padding: '12px 18px' }}>
                          {hasCustomOverride ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ede9fe', border: '1px solid #ddd6fe', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', color: '#6d28d9', fontWeight: 700 }}>
                              <Sparkles size={13} color="#7c3aed" /> Custom Override ({customCount} modules)
                            </div>
                          ) : (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              Standard Role Default ({USER_ROLES[u.role]?.label || u.role})
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenUserOverride(u)}
                              style={{
                                padding: '5px 10px',
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                color: '#b45309',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Key size={13} /> Permissions
                            </button>

                            <button
                              onClick={() => {
                                setEditingUserAccount(u);
                                setUserFormData({
                                  name: u.name,
                                  email: u.email,
                                  phone: u.phone || '',
                                  role: u.role,
                                  password: '',
                                  isActive: u.isActive
                                });
                                setShowUserModal(true);
                              }}
                              style={{
                                padding: '5px 8px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                              title="Edit User Info"
                            >
                              <Edit size={14} />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u._id, u.name)}
                              style={{
                                padding: '5px 8px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 3: SYSTEM GLOBAL MODULE SWITCHES (LIGHT THEME)
      ═══════════════════════════════════════════ */}
      {activeTab === 'global' && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
                Master Global Module Registry
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Globally activate or deactivate entire functional subsystems across the entire company with one click.
              </p>
            </div>

            <button
              onClick={handleEnableAllGlobalModules}
              style={{
                padding: '8px 16px',
                background: '#ecfdf5',
                border: '1px solid #86efac',
                color: '#059669',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Power size={14} /> Enable All Modules
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '14px'
          }}>
            {ALL_CRM_MODULES.map(mod => {
              const isOff = disabledModules.includes(mod.id);
              const IconComp = ICON_MAP[mod.icon] || Building;

              return (
                <div
                  key={mod.id}
                  style={{
                    background: isOff ? '#fff1f2' : '#ffffff',
                    border: `1px solid ${isOff ? '#fca5a5' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: isOff ? '#fee2e2' : '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isOff ? '#dc2626' : '#2563eb',
                        flexShrink: 0
                      }}>
                        <IconComp size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: isOff ? '#991b1b' : '#0f172a' }}>{mod.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CATEGORY: {mod.category}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleGlobalModule(mod.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        background: isOff ? '#fee2e2' : '#dcfce7',
                        border: `1px solid ${isOff ? '#fca5a5' : '#86efac'}`,
                        color: isOff ? '#b91c1c' : '#15803d',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Power size={13} /> {isOff ? 'DISABLED' : 'ACTIVE'}
                    </button>
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>
                    {mod.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 4: ROLE SIMULATOR & AUDIT (LIGHT THEME)
      ═══════════════════════════════════════════ */}
      {activeTab === 'simulator' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
              Live Role Access Simulator
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Select any CRM organizational role below to immediately audit and preview what modules and capabilities that role can access.
            </p>
          </div>

          {/* Role Picker Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 260 }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Select Target Role to Audit:</label>
              <div style={{ flex: 1 }}>
                <CustomSelect
                  value={simulatorRole}
                  onChange={val => setSimulatorRole(typeof val === 'object' && val.target ? val.target.value : val)}
                  options={Object.entries(USER_ROLES).map(([k, v]) => ({
                    value: k,
                    label: v.label
                  }))}
                />
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Evaluating access matrix for <strong style={{ color: '#0f172a' }}>{USER_ROLES[simulatorRole]?.label || simulatorRole}</strong>
            </div>
          </div>

          {/* Simulator Modules Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px'
          }}>
            {ALL_CRM_MODULES.map(mod => {
              const isGloballyOff = disabledModules.includes(mod.id);
              const currentRoleMods = rolePermissions[simulatorRole] || DEFAULT_ROLE_MODULE_PERMISSIONS[simulatorRole] || [];
              const isGranted = (simulatorRole === 'super_admin' || simulatorRole === 'admin' || currentRoleMods.includes('*') || currentRoleMods.includes(mod.id)) && !isGloballyOff;
              const IconComp = ICON_MAP[mod.icon] || Building;

              return (
                <div
                  key={mod.id}
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${isGranted ? '#86efac' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    opacity: isGranted ? 1 : 0.65
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isGranted ? '#dcfce7' : '#f1f5f9',
                      color: isGranted ? '#059669' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComp size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{mod.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{mod.category}</div>
                    </div>
                  </div>

                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: isGranted ? '#dcfce7' : '#fee2e2',
                    color: isGranted ? '#15803d' : '#b91c1c',
                    border: `1px solid ${isGranted ? '#86efac' : '#fca5a5'}`
                  }}>
                    {isGranted ? '✓ Authorized' : '✕ Restricted'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODAL: CONFIGURE USER-LEVEL MODULE OVERRIDE (LIGHT THEME)
      ═══════════════════════════════════════════ */}
      {selectedUserForOverride && (
        <div className="modal-overlay" onClick={() => setSelectedUserForOverride(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 680,
              width: '95%',
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15)',
              borderRadius: '16px'
            }}
          >
            <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '16px 20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#2563eb" /> Custom Module Permissions — {selectedUserForOverride.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Base Role: <strong style={{ color: '#2563eb' }}>{USER_ROLES[selectedUserForOverride.role]?.label || selectedUserForOverride.role}</strong>
                </div>
              </div>
              <button
                className="modal-close btn btn-ghost btn-icon btn-sm"
                style={{ color: '#64748b' }}
                onClick={() => setSelectedUserForOverride(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto', padding: '20px' }}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#1e40af',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Select the specific modules this user should have access to:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleSelectAllUserModal}
                    style={{ background: '#ffffff', border: '1px solid #93c5fd', color: '#1d4ed8', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllUserModal}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#64748b', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '10px'
              }}>
                {ALL_CRM_MODULES.map(mod => {
                  const isChecked = userModalModules.includes(mod.id);
                  const IconComp = ICON_MAP[mod.icon] || Building;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleToggleUserModalModule(mod.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: isChecked ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${isChecked ? '#3b82f6' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconComp size={15} color={isChecked ? '#2563eb' : '#64748b'} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: isChecked ? '#1e40af' : '#334155' }}>
                          {mod.label}
                        </span>
                      </div>
                      {isChecked ? <CheckCircle2 size={18} color="#2563eb" /> : <div style={{ width: 16, height: 16, border: '1px solid #cbd5e1', borderRadius: 4 }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fca5a5' }}
                onClick={() => handleRevertUserToRoleDefault(selectedUserForOverride._id, selectedUserForOverride.name)}
              >
                Revert to Role Default
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedUserForOverride(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#2563eb', color: '#ffffff', fontWeight: 700 }}
                  onClick={handleSaveUserOverride}
                >
                  Save User Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODAL: CREATE / EDIT USER ACCOUNT (LIGHT THEME)
      ═══════════════════════════════════════════ */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 560,
              width: '95%',
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '16px 20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {editingUserAccount ? `Edit Account — ${editingUserAccount.name}` : 'Create CRM User Account'}
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" style={{ color: '#64748b' }} onClick={() => setShowUserModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveUserAccount}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: 6 }}>Full Name *</label>
                  <input
                    className="form-input"
                    value={userFormData.name}
                    onChange={e => setUserFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Anand Kumar"
                    required
                  />
                </div>

                <div className="form-row" style={{ marginBottom: 14 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: 6 }}>Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      value={userFormData.email}
                      onChange={e => setUserFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="anand@company.com"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: 6 }}>Phone Number</label>
                    <input
                      className="form-input"
                      value={userFormData.phone}
                      onChange={e => setUserFormData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 14 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: 6 }}>Organizational Role</label>
                    <CustomSelect
                      value={userFormData.role}
                      onChange={val => setUserFormData(p => ({ ...p, role: typeof val === 'object' && val.target ? val.target.value : val }))}
                      options={Object.entries(USER_ROLES).filter(([k]) => k !== 'super_admin').map(([k, v]) => ({
                        value: k,
                        label: v.label
                      }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: 6 }}>Account Access Status</label>
                    <CustomSelect
                      value={userFormData.isActive ? 'active' : 'inactive'}
                      onChange={val => {
                        const actualVal = typeof val === 'object' && val.target ? val.target.value : val;
                        setUserFormData(p => ({ ...p, isActive: actualVal === 'active' }));
                      }}
                      options={[
                        { value: 'active', label: 'Active (Access Enabled)', icon: '🟢' },
                        { value: 'inactive', label: 'Inactive (Suspended)', icon: '🔴' }
                      ]}
                    />
                  </div>
                </div>

                {!editingUserAccount && (
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: 6 }}>Initial Password</label>
                    <input
                      className="form-input"
                      type="password"
                      value={userFormData.password}
                      onChange={e => setUserFormData(p => ({ ...p, password: e.target.value }))}
                      placeholder="Password@123"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  {editingUserAccount ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          APPLICANT & ORGANIZATION DETAILS MODAL
      ═══════════════════════════════════════════ */}
      {viewingApplicantDetails && (
        <div
          className="modal-overlay"
          onClick={() => setViewingApplicantDetails(null)}
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1px solid #cbd5e1',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              background: '#ffffff'
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              padding: '24px 28px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    boxShadow: '0 8px 16px rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '22px',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    <Building2 size={28} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
                        {viewingApplicantDetails.organization || 'RealtyHub Organization'}
                      </h3>
                      {viewingApplicantDetails.city && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.15)',
                          color: '#f8fafc',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          backdropFilter: 'blur(4px)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <MapPin size={11} /> {viewingApplicantDetails.city}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                      Inbound RealtyHub Organization Registration & Workspace Application
                    </p>
                  </div>
                </div>

                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setViewingApplicantDetails(null)}
                  style={{
                    color: '#94a3b8',
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Pill Badge in Header */}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {(viewingApplicantDetails.approvalStatus === 'pending' || (!viewingApplicantDetails.isApproved && viewingApplicantDetails.approvalStatus !== 'approved' && viewingApplicantDetails.approvalStatus !== 'rejected')) ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a'
                  }}>
                    <Clock size={14} /> Pending Super Admin Review
                  </span>
                ) : (viewingApplicantDetails.approvalStatus === 'approved' || viewingApplicantDetails.isApproved) ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #86efac'
                  }}>
                    <CheckCircle2 size={14} /> Approved & Active Workspace
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5'
                  }}>
                    <XCircle size={14} /> Application Rejected
                  </span>
                )}

                <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Submitted: {formatDate(viewingApplicantDetails.createdAt || new Date())} at {new Date(viewingApplicantDetails.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div style={{
              padding: '24px 28px',
              overflowY: 'auto',
              maxHeight: 'calc(90vh - 190px)',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {/* Section 1: Top 3 Quick Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Requested Role</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1d4ed8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} /> {USER_ROLES[viewingApplicantDetails.role]?.label || viewingApplicantDetails.role || 'Organization Admin'}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Workspace Partition</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} /> Isolated Tenant DB
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Account Status</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: viewingApplicantDetails.isActive ? '#059669' : '#d97706', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Power size={16} /> {viewingApplicantDetails.isActive ? 'Active (Enabled)' : 'Pending Approval'}
                  </div>
                </div>
              </div>

              {/* Section 2: Two Column Detailed Applicant Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Card A: Contact Person & Credentials */}
                <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <User size={16} color="#2563eb" /> Applicant & Contact Profile
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>FULL APPLICANT NAME</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        {viewingApplicantDetails.name || 'Not provided'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>EMAIL ADDRESS (LOGIN ID)</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>
                          {viewingApplicantDetails.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(viewingApplicantDetails.email, 'Email')}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedField === 'Email' ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', padding: '2px' }}
                          title="Copy Email"
                        >
                          {copiedField === 'Email' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>PHONE / MOBILE NUMBER</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {viewingApplicantDetails.phone || 'No phone number provided'}
                        </span>
                        {viewingApplicantDetails.phone && (
                          <button
                            type="button"
                            onClick={() => handleCopy(viewingApplicantDetails.phone, 'Phone')}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedField === 'Phone' ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', padding: '2px' }}
                            title="Copy Phone"
                          >
                            {copiedField === 'Phone' ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>USERNAME / USER ID</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        {viewingApplicantDetails.username || viewingApplicantDetails.email?.split('@')[0] || 'Auto-derived from email'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card B: Organization & Workspace Configuration */}
                <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <Building2 size={16} color="#059669" /> Organization & Workspace Scope
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>COMPANY / FIRM NAME</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        {viewingApplicantDetails.organization || 'RealtyHub Organization'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>OPERATING CITY / REGION</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#64748b" /> {viewingApplicantDetails.city || 'Headquarters / Main'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>CRM MODULE ACCESS</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                        All 17 Real Estate CRM Modules (Full Suite)
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>MULTI-TENANT DATA PROTECTION</div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        🔒 Strict Tenant Scoping: Zero data bleed. Only accounts created within <strong>{viewingApplicantDetails.organization || 'this Organization'}</strong> can view or manage their leads and projects.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Audit & Decision Banner */}
              {viewingApplicantDetails.rejectionReason && (
                <div style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <XCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b', marginBottom: '2px' }}>
                      Rejection Reason Logged:
                    </div>
                    <div style={{ fontSize: '13px', color: '#b91c1c' }}>
                      "{viewingApplicantDetails.rejectionReason}"
                    </div>
                  </div>
                </div>
              )}

              {(viewingApplicantDetails.approvalStatus === 'pending' || (!viewingApplicantDetails.isApproved && viewingApplicantDetails.approvalStatus !== 'approved' && viewingApplicantDetails.approvalStatus !== 'rejected')) && (
                <div style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <Info size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
                    <strong>Super Admin Review Notice:</strong> Approving this application will immediately activate the applicant's isolated organization workspace. They can then log in using <strong>{viewingApplicantDetails.email}</strong>.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              padding: '16px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingApplicantDetails(null)}
                style={{ padding: '8px 18px', fontWeight: 600 }}
              >
                Close
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {(viewingApplicantDetails.approvalStatus === 'pending' || (!viewingApplicantDetails.isApproved && viewingApplicantDetails.approvalStatus !== 'approved' && viewingApplicantDetails.approvalStatus !== 'rejected')) && (
                  <>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const target = viewingApplicantDetails;
                        setViewingApplicantDetails(null);
                        handleOpenRejectModal(target);
                      }}
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '9px 18px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={15} /> Reject Request
                    </button>

                    <button
                      type="button"
                      className="btn"
                      onClick={async () => {
                        const target = viewingApplicantDetails;
                        await handleApproveAccount(target);
                        setViewingApplicantDetails(prev => prev ? { ...prev, approvalStatus: 'approved', isApproved: true, isActive: true } : null);
                      }}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '9px 22px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                      }}
                    >
                      <Check size={16} /> Approve Workspace & Grant Access
                    </button>
                  </>
                )}

                {(viewingApplicantDetails.approvalStatus === 'approved' || viewingApplicantDetails.isApproved) && (
                  <>
                    <button
                      type="button"
                      className="btn"
                      onClick={async () => {
                        const target = viewingApplicantDetails;
                        await handleRevokeApproval(target);
                        setViewingApplicantDetails(prev => prev ? { ...prev, approvalStatus: 'pending', isApproved: false, isActive: false } : null);
                      }}
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        color: '#b45309',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Revoke Approval
                    </button>
                    <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={16} /> Workspace is Active
                    </span>
                  </>
                )}

                {viewingApplicantDetails.approvalStatus === 'rejected' && (
                  <button
                    type="button"
                    className="btn"
                    onClick={async () => {
                      const target = viewingApplicantDetails;
                      await handleApproveAccount(target);
                      setViewingApplicantDetails(prev => prev ? { ...prev, approvalStatus: 'approved', isApproved: true, isActive: true } : null);
                    }}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 20px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check size={15} /> Re-Approve Workspace
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModalUser && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: '480px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#991b1b' }}>
                    Reject Registration Request
                  </div>
                  <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                    {rejectModalUser.name} ({rejectModalUser.organization || 'Organization'})
                  </div>
                </div>
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" style={{ color: '#991b1b' }} onClick={() => setRejectModalUser(null)}><X size={16} /></button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 14px', lineHeight: 1.5 }}>
                Rejecting this workspace request will prevent <strong>{rejectModalUser.email}</strong> from logging into RealtyHub. Please provide a brief reason for the applicant:
              </p>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Rejection Reason / Note *
                </label>
                <textarea
                  className="form-input"
                  style={{ width: '100%', height: '90px', padding: '10px 12px', fontSize: '13px', resize: 'vertical' }}
                  value={rejectionReasonInput}
                  onChange={e => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. Organization verification failed or duplicate account."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Organization verification failed', 'Duplicate account request', 'Invalid contact or email address', 'Account not eligible'].map(quickReason => (
                  <button
                    key={quickReason}
                    type="button"
                    onClick={() => setRejectionReasonInput(quickReason)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '11px',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    + {quickReason}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setRejectModalUser(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmReject}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
