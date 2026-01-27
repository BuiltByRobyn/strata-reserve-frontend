import { Navigate } from 'react-router-dom';
import { useClientAuth } from '../contexts/ClientAuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ClientProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useClientAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
