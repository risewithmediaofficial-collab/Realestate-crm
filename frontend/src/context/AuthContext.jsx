import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('crm_user'));
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
    const normalizedIdentifier = (email || '').trim().toLowerCase();
    const isUsernameLogin = !normalizedIdentifier.includes('@');

    try {
      // 1. Attempt live API login to get authenticated JWT
      const loginPayload = isUsernameLogin
        ? { username: normalizedIdentifier, password }
        : { email: normalizedIdentifier, password };
      const { data } = await api.post('/auth/login', loginPayload);
      if (data?.token && data?.user) {
        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true, user: data.user };
      }
      throw new Error(data?.message || 'Login failed');
    } catch (err) {
      // 2. Offline / Mock fallback for Super Admin root console
      if ((normalizedIdentifier === 'superadmin@crm.com' || normalizedIdentifier === 'superadmin') && (password === 'SuperAdmin@2026' || password === 'Admin@123' || password === 'admin' || password === 'Password@123')) {
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

      const errorMessage = err.response?.data?.message || err.message || 'Invalid credentials. Please check your email/username and password.';
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
    localStorage.removeItem('crm_user_projects');
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
