import { useAuth } from '../../shared/contexts/AuthContext';
import { Navbar } from '../../shared/components/Navbar';

const ADMIN_NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', end: true },
  { to: '/admin/strata', label: 'Strata' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/documents', label: 'Documents' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/appointments', label: 'Appointments' },
  { to: '/admin/timelines', label: 'Timelines' },
  { to: '/admin/profile', label: 'System Settings' },
];

export const AdminNavbar = () => {
  const { user } = useAuth();
  const adminUser = user?.role === 'admin' ? user : null;

  return (
    <Navbar
      variant="admin"
      navItems={ADMIN_NAV_ITEMS}
      userInfoRows={[
        { label: 'Company:', value: 'Strata Reserve Planning' },
        { label: 'User:', value: adminUser?.fullName || '' },
      ]}
    />
  );
};
