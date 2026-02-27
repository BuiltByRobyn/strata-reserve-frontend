import { useState, useEffect } from 'react';
import { Modal } from '../../shared/components/Modal';
import { InputField } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { useUsers } from '../../shared/hooks/useUsers';
import type { InspectorAvailabilityModalProps } from '../../shared/types/component.types';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { extractTimeFromISO } from '../../shared/utils/availabilityUtils';
import { LOCATION_OPTIONS } from '../../shared/lib/constants';

export const InspectorAvailabilityModal = ({
    isOpen,
    onClose,
    initialData,
    onSubmitCreate,
    onSubmitUpdate,
    onDeleteClick
}: InspectorAvailabilityModalProps) => {
    const { users, loading: usersLoading } = useUsers();

    const [formData, setFormData] = useState({
        inspectorProfileId: '',
        availableStartDate: '',
        availableEndDate: '',
        availableStartTime: '',
        availableEndTime: '',
        locationCodes: [] as string[]
    });

    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialData && isOpen) {
            setFormData({
                inspectorProfileId: initialData.inspectorProfileId,
                availableStartDate: initialData.availableStartDate.split('T')[0],
                availableEndDate: initialData.availableEndDate.split('T')[0],
                availableStartTime: extractTimeFromISO(initialData.availableStartTime),
                availableEndTime: extractTimeFromISO(initialData.availableEndTime),
                locationCodes: initialData.locations ? initialData.locations.map(loc => loc.locationCode) : []
            });
        } else if (isOpen) {
            setFormData({
                inspectorProfileId: '',
                availableStartDate: '',
                availableEndDate: '',
                availableStartTime: '',
                availableEndTime: '',
                locationCodes: []
            });
        }
        setError(null);
    }, [initialData, isOpen]);

    const handleSubmit = async () => {
        try {
            if (!formData.inspectorProfileId || !formData.availableStartDate || !formData.availableEndDate) {
                throw new Error('Please fill in all required fields.');
            }

            setSaving(true);
            setError(null);

            if (initialData) {
                const updatePayload = {
                    availableStartDate: formData.availableStartDate,
                    availableEndDate: formData.availableEndDate,
                    availableStartTime: formData.availableStartTime || null,
                    availableEndTime: formData.availableEndTime || null,
                    locationCodes: formData.locationCodes,
                };
                await onSubmitUpdate(initialData.inspectorAvailableDateId, updatePayload);
            } else {
                const createPayload = {
                    inspectorProfileId: formData.inspectorProfileId,
                    availableStartDate: formData.availableStartDate,
                    availableEndDate: formData.availableEndDate,
                    availableStartTime: formData.availableStartTime || undefined,
                    availableEndTime: formData.availableEndTime || undefined,
                    locationCodes: formData.locationCodes,
                };
                await onSubmitCreate(createPayload);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    const toggleLocation = (code: string) => {
        setFormData(prev => {
            const isSelected = prev.locationCodes.includes(code);
            if (isSelected) {
                return { ...prev, locationCodes: prev.locationCodes.filter(c => c !== code) };
            } else {
                return { ...prev, locationCodes: [...prev.locationCodes, code] };
            }
        });
    };

    const userOptions = users.map(u => ({
        value: u.id,
        label: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown'
    }));

    const footer = (
        <div className="inspector-availability-modal modal-footer">
            {initialData ? (
                <button className="btn-remove" onClick={onDeleteClick}>
                    Remove Availability
                </button>
            ) : <div />}
            <div className="modal-actions">
                <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Saving...' : (initialData ? 'Update Availability' : 'Add Availability')}
                </button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Inspector Available" : "Inspector Available"}
            size="large"
            footer={footer}
        >
            <div className="inspector-availability-modal">
                {error && <div className="modal-error">{error}</div>}

                {usersLoading ? (
                    <div className="modal-loading"><LoadingSpinner /></div>
                ) : (
                    <div className="modal-form">
                        <div className="form-row">
                            <SingleSelectDropdown
                                label="Staff Member *"
                                options={userOptions}
                                value={formData.inspectorProfileId}
                                onChange={(val) => setFormData(prev => ({ ...prev, inspectorProfileId: String(val) }))}
                                disabled={!!initialData}
                            />
                        </div>

                        <div className="form-row-dates">
                            <InputField
                                label="Available Start Date *"
                                type="date"
                                id="available-start-date"
                                value={formData.availableStartDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, availableStartDate: e.target.value }))}
                            />

                            <InputField
                                label="Available End Date *"
                                type="date"
                                id="available-end-date"
                                value={formData.availableEndDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, availableEndDate: e.target.value }))}
                            />
                        </div>

                        <div className="form-row-times">
                            <InputField
                                label="Available Start Time"
                                type="time"
                                id="available-start-time"
                                value={formData.availableStartTime}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, availableStartTime: e.target.value }))}
                            />

                            <InputField
                                label="Available End Time"
                                type="time"
                                id="available-end-time"
                                value={formData.availableEndTime}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, availableEndTime: e.target.value }))}
                            />
                        </div>

                        <div className="form-row">
                            <label className="locations-label">Available Locations</label>
                            <div className="locations-options">
                                {LOCATION_OPTIONS.map(loc => (
                                    <label
                                        key={loc.key}
                                        className="location-option"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.locationCodes.includes(loc.key)}
                                            onChange={() => toggleLocation(loc.key)}
                                        />
                                        <span>{loc.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
