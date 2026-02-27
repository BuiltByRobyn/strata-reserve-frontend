import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import type { InspectorAvailableDate } from '../../shared/types/entities.types';
import { formatDateShort } from '../../shared/lib/formatters';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    block: InspectorAvailableDate;
    onDelete: (id: number) => Promise<any>;
}

export const DeleteAvailabilityModal = ({
    isOpen,
    onClose,
    block,
    onDelete
}: Props) => {
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <button className="btn-secondary" onClick={onClose} disabled={deleting} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>Cancel</button>
            <button className="btn-primary" onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ff0000', color: 'white' }}>
                {deleting ? 'Removing...' : 'Remove Availability'}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Remove Inspector Availability"
            size="medium"
            footer={footer}
        >
            {error && <div className="alert alert-error" style={{ marginBottom: '15px', color: '#ff0000', backgroundColor: '#ffeeee', padding: '10px', borderRadius: '4px' }}>{error}</div>}

            <div style={{ padding: '0 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #E5E7EB' }}>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#6A7282', fontSize: '13px', marginBottom: '5px' }}>INSPECTOR NAME</div>
                        <div style={{ fontSize: '15px' }}>{block.inspectorProfile?.displayName || `${block.inspectorProfile?.firstName || ''} ${block.inspectorProfile?.lastName || ''}`.trim() || 'Unknown'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', color: '#6A7282', fontSize: '13px', marginBottom: '5px' }}>AVAILABLE DATE</div>
                        <div style={{ fontSize: '15px' }}>{formatDateShort(block.availableStartDate)}</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', margin: '40px 0' }}>
                    <h3 style={{ color: '#1C1917', fontSize: '1.4rem', marginBottom: '15px', fontWeight: 'bold' }}>
                        Are you sure that you would like to remove this availability?
                    </h3>
                    <p style={{ color: '#6A7282', lineHeight: '1.5' }}>
                        Please ensure that any client appointments are rescheduled for this date before continuing.
                    </p>
                </div>
            </div>

        </Modal>
    );
};
