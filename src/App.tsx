import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/contexts/AuthContext';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { DashboardRouter } from './pages/DashboardRouter';
import { Login } from './pages/Login';

// Admin Components
import { AdminNavbar } from './admin/components/AdminNavbar';
import { Dashboard as AdminDashboard } from './admin/pages/Dashboard';
import { Upload as AdminUpload } from './admin/pages/Upload';
import { Profile as AdminProfile } from './admin/pages/Profile';

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
                  <AdminDashboard />
                </div>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/upload"
            element={
              <ProtectedRoute requireAdmin>
                <div className="app">
                  <AdminNavbar />
                  <AdminUpload />
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
                  <AdminProfile />
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/clients"
            element={
              <ProtectedRoute requireAdmin>
                <div className="app">
                  <AdminNavbar />
                  <div className="page-container">
                    <h1>Client Management</h1>
                    <p>Manage all clients here (Coming Soon)</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute requireAdmin>
                <div className="app">
                  <AdminNavbar />
                  <div className="page-container">
                    <h1>All Reports</h1>
                    <p>View and manage all reports (Coming Soon)</p>
                  </div>
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
