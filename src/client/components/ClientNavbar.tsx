import { useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { Navbar } from '../../shared/components/Navbar';
import type { ServiceRequest } from '../../shared/types/entities.types';

const BASE_NAV_ITEMS = [
  { to: '/client/dashboard', label: 'Dashboard', end: true },
  { to: '/client/strata-information', label: 'Strata Information' },
  { to: '/client/strata-members', label: 'Strata Members' },
  { to: '/client/timelines', label: 'Timelines' },
  { to: '/client/survey', label: 'Survey' },
  { to: '/client/documents', label: 'Documents' },
];

export const ClientNavbar = ({ activeRequest }: { activeRequest: ServiceRequest | null }) => {
  const { user } = useAuth();
  const clientUser = user?.role === 'client' ? user : null;

  const navItems = useMemo(() => {
    const items = [...BASE_NAV_ITEMS];
    if (activeRequest?.appointmentOfferedAt) {
      items.push({ to: '/client/inspection-date', label: 'Inspection Date' });
    }
    return items;
  }, [activeRequest?.appointmentOfferedAt]);

  return (
    <Navbar
      variant="client"
      navItems={navItems}
      userInfoRows={[
        { label: 'Strata ID:', value: clientUser?.strataPlan || 'N/A' },
        { label: 'User:', value: `${clientUser?.firstName || ''} ${clientUser?.lastName || ''}` },
      ]}
      loading={false}
    />
  );
};
