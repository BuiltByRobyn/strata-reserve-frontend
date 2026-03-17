import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { PasswordToggleButton } from './PasswordToggleButton';
import type { ChangePasswordModalProps } from '../types/component.types';

export const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { updatePassword, signIn, user } = useAuth();

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    
    const hasMinLength = newPassword.length >= 8;
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasMinLength || !hasLower || !hasUpper || !hasDigit || !hasSymbol) {
      setError('Password does not meet the minimum requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    
    try {
      if (!user?.email) throw new Error("No user email found");
      
      const { error: signInError } = await signIn(user.email, currentPassword);
      if (signInError) {
        throw new Error("Incorrect current password. Please try again.");
      }

      const { error: authError } = await updatePassword(newPassword);
      if (authError) {
        throw authError; // Supabase errors typically have a .message property
      }
      
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('Password change error:', err);
      setError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
      footer={
        <div className="modal-footer-actions">
          {!success && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              >
                {saving ? 'Saving...' : 'Update Password'}
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="change-password-form">
        {success ? (
          <div className="alert alert-success" style={{ textAlign: 'center', padding: '2rem' }}>
            <strong>Password updated successfully!</strong>
            <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>You can now use your new password to log in.</p>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="currentPassword" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151', fontSize: '14px' }}>Current Password</label>
              <div className="password-input-wrapper">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  disabled={saving}
                  style={{
                    backgroundColor: '#fff',
                    borderColor: '#e5e7eb'
                  }}
                />
                <PasswordToggleButton showPassword={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="newPassword" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                <span>New Password</span>
                <span style={{ color: '#ef4444', fontSize: '12px' }}>Use at least 8 characters, including uppercase, lowercase, a number, and a symbol.</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={saving}
                  style={{
                    backgroundColor: '#fff',
                    borderColor: '#e5e7eb'
                  }}
                />
                <PasswordToggleButton showPassword={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
              </div>
              
              {newPassword && (
                <div style={{ marginTop: '0.5rem', fontSize: '12px', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ color: newPassword.length >= 8 ? '#10b981' : '#ef4444' }}>
                    {newPassword.length >= 8 ? '✓' : '✗'} 8+ characters
                  </span>
                  <span style={{ color: /[a-z]/.test(newPassword) ? '#10b981' : '#ef4444' }}>
                    {/[a-z]/.test(newPassword) ? '✓' : '✗'} Lowercase
                  </span>
                  <span style={{ color: /[A-Z]/.test(newPassword) ? '#10b981' : '#ef4444' }}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '✗'} Uppercase
                  </span>
                  <span style={{ color: /\d/.test(newPassword) ? '#10b981' : '#ef4444' }}>
                    {/\d/.test(newPassword) ? '✓' : '✗'} Number
                  </span>
                  <span style={{ color: /[^A-Za-z0-9]/.test(newPassword) ? '#10b981' : '#ef4444' }}>
                    {/[^A-Za-z0-9]/.test(newPassword) ? '✓' : '✗'} Symbol
                  </span>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151', fontSize: '14px' }}>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={saving}
                  style={{
                    backgroundColor: '#fff',
                    borderColor: '#e5e7eb'
                  }}
                />
                <PasswordToggleButton showPassword={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '0.5rem' }}>
                  Passwords do not match.
                </div>
              )}
            </div>
            
            <button type="submit" style={{ display: 'none' }}>Submit</button>
          </form>
        )}
      </div>
    </Modal>
  );
};
