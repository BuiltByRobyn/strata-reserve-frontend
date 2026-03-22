import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const DashboardRouter = () => {
  const { user, session, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (session?.user?.user_metadata?.must_change_password) {
    return <Navigate to="/set-password" replace />;
  }

  if (user.role === 'admin' || user.role === 'inspector' || user.role === 'assistant') {
    return <Navigate to="/admin/dashboard" replace />;
  } else {
    return <Navigate to="/client/dashboard" replace />;
  }
};
