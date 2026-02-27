import { useState } from 'react';
import { useInspectorAvailability } from '../../shared/hooks/useInspectorAvailability';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { formatDateShort } from '../../shared/lib/formatters';
import type { InspectorAvailableDate } from '../../shared/types/entities.types';
import { InspectorAvailabilityModal } from './InspectorAvailabilityModal.tsx';
import { DeleteAvailabilityModal } from './DeleteAvailabilityModal.tsx';

const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '-';

    // Extract HH:mm whether it's an ISO string "1970-01-01T14:30:00.000Z" or just "14:30"
    const match = timeStr.match(/(?:T|^)(\d{2}):(\d{2})/);
    if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    }

    return timeStr;
};

export const InspectorAvailabilityManager = () => {
    const { availableDates, loading, error, deleteAvailableDate, createAvailableDate, updateAvailableDate } = useInspectorAvailability();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<InspectorAvailableDate | null>(null);

    const handleEdit = (block: InspectorAvailableDate) => {
        setSelectedBlock(block);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setSelectedBlock(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedBlock(null);
    };

    const handleOpenDelete = (block: InspectorAvailableDate) => {
        setSelectedBlock(block);
        setIsModalOpen(false);
        setIsDeleteModalOpen(true);
    };

    const columns: Column<InspectorAvailableDate>[] = [
        {
            key: 'staffName',
            header: 'STAFF NAME',
            render: (item) => item.inspectorProfile?.displayName ||
                `${item.inspectorProfile?.firstName || ''} ${item.inspectorProfile?.lastName || ''}`.trim() ||
                'Unknown'
        },
        {
            key: 'availableDate',
            header: 'AVAILABLE DATE',
            render: (item) => formatDateShort(item.availableStartDate)
        },
        {
            key: 'startTime',
            header: 'START TIME',
            render: (item) => formatTime(item.availableStartTime)
        },
        {
            key: 'endTime',
            header: 'END TIME',
            render: (item) => formatTime(item.availableEndTime)
        }
    ];

    const renderActions = (item: InspectorAvailableDate) => (
        <button className="btn-link" onClick={() => handleEdit(item)}>
            <u>Edit</u>
        </button>
    );

    return (
        <div className="inspector-availability-manager">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Inspector Availability</h3>
                <button className="btn-primary" onClick={handleAddNew}>
                    + Add Available Date
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <DataTable
                columns={columns}
                data={availableDates}
                keyExtractor={(item) => item.inspectorAvailableDateId}
                loading={loading}
                actions={renderActions}
                actionsColumnHeader="ACTIONS"
            />

            {isModalOpen && (
                <InspectorAvailabilityModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    initialData={selectedBlock}
                    onSubmitCreate={createAvailableDate}
                    onSubmitUpdate={updateAvailableDate}
                    onDeleteClick={() => selectedBlock && handleOpenDelete(selectedBlock)}
                />
            )}

            {isDeleteModalOpen && selectedBlock && (
                <DeleteAvailabilityModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setSelectedBlock(null);
                    }}
                    block={selectedBlock}
                    onDelete={deleteAvailableDate}
                />
            )}
        </div>
    );
};
