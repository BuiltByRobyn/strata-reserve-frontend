import { useState, useEffect } from 'react';
import { Modal } from '../../shared/components/Modal';
import { InputField } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { useUsers } from '../../shared/hooks/useUsers';
import type { InspectorAvailableDate, CreateInspectorAvailableDateInput, UpdateInspectorAvailableDateInput } from '../../shared/types/entities.types';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';

const LOCATION_OPTIONS = [
    { key: 'OK', label: 'OK' },
    { key: 'TH', label: 'TH' },
    { key: 'LM', label: 'LM' },
    { key: 'LLVI', label: 'LLVI' },
    { key: 'NB', label: 'NB' },
    { key: 'Virtual', label: 'Virtual' }
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialData: InspectorAvailableDate | null;
    onSubmitCreate: (data: CreateInspectorAvailableDateInput) => Promise<any>;
    onSubmitUpdate: (id: number, data: UpdateInspectorAvailableDateInput) => Promise<any>;
    onDeleteClick?: () => void;
}

export const InspectorAvailabilityModal = ({
    isOpen,
    onClose,
    initialData,
    onSubmitCreate,
    onSubmitUpdate,
    onDeleteClick
}: Props) => {
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
                availableStartTime: initialData.availableStartTime ? (initialData.availableStartTime.match(/(?:T|^)(\d{2}:\d{2})/) || [])[1] || '' : '',
                availableEndTime: initialData.availableEndTime ? (initialData.availableEndTime.match(/(?:T|^)(\d{2}:\d{2})/) || [])[1] || '' : '',
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
                const updatePayload: UpdateInspectorAvailableDateInput = {
                    availableStartDate: formData.availableStartDate,
                    availableEndDate: formData.availableEndDate,
                    availableStartTime: formData.availableStartTime || null,
                    availableEndTime: formData.availableEndTime || null,
                    locationCodes: formData.locationCodes,
                };
                await onSubmitUpdate(initialData.inspectorAvailableDateId, updatePayload);
            } else {
                const createPayload: CreateInspectorAvailableDateInput = {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {initialData ? (
                <button className="btn-action" style={{ backgroundColor: '#ff0000', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={onDeleteClick}>
                    Remove Availability
                </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={onClose} disabled={saving} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>Cancel</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={saving} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#628a55', color: 'white' }}>
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
            {error && <div className="alert alert-error" style={{ marginBottom: '15px', color: '#ff0000', backgroundColor: '#ffeeee', padding: '10px', borderRadius: '4px' }}>{error}</div>}

            {usersLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><LoadingSpinner /></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ width: '100%' }}>
                        <SingleSelectDropdown
                            label="Staff Member *"
                            options={userOptions}
                            value={formData.inspectorProfileId}
                            onChange={(val) => setFormData(prev => ({ ...prev, inspectorProfileId: String(val) }))}
                            disabled={!!initialData}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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

                    <div style={{ width: '100%' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#6A7282', fontSize: '14px' }}>Available Locations</label>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            {LOCATION_OPTIONS.map(loc => (
                                <label
                                    key={loc.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        color: '#333'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.locationCodes.includes(loc.key)}
                                        onChange={() => toggleLocation(loc.key)}
                                        style={{ accentColor: '#6B8E5F', width: '18px', height: '18px' }}
                                    />
                                    <span>{loc.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};
