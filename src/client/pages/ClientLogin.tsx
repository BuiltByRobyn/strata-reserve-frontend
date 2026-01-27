import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAuth } from '../contexts/ClientAuthContext';

export const ClientLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useClientAuth();
  const navigate = useNavigate();

  // Check if Supabase is configured
  const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Please follow the setup instructions in SUPABASE_SETUP.md to configure your environment variables.');
      return;
    }

    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/client/dashboard');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {!isSupabaseConfigured && (
          <div className="dev-warning">
            <strong>⚠️ Development Mode</strong>
            <p>Supabase is not configured. Authentication will not work.</p>
            <p>See <code>SUPABASE_SETUP.md</code> for setup instructions.</p>
          </div>
        )}
        
        <div className="login-logo">
          <img src="/building-icon.png" alt="Building Icon" />
        </div>
        
        <div className="login-header">
          <h1>Client Portal</h1>
          <p className="login-subtitle">Strata Reserve Planning</p>
          <div className="client-badge">Depreciation Report Access</div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn client-btn" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <a href="#" className="forgot-password">Forgot Password?</a>
        </form>

        <div className="login-divider"></div>

        <div className="login-footer">
          <p className="help-text">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@stratareserveplanning.com">
              support@stratareserveplanning.com
            </a>
          </p>
          <div className="footer-links">
            <a href="/admin/login">Admin Login</a>
            <span>|</span>
            <a href="#">Privacy Policy</a>
            <span>|</span>
            <a href="#">Terms of Use</a>
          </div>
        </div>

        <p className="copyright">© 2025 Strata Reserve Planning. All rights reserved.</p>
      </div>
    </div>
  );
};
