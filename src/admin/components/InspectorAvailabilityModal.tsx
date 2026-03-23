import { useState, useEffect } from 'react';
import { Modal } from '../../shared/components/Modal';
import { InputField } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { useUsers } from '../../shared/hooks/useUsers';
import { useCompanyHolidays } from '../../shared/hooks/useCompanyHolidays';
import type { InspectorAvailabilityModalProps } from '../../shared/types/component.types';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { extractTimeFromISO, expandWeekdayDateRange } from '../../shared/utils/availabilityUtils';
import { getInspectorOptions } from '../../shared/utils/userUtils';
import { LOCATION_OPTIONS } from '../../shared/utils/constants';

const LOCATION_CODE_MAP: Record<string, string> = { 'LLVI': 'VI', 'NB': 'N/BC' };

export const InspectorAvailabilityModal = ({
    isOpen,
    onClose,
    initialData,
    onSubmitBulkCreate,
    onSubmitUpdate,
    onDeleteClick
}: InspectorAvailabilityModalProps) => {
    const { users, loading: usersLoading } = useUsers();
    const { checkIsHoliday } = useCompanyHolidays();

    const [formData, setFormData] = useState({
        inspectorProfileId: '',
        availableStartDate: '',
        availableEndDate: '',
        availableStartTime: '09:00',
        availableEndTime: '19:00',
        locationCodes: [] as string[]
    });

    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [holidayWarning, setHolidayWarning] = useState<string | null>(null);
    const [saveProgress, setSaveProgress] = useState<{ phase: 'filtering' | 'saving'; current: number; total: number } | null>(null);

    useEffect(() => {
        if (initialData && isOpen) {
            setFormData({
                inspectorProfileId: initialData.inspectorProfileId,
                availableStartDate: initialData.availableStartDate.split('T')[0],
                availableEndDate: initialData.availableEndDate.split('T')[0],
                availableStartTime: extractTimeFromISO(initialData.availableStartTime),
                availableEndTime: extractTimeFromISO(initialData.availableEndTime),
                locationCodes: initialData.locations ? initialData.locations.map(loc => LOCATION_CODE_MAP[loc.locationCode] ?? loc.locationCode) : []
            });
        } else if (isOpen) {
            setFormData({
                inspectorProfileId: '',
                availableStartDate: '',
                availableEndDate: '',
                availableStartTime: '09:00',
                availableEndTime: '19:00',
                locationCodes: LOCATION_OPTIONS.map(l => l.key)
            });
        }
        setError(null);
        setHolidayWarning(null);
        setSaveProgress(null);
    }, [initialData, isOpen]);

    const handleSubmit = async (skipHolidayCheck = false) => {
        try {
            const effectiveEndDate = initialData ? formData.availableStartDate : formData.availableEndDate;

            if (!skipHolidayCheck) {
                const weekdayDatesForCheck = expandWeekdayDateRange(formData.availableStartDate, effectiveEndDate);
                const holidayDates: string[] = [];
                for (const dateStr of weekdayDatesForCheck) {
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
                // Edit mode: single day update
                await onSubmitUpdate(initialData.inspectorAvailableDateId, {
                    availableStartDate: formData.availableStartDate,
                    availableEndDate: formData.availableStartDate,
                    availableStartTime: formData.availableStartTime || null,
                    availableEndTime: formData.availableEndTime || null,
                    locationCodes: formData.locationCodes,
                });
            } else {
                // Bulk create: filter weekends, show progress
                setSaveProgress({ phase: 'filtering', current: 0, total: 0 });
                const weekdayDates = expandWeekdayDateRange(formData.availableStartDate, effectiveEndDate);
                const inputs = weekdayDates.map(dateStr => ({
                    inspectorProfileId: formData.inspectorProfileId,
                    availableStartDate: dateStr,
                    availableEndDate: dateStr,
                    availableStartTime: formData.availableStartTime || undefined,
                    availableEndTime: formData.availableEndTime || undefined,
                    locationCodes: formData.locationCodes,
                }));
                await onSubmitBulkCreate(inputs, (current, total) =>
                    setSaveProgress({ phase: 'saving', current, total })
                );
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while saving.');
            setSaveProgress(null);
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

    const userOptions = getInspectorOptions(users);

    const today = new Date().toISOString().split('T')[0];
    const effectiveEndForValid = initialData ? formData.availableStartDate : formData.availableEndDate;
    const isFormValid =
        !!formData.inspectorProfileId &&
        !!formData.availableStartDate &&
        (!!initialData || !!formData.availableEndDate) &&
        formData.locationCodes.some(c => c !== 'Virtual') &&
        formData.availableStartDate >= today &&
        (!initialData ? effectiveEndForValid >= formData.availableStartDate : true);

    const footer = (holidayWarning || saveProgress) ? null : (
        <>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            {initialData && (
                <button className="btn-delete" onClick={onDeleteClick}>
                    Remove Availability
                </button>
            )}
            <button className="btn-primary" onClick={() => handleSubmit()} disabled={!isFormValid || saving}>
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
            className="modal-inspector-availability"
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
                ) : saveProgress ? (
                    <div className="modal-loading">
                        <LoadingSpinner />
                        <p className="availability-save-progress">
                            {saveProgress.phase === 'filtering'
                                ? 'Removing weekends...'
                                : `Adding day ${saveProgress.current} of ${saveProgress.total}...`}
                        </p>
                    </div>
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

                        {initialData ? (
                            <div className="form-row">
                                <InputField
                                    label="Available Date"
                                    required
                                    type="date"
                                    id="available-date"
                                    value={formData.availableStartDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, availableStartDate: e.target.value }))}
                                />
                            </div>
                        ) : (
                            <div className="form-row-dates">
                                <InputField
                                    label="Available Start Date"
                                    required
                                    type="date"
                                    id="available-start-date"
                                    value={formData.availableStartDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, availableStartDate: e.target.value }))}
                                />

                                <InputField
                                    label="Available End Date"
                                    required
                                    type="date"
                                    id="available-end-date"
                                    value={formData.availableEndDate}
                                    min={formData.availableStartDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, availableEndDate: e.target.value }))}
                                />
                            </div>
                        )}

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

                        <div className="locations-row">
                            <label className="locations-label">Available Locations <span className="required">*</span></label>
                            {LOCATION_OPTIONS.map(loc => (
                                <label key={loc.key} className="location-option">
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
                )}
            </div>
        </Modal>
    );
};
