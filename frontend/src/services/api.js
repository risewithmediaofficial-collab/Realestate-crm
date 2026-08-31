import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Only handle 401 if it's not the login/auth endpoint itself
    const requestUrl = error.config?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
    const token = localStorage.getItem('crm_token') || '';
    const isMockOrDemoToken = token.startsWith('jwt_superadmin_') || token.startsWith('demo_token_');

    // If it's a 401 on an API request and NOT using a mock/demo token, expire the session
    if (error.response?.status === 401 && !isAuthRequest && !isMockOrDemoToken) {
      let isSuperAdmin = false;
      try {
        const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
        isSuperAdmin = user.role === 'super_admin';
      } catch (e) {}

      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');

      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/superadmin/login') {
        if (isSuperAdmin || currentPath.startsWith('/superadmin')) {
          window.location.href = '/superadmin/login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
