import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Unauthorized } from '../pages/Unauthorized';
import type { ProtectedRouteProps } from '../types/component.types';

const ROLE_MAP = {
  admin: 'isAdmin',
  inspector: 'isInspector',
  assistant: 'isAssistant',
  client: 'isClient',
} as const;

export const ProtectedRoute = ({ children, requireAdmin, requireClient, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isInspector, isAssistant, isClient } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const roles = { isAdmin, isInspector, isAssistant, isClient };
    const hasRole = allowedRoles.some(role => roles[ROLE_MAP[role]]);
    if (!hasRole) return <Unauthorized />;
  }

  if (requireAdmin && !isAdmin && !isInspector && !isAssistant) {
    return <Unauthorized />;
  }

  if (requireClient && !isClient) {
    return <Unauthorized />;
  }

  return <>{children}</>;
};
