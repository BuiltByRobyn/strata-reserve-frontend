import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (user?.role === 'admin' || user?.role === 'inspector' || user?.role === 'assistant') {
      navigate('/admin/dashboard');
    } else if (user?.role === 'client') {
      navigate('/client/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Access Denied</h1>
          <p className="login-subtitle">You are not authorized to view this page</p>
        </div>

        <button className="login-btn" onClick={handleGoBack}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};
