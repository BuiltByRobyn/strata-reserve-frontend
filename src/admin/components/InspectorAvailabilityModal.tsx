import { useState, useEffect } from 'react';
import { Modal } from '../../shared/components/Modal';
import { InputField } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { useUsers } from '../../shared/hooks/useUsers';
import { useCompanyHolidays } from '../../shared/hooks/useCompanyHolidays';
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
    const { checkIsHoliday } = useCompanyHolidays();

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
    const [holidayWarning, setHolidayWarning] = useState<string | null>(null);

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
        setHolidayWarning(null);
    }, [initialData, isOpen]);

    const handleSubmit = async (skipHolidayCheck = false) => {
        try {
            if (!formData.inspectorProfileId || !formData.availableStartDate || !formData.availableEndDate) {
                throw new Error('Please fill in all required fields.');
            }

            if (formData.availableEndDate < formData.availableStartDate) {
                setError('End date must be on or after start date.');
                return;
            }

            if (!skipHolidayCheck) {
                const holidayDates: string[] = [];
                const start = new Date(formData.availableStartDate + 'T12:00:00');
                const end = new Date(formData.availableEndDate + 'T12:00:00');
                for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().slice(0, 10);
                    const isHoliday = await checkIsHoliday(dateStr);
                    if (isHoliday) {
                        holidayDates.push(dateStr);
                    }
                }

                if (holidayDates.length > 0) {
                    setHolidayWarning(
                        `The following date(s) fall on a company holiday: ${holidayDates.join(', ')}. Are you sure you wish to open availability on a blocked date?`
                    );
                    return;
                }
            }

            setSaving(true);
            setError(null);
            setHolidayWarning(null);

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

    const handleHolidayOverrideConfirm = () => {
        setHolidayWarning(null);
        handleSubmit(true);
    };

    const handleHolidayOverrideCancel = () => {
        setHolidayWarning(null);
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

    const footer = holidayWarning ? null : (
        <>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            {initialData && (
                <button className="btn-delete" onClick={onDeleteClick}>
                    Remove Availability
                </button>
            )}
            <button className="btn-primary" onClick={() => handleSubmit()} disabled={saving}>
                {saving ? 'Saving...' : (initialData ? 'Update Availability' : 'Add Availability')}
            </button>
        </>
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

                {holidayWarning && (
                    <div className="modal-warning">
                        <p>{holidayWarning}</p>
                        <div className="modal-warning-actions">
                            <button className="btn-secondary" onClick={handleHolidayOverrideCancel}>
                                Go Back
                            </button>
                            <button className="btn-primary" onClick={handleHolidayOverrideConfirm}>
                                Yes, Proceed
                            </button>
                        </div>
                    </div>
                )}

                {usersLoading ? (
                    <div className="modal-loading"><LoadingSpinner /></div>
                ) : (
                    <div className="modal-form">
                        <div className="form-row">
                            <SingleSelectDropdown
                                label="Staff Member"
                                required
                                options={userOptions}
                                value={formData.inspectorProfileId}
                                onChange={(val) => setFormData(prev => ({ ...prev, inspectorProfileId: String(val) }))}
                                disabled={!!initialData}
                            />
                        </div>

                        <div className="form-row-dates">
                            <InputField
                                label="Available Start Date"
                                required
                                type="date"
                                id="available-start-date"
                                value={formData.availableStartDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, availableStartDate: e.target.value }))}
                            />

                            <InputField
                                label="Available End Date"
                                required
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
