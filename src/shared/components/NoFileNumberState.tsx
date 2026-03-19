import { useState } from 'react';
import { useActivationRequest } from '../hooks/useActivationRequest';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';

export const NoFileNumberState = () => {
  const { request, loading, createRequest } = useActivationRequest();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async () => {
    setSubmitting(true);
    const ok = await createRequest();
    if (ok) setShowModal(true);
    setSubmitting(false);
  };

  if (loading) return <LoadingSpinner />;

  const isPending = request?.status === 'Pending';

  return (
    <>
      {isPending ? (
        <p className="no-file-number-message">
          No active file number found. Your profile will update as soon as your administrator reviews your pending request. In most cases, this will take no more than 3-5 business days.
        </p>
      ) : (
        <p className="no-file-number-message">
          No active file number found.{' '}
          <button className="btn-link" onClick={handleRequest} disabled={submitting}>
            {submitting ? 'Sending request...' : 'Request activation from your administrator here.'}
          </button>
        </p>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Thank You"
        size="medium"
        footer={
          <button className="btn-primary" onClick={() => setShowModal(false)}>
            Close
          </button>
        }
      >
        <div className="thank-you-content">
          <p>
            Thank you for highlighting that your account is inactive. A Strata Reserve Planning Team member will activate your account shortly.
          </p>
        </div>
      </Modal>
    </>
  );
};
