import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner/LoadingSpinner';
import type { ProtectedRouteProps } from '../types/component.types';

export const ProtectedRoute = ({ children, requireAdmin, requireClient }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isClient } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireClient && !isClient) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
