import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

const getAuthMethod = (accessToken: string): string | null => {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const amr = payload.amr as Array<{ method: string }> | undefined;
    return amr?.[0]?.method ?? null;
  } catch {
    return null;
  }
};

export const DashboardRouter = () => {
  const { user, session, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const authMethod = session?.access_token ? getAuthMethod(session.access_token) : null;
  const isPasswordLogin = authMethod === 'password';

  if (session?.user?.user_metadata?.must_change_password && !isPasswordLogin) {
    return <Navigate to="/set-password" replace />;
  }

  if (user.role === 'admin' || user.role === 'inspector' || user.role === 'assistant') {
    return <Navigate to="/admin/dashboard" replace />;
  } else {
    return <Navigate to="/client/dashboard" replace />;
  }
};
