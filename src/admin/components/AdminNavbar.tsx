import { useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { Navbar } from '../../shared/components/Navbar';
import type { NavItem } from '../../shared/types/component.types';

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', end: true },
  { to: '/admin/strata', label: 'Strata' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/documents', label: 'Documents' },
  { to: '/admin/questions', label: 'Questions', hideForRoles: ['inspector'] },
  { to: '/admin/appointments', label: 'Appointments' },
  { to: '/admin/timelines', label: 'Timelines' },
  { to: '/admin/profile', label: 'System Settings' },
];

export const AdminNavbar = () => {
  const { user } = useAuth();
  const adminUser = user && user.role !== 'client' ? user : null;
  const role = user?.role || '';

  const navItems = useMemo(() =>
    ADMIN_NAV_ITEMS.filter(item => !item.hideForRoles?.includes(role)),
    [role]
  );

  return (
    <Navbar
      variant="admin"
      navItems={navItems}
      userInfoRows={[
        { label: 'Company:', value: 'Strata Reserve Planning' },
        { label: 'User:', value: adminUser?.fullName || '' },
      ]}
    />
  );
};
