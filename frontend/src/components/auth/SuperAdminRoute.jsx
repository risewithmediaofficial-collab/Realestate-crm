import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccessDenied from './AccessDenied';

export default function SuperAdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1d', color: '#f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700 }}>
          <div className="spinner" style={{ width: 24, height: 24, borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
          Verifying Root Permissions…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/superadmin/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'super_admin') {
    return <AccessDenied userRole={user?.role} path={location.pathname} />;
  }

  return children;
}

