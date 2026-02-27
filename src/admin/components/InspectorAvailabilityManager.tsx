import { useState } from 'react';
import { useInspectorAvailability } from '../../shared/hooks/useInspectorAvailability';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
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
    const isDesktop = useMediaQuery('(min-width: 750px)');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<InspectorAvailableDate | null>(null);
    const [viewingBlock, setViewingBlock] = useState<InspectorAvailableDate | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

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

    const getViewAvailabilityRows = (block: InspectorAvailableDate) => [
        { label: 'Staff Name', value: block.inspectorProfile?.displayName || `${block.inspectorProfile?.firstName || ''} ${block.inspectorProfile?.lastName || ''}`.trim() || 'Unknown' },
        { label: 'Available Start Date', value: formatDateShort(block.availableStartDate) },
        { label: 'Available End Date', value: formatDateShort(block.availableEndDate) },
        { label: 'Start Time', value: formatTime(block.availableStartTime) },
        { label: 'End Time', value: formatTime(block.availableEndTime) },
        { label: 'Locations', value: block.locations?.map((l) => l.locationCode).join(', ') || '-' },
    ];

    const getStaffName = (item: InspectorAvailableDate) =>
        item.inspectorProfile?.displayName ||
        `${item.inspectorProfile?.firstName || ''} ${item.inspectorProfile?.lastName || ''}`.trim() ||
        'Unknown';

    const columns: Column<InspectorAvailableDate>[] = [
        {
            key: 'staffName',
            header: 'STAFF NAME',
            render: (item) => getStaffName(item)
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

    const getMobileCardRows = (item: InspectorAvailableDate) => [
        { label: 'Staff Name', value: getStaffName(item) },
        { label: 'Available Date', value: formatDateShort(item.availableStartDate) },
        { label: 'Start Time', value: formatTime(item.availableStartTime) },
        { label: 'End Time', value: formatTime(item.availableEndTime) },
    ];

    return (
        <div className="inspector-availability-manager">
            <div className="manager-header">
                <h3>Inspector Availability</h3>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {isDesktop ? (
                <DataTable
                    columns={columns}
                    data={availableDates}
                    keyExtractor={(item) => item.inspectorAvailableDateId}
                    loading={loading}
                    onRowClick={(block) => {
                        setViewingBlock(block);
                        setIsViewModalOpen(true);
                    }}
                    actions={renderActions}
                    actionsColumnHeader="ACTIONS"
                />
            ) : (
                <>
                    {loading && <LoadingSpinner />}
                    {!loading && availableDates.length === 0 && (
                        <div className="data-table-empty">
                            <p>No availability found.</p>
                        </div>
                    )}
                    {!loading && availableDates.length > 0 && (
                        <div className="availability-mobile-list">
                            {availableDates.map((item) => (
                                <div
                                    key={item.inspectorAvailableDateId}
                                    className="availability-mobile-card clickable"
                                    onClick={() => {
                                        setViewingBlock(item);
                                        setIsViewModalOpen(true);
                                    }}
                                >
                                    <table className="data-table availability-table-mobile">
                                        <tbody>
                                            {getMobileCardRows(item).map((row) => (
                                                <tr key={row.label}>
                                                    <td className="mobile-label-col">{row.label}</td>
                                                    <td className="mobile-value-col">{row.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <button className="btn-confirm availability-add-button" onClick={handleAddNew}>
                + Add Available Date
            </button>

            <Modal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setViewingBlock(null);
                }}
                title="View Availability"
                size="medium"
                footer={
                    <>
                        <button
                            className={isDesktop ? "btn-primary" : "btn-secondary"}
                            onClick={() => {
                                setIsViewModalOpen(false);
                                setViewingBlock(null);
                            }}
                        >
                            Close
                        </button>
                        {!isDesktop && viewingBlock && (
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    setIsViewModalOpen(false);
                                    handleEdit(viewingBlock);
                                    setViewingBlock(null);
                                }}
                            >
                                Edit
                            </button>
                        )}
                    </>
                }
            >
                {viewingBlock && (
                    <table className="view-detail-table">
                        <tbody>
                            {getViewAvailabilityRows(viewingBlock).map((row) => (
                                <tr key={row.label}>
                                    <th scope="row">{row.label}</th>
                                    <td>{row.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Modal>

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
