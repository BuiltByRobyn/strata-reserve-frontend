import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { PasswordToggleButton } from "../components/PasswordToggleButton";
import { calculatePasswordStrength } from "../utils/passwordUtils";
import type { PasswordStrength } from "../utils/passwordUtils";

type PageState = "loading" | "error" | "form" | "success";

const parseHashParams = (): Record<string, string> => {
  const hash = window.location.hash.slice(1);
  return Object.fromEntries(new URLSearchParams(hash));
};

export const ResetPassword = () => {
  const [pageState, setPageState] = useState<PageState>("loading");

  // Password form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrength>(null);

  // Resend form state
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState("");

  const navigate = useNavigate();
  const { signOut } = useAuth();
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    const params = parseHashParams();

    if (params.error) {
      setPageState("error");
      return;
    }

    // token_hash flow: verify the OTP directly (same pattern as AcceptInvite)
    if (params.token_hash && params.type === "recovery") {
      supabase.auth
        .verifyOtp({ token_hash: params.token_hash, type: "recovery" })
        .then(({ error }) => {
          setPageState(error ? "error" : "form");
        });
      return;
    }

    // Fallback: wait for session / auth events (legacy implicit flow via /auth/callback)
    let cleanup: (() => void) | undefined;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setPageState("form");
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setPageState("form");
        }
      });

      const timeout = setTimeout(() => {
        setPageState("error");
        subscription.unsubscribe();
      }, 5000);

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    };

    checkSession().then((fn) => {
      cleanup = fn;
    });

    return () => cleanup?.();
  }, []);

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    if (passwordStrength === "weak") {
      setFormError("Please choose a stronger password");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      });
      if (updateError) {
        setFormError(updateError.message);
        setLoading(false);
        return;
      }
      await signOut();
      setPageState("success");
    } catch {
      setFormError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResendError("");
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        setResendError(error.message);
      } else {
        setResendSent(true);
      }
    } catch {
      setResendError("An unexpected error occurred. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="set-password-page">
      <div className="set-password-card">
        <div className="set-password-logo">
          <img src="/logonobg.png" alt="Building Icon" />
        </div>

        <div className="set-password-header">
          <h1>Reset Your Password</h1>
          <p className="set-password-subtitle">
            {pageState === "success"
              ? "Password reset successfully!"
              : pageState === "error"
                ? resendSent
                  ? "New link sent!"
                  : "Your reset link has expired"
                : pageState === "loading"
                  ? "Verifying your link…"
                  : "Choose a new secure password for your account"}
          </p>
        </div>

        {pageState === "success" && (
          <div className="success-message">
            <svg
              className="success-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>Your password has been reset successfully.</p>
            <button
              className="set-password-btn"
              onClick={() => navigate("/login")}
            >
              Return to Login
            </button>
          </div>
        )}

        {pageState === "loading" && (
          <div
            style={{ textAlign: "center", padding: "30px 0", color: "#6B8E5F" }}
          >
            <p>Please wait…</p>
          </div>
        )}

        {pageState === "error" &&
          (resendSent ? (
            <div className="success-message">
              <svg
                className="success-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p>Check your inbox — a new reset link is on its way.</p>
              <p className="redirect-text">
                <a href="/login" style={{ color: "#6B8E5F" }}>
                  Back to Login
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleResend} className="set-password-form">
              <p
                className="set-password-subtitle"
                style={{ marginBottom: "20px", textAlign: "left" }}
              >
                Reset links can expire if your email client previews links
                automatically. Enter your email below to receive a new one.
              </p>
              <div className="form-group">
                <label htmlFor="resendEmail">Email Address</label>
                <input
                  id="resendEmail"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  disabled={resendLoading}
                  autoComplete="email"
                />
              </div>
              {resendError && (
                <div className="error-message">{resendError}</div>
              )}
              <button
                type="submit"
                className="set-password-btn"
                disabled={resendLoading}
              >
                {resendLoading ? "Sending…" : "Send New Reset Link"}
              </button>
              <p
                className="help-text"
                style={{ textAlign: "center", marginTop: "16px" }}
              >
                <a href="/login">Back to Login</a>
              </p>
            </form>
          ))}


        {pageState === "form" && (
          <form onSubmit={handlePasswordSubmit} className="set-password-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <PasswordToggleButton
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                />
              </div>
              {passwordStrength && (
                <div className="password-strength">
                  <div className="strength-bar-container">
                    <div
                      className={`strength-bar strength-${passwordStrength}`}
                    ></div>
                  </div>
                  <span
                    className={`strength-text strength-${passwordStrength}`}
                  >
                    {passwordStrength === "weak" && "Weak password"}
                    {passwordStrength === "medium" && "Medium strength"}
                    {passwordStrength === "strong" && "Strong password"}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <PasswordToggleButton
                  showPassword={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </div>
            </div>

            <div className="password-requirements">
              <p className="requirements-title">Password must contain:</p>
              <ul>
                <li className={password.length >= 8 ? "met" : ""}>
                  At least 8 characters
                </li>
                <li
                  className={
                    /[A-Z]/.test(password) && /[a-z]/.test(password)
                      ? "met"
                      : ""
                  }
                >
                  Uppercase and lowercase letters
                </li>
                <li className={/[0-9]/.test(password) ? "met" : ""}>
                  At least one number
                </li>
                <li className={/[^A-Za-z0-9]/.test(password) ? "met" : ""}>
                  At least one special character (optional but recommended)
                </li>
              </ul>
            </div>

            {formError && <div className="error-message">{formError}</div>}

            <button
              type="submit"
              className="set-password-btn"
              disabled={loading}
            >
              {loading ? "Resetting Password…" : "Reset Password"}
            </button>
          </form>
        )}

        <div className="set-password-divider"></div>

        <div className="set-password-footer">
          <p className="help-text">
            Need help? Contact our support team at{" "}
            <a href="mailto:contact@builtbyrobyn.com">
              contact@builtbyrobyn.com
            </a>
          </p>
        </div>

        <p className="copyright">
          © 2026 BuiltByRobyn. All rights reserved.
        </p>
      </div>
    </div>
  );
};
