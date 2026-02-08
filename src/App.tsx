import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/contexts/AuthContext';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { DashboardRouter } from './pages/DashboardRouter';
import { Login } from './pages/Login';
import { SetPassword } from './pages/SetPassword';

// Admin Components
import { AdminNavbar } from './admin/components/AdminNavbar';
import { Dashboard as AdminDashboard } from './admin/pages/Dashboard';
import { Profile as AdminProfile } from './admin/pages/Profile';
import StrataPage from './admin/pages/Strata';
import UsersPage from './admin/pages/Users';
import AppointmentsPage from './admin/pages/Appointments';

// Client Components
import { ClientNavbar } from './client/components/ClientNavbar';
import { Dashboard as ClientDashboard } from './client/pages/Dashboard';
import { Profile as ClientProfile } from './client/pages/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Password setup for new user invitations */}
          <Route path="/set-password" element={<SetPassword />} />
          
          {/* Redirect old login URLs to unified login */}
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/client/login" element={<Navigate to="/login" replace />} />
          
          {/* Dashboard route - redirects based on role */}
          <Route path="/dashboard" element={<DashboardRouter />} />
          
          {/* Default route redirects to dashboard (which then redirects based on role) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Admin Routes - Only accessible by admin users */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <div className="app">
                  <AdminNavbar />
                  <main className="app-main">
                    <AdminDashboard />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute requireAdmin>
                <div className="app">
                  <AdminNavbar />
                  <main className="app-main">
                    <AdminProfile />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/strata"
            element={
              <ProtectedRoute requireAdmin>
                <div className="app">
                  <AdminNavbar />
                  <main className="app-main">
                    <StrataPage />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin>
                <div className="app">
                  <AdminNavbar />
                  <main className="app-main">
                    <UsersPage />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/appointments"
            element={
              <ProtectedRoute requireAdmin>
                <div className="app">
                  <AdminNavbar />
                  <main className="app-main">
                    <AppointmentsPage />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          {/* Client Routes - Only accessible by client users */}
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute requireClient>
                <div className="app">
                  <ClientNavbar />
                  <ClientDashboard />
                </div>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/client/profile"
            element={
              <ProtectedRoute requireClient>
                <div className="app">
                  <ClientNavbar />
                  <ClientProfile />
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/client/reports"
            element={
              <ProtectedRoute requireClient>
                <div className="app">
                  <ClientNavbar />
                  <div className="page-container">
                    <h1>My Reports</h1>
                    <p>View your depreciation reports (Coming Soon)</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
