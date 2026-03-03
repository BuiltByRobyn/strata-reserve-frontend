import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../../shared/routes/ProtectedRoute';
import { ClientLayout } from '../components/ClientLayout';
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
      <ClientLayout><Dashboard /></ClientLayout>
    </ProtectedRoute>
  } />,
  <Route key="client-strata-information" path="/client/strata-information" element={
    <ProtectedRoute requireClient>
      <ClientLayout><StrataInformation /></ClientLayout>
    </ProtectedRoute>
  } />,
  <Route key="client-strata-members" path="/client/strata-members" element={
    <ProtectedRoute requireClient>
      <ClientLayout><StrataMembers /></ClientLayout>
    </ProtectedRoute>
  } />,
  <Route key="client-documents" path="/client/documents" element={
    <ProtectedRoute requireClient>
      <ClientLayout><DocumentsPage /></ClientLayout>
    </ProtectedRoute>
  } />,
  <Route key="client-survey-section" path="/client/survey/:section" element={
    <ProtectedRoute requireClient>
      <ClientLayout><SurveySectionPage /></ClientLayout>
    </ProtectedRoute>
  } />,
  <Route key="client-survey" path="/client/survey" element={
    <ProtectedRoute requireClient>
      <ClientLayout><SurveyPage /></ClientLayout>
    </ProtectedRoute>
  } />,
  <Route key="client-timelines" path="/client/timelines" element={
    <ProtectedRoute requireClient>
      <ClientLayout><Timelines /></ClientLayout>
    </ProtectedRoute>
  } />,
  <Route key="client-inspection-date" path="/client/inspection-date" element={
    <ProtectedRoute requireClient>
      <ClientLayout><InspectionDate /></ClientLayout>
    </ProtectedRoute>
  } />,
  <Route key="client-reports" path="/client/reports" element={
    <ProtectedRoute requireClient>
      <ClientLayout>
        <div className="page-container">
          <h1>My Reports</h1>
          <p>View your depreciation reports (Coming Soon)</p>
        </div>
      </ClientLayout>
    </ProtectedRoute>
  } />,
];
