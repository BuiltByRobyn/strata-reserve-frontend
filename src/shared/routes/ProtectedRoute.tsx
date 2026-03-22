import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Unauthorized } from '../pages/Unauthorized';
import type { ProtectedRouteProps } from '../types/component.types';

export const ProtectedRoute = ({ children, requireAdmin, requireClient }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isInspector, isAssistant, isClient } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin && !isInspector && !isAssistant) {
    return <Unauthorized />;
  }

  if (requireClient && !isClient) {
    return <Unauthorized />;
  }

  return <>{children}</>;
};
