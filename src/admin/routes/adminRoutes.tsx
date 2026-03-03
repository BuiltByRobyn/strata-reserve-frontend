import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../../shared/routes/ProtectedRoute';
import { AdminLayout } from '../components/AdminLayout';
import { Dashboard } from '../pages/Dashboard';
import ProfilePage from '../pages/Profile';
import StrataPage from '../pages/Strata';
import StrataDetailPage from '../pages/StrataDetail';
import UsersPage from '../pages/Users';
import AppointmentsPage from '../pages/Appointments';
import DocumentsPage from '../pages/Documents';
import QuestionsPage from '../pages/Questions';
import TimelinesPage from '../pages/Timelines';

export const adminRoutes = [
  <Route key="admin-dashboard" path="/admin/dashboard" element={
    <ProtectedRoute requireAdmin>
      <AdminLayout><Dashboard /></AdminLayout>
    </ProtectedRoute>
  } />,
  <Route key="admin-profile" path="/admin/profile" element={
    <ProtectedRoute requireAdmin>
      <AdminLayout><ProfilePage /></AdminLayout>
    </ProtectedRoute>
  } />,
  <Route key="admin-strata-detail" path="/admin/strata/:id" element={
    <ProtectedRoute requireAdmin>
      <AdminLayout><StrataDetailPage /></AdminLayout>
    </ProtectedRoute>
  } />,
  <Route key="admin-strata" path="/admin/strata" element={
    <ProtectedRoute requireAdmin>
      <AdminLayout><StrataPage /></AdminLayout>
    </ProtectedRoute>
  } />,
  <Route key="admin-users" path="/admin/users" element={
    <ProtectedRoute requireAdmin>
      <AdminLayout><UsersPage /></AdminLayout>
    </ProtectedRoute>
  } />,
  <Route key="admin-appointments" path="/admin/appointments" element={
    <ProtectedRoute requireAdmin>
      <AdminLayout><AppointmentsPage /></AdminLayout>
    </ProtectedRoute>
  } />,
  <Route key="admin-documents" path="/admin/documents" element={
    <ProtectedRoute requireAdmin>
      <AdminLayout><DocumentsPage /></AdminLayout>
    </ProtectedRoute>
  } />,
  <Route key="admin-questions" path="/admin/questions" element={
    <ProtectedRoute requireAdmin>
      <AdminLayout><QuestionsPage /></AdminLayout>
    </ProtectedRoute>
  } />,
  <Route key="admin-timelines" path="/admin/timelines" element={
    <ProtectedRoute requireAdmin>
      <AdminLayout><TimelinesPage /></AdminLayout>
    </ProtectedRoute>
  } />,
];
