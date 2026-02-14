import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../../shared/routes/ProtectedRoute';
import { AdminNavbar } from '../components/AdminNavbar';
import { Dashboard } from '../pages/Dashboard';
import ProfilePage from '../pages/Profile';
import StrataPage from '../pages/Strata';
import StrataDetailPage from '../pages/StrataDetail';
import UsersPage from '../pages/Users';
import AppointmentsPage from '../pages/Appointments';
import DocumentsPage from '../pages/Documents';
import QuestionsPage from '../pages/Questions';

export const adminRoutes = [
  <Route key="admin-dashboard" path="/admin/dashboard" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <main className="app-main">
          <Dashboard />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-profile" path="/admin/profile" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <main className="app-main">
          <ProfilePage />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-strata-detail" path="/admin/strata/:id" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <main className="app-main">
          <StrataDetailPage />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-strata" path="/admin/strata" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <main className="app-main">
          <StrataPage />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-users" path="/admin/users" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <main className="app-main">
          <UsersPage />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-appointments" path="/admin/appointments" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <main className="app-main">
          <AppointmentsPage />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-documents" path="/admin/documents" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <main className="app-main">
          <DocumentsPage />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="admin-questions" path="/admin/questions" element={
    <ProtectedRoute requireAdmin>
      <div className="app">
        <AdminNavbar />
        <main className="app-main">
          <QuestionsPage />
        </main>
      </div>
    </ProtectedRoute>
  } />,
];
