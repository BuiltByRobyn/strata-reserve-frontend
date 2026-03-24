import { useState, useMemo } from 'react';
import { Modal } from '../../shared/components/Modal';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { formatDateMedium, formatTime12h, getUserDisplayName } from '../../shared/utils/formatters';
import { getInspectorOptions } from '../../shared/utils/userUtils';
import type { AppointmentRequestReviewModalProps } from '../../shared/types/component.types';

const AppointmentRequestReviewModal = ({
  isOpen,
  onClose,
  request,
  inspectors,
  onReview,
}: AppointmentRequestReviewModalProps) => {
  const [inspectorId, setInspectorId] = useState('');
  const [addSecondInspector, setAddSecondInspector] = useState(false);
  const [secondInspectorId, setSecondInspectorId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!request) return null;

  const sr = request.fileNumber;
  const strataName = sr?.strata?.complexName || sr?.strata?.strataPlan || 'Unknown';

  const inspectorOptions = getInspectorOptions(inspectors);
  const secondInspectorOptions = useMemo(
    () => inspectorOptions.filter(o => o.value !== inspectorId),
    [inspectorOptions, inspectorId]
  );

  const handleApprove = async (choiceNum: number) => {
    setSubmitting(true);
    setError(null);
    const result = await onReview(request.appointmentRequestId, {
      approved: true,
      approvedDateChoice: choiceNum,
      inspectorProfileId: inspectorId,
      secondInspectorProfileId: addSecondInspector && secondInspectorId ? secondInspectorId : undefined,
      comments: comments.trim() || undefined,
    });
    setSubmitting(false);
    if (result.success) {
      resetAndClose();
    } else {
      setError(result.error || 'Approval failed');
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);
    const result = await onReview(request.appointmentRequestId, {
      approved: false,
      rejectionReason: rejectionReason.trim(),
      comments: comments.trim() || undefined,
    });
    setSubmitting(false);
    if (result.success) {
      resetAndClose();
    } else {
      setError(result.error || 'Rejection failed');
    }
  };

  const resetAndClose = () => {
    setInspectorId('');
    setAddSecondInspector(false);
    setSecondInspectorId('');
    setRejectionReason('');
    setComments('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Review Appointment Request" size="large">
      <div className="review-modal">
        {error && <div className="review-modal__error">{error}</div>}

        <div className="review-modal__info">
          <div className="review-modal__row">
            <span className="review-modal__label">Strata</span>
            <span className="review-modal__value">{strataName}</span>
          </div>
          <div className="review-modal__row">
            <span className="review-modal__label">Type</span>
            <span className="review-modal__value">{request.appointmentType?.typeName}</span>
          </div>
          <div className="review-modal__row">
            <span className="review-modal__label">Requested By</span>
            <span className="review-modal__value">
              {getUserDisplayName(request.requestedBy, '-')}
            </span>
          </div>
        </div>

        <div className="review-modal__choices">
          <div className="review-modal__choice">
            <h4>First Choice</h4>
            <p>{formatDateMedium(request.firstChoiceDate)}</p>
            <p>{request.firstChoiceTimeSlot?.slotName} ({formatTime12h(request.firstChoiceTimeSlot?.slotTime || '')})</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleApprove(1)}
              disabled={!inspectorId || submitting}
            >
              Approve First Choice
            </button>
          </div>

          {request.secondChoiceDate && request.secondChoiceTimeSlot && (
            <div className="review-modal__choice">
              <h4>Second Choice</h4>
              <p>{formatDateMedium(request.secondChoiceDate)}</p>
              <p>{request.secondChoiceTimeSlot.slotName} ({formatTime12h(request.secondChoiceTimeSlot.slotTime)})</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleApprove(2)}
                disabled={!inspectorId || submitting}
              >
                Approve Second Choice
              </button>
            </div>
          )}
        </div>

        {request.specialRequirements && (
          <div className="review-modal__section">
            <h4>Special Requirements</h4>
            <p>{request.specialRequirements}</p>
          </div>
        )}

        <SingleSelectDropdown
          label="Reassign Inspector"
          required
          options={inspectorOptions}
          value={inspectorId}
          onChange={(val) => {
            setInspectorId(val);
            if (val === secondInspectorId) setSecondInspectorId('');
          }}
          placeholder="Select an inspector..."
        />

        {addSecondInspector && (
          <SingleSelectDropdown
            label="Additional Inspector"
            options={secondInspectorOptions}
            value={secondInspectorId}
            onChange={setSecondInspectorId}
            placeholder="Select additional inspector..."
          />
        )}

        <div className="review-modal__section">
          <label className="offer-modal__checkbox-label">
            <input
              type="checkbox"
              checked={addSecondInspector}
              onChange={(e) => {
                setAddSecondInspector(e.target.checked);
                if (!e.target.checked) setSecondInspectorId('');
              }}
            />
            Add additional inspector
          </label>
        </div>

        <div className="review-modal__section">
          <label htmlFor="review-comments">Comments (Optional)</label>
          <textarea
            id="review-comments"
            className="review-modal__textarea"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
          />
        </div>

        <div className="review-modal__reject-section">
          <h4>Reject Request</h4>
          <textarea
            className="review-modal__textarea"
            placeholder="Rejection reason (required to reject)..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={2}
          />
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={handleReject}
            disabled={!rejectionReason.trim() || submitting}
          >
            {submitting ? 'Processing...' : 'Reject Request'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AppointmentRequestReviewModal;
