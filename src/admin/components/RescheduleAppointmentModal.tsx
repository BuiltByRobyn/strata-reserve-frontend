import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { AppointmentInfoDisplay } from './AppointmentInfoDisplay';
import { formatTime12h, getUserDisplayName } from '../../shared/lib/formatters';
import { getInspectorOptions } from '../../shared/utils/userUtils';
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
  const [addSecondInspector, setAddSecondInspector] = useState(false);
  const [secondInspectorId, setSecondInspectorId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!appointment) return null;

  const currentInspector = appointment.inspector
    ? getUserDisplayName(appointment.inspector)
    : 'Unassigned';

  const existingSecondInspector = appointment.fileNumber?.appointmentOfferSecondInspector;
  const hasExistingSecondInspector = !!existingSecondInspector;

  const inspectorOptions = getInspectorOptions(inspectors);
  const effectivePrimaryId = inspectorId || appointment.inspectorProfileId || '';
  const secondInspectorOptions = inspectorOptions.filter(o => o.value !== effectivePrimaryId);

  const handleSubmit = async () => {
    if (!newDate || !newTimeSlotId) {
      setError('Please select a new date and time slot');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const secondId = hasExistingSecondInspector
        ? (secondInspectorId || existingSecondInspector.id)
        : (addSecondInspector && secondInspectorId ? secondInspectorId : undefined);
      await onReschedule(appointment.appointmentId, newDate, newTimeSlotId, {
        inspectorProfileId: inspectorId || undefined,
        secondInspectorProfileId: secondId,
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
    setAddSecondInspector(false);
    setSecondInspectorId('');
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

        <AppointmentInfoDisplay
          date={appointment.appointmentDate}
          slotTime={appointment.timeSlot.slotTime}
          typeName={appointment.appointmentType.typeName}
          inspectorName={currentInspector}
          secondInspectorName={existingSecondInspector ? getUserDisplayName(existingSecondInspector) : null}
          locationName={appointment.fileNumber?.strata?.location?.locationName}
        />

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
            onChange={(val) => {
              setInspectorId(val);
              if (val === secondInspectorId) setSecondInspectorId('');
            }}
            placeholder={`${currentInspector} (current)`}
          />

          {hasExistingSecondInspector ? (
            <SingleSelectDropdown
              label="Reassign Additional Inspector (optional)"
              options={secondInspectorOptions}
              value={secondInspectorId}
              onChange={setSecondInspectorId}
              placeholder={`${getUserDisplayName(existingSecondInspector)} (current)`}
            />
          ) : (
            <>
              {addSecondInspector && (
                <SingleSelectDropdown
                  label="Additional Inspector"
                  options={secondInspectorOptions}
                  value={secondInspectorId}
                  onChange={setSecondInspectorId}
                  placeholder="Select additional inspector..."
                />
              )}
              <div className="offer-modal__field">
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
            </>
          )}

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
