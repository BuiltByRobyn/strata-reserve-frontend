import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export const AcceptInvite = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const params = new URLSearchParams(window.location.hash.slice(1));
  const tokenHash = params.get('token_hash');
  const type = params.get('type');

  const handleAccept = async () => {
    if (!tokenHash) {
      setError('Invalid invitation link. Please request a new invitation.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'invite',
    });

    if (verifyError) {
      setLoading(false);
      navigate('/login', {
        replace: true,
        state: { error: verifyError.message },
      });
      return;
    }

    navigate('/set-password', { replace: true });
  };

  const isInvalidLink = !tokenHash || (type && type !== 'invite');

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logonobg.png" alt="Building Icon" />
        </div>

        <div className="login-header">
          <h1>Strata Reserve Planning</h1>
          <p className="login-subtitle">Data Collection Portal</p>
        </div>

        <div className="login-form">
          {isInvalidLink ? (
            <div className="error-message">
              Invalid invitation link. Please request a new invitation.
            </div>
          ) : (
            <>
              <p style={{ textAlign: 'center', color: '#4B5563', marginBottom: '1.5rem' }}>
                You've been invited to create an account. Click below to accept your invitation and set up your password.
              </p>

              {error && <div className="error-message">{error}</div>}

              <button
                className="login-btn"
                onClick={handleAccept}
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Accept Invitation'}
              </button>
            </>
          )}
        </div>

        <div className="login-divider"></div>

        <div className="login-footer">
          <p className="help-text">
            Need help? Contact our support team at{' '}
            <a href="mailto:contact@builtbyrobyn.com">
              contact@builtbyrobyn.com
            </a>
          </p>
        </div>

        <p className="copyright">© 2026 BuiltByRobyn. All rights reserved.</p>
      </div>
    </div>
  );
};
