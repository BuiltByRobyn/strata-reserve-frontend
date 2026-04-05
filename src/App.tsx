import { BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './shared/contexts/AuthContext';
import { BackendWarmup } from './shared/components/BackendWarmup';
import { publicRoutes } from './shared/routes/publicRoutes';
import { adminRoutes } from './admin/routes/adminRoutes';
import { clientRoutes } from './client/routes/clientRoutes';

function App() {
  return (
    <BackendWarmup>
      <AuthProvider>
        <Router>
          <Routes>
            {publicRoutes}
            {adminRoutes}
            {clientRoutes}
          </Routes>
        </Router>
        <Toaster position="top-center" />
      </AuthProvider>
    </BackendWarmup>
  );
}

export default App;
