import { useAuth } from '../../shared/contexts/AuthContext';
import { Navbar } from '../../shared/components/Navbar';

const CLIENT_NAV_ITEMS = [
  { to: '/client/dashboard', label: 'Dashboard', end: true },
  { to: '/client/strata-information', label: 'Strata Information' },
  { to: '/client/strata-members', label: 'Strata Members' },
  { to: '/client/timelines', label: 'Timelines' },
  { to: '/client/survey', label: 'Survey' },
  { to: '/client/documents', label: 'Documents' },
  { to: '/client/inspection-date', label: 'Inspection Date' },
];

export const ClientNavbar = () => {
  const { user } = useAuth();
  const clientUser = user?.role === 'client' ? user : null;

  return (
    <Navbar
      variant="client"
      navItems={CLIENT_NAV_ITEMS}
      userInfoRows={[
        { label: 'Strata ID:', value: clientUser?.strataPlan || 'N/A' },
        { label: 'User:', value: `${clientUser?.firstName || ''} ${clientUser?.lastName || ''}` },
      ]}
    />
  );
};
