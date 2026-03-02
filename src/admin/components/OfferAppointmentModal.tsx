import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import type { OfferAppointmentModalProps } from '../../shared/types/component.types';

export const OfferAppointmentModal = ({
  isOpen,
  onClose,
  serviceRequestId,
  strataName,
  appointmentTypes,
  inspectors,
  onSubmit,
}: OfferAppointmentModalProps) => {
  const [dueDate, setDueDate] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [inspectorId, setInspectorId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspectorOptions = inspectors
    .filter(u => u.isAdmin || ['Inspector', 'Admin'].includes(u.userType?.userTypeName ?? ''))
    .map(u => ({
      value: u.id,
      label: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    }));

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(serviceRequestId, {
        dueDate: dueDate || undefined,
        appointmentTypeId: selectedTypeId ?? undefined,
        inspectorProfileId: inspectorId || undefined,
        notes: notes.trim() || undefined,
      });
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to offer appointment');
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setDueDate('');
    setSelectedTypeId(null);
    setInspectorId('');
    setNotes('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Offer Appointment" size="medium">
      <div className="offer-modal">
        {error && <div className="offer-modal__error">{error}</div>}

        <div className="offer-modal__field">
          <span className="offer-modal__label">Strata ID</span>
          <span className="offer-modal__value">SR {serviceRequestId}</span>
        </div>

        <div className="offer-modal__field">
          <label htmlFor="offer-due-date">Due Date *</label>
          <input
            id="offer-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="offer-modal__field">
          <label>Appointment Type</label>
          <div className="offer-modal__type-buttons">
            {appointmentTypes.map(t => (
              <button
                key={t.appointmentTypeId}
                type="button"
                className={`offer-modal__type-btn${selectedTypeId === t.appointmentTypeId ? ' offer-modal__type-btn--selected' : ''}`}
                onClick={() => setSelectedTypeId(t.appointmentTypeId)}
              >
                {t.typeName}
              </button>
            ))}
          </div>
        </div>

        <SingleSelectDropdown
          label="Assign Inspector"
          options={inspectorOptions}
          value={inspectorId}
          onChange={setInspectorId}
          placeholder="Select inspector..."
        />

        <div className="offer-modal__field">
          <label htmlFor="offer-notes">Admin Notes (optional) *</label>
          <textarea
            id="offer-notes"
            className="offer-modal__textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Follow up via phone on 02 Feb 26 if not booked..."
          />
        </div>

        <div className="offer-modal__actions">
          <button type="button" className="btn btn-secondary" onClick={resetAndClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Sending...' : 'Offer Appointment'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
