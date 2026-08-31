import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('crm_user'));
      if (u && (u.name === 'Rajesh Kumar' || u.name === 'Rajesh' || !u.name)) {
        u.name = 'Workspace Admin';
        localStorage.setItem('crm_user', JSON.stringify(u));
      }
      return u;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [permissionsRevision, setPermissionsRevision] = useState(0);

  useEffect(() => {
    const handlePermissionsUpdated = () => {
      setPermissionsRevision(p => p + 1);
    };
    window.addEventListener('crm_permissions_updated', handlePermissionsUpdated);
    return () => window.removeEventListener('crm_permissions_updated', handlePermissionsUpdated);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    const normalizedEmail = (email || '').trim().toLowerCase();

    try {
      // 1. Attempt live API login to get authenticated JWT
      const { data } = await api.post('/auth/login', { email: normalizedEmail, password });
      if (data?.token && data?.user) {
        if (data.user.name === 'Rajesh Kumar' || data.user.name === 'Rajesh') {
          data.user.name = 'Workspace Admin';
        }
        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true, user: data.user };
      }
      throw new Error(data?.message || 'Login failed');
    } catch (err) {
      // 2. Offline / Mock fallback for Super Admin
      if (normalizedEmail === 'superadmin@crm.com' && (password === 'SuperAdmin@2026' || password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const superAdminUser = {
          _id: '65a000000000000000000001',
          name: 'Super Admin Master',
          email: 'superadmin@crm.com',
          role: 'super_admin',
          phone: '+91-9999999999',
          isActive: true,
          permissions: ['*']
        };
        const token = 'jwt_superadmin_root_token_' + Date.now();
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(superAdminUser));
        setUser(superAdminUser);
        return { success: true, user: superAdminUser };
      }

      // 3. Fallback demo users if backend is offline or matching seeded demo credentials
      if (normalizedEmail === 'admin@crm.com' && (password === 'Admin@123' || password === 'admin')) {
        const fallbackAdmin = { _id: '65a000000000000000000002', name: 'Workspace Admin', email: 'admin@crm.com', role: 'admin', phone: '+91-9876543210', isActive: true, permissions: ['*'] };
        localStorage.setItem('crm_token', 'demo_token_admin');
        localStorage.setItem('crm_user', JSON.stringify(fallbackAdmin));
        setUser(fallbackAdmin);
        return { success: true, user: fallbackAdmin };
      }

      if (normalizedEmail === 'sales.head@crm.com' && (password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const fallbackSalesHead = { _id: '65a000000000000000000003', name: 'Priya Sharma', email: 'sales.head@crm.com', role: 'sales_head', phone: '+91-9876543211', isActive: true, permissions: ['*'] };
        localStorage.setItem('crm_token', 'demo_token_saleshead');
        localStorage.setItem('crm_user', JSON.stringify(fallbackSalesHead));
        setUser(fallbackSalesHead);
        return { success: true, user: fallbackSalesHead };
      }

      if ((normalizedEmail === 'manager@crm.com' || normalizedEmail === 'sales.manager@crm.com') && (password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const fallbackSalesManager = { _id: '65a000000000000000000005', name: 'Vikram Malhotra', email: 'manager@crm.com', role: 'sales_manager', phone: '+91-9876543213', isActive: true };
        localStorage.setItem('crm_token', 'demo_token_salesmanager');
        localStorage.setItem('crm_user', JSON.stringify(fallbackSalesManager));
        setUser(fallbackSalesManager);
        return { success: true, user: fallbackSalesManager };
      }

      if (normalizedEmail === 'sales1@crm.com' && (password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const fallbackSales1 = { _id: '65a000000000000000000004', name: 'Amit Singh', email: 'sales1@crm.com', role: 'sales_executive', phone: '+91-9876543212', isActive: true };
        localStorage.setItem('crm_token', 'demo_token_sales1');
        localStorage.setItem('crm_user', JSON.stringify(fallbackSales1));
        setUser(fallbackSales1);
        return { success: true, user: fallbackSales1 };
      }

      if (normalizedEmail === 'telecaller@crm.com' && (password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const fallbackTelecaller = { _id: '65a000000000000000000006', name: 'Pooja Verma', email: 'telecaller@crm.com', role: 'telecaller', phone: '+91-9876543214', isActive: true };
        localStorage.setItem('crm_token', 'demo_token_telecaller');
        localStorage.setItem('crm_user', JSON.stringify(fallbackTelecaller));
        setUser(fallbackTelecaller);
        return { success: true, user: fallbackTelecaller };
      }

      if (normalizedEmail === 'presales@crm.com' && (password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const fallbackPresales = { _id: '65a000000000000000000007', name: 'Anjali Nair', email: 'presales@crm.com', role: 'presales', phone: '+91-9876543218', isActive: true };
        localStorage.setItem('crm_token', 'demo_token_presales');
        localStorage.setItem('crm_user', JSON.stringify(fallbackPresales));
        setUser(fallbackPresales);
        return { success: true, user: fallbackPresales };
      }

      if (normalizedEmail === 'marketing@crm.com' && (password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const fallbackMarketing = { _id: '65a000000000000000000010', name: 'Sunita Rao', email: 'marketing@crm.com', role: 'marketing_head', phone: '+91-9876543215', isActive: true };
        localStorage.setItem('crm_token', 'demo_token_marketing');
        localStorage.setItem('crm_user', JSON.stringify(fallbackMarketing));
        setUser(fallbackMarketing);
        return { success: true, user: fallbackMarketing };
      }

      if (normalizedEmail === 'finance@crm.com' && (password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const fallbackFinance = { _id: '65a000000000000000000008', name: 'Ramesh Iyer', email: 'finance@crm.com', role: 'finance_manager', phone: '+91-9876543216', isActive: true };
        localStorage.setItem('crm_token', 'demo_token_finance');
        localStorage.setItem('crm_user', JSON.stringify(fallbackFinance));
        setUser(fallbackFinance);
        return { success: true, user: fallbackFinance };
      }

      if (normalizedEmail === 'partner@crm.com' && (password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const fallbackCP = { _id: '65a000000000000000000009', name: 'Apex Realty Advisors', email: 'partner@crm.com', role: 'channel_partner', phone: '+91-9876543217', isActive: true };
        localStorage.setItem('crm_token', 'demo_token_cp');
        localStorage.setItem('crm_user', JSON.stringify(fallbackCP));
        setUser(fallbackCP);
        return { success: true, user: fallbackCP };
      }

      if ((normalizedEmail === 'partner@crm.com' || normalizedEmail === 'cp@crm.com') && (password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
        const fallbackCP = { _id: '8', name: 'Apex Realty Advisors', email: 'partner@crm.com', role: 'channel_partner', phone: '+91-9876543217', isActive: true };
        localStorage.setItem('crm_token', 'demo_token_cp');
        localStorage.setItem('crm_user', JSON.stringify(fallbackCP));
        setUser(fallbackCP);
        return { success: true, user: fallbackCP };
      }

      const errorMessage = err.response?.data?.message || err.message || 'Invalid credentials. Please check your email and password.';
      return {
        success: false,
        pendingApproval: Boolean(err.response?.data?.pendingApproval),
        rejected: Boolean(err.response?.data?.rejected),
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (registerData) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', registerData);
      if (data?.pendingApproval) {
        return {
          success: true,
          pendingApproval: true,
          message: data.message || 'Registration submitted successfully! Pending Super Admin approval.',
          user: data.user
        };
      }
      if (data?.token && data?.user) {
        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true, user: data.user, message: data.message };
      }
      return { success: true, pendingApproval: true, message: data?.message || 'Registration submitted for approval' };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('crm_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      loading,
      updateUser,
      isAuthenticated: !!user,
      isSuperAdmin: user?.role === 'super_admin',
      permissionsRevision
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

