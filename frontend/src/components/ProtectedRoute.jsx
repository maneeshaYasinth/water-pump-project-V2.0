import { Navigate } from 'react-router-dom';
import { isAdminOrAuthority, isAuthenticated } from '../services/authService';

// Protects admin routes - only allows admin/authority users
export const AdminRoute = ({ children }) => {
  const isAuth = isAuthenticated();
  const isAdmin = isAdminOrAuthority();
  
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/meters" replace />;
  }

  return children;
};

// Protects user routes - only allows regular users
export const UserRoute = ({ children }) => {
  const isAuth = isAuthenticated();
  const isAdmin = isAdminOrAuthority();
  
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  
  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};