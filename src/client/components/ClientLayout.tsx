import { useState, useEffect } from 'react';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ClientNavbar } from './ClientNavbar';
import { Modal } from '../../shared/components/Modal';

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const { activeRequest, fileId, loading } = useClientFileNumber();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (!fileId || !activeRequest?.appointmentOfferedAt) return;
    const key = `welcome-modal-shown-${fileId}`;
    if (!localStorage.getItem(key)) {
      setShowWelcomeModal(true);
      localStorage.setItem(key, '1');
    }
  }, [fileId, activeRequest?.appointmentOfferedAt]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="app">
      <ClientNavbar activeRequest={activeRequest} />
      <main className="app-main">{children}</main>
      <Modal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        title="Please book an inspection date"
        size="medium"
        footer={
          <button className="btn btn-primary" onClick={() => setShowWelcomeModal(false)}>
            Close
          </button>
        }
      >
        <p>
          Your submission has been approved and you can now book an inspection date.
          Please select your preferred dates and times from the available slots below.
        </p>
        <p>
          If you have any questions, please contact us at{' '}
          <a href="mailto:clientcare@stratareserveplanning.com">
            clientcare@stratareserveplanning.com
          </a>
        </p>
      </Modal>
    </div>
  );
};
