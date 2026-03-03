import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../shared/components/Modal';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { formatDateShort } from '../../shared/lib/formatters';
import type { OfferAppointmentModalProps } from '../../shared/types/component.types';

export const OfferAppointmentModal = ({
  isOpen,
  onClose,
  serviceRequestId,
  strataPlan,
  targetDate,
  appointmentTypes,
  inspectors,
  initialTypeId,
  initialInspectorId,
  initialSecondInspectorId,
  locations,
  initialLocationId,
  strataId,
  onSubmit,
  onAddNote,
  onUpdateLocation,
}: OfferAppointmentModalProps) => {
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [inspectorId, setInspectorId] = useState('');
  const [addSecondInspector, setAddSecondInspector] = useState(false);
  const [secondInspectorId, setSecondInspectorId] = useState('');
  const [locationId, setLocationId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate with existing offer data when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTypeId(initialTypeId ?? null);
      setInspectorId(initialInspectorId ?? '');
      if (initialSecondInspectorId) {
        setAddSecondInspector(true);
        setSecondInspectorId(initialSecondInspectorId);
      } else {
        setAddSecondInspector(false);
        setSecondInspectorId('');
      }
      setLocationId(initialLocationId ?? null);
      setNotes('');
      setError(null);
    }
  }, [isOpen, initialTypeId, initialInspectorId, initialSecondInspectorId, initialLocationId]);

  const inspectorOptions = inspectors
    .filter(u => u.isAdmin || ['Inspector', 'Admin'].includes(u.userType?.userTypeName ?? ''))
    .map(u => ({
      value: u.id,
      label: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    }));

  const secondInspectorOptions = inspectorOptions.filter(o => o.value !== inspectorId);

  const locationOptions = useMemo(() =>
    locations.map(l => ({ value: l.locationId, label: l.locationCode }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [locations]
  );

  const sortedTypes = useMemo(() =>
    [...appointmentTypes].sort((a, b) => {
      if (a.isDraftMeeting !== b.isDraftMeeting) return a.isDraftMeeting ? 1 : -1;
      const order: Record<string, number> = { 'half day': 0, 'full day': 1 };
      return (order[a.durationType?.toLowerCase() ?? ''] ?? 2) - (order[b.durationType?.toLowerCase() ?? ''] ?? 2);
    }),
    [appointmentTypes]
  );

  const isValid = selectedTypeId != null && inspectorId !== '' && locationId != null;

  const handleSubmit = async () => {
    if (selectedTypeId == null || !inspectorId) {
      setError('Please select an appointment type and assign an inspector');
      return;
    }
    if (locationId == null) {
      setError('Please select a location for this strata');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Update strata location if changed
      if (locationId !== initialLocationId) {
        await onUpdateLocation(strataId, locationId);
      }
      if (notes.trim() && onAddNote) {
        await onAddNote(notes.trim());
      }
      await onSubmit(serviceRequestId, {
        appointmentTypeId: selectedTypeId ?? undefined,
        inspectorProfileId: inspectorId || undefined,
        secondInspectorProfileId: addSecondInspector && secondInspectorId ? secondInspectorId : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to offer appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Offer Appointment" size="medium">
      <div className="offer-modal">
        {error && <div className="offer-modal__error">{error}</div>}

        <div className="offer-modal__row">
          <div className="offer-modal__field offer-modal__field--inline">
            <span className="offer-modal__label">Strata Plan</span>
            <span className="offer-modal__value">{strataPlan}</span>
          </div>
          <div className="offer-modal__field offer-modal__field--inline">
            <span className="offer-modal__label">Target Date</span>
            <span className="offer-modal__value">
              {targetDate ? formatDateShort(targetDate) : 'Not set'}
            </span>
          </div>
          <div className="offer-modal__field offer-modal__field--inline">
            <span className="offer-modal__label">Location <span className="offer-modal__required">*</span></span>
            <SingleSelectDropdown
              label=""
              options={locationOptions}
              value={locationId ?? ''}
              onChange={(val) => setLocationId(val ? Number(val) : null)}
              placeholder="Select location..."
            />
          </div>
        </div>

        <div className="offer-modal__field">
          <span className="offer-modal__label">Appointment Type <span className="offer-modal__required">*</span></span>
          {/* Desktop: buttons */}
          <div className="offer-modal__type-buttons offer-modal__desktop">
            {sortedTypes.map(t => (
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
          {/* Mobile: dropdown */}
          <div className="offer-modal__mobile">
            <SingleSelectDropdown
              label=""
              options={sortedTypes.map(t => ({ value: t.appointmentTypeId, label: t.typeName }))}
              value={selectedTypeId ?? ''}
              onChange={(val) => setSelectedTypeId(val ? Number(val) : null)}
              placeholder="Select appointment type..."
            />
          </div>
        </div>

        <div className="offer-modal__row">
          <div className="offer-modal__field">
            <span className="offer-modal__label">Assign Inspector <span className="offer-modal__required">*</span></span>
            <SingleSelectDropdown
              label=""
              options={inspectorOptions}
              value={inspectorId}
              onChange={(val) => {
                setInspectorId(val);
                if (val === secondInspectorId) setSecondInspectorId('');
              }}
              placeholder="Select inspector..."
            />
          </div>

          {addSecondInspector && (
            <div className="offer-modal__field">
              <span className="offer-modal__label">Additional Inspector</span>
              <SingleSelectDropdown
                label=""
                options={secondInspectorOptions}
                value={secondInspectorId}
                onChange={setSecondInspectorId}
                placeholder="Select additional inspector..."
              />
            </div>
          )}
        </div>

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

        <div className="offer-modal__field">
          <span className="offer-modal__label">Admin Notes (optional)</span>
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
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving || !isValid}
          >
            {saving ? 'Sending...' : 'Offer Appointment'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
