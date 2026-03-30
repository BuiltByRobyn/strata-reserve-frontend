import { useState, useEffect } from 'react';
import { useActivationRequest } from '../hooks/useActivationRequest';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';

export const NoFileNumberState = () => {
  const { request, loading, createRequest } = useActivationRequest();
  const [showThankYou, setShowThankYou] = useState(false);
  const [showRejection, setShowRejection] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!request) return;
    if (
      request.status === 'Rejected' &&
      request.rejectionReason &&
      !localStorage.getItem(`activation_rejection_seen_${request.activationRequestId}`)
    ) {
      setShowRejection(true);
    }
    if (
      request.status === 'Approved' &&
      !localStorage.getItem(`activation_approval_seen_${request.activationRequestId}`)
    ) {
      setShowApproval(true);
    }
  }, [request?.activationRequestId, request?.status, request?.rejectionReason]);

  const handleDismissRejection = () => {
    if (request) {
      localStorage.setItem(`activation_rejection_seen_${request.activationRequestId}`, '1');
    }
    setShowRejection(false);
  };

  const handleDismissApproval = () => {
    if (request) {
      localStorage.setItem(`activation_approval_seen_${request.activationRequestId}`, '1');
    }
    setShowApproval(false);
  };

  const handleRequest = async () => {
    setSubmitting(true);
    const ok = await createRequest();
    if (ok) setShowThankYou(true);
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
        isOpen={showRejection}
        onClose={handleDismissRejection}
        title="Activation Request Update"
        size="medium"
        footer={
          <button className="btn-primary" onClick={handleDismissRejection}>
            OK
          </button>
        }
      >
        <div className="rejection-notice-content">
          <p>Your strata's activation request was not approved.</p>
          {request?.rejectionReason && (
            <p className="rejection-notice-reason">{request.rejectionReason}</p>
          )}
          <p>You may submit a new request at any time.</p>
        </div>
      </Modal>

      <Modal
        isOpen={showApproval}
        onClose={handleDismissApproval}
        title="Account Activated"
        size="medium"
        footer={
          <button className="btn-primary" onClick={handleDismissApproval}>
            Close
          </button>
        }
      >
        <div className="thank-you-content">
          <p>
            Your strata's activation request has been approved. Your account is now active and your file number has been assigned. Please refresh the page to continue.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={showThankYou}
        onClose={() => setShowThankYou(false)}
        title="Thank You"
        size="medium"
        footer={
          <button className="btn-primary" onClick={() => setShowThankYou(false)}>
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
