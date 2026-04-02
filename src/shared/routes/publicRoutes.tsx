import { Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { SetPassword } from '../pages/SetPassword';
import { ResetPassword } from '../pages/ResetPassword';
import { PrivacyPolicy } from '../pages/PrivacyPolicy';
import { TermsOfUse } from '../pages/TermsOfUse';
import { Help } from '../pages/Help';
import { AuthCallback } from '../pages/AuthCallback';
import { AcceptInvite } from '../pages/AcceptInvite';
import { DashboardRouter } from './DashboardRouter';

// If Supabase redirects to the root URL instead of /auth/callback (e.g. because
// the redirectTo URL wasn't in the Supabase allowed list), the hash/query will
// still contain the auth tokens. Forward them to AuthCallback so they aren't lost.
const RootRedirect = () => {
  const hash = window.location.hash;
  const search = window.location.search;
  console.log('[RootRedirect] Triggered. hash:', hash, 'search:', search);
  if (
    hash.includes('access_token=') ||
    hash.includes('error_description=') ||
    search.includes('code=') ||
    search.includes('error=')
  ) {
    console.log('[RootRedirect] Auth tokens detected → forwarding to /auth/callback');
    return <Navigate to={`/auth/callback${search}${hash}`} replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export const publicRoutes = [
  <Route key="login" path="/login" element={<Login />} />,
  <Route key="privacy" path="/privacy" element={<PrivacyPolicy />} />,
  <Route key="terms" path="/terms" element={<TermsOfUse />} />,
  <Route key="help" path="/help" element={<Help />} />,
  <Route key="set-password" path="/set-password" element={<SetPassword />} />,
  <Route key="reset-password" path="/reset-password" element={<ResetPassword />} />,
  <Route key="admin-login" path="/admin/login" element={<Navigate to="/login" replace />} />,
  <Route key="client-login" path="/client/login" element={<Navigate to="/login" replace />} />,
  <Route key="dashboard" path="/dashboard" element={<DashboardRouter />} />,
  <Route key="accept-invite" path="/accept-invite" element={<AcceptInvite />} />,
  <Route key="auth-callback" path="/auth/callback" element={<AuthCallback />} />,
  <Route key="root" path="/" element={<RootRedirect />} />,
];
