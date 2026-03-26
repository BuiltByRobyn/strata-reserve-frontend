import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../shared/components/Modal';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { AppointmentInfoDisplay } from './AppointmentInfoDisplay';
import { formatTime12h, getUserDisplayName } from '../../shared/utils/formatters';
import { getInspectorOptions } from '../../shared/utils/userUtils';
import type { RescheduleAppointmentModalProps } from '../../shared/types/component.types';
import { getAppointmentTypeTimeSlotViolationMessage } from '../../shared/utils/appointmentRules';

const RescheduleAppointmentModal = ({
  isOpen,
  onClose,
  appointment,
  timeSlots,
  inspectors,
  onReschedule,
}: RescheduleAppointmentModalProps) => {
  const [newDate, setNewDate] = useState(appointment?.appointmentDate?.split('T')[0] || '');
  const [newTimeSlotId, setNewTimeSlotId] = useState<number | null>(appointment?.timeSlot?.timeSlotId ?? null);
  const [inspectorId, setInspectorId] = useState(appointment?.inspectorProfileId || '');
  const [addSecondInspector, setAddSecondInspector] = useState(!!appointment?.fileNumber?.appointmentOfferSecondInspector);
  const [secondInspectorId, setSecondInspectorId] = useState(appointment?.fileNumber?.appointmentOfferSecondInspector?.id || '');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && appointment) {
      setNewDate(appointment.appointmentDate?.split('T')[0] || '');
      setNewTimeSlotId(appointment.timeSlot?.timeSlotId ?? null);
      setInspectorId(appointment.inspectorProfileId || '');
      setAddSecondInspector(!!appointment.fileNumber?.appointmentOfferSecondInspector);
      setSecondInspectorId(appointment.fileNumber?.appointmentOfferSecondInspector?.id || '');
    }
  }, [isOpen, appointment]);

  if (!appointment) return null;

  const currentInspector = appointment.inspector
    ? getUserDisplayName(appointment.inspector)
    : 'Unassigned';

  const existingSecondInspector = appointment.fileNumber?.appointmentOfferSecondInspector;
  const hasExistingSecondInspector = !!existingSecondInspector;

  const inspectorOptions = getInspectorOptions(inspectors);
  const effectivePrimaryId = inspectorId || appointment.inspectorProfileId || '';
  const primaryInspectorOptions = inspectorOptions.filter(
    o => o.value !== secondInspectorId
  );
  const secondInspectorOptions = inspectorOptions.filter(
    o => o.value !== effectivePrimaryId
  );

  const selectedRescheduleSlot = useMemo(
    () => timeSlots.find(s => s.timeSlotId === newTimeSlotId),
    [timeSlots, newTimeSlotId]
  );
  const typeSlotViolationMessage = useMemo(
    () =>
      getAppointmentTypeTimeSlotViolationMessage(
        appointment.appointmentType,
        selectedRescheduleSlot,
        !!newTimeSlotId
      ),
    [appointment.appointmentType, selectedRescheduleSlot, newTimeSlotId]
  );

  const isFormValid = !!newDate && !!newTimeSlotId && !!inspectorId && !typeSlotViolationMessage;

  const handleSubmit = async () => {
    if (typeSlotViolationMessage) {
      setError(typeSlotViolationMessage);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const secondId = hasExistingSecondInspector
        ? (addSecondInspector ? (secondInspectorId || null) : null)
        : (addSecondInspector && secondInspectorId ? secondInspectorId : undefined);
      await onReschedule(appointment.appointmentId, newDate, newTimeSlotId!, {
        inspectorProfileId: inspectorId,
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
    setInspectorId(appointment.inspectorProfileId || '');
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
            <label htmlFor="reschedule-date">New Date <span className="required">*</span></label>
            <input
              id="reschedule-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={minDateStr}
            />
          </div>

          <div className="form-field">
            <label>New Time Slot <span className="required">*</span></label>
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
            {typeSlotViolationMessage && (
              <div className="reschedule-modal__error" role="alert">
                {typeSlotViolationMessage}
              </div>
            )}
          </div>

          <SingleSelectDropdown
            label="Reassign Inspector"
            required
            className="reschedule-modal__primary-inspector"
            options={primaryInspectorOptions}
            value={inspectorId}
            onChange={(val) => {
              setInspectorId(val);
              if (val === secondInspectorId) setSecondInspectorId('');
            }}
            placeholder="Select inspector..."
          />

          <>
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
                {hasExistingSecondInspector ? 'Include additional inspector' : 'Add additional inspector'}
              </label>
            </div>
            {addSecondInspector && (
              <SingleSelectDropdown
                label={hasExistingSecondInspector ? 'Reassign Additional Inspector (optional)' : 'Additional Inspector'}
                options={secondInspectorOptions}
                value={secondInspectorId}
                onChange={setSecondInspectorId}
                placeholder="Select inspector..."
              />
            )}
          </>

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
          <button type="button" className="btn btn-danger" onClick={handleSubmit} disabled={!isFormValid || submitting}>
            {submitting ? 'Rescheduling...' : 'Reschedule'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RescheduleAppointmentModal;
