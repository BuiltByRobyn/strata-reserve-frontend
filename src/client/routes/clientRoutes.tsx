import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../../shared/routes/ProtectedRoute';
import { ClientNavbar } from '../components/ClientNavbar';
import { Dashboard } from '../pages/Dashboard';
import { Profile } from '../pages/Profile';
import DocumentsPage from '../pages/Documents';

export const clientRoutes = [
  <Route key="client-dashboard" path="/client/dashboard" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <Dashboard />
      </div>
    </ProtectedRoute>
  } />,
  <Route key="client-profile" path="/client/profile" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <Profile />
      </div>
    </ProtectedRoute>
  } />,
  <Route key="client-documents" path="/client/documents" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <DocumentsPage />
      </div>
    </ProtectedRoute>
  } />,
  <Route key="client-reports" path="/client/reports" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <div className="page-container">
          <h1>My Reports</h1>
          <p>View your depreciation reports (Coming Soon)</p>
        </div>
      </div>
    </ProtectedRoute>
  } />,
];
