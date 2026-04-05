import { useState, useMemo, useEffect } from 'react';
import { useInspectorAvailability } from '../../shared/hooks/useInspectorAvailability';
import { useUsers } from '../../shared/hooks/useUsers';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { InputField } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { formatDateShort, getUserDisplayName } from '../../shared/utils/formatters';
import { parseLocalDate } from '../../shared/utils/dateUtils';
import type { InspectorAvailableDate } from '../../shared/types/entities.types';
import { getInspectorOptions } from '../../shared/utils/userUtils';
import { InspectorAvailabilityModal } from './InspectorAvailabilityModal.tsx';
import { DeleteAvailabilityModal } from './DeleteAvailabilityModal.tsx';
import type { InspectorAvailabilityManagerProps } from '../../shared/types/component.types';

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

export const InspectorAvailabilityManager = ({ inspectorProfileId }: InspectorAvailabilityManagerProps) => {
    const { availableDates, loading, error, deleteAvailableDate, createAvailableDatesBatch, updateAvailableDate } = useInspectorAvailability();
    const canDeleteAvailability = true;
    const { users } = useUsers();
    const isDesktop = useMediaQuery('(min-width: 750px)');

    // Filter state
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterInspector, setFilterInspector] = useState('');
    const [showPastDates, setShowPastDates] = useState(false);

    const inspectorOptions = useMemo(() => getInspectorOptions(users), [users]);

    const filteredDates = useMemo(() => {
        let result = inspectorProfileId
            ? availableDates.filter(d => d.inspectorProfileId === inspectorProfileId)
            : availableDates;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (showPastDates) {
            // Show ONLY past dates
            result = result.filter(d => {
                const startDate = parseLocalDate(d.availableStartDate);
                return startDate ? startDate < today : false;
            });
        } else {
            // Show ONLY future/today dates
            result = result.filter(d => {
                const startDate = parseLocalDate(d.availableStartDate);
                return startDate ? startDate >= today : false;
            });
        }

        if (filterInspector) {
            result = result.filter(d => d.inspectorProfileId === filterInspector);
        }
        if (dateFrom) {
            const from = new Date(dateFrom + 'T00:00:00');
            result = result.filter(d => {
                const startDate = parseLocalDate(d.availableStartDate);
                return startDate ? startDate >= from : false;
            });
        }
        if (dateTo) {
            const to = new Date(dateTo + 'T00:00:00');
            result = result.filter(d => {
                const startDate = parseLocalDate(d.availableStartDate);
                return startDate ? startDate <= to : false;
            });
        }

        // Sort: past dates most recent first, future dates closest first
        result = [...result].sort((a, b) => {
            const dateA = parseLocalDate(a.availableStartDate)?.getTime() ?? 0;
            const dateB = parseLocalDate(b.availableStartDate)?.getTime() ?? 0;
            return showPastDates ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [availableDates, filterInspector, dateFrom, dateTo, showPastDates]);

    useEffect(() => setVisibleCount(10), [filterInspector, dateFrom, dateTo, showPastDates]);

    const [visibleCount, setVisibleCount] = useState(10);
    const visibleDates = useMemo(() => filteredDates.slice(0, visibleCount), [filteredDates, visibleCount]);

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
        { label: 'Staff Name', value: getUserDisplayName(block.inspectorProfile) },
        { label: 'Available Start Date', value: formatDateShort(block.availableStartDate) },
        { label: 'Available End Date', value: formatDateShort(block.availableEndDate) },
        { label: 'Start Time', value: formatTime(block.availableStartTime) },
        { label: 'End Time', value: formatTime(block.availableEndTime) },
        { label: 'Locations', value: block.locations?.map((l) => l.locationCode).join(', ') || '-' },
    ];

    const getStaffName = (item: InspectorAvailableDate) =>
        getUserDisplayName(item.inspectorProfile);

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
        <button className="btn-edit" onClick={() => handleEdit(item)}>
            Edit
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
            <div className="manager-header company-holidays-header">
                <h3>Inspector Availability</h3>
                {isDesktop && (
                    <button className="btn-confirm company-holidays-add-btn" onClick={handleAddNew}>
                        + Add Available Date
                    </button>
                )}
            </div>

            <div className="filters-row">
                {!inspectorProfileId && (
                    <SingleSelectDropdown
                        label="Inspector"
                        value={filterInspector}
                        onChange={setFilterInspector}
                        options={inspectorOptions}
                        placeholder="All Inspectors"
                    />
                )}
                <div className="date-range-filter">
                    <InputField
                        label="From"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                    />
                    <InputField
                        label="To"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                    />
                </div>
                <div className="form-field archived-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={showPastDates}
                            onChange={() => setShowPastDates(prev => !prev)}
                        />
                        Show Past Dates
                    </label>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {!isDesktop && (
                <button className="btn-confirm availability-add-button" onClick={handleAddNew}>
                    + Add Available Date
                </button>
            )}

            {isDesktop ? (
                <>
                    <DataTable
                        columns={columns}
                        data={visibleDates}
                        keyExtractor={(item) => item.inspectorAvailableDateId}
                        loading={loading}
                        onRowClick={(block) => {
                            setViewingBlock(block);
                            setIsViewModalOpen(true);
                        }}
                        actions={renderActions}
                        actionsColumnHeader="ACTIONS"
                        emptyMessage={filterInspector ? 'This inspector currently has no availability' : 'No availability found.'}
                    />
                    {visibleCount < filteredDates.length && (
                        <div className="load-more-container">
                            <button className="btn-link" onClick={() => setVisibleCount(prev => prev + 10)}>
                                Load More ({filteredDates.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <>
                    {loading && <LoadingSpinner />}
                    {!loading && filteredDates.length === 0 && (
                        <div className="data-table-empty">
                            <p>{filterInspector ? 'This inspector currently has no availability' : 'No availability found.'}</p>
                        </div>
                    )}
                    {!loading && filteredDates.length > 0 && (
                        <div className="availability-mobile-list">
                            {visibleDates.map((item) => (
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
                    {!loading && visibleCount < filteredDates.length && (
                        <div className="load-more-container">
                            <button className="btn-link" onClick={() => setVisibleCount(prev => prev + 10)}>
                                Load More ({filteredDates.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </>
            )}

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
                    onSubmitBulkCreate={createAvailableDatesBatch}
                    onSubmitUpdate={updateAvailableDate}
                    onDeleteClick={canDeleteAvailability ? () => selectedBlock && handleOpenDelete(selectedBlock) : undefined}
                    lockedInspectorProfileId={inspectorProfileId}
                />
            )}

            {canDeleteAvailability && isDeleteModalOpen && selectedBlock && (
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
