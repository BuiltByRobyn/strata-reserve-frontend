import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { useClientAppointments } from '../../shared/hooks/useClientAppointments';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ClientNavbar } from './ClientNavbar';
import { Modal } from '../../shared/components/Modal';

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { activeRequest, fileId, loading } = useClientFileNumber();
  const { getActiveAppointment } = useClientAppointments();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const offeredAt = activeRequest?.appointmentOfferedAt ?? null;
  const hasCompletedInspection = activeRequest?.appointments?.some(
    a => a.status === 'Completed' && a.appointmentType?.isDraftMeeting === false
  ) ?? false;
  const hasCompletedDraft = activeRequest?.appointments?.some(
    a => a.status === 'Completed' && a.appointmentType?.isDraftMeeting === true
  ) ?? false;
  const isDraftOffer = activeRequest?.appointmentOfferType?.isDraftMeeting === true
    || (hasCompletedInspection && !hasCompletedDraft);

  useEffect(() => {
    if (!fileId || !offeredAt) return;
    if (hasCompletedDraft) return;
    let cancelled = false;

    const checkAndShow = async () => {
      const activeAppointment = await getActiveAppointment();
      if (cancelled) return;
      if (!isDraftOffer && activeAppointment?.type === 'scheduled') {
        setShowWelcomeModal(false);
        return;
      }

      const key = `welcome-modal-last-offer-${fileId}`;
      const lastSeenOfferAt = localStorage.getItem(key);
      if (lastSeenOfferAt !== offeredAt) {
        setShowWelcomeModal(true);
        localStorage.setItem(key, offeredAt);
      }
    };

    checkAndShow();
    return () => { cancelled = true; };
  }, [fileId, offeredAt, isDraftOffer, hasCompletedDraft, getActiveAppointment]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="app">
      <ClientNavbar activeRequest={activeRequest} />
      <main className="app-main">{children}</main>
      <Modal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        title={isDraftOffer ? 'Draft Meeting Available' : 'Please book an inspection date'}
        size="medium"
        footer={
          isDraftOffer ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowWelcomeModal(false);
                navigate('/client/inspection-date');
              }}
            >
              Book Now
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowWelcomeModal(false)}>
              Close
            </button>
          )
        }
      >
        {isDraftOffer ? (
          <div className="thank-you-content">
            <p>Your inspection is complete. You can now book your draft meeting — select your preferred dates to get started.</p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </Modal>
    </div>
  );
};
