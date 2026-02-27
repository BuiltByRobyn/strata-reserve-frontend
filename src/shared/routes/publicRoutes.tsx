import { Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { SetPassword } from '../pages/SetPassword';
import { PrivacyPolicy } from '../pages/PrivacyPolicy';
import { TermsOfUse } from '../pages/TermsOfUse';
import { DashboardRouter } from './DashboardRouter';

export const publicRoutes = [
  <Route key="login" path="/login" element={<Login />} />,
  <Route key="privacy" path="/privacy" element={<PrivacyPolicy />} />,
  <Route key="terms" path="/terms" element={<TermsOfUse />} />,
  <Route key="set-password" path="/set-password" element={<SetPassword />} />,
  <Route key="admin-login" path="/admin/login" element={<Navigate to="/login" replace />} />,
  <Route key="client-login" path="/client/login" element={<Navigate to="/login" replace />} />,
  <Route key="dashboard" path="/dashboard" element={<DashboardRouter />} />,
  <Route key="root" path="/" element={<Navigate to="/dashboard" replace />} />,
];
