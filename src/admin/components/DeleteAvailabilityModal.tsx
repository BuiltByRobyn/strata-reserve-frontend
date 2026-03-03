import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import type { DeleteAvailabilityModalProps } from '../../shared/types/component.types';
import { formatDateShort, getUserDisplayName } from '../../shared/lib/formatters';

export const DeleteAvailabilityModal = ({
    isOpen,
    onClose,
    block,
    onDelete
}: DeleteAvailabilityModalProps) => {
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        try {
            setDeleting(true);
            setError(null);
            await onDelete(block.inspectorAvailableDateId);
            onClose();
        } catch (err: any) {
            setError(err.message || 'An error occurred while deleting.');
        } finally {
            setDeleting(false);
        }
    };

    const footer = (
        <>
            <button className="btn-secondary" onClick={onClose} disabled={deleting}>Cancel</button>
            <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Removing...' : 'Remove Availability'}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Remove Inspector Availability"
            size="medium"
            footer={footer}
        >
            {error && <div className="alert alert-error">{error}</div>}

            <div className="delete-availability-body">
                <div className="delete-availability-info">
                    <div>
                        <div className="delete-availability-label">INSPECTOR NAME</div>
                        <div className="delete-availability-value">{getUserDisplayName(block.inspectorProfile)}</div>
                    </div>
                    <div className="delete-availability-info-right">
                        <div className="delete-availability-label">AVAILABLE DATE</div>
                        <div className="delete-availability-value">{formatDateShort(block.availableStartDate)}</div>
                    </div>
                </div>

                <div className="delete-availability-confirm">
                    <h3>Are you sure that you would like to remove this availability?</h3>
                    <p>Please ensure that any client appointments are rescheduled for this date before continuing.</p>
                </div>
            </div>

        </Modal>
    );
};
