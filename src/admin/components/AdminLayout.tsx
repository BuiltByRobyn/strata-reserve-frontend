import { AdminNavbar } from './AdminNavbar';

export const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="app">
    <AdminNavbar />
    <main className="app-main">{children}</main>
  </div>
);
