import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { formatDateMedium, formatTime12h } from '../../shared/lib/formatters';
import type { RescheduleAppointmentModalProps } from '../../shared/types/component.types';

const RescheduleAppointmentModal = ({
  isOpen,
  onClose,
  appointment,
  timeSlots,
  inspectors,
  onReschedule,
}: RescheduleAppointmentModalProps) => {
  const [newDate, setNewDate] = useState('');
  const [newTimeSlotId, setNewTimeSlotId] = useState<number | null>(null);
  const [inspectorId, setInspectorId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!appointment) return null;

  const currentInspector = appointment.inspector
    ? (appointment.inspector.displayName || `${appointment.inspector.firstName || ''} ${appointment.inspector.lastName || ''}`.trim())
    : 'Unassigned';

  const inspectorOptions = inspectors
    .filter(u => u.isAdmin || ['Inspector', 'Admin'].includes(u.userType?.userTypeName ?? ''))
    .map(u => ({
      value: u.id,
      label: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    }));

  const handleSubmit = async () => {
    if (!newDate || !newTimeSlotId) {
      setError('Please select a new date and time slot');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onReschedule(appointment.appointmentId, newDate, newTimeSlotId, {
        inspectorProfileId: inspectorId || undefined,
        reason: reason.trim() || undefined,
      });
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reschedule failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setNewDate('');
    setNewTimeSlotId(null);
    setInspectorId('');
    setReason('');
    setError(null);
    onClose();
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 3);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Reschedule Appointment" size="medium">
      <div className="reschedule-modal">
        {error && <div className="reschedule-modal__error">{error}</div>}

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

        <div className="reschedule-modal__form">
          <div className="form-field">
            <label htmlFor="reschedule-date">New Date *</label>
            <input
              id="reschedule-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={minDateStr}
            />
          </div>

          <div className="form-field">
            <label>Time Slot *</label>
            <div className="reschedule-modal__slot-buttons">
              {timeSlots.map(s => (
                <button
                  key={s.timeSlotId}
                  type="button"
                  className={`reschedule-modal__slot-btn${newTimeSlotId === s.timeSlotId ? ' reschedule-modal__slot-btn--selected' : ''}`}
                  onClick={() => setNewTimeSlotId(s.timeSlotId)}
                >
                  <span className="reschedule-modal__slot-name">{s.slotName}</span>
                  <span className="reschedule-modal__slot-time">{formatTime12h(s.slotTime)}</span>
                </button>
              ))}
            </div>
          </div>

          <SingleSelectDropdown
            label="Reassign Inspector (optional)"
            options={inspectorOptions}
            value={inspectorId}
            onChange={setInspectorId}
            placeholder={`${currentInspector} (current)`}
          />

          <div className="form-field">
            <label htmlFor="reschedule-reason">Reason for Rescheduling (optional)</label>
            <textarea
              id="reschedule-reason"
              className="reschedule-modal__textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. Inspector unavailable, client request, weather..."
            />
          </div>
        </div>

        <div className="reschedule-modal__actions">
          <button type="button" className="btn btn-secondary" onClick={resetAndClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Rescheduling...' : 'Reschedule'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RescheduleAppointmentModal;
