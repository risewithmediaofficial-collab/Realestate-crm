import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasPathAccess } from '../../utils/rbac';
import AccessDenied from './AccessDenied';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user && !hasPathAccess(user, location.pathname)) {
    return <AccessDenied userRole={user.role} path={location.pathname} />;
  }

  return children;
}
