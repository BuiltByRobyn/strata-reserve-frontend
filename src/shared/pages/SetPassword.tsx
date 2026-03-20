import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { PasswordToggleButton } from '../components/PasswordToggleButton';
import { calculatePasswordStrength } from '../utils/passwordUtils';
import type { PasswordStrength } from '../utils/passwordUtils';

export const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(null);
  const navigate = useNavigate();

  // Check if there's a valid session/token from the URL
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No valid token, redirect to login
        setError('Invalid or expired invitation link. Please request a new invitation.');
      }
    };
    
    checkSession();
  }, []);

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength === 'weak') {
      setError('Please choose a stronger password');
      return;
    }

    setLoading(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Success!
      setSuccess(true);
      
      // Wait 2 seconds then redirect to login
      setTimeout(() => {
        // Sign out to ensure they use their new password
        supabase.auth.signOut();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="set-password-page">
      <div className="set-password-card">
        <div className="set-password-logo">
          <img src="/logonobg.png" alt="Building Icon" />
        </div>
        
        <div className="set-password-header">
          <h1>Set Your Password</h1>
          <p className="set-password-subtitle">
            {success ? 'Password set successfully!' : 'Create a secure password for your account'}
          </p>
        </div>

        {success ? (
          <div className="success-message">
            <svg className="success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>Your password has been set successfully.</p>
            <p className="redirect-text">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="set-password-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <PasswordToggleButton showPassword={showPassword} onToggle={() => setShowPassword(!showPassword)} />
              </div>

              {passwordStrength && (
                <div className="password-strength">
                  <div className="strength-bar-container">
                    <div className={`strength-bar strength-${passwordStrength}`}></div>
                  </div>
                  <span className={`strength-text strength-${passwordStrength}`}>
                    {passwordStrength === 'weak' && 'Weak password'}
                    {passwordStrength === 'medium' && 'Medium strength'}
                    {passwordStrength === 'strong' && 'Strong password'}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <PasswordToggleButton showPassword={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
              </div>
            </div>

            <div className="password-requirements">
              <p className="requirements-title">Password must contain:</p>
              <ul>
                <li className={password.length >= 8 ? 'met' : ''}>At least 8 characters</li>
                <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'met' : ''}>
                  Uppercase and lowercase letters
                </li>
                <li className={/[0-9]/.test(password) ? 'met' : ''}>At least one number</li>
                <li className={/[^A-Za-z0-9]/.test(password) ? 'met' : ''}>
                  At least one special character (optional but recommended)
                </li>
              </ul>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="set-password-btn" disabled={loading}>
              {loading ? 'Setting Password...' : 'Set Password'}
            </button>
          </form>
        )}

        <div className="set-password-divider"></div>

        <div className="set-password-footer">
          <p className="help-text">
            Need help? Contact our support team at{' '}
            <a href="mailto:clientcare@stratareserveplanning.com">
              clientcare@stratareserveplanning.com
            </a>
          </p>
        </div>

        <p className="copyright">© 2026 Strata Reserve Planning. All rights reserved.</p>
      </div>
    </div>
  );
};
