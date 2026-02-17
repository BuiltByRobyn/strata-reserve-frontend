import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../../shared/routes/ProtectedRoute';
import { ClientNavbar } from '../components/ClientNavbar';
import { Dashboard } from '../pages/Dashboard';
import DocumentsPage from '../pages/Documents';
import SurveyPage from '../pages/Survey';
import SurveySectionPage from '../pages/SurveySection';
import StrataInformation from '../pages/StrataInformation';
import StrataMembers from '../pages/StrataMembers';
import Timelines from '../pages/Timelines';
import InspectionDate from '../pages/InspectionDate';

export const clientRoutes = [
  <Route key="client-dashboard" path="/client/dashboard" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <Dashboard />
      </div>
    </ProtectedRoute>
  } />,
  <Route key="client-strata-information" path="/client/strata-information" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <main className="app-main">
          <StrataInformation />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="client-strata-members" path="/client/strata-members" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <main className="app-main">
          <StrataMembers />
        </main>
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
  <Route key="client-survey-section" path="/client/survey/:section" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <main className="app-main">
          <SurveySectionPage />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="client-survey" path="/client/survey" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <main className="app-main">
          <SurveyPage />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="client-timelines" path="/client/timelines" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <main className="app-main">
          <Timelines />
        </main>
      </div>
    </ProtectedRoute>
  } />,
  <Route key="client-inspection-date" path="/client/inspection-date" element={
    <ProtectedRoute requireClient>
      <div className="app">
        <ClientNavbar />
        <main className="app-main">
          <InspectionDate />
        </main>
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
