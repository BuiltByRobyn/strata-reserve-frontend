import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import { AppointmentInfoDisplay } from './AppointmentInfoDisplay';
import { getUserDisplayName } from '../../shared/utils/formatters';
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
    ? getUserDisplayName(appointment.inspector)
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

        <AppointmentInfoDisplay
          date={appointment.appointmentDate}
          slotTime={appointment.timeSlot.slotTime}
          typeName={appointment.appointmentType.typeName}
          inspectorName={currentInspector}
          secondInspectorName={appointment.fileNumber?.appointmentOfferSecondInspector ? getUserDisplayName(appointment.fileNumber.appointmentOfferSecondInspector) : null}
          locationName={appointment.fileNumber?.strata?.location?.locationName}
        />

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
