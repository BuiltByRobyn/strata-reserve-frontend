import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import { formatDateMedium, formatTime12h } from '../../shared/lib/formatters';
import type { CancelAppointmentModalProps } from '../../shared/types/component.types';

const CancelAppointmentModal = ({
  isOpen,
  onClose,
  appointment,
  onCancel,
}: CancelAppointmentModalProps) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!appointment) return null;

  const currentInspector = appointment.inspector
    ? (appointment.inspector.displayName || `${appointment.inspector.firstName || ''} ${appointment.inspector.lastName || ''}`.trim())
    : 'Unassigned';

  const handleCancel = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onCancel(appointment.appointmentId, reason.trim() || undefined);
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Cancel Appointment" size="medium">
      <div className="cancel-modal">
        {error && <div className="cancel-modal__error">{error}</div>}

        <div className="appointment-info-row">
          <div className="appointment-info-row__header">Current Appointment</div>
          <div className="appointment-info-row__grid">
            <div><span className="appointment-info-row__label">Date</span><span>{formatDateMedium(appointment.appointmentDate)}</span></div>
            <div><span className="appointment-info-row__label">Time</span><span>{formatTime12h(appointment.timeSlot.slotTime)}</span></div>
            <div><span className="appointment-info-row__label">Appointment Type</span><span>{appointment.appointmentType.typeName}</span></div>
            <div><span className="appointment-info-row__label">Inspector</span><span>{currentInspector}</span></div>
            <div><span className="appointment-info-row__label">Location</span><span>{(appointment.serviceRequest?.strata as any)?.location?.locationName || '-'}</span></div>
          </div>
        </div>

        <p className="cancel-modal__question">
          Are you sure that you would like to cancel this appointment?
        </p>

        <div className="form-field">
          <label htmlFor="cancel-reason">Reason for Cancellation (optional)</label>
          <textarea
            id="cancel-reason"
            className="cancel-modal__textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Inspector unavailable, client request, weather..."
          />
        </div>

        <p className="cancel-modal__notice">
          The client and inspector will be notified via email, and the appointment slot will become available again.
        </p>

        <div className="cancel-modal__actions">
          <button type="button" className="btn btn-secondary" onClick={resetAndClose} disabled={submitting}>
            No, Keep Appointment
          </button>
          <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={submitting}>
            {submitting ? 'Cancelling...' : 'Yes, Cancel Appointment'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelAppointmentModal;
