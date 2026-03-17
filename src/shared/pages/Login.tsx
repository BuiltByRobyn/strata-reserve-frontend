import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PasswordToggleButton } from "../components/PasswordToggleButton";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const { signIn, resetPasswordForEmail, user } = useAuth();
  const navigate = useNavigate();

  // Check if Supabase is configured
  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      setError(
        "Supabase is not configured yet. Please follow the setup instructions in SUPABASE_SETUP.md to configure your environment variables.",
      );
      return;
    }

    setError("");
    setLoading(true);

    if (isForgotPasswordMode) {
      const { error } = await resetPasswordForEmail(email);
      if (error) {
        setError(error.message);
      } else {
        setResetMessage("Check your email for the password reset link!");
      }
      setLoading(false);
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {!isSupabaseConfigured && (
          <div className="dev-warning">
            <strong>⚠️ Development Mode</strong>
            <p>Supabase is not configured. Authentication will not work.</p>
            <p>
              See <code>SUPABASE_SETUP.md</code> for setup instructions.
            </p>
          </div>
        )}

        <div className="login-logo">
          <img src="/logonobg.png" alt="Building Icon" />
        </div>

        <div className="login-header">
          <h1>Strata Reserve Planning</h1>
          <p className="login-subtitle">Information Report Portal</p>
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
              autoFocus
            />
          </div>

          {isForgotPasswordMode ? (
            <>
              {resetMessage && <div className="success-message" style={{ color: 'green', marginBottom: '1rem', textAlign: 'center' }}>{resetMessage}</div>}
              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                className="forgot-password"
                onClick={() => {
                  setIsForgotPasswordMode(false);
                  setError("");
                  setResetMessage("");
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'block', margin: '1rem auto 0' }}
              >
                Back to Login
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <PasswordToggleButton showPassword={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </button>

              <button
                type="button"
                className="forgot-password"
                onClick={() => {
                  setIsForgotPasswordMode(true);
                  setError("");
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'block', margin: '1rem auto 0' }}
              >
                Forgot Password?
              </button>
            </>
          )}
        </form>

        <div className="login-divider"></div>

        <div className="login-footer">
          <p className="help-text">
            Need help? Contact our support team at{" "}
            <a href="mailto:support@stratareserveplanning.com">
              support@stratareserveplanning.com
            </a>
          </p>
          <div className="footer-links">
            <Link to="/privacy">Privacy Policy</Link>
            <span>|</span>
            <Link to="/terms">Terms of Use</Link>
          </div>
        </div>

        <p className="copyright">
          © 2026 Strata Reserve Planning. All rights reserved.
        </p>
      </div>
    </div>
  );
};
