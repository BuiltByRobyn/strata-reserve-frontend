import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppointments } from '../../shared/hooks/useAppointments';
import { useUsers } from '../../shared/hooks/useUsers';
import { useFileNumbers } from '../../shared/hooks/useFileNumbers';
import { Modal } from '../../shared/components/Modal';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { formatTime12h } from '../../shared/lib/formatters';
import { getInspectorOptions } from '../../shared/utils/userUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAppointmentModal({ isOpen, onClose }: Props) {
  const { createAppointment, fetchTimeSlots, fetchAppointmentTypes, checkInspectorAvailability, createInspectorAvailability } = useAppointments();
  const { users } = useUsers();
  const { fileNumbers, refetch: fetchFileNumbers } = useFileNumbers();

  const [createForm, setCreateForm] = useState({ fileId: '', appointmentDate: '', timeSlotId: '', appointmentTypeId: '', inspectorProfileId: '' });
  const [addSecondInspector, setAddSecondInspector] = useState(false);
  const [secondInspectorId, setSecondInspectorId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [showAvailabilityWarning, setShowAvailabilityWarning] = useState(false);
  const [allTimeSlots, setAllTimeSlots] = useState<any[]>([]);
  const [allAppointmentTypes, setAllAppointmentTypes] = useState<any[]>([]);

  const inspectorOptions = useMemo(() => getInspectorOptions(users), [users]);

  useEffect(() => {
    if (!isOpen) return;
    setCreateForm({ fileId: '', appointmentDate: '', timeSlotId: '', appointmentTypeId: '', inspectorProfileId: '' });
    setAddSecondInspector(false);
    setSecondInspectorId('');
    setCreateError(null);
    setShowAvailabilityWarning(false);
    fetchFileNumbers({ archived: false });
    Promise.all([fetchTimeSlots(), fetchAppointmentTypes()]).then(([slots, types]) => {
      setAllTimeSlots((slots || []).filter((s: any, i: number, arr: any[]) => arr.findIndex((t: any) => t.slotTime === s.slotTime) === i));
      setAllAppointmentTypes(types || []);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const isFormValid = !!(
    createForm.fileId &&
    createForm.appointmentTypeId &&
    createForm.appointmentDate &&
    createForm.timeSlotId &&
    createForm.inspectorProfileId
  );

  const submitAppointment = useCallback(async () => {
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createAppointment({
        fileId: parseInt(createForm.fileId),
        appointmentDate: createForm.appointmentDate,
        timeSlotId: parseInt(createForm.timeSlotId),
        appointmentTypeId: parseInt(createForm.appointmentTypeId),
        inspectorProfileId: createForm.inspectorProfileId,
        secondInspectorProfileId: addSecondInspector && secondInspectorId ? secondInspectorId : undefined,
      });
      onClose();
      toast.success('Appointment created successfully');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setCreateSubmitting(false);
    }
  }, [createForm, createAppointment, addSecondInspector, secondInspectorId, onClose]);

  const handleCreateAppointment = useCallback(async () => {
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const isAvailable = await checkInspectorAvailability(createForm.inspectorProfileId, createForm.appointmentDate);
      if (isAvailable) {
        await submitAppointment();
      } else {
        setCreateSubmitting(false);
        setShowAvailabilityWarning(true);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create appointment');
      setCreateSubmitting(false);
    }
  }, [checkInspectorAvailability, createForm, submitAppointment]);

  const handleConfirmUnavailable = useCallback(async () => {
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createInspectorAvailability(createForm.inspectorProfileId, createForm.appointmentDate);
      await submitAppointment();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create appointment');
      setCreateSubmitting(false);
    }
  }, [createForm, createInspectorAvailability, submitAppointment]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Appointment"
      size="medium"
      footer={showAvailabilityWarning ? undefined : (
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={createSubmitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateAppointment} disabled={!isFormValid || createSubmitting}>
            {createSubmitting ? 'Checking...' : 'Add Appointment'}
          </button>
        </>
      )}
    >
      <div className="offer-modal">
        {createError && <div className="offer-modal__error">{createError}</div>}

        {showAvailabilityWarning ? (
          <div className="offer-modal__warning">
            <p>Inspector unavailable on the selected date. Are you sure you would like to book this appointment?</p>
            <div className="offer-modal__warning-actions">
              <button className="btn btn-secondary" onClick={() => setShowAvailabilityWarning(false)} disabled={createSubmitting}>Go Back</button>
              <button className="btn btn-primary" onClick={handleConfirmUnavailable} disabled={createSubmitting}>
                {createSubmitting ? 'Booking...' : 'Yes, Book Anyway'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <SingleSelectDropdown
              label="Strata"
              required
              options={fileNumbers.map(sr => ({ value: String(sr.fileId), label: `${sr.strata?.strataPlan || ''} - ${sr.strata?.complexName || 'Unknown'}` }))}
              value={createForm.fileId}
              onChange={(val) => setCreateForm(prev => ({ ...prev, fileId: val }))}
              placeholder="Select a strata..."
            />

            {createForm.fileId && (() => {
              const sr = fileNumbers.find(s => String(s.fileId) === createForm.fileId);
              const loc = sr?.strata?.location?.locationName;
              return loc ? (
                <div className="form-field">
                  <label>Location</label>
                  <input type="text" value={loc} disabled />
                </div>
              ) : null;
            })()}

            <SingleSelectDropdown
              label="Appointment Type"
              required
              options={allAppointmentTypes.map((t: any) => ({ value: String(t.appointmentTypeId), label: `${t.typeName} (${t.durationType})` }))}
              value={createForm.appointmentTypeId}
              onChange={(val) => setCreateForm(prev => ({ ...prev, appointmentTypeId: val }))}
              placeholder="Select appointment type..."
            />

            <div className="offer-modal__field">
              <label>Date <span className="offer-modal__required">*</span></label>
              <input type="date" value={createForm.appointmentDate} onChange={(e) => setCreateForm(prev => ({ ...prev, appointmentDate: e.target.value }))} />
            </div>

            <SingleSelectDropdown
              label="Time Slot"
              required
              options={allTimeSlots.map((s: any) => ({ value: String(s.timeSlotId), label: `${s.slotName} (${formatTime12h(s.slotTime)})` }))}
              value={createForm.timeSlotId}
              onChange={(val) => setCreateForm(prev => ({ ...prev, timeSlotId: val }))}
              placeholder="Select a time slot..."
            />

            <SingleSelectDropdown
              label="Inspector"
              required
              options={inspectorOptions}
              value={createForm.inspectorProfileId}
              onChange={(val) => { setCreateForm(prev => ({ ...prev, inspectorProfileId: val })); if (val === secondInspectorId) setSecondInspectorId(''); }}
              placeholder="Select an inspector..."
            />

            {addSecondInspector && (
              <SingleSelectDropdown
                label="Additional Inspector"
                options={inspectorOptions.filter(o => o.value !== createForm.inspectorProfileId)}
                value={secondInspectorId}
                onChange={setSecondInspectorId}
                placeholder="Select additional inspector..."
              />
            )}

            <div className="offer-modal__field">
              <label className="offer-modal__checkbox-label">
                <input type="checkbox" checked={addSecondInspector} onChange={(e) => { setAddSecondInspector(e.target.checked); if (!e.target.checked) setSecondInspectorId(''); }} />
                Add additional inspector
              </label>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
