import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ClientNavbar } from './ClientNavbar';

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const { activeRequest, loading } = useClientFileNumber();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="app">
      <ClientNavbar activeRequest={activeRequest} />
      <main className="app-main">{children}</main>
    </div>
  );
};
