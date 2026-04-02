import { AdminNavbar } from './AdminNavbar';
import { Footer } from '../../shared/components/Footer';

export const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="app">
    <AdminNavbar />
    <main className="app-main">{children}</main>
    <Footer />
  </div>
);
