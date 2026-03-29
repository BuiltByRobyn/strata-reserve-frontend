import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import type { ClientCancelAppointmentModalProps } from '../../shared/types/component.types';

const CancelAppointmentModal = ({ onConfirm, onClose, loading }: ClientCancelAppointmentModalProps) => {
  const [reason, setReason] = useState('');

  return (
    <Modal isOpen onClose={onClose} title="Cancel Appointment" size="medium">
      <div className="cancel-modal">
        <p className="cancel-modal__question">
          Are you sure you want to cancel this appointment?
        </p>

        <div className="form-field">
          <label htmlFor="client-cancel-reason">Reason for Cancellation (optional)</label>
          <textarea
            id="client-cancel-reason"
            className="cancel-modal__textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Let us know why you're cancelling..."
          />
        </div>

        <p className="cancel-modal__notice">
          Online cancellations must be made at least 48 hours before the appointment.
          For changes within 48 hours, please call SRP at (604) 638-4960.
        </p>

        <div className="cancel-modal__actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            No, Keep Appointment
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onConfirm(reason.trim() || undefined)} disabled={loading}>
            {loading ? 'Cancelling...' : 'Yes, Cancel Appointment'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelAppointmentModal;
