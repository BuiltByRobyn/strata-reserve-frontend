import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../../shared/routes/ProtectedRoute';
import { AdminNavbar } from '../components/AdminNavbar';
import { Dashboard } from '../pages/Dashboard';
import { Profile } from '../pages/Profile';
import StrataPage from '../pages/Strata';
import UsersPage from '../pages/Users';
import AppointmentsPage from '../pages/Appointments';
import DocumentsPage from '../pages/Documents';

export const adminRoutes = [
  <Route key="admin-dashboard" path="/admin/dashboard" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <Dashboard />
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-profile" path="/admin/profile" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <Profile />
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-strata" path="/admin/strata" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <StrataPage />
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-users" path="/admin/users" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <UsersPage />
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-appointments" path="/admin/appointments" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <AppointmentsPage />
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-documents" path="/admin/documents" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <DocumentsPage />
      </div>
    </ProtectedRoute>
  } />,
];
