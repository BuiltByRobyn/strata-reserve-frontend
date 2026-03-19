import { useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import type { SRDocRequirement, BatchDocumentReviewInput } from '../../shared/types/document.types';
import type { DocumentReviewResult } from '../../shared/types/document.types';
import type { ReviewStatus } from '../../shared/types/entities.types';

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number | null;
  docRequirements: SRDocRequirement[];
  reviewStatuses: ReviewStatus[];
  review: DocumentReviewResult | null;
  loading: boolean;
  onSubmit: (fileId: number, input: BatchDocumentReviewInput) => Promise<void>;
}

export function DocumentReviewModal({
  isOpen,
  onClose,
  fileId,
  docRequirements,
  reviewStatuses,
  review,
  loading,
  onSubmit,
}: DocumentReviewModalProps) {
  const [statusSelections, setStatusSelections] = useState<Record<number, { reviewStatusId: string; notes: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  const requirementsWithDocs = docRequirements.filter(r => r.fileNumberDocuments.length > 0);

  const handleStatusChange = (reqId: number, field: 'reviewStatusId' | 'notes', value: string) => {
    setStatusSelections(prev => ({
      ...prev,
      [reqId]: { ...prev[reqId] ?? { reviewStatusId: '', notes: '' }, [field]: value },
    }));
  };

  const allReviewed = requirementsWithDocs.length > 0 &&
    requirementsWithDocs.every(r => !!statusSelections[r.fnDocRequirementId]?.reviewStatusId);

  const handleSubmit = async () => {
    if (!fileId || !allReviewed) return;
    setSubmitting(true);
    const items = requirementsWithDocs.map(r => ({
      fnDocRequirementId: r.fnDocRequirementId,
      reviewStatusId: parseInt(statusSelections[r.fnDocRequirementId].reviewStatusId),
      notes: statusSelections[r.fnDocRequirementId].notes || undefined,
    }));
    await onSubmit(fileId, { items });
    setSubmitting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review All Documents"
      size="large"
      className="doc-review-modal"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          {!review && (
            <button
              className="btn-primary review-modal__submit"
              onClick={handleSubmit}
              disabled={!allReviewed || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="doc-review-loading">Loading...</div>
      ) : review ? (
        <div className="doc-review-result">
          <p className="doc-review-result__meta">
            Reviewed on {new Date(review.reviewedAt).toLocaleDateString()} by{' '}
            {review.reviewedBy.firstName} {review.reviewedBy.lastName}
          </p>
          <table className="doc-review-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {review.items.map(item => {
                const req = docRequirements.find(r => r.fnDocRequirementId === item.fnDocRequirementId);
                return (
                  <tr key={item.reviewItemId} className="doc-review-row">
                    <td>{req?.documentType.typeName || '—'}</td>
                    <td>{req?.versionLabel || 'Default'}</td>
                    <td>
                      <span className={`status-badge status-badge--${item.reviewStatus.statusName.toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.reviewStatus.statusName}
                      </span>
                    </td>
                    <td>{item.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : requirementsWithDocs.length === 0 ? (
        <p className="notes-empty">No uploaded documents to review yet.</p>
      ) : (
        <table className="doc-review-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Version</th>
              <th>File</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {requirementsWithDocs.map(r => {
              const latestDoc = r.fileNumberDocuments[0];
              const sel = statusSelections[r.fnDocRequirementId] ?? { reviewStatusId: '', notes: '' };
              return (
                <tr key={r.fnDocRequirementId} className="doc-review-row">
                  <td>{r.documentType.typeName}</td>
                  <td className="doc-review-row__version">{r.versionLabel || 'Default'}</td>
                  <td className="doc-review-row__file">{latestDoc.fileName}</td>
                  <td className="doc-review-row__status">
                    <select
                      value={sel.reviewStatusId}
                      onChange={e => handleStatusChange(r.fnDocRequirementId, 'reviewStatusId', e.target.value)}
                    >
                      <option value="">Select status</option>
                      {reviewStatuses.map(rs => (
                        <option key={rs.reviewStatusId} value={rs.reviewStatusId}>{rs.statusName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="doc-review-row__notes">
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={sel.notes}
                      onChange={e => handleStatusChange(r.fnDocRequirementId, 'notes', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
