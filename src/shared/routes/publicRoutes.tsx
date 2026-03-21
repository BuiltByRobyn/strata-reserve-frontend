import { Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { SetPassword } from '../pages/SetPassword';
import { ResetPassword } from '../pages/ResetPassword';
import { PrivacyPolicy } from '../pages/PrivacyPolicy';
import { TermsOfUse } from '../pages/TermsOfUse';
import { AuthCallback } from '../pages/AuthCallback';
import { DashboardRouter } from './DashboardRouter';

export const publicRoutes = [
  <Route key="login" path="/login" element={<Login />} />,
  <Route key="privacy" path="/privacy" element={<PrivacyPolicy />} />,
  <Route key="terms" path="/terms" element={<TermsOfUse />} />,
  <Route key="set-password" path="/set-password" element={<SetPassword />} />,
  <Route key="reset-password" path="/reset-password" element={<ResetPassword />} />,
  <Route key="admin-login" path="/admin/login" element={<Navigate to="/login" replace />} />,
  <Route key="client-login" path="/client/login" element={<Navigate to="/login" replace />} />,
  <Route key="dashboard" path="/dashboard" element={<DashboardRouter />} />,
  <Route key="auth-callback" path="/auth/callback" element={<AuthCallback />} />,
  <Route key="root" path="/" element={<Navigate to="/dashboard" replace />} />,
];
