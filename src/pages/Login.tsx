import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../shared/contexts/AuthContext";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Check if Supabase is configured
  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );

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

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // The routing logic in App.tsx will handle redirecting to the appropriate dashboard
      // based on the user's role
      navigate("/dashboard");
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
          <img src="/building-icon.png" alt="Building Icon" />
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
            />
          </div>

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
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <a href="#" className="forgot-password">
            Forgot Password?
          </a>
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
            <a href="#">Privacy Policy</a>
            <span>|</span>
            <a href="#">Terms of Use</a>
          </div>
        </div>

        <p className="copyright">
          © 2026 Strata Reserve Planning. All rights reserved.
        </p>
      </div>
    </div>
  );
};
