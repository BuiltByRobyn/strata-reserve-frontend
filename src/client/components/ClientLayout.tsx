import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ClientNavbar } from './ClientNavbar';

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const { activeRequest, loading } = useClientServiceRequest();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="app">
      <ClientNavbar activeRequest={activeRequest} />
      <main className="app-main">{children}</main>
    </div>
  );
};
