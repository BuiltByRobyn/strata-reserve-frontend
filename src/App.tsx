import { BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from './shared/contexts/AuthContext';
import { publicRoutes } from './shared/routes/publicRoutes';
import { adminRoutes } from './admin/routes/adminRoutes';
import { clientRoutes } from './client/routes/clientRoutes';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {publicRoutes}
          {adminRoutes}
          {clientRoutes}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
