import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import type { DeleteStrataModalProps } from '../../shared/types/component.types';

export const DeleteStrataModal = ({
    isOpen,
    onClose,
    strata,
    onDelete
}: DeleteStrataModalProps) => {
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        try {
            setDeleting(true);
            setError(null);
            await onDelete(strata.strataId);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to delete strata.');
        } finally {
            setDeleting(false);
        }
    };

    const strataName = strata.strataPlan || strata.complexName || 'this strata';

    const footer = (
        <>
            <button className="btn-secondary" onClick={onClose} disabled={deleting}>Cancel</button>
            <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Strata'}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Strata"
            size="small"
            footer={footer}
        >
            {error && <div className="alert alert-error">{error}</div>}

            <div className="delete-strata-body">
                <div className="delete-strata-info">
                    <div>
                        <div className="delete-strata-label">STRATA PLAN</div>
                        <div className="delete-strata-value">{strata.strataPlan ?? '-'}</div>
                    </div>
                    <div>
                        <div className="delete-strata-label">COMPLEX NAME</div>
                        <div className="delete-strata-value">{strata.complexName ?? '-'}</div>
                    </div>
                </div>

                <div className="delete-strata-confirm">
                    <h3>Are you sure you want to delete "{strataName}"?</h3>
                    <p>This action cannot be undone. All associated data will be permanently removed.</p>
                </div>
            </div>
        </Modal>
    );
};
