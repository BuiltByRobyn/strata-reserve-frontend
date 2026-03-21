import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../shared/components/Modal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../shared/utils/constants';
import type { DocumentReviewModalProps } from '../../shared/types/component.types';

const getFileType = (contentType: string): 'pdf' | 'image' | 'other' => {
  if (contentType.includes('application/pdf')) return 'pdf';
  if (contentType.startsWith('image/')) return 'image';
  return 'other';
};

export function DocumentReviewModal({
  isOpen,
  onClose,
  fileId,
  docRequirements,
  reviewStatuses,
  review,
  loading,
  token,
  onSubmit,
}: DocumentReviewModalProps) {
  const items = docRequirements
    .filter(r => r.fileNumberDocuments.length > 0)
    .map(r => ({ req: r, doc: r.fileNumberDocuments[0] }));

  const approveStatus = reviewStatuses.find(rs => rs.statusName.toLowerCase().includes('approv'));
  const denyStatus = reviewStatuses.find(rs =>
    rs.statusName.toLowerCase().includes('deny') ||
    rs.statusName.toLowerCase().includes('reject')
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusSelections, setStatusSelections] = useState<Record<number, number>>({});
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileContentType, setFileContentType] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setStatusSelections({});
    }
  }, [isOpen]);

  const cleanupBlob = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    if (!isOpen || items.length === 0 || review) return;

    const currentDoc = items[currentIndex]?.doc;
    if (!currentDoc || !token) return;

    let cancelled = false;
    setBlobUrl(prev => { cleanupBlob(prev); return null; });
    setFileContentType('');
    setPreviewError(null);
    setLoadingPreview(true);

    const fetchPreview = async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/preview-document`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId: currentDoc.fileNumberDocumentId }),
        });

        const contentType = response.headers.get('Content-Type') || '';

        if (contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load preview');
        }
        if (!response.ok) throw new Error('Failed to load preview');

        const blob = await response.blob();
        if (!cancelled) {
          setFileContentType(contentType);
          setBlobUrl(URL.createObjectURL(blob));
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewError(err instanceof Error ? err.message : 'Failed to load document preview.');
        }
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    fetchPreview();
    return () => { cancelled = true; };
  }, [isOpen, currentIndex, token, review]);

  useEffect(() => {
    return () => cleanupBlob(blobUrl);
  }, [blobUrl, cleanupBlob]);

  const handleStatusToggle = (reqId: number, statusId: number) => {
    setStatusSelections(prev => {
      if (prev[reqId] === statusId) {
        const next = { ...prev };
        delete next[reqId];
        return next;
      }
      return { ...prev, [reqId]: statusId };
    });
  };

  const handleClose = () => {
    cleanupBlob(blobUrl);
    setBlobUrl(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!fileId) return;
    setSubmitting(true);
    const submitItems = items.map(({ req }) => ({
      fnDocRequirementId: req.fnDocRequirementId,
      reviewStatusId: statusSelections[req.fnDocRequirementId],
      notes: undefined,
    }));
    await onSubmit(fileId, { items: submitItems });
    setSubmitting(false);
  };

  const allReviewed = items.length > 0 && items.every(({ req }) => !!statusSelections[req.fnDocRequirementId]);

  const currentItem = items[currentIndex];
  const currentReqId = currentItem?.req.fnDocRequirementId;
  const currentSelection = currentReqId !== undefined ? statusSelections[currentReqId] : undefined;

  const buildTitle = () => {
    if (!currentItem) return 'Review All Documents';
    const { req, doc } = currentItem;
    const typeName = req.documentType.typeName;
    const version = req.versionLabel && req.versionLabel !== 'Default' ? ` — ${req.versionLabel}` : '';
    return `${typeName}${version} — ${doc.fileName}`;
  };

  const renderPreview = () => {
    if (!blobUrl) return null;
    const fileType = getFileType(fileContentType);
    switch (fileType) {
      case 'pdf':
        return <iframe src={`${blobUrl}#navpanes=0`} title={currentItem?.doc.fileName} className="document-preview-iframe" />;
      case 'image':
        return <img src={blobUrl} alt={currentItem?.doc.fileName} className="document-preview-image" />;
      default:
        return (
          <div className="document-preview-other">
            <p>Preview not available for this file type.</p>
            <a href={blobUrl} download={currentItem?.doc.fileName} className="btn btn-primary">Download File</a>
          </div>
        );
    }
  };

  const footer = review ? (
    <button className="btn-secondary" onClick={handleClose}>Close</button>
  ) : (
    <div className="doc-review-actions">
      <button className="btn-secondary" onClick={handleClose}>Cancel</button>
      <div className="doc-review-actions__nav">
        <button
          className="btn-secondary"
          onClick={() => setCurrentIndex(i => i - 1)}
          disabled={currentIndex === 0}
        >
          Back
        </button>
        <span className="doc-review-nav-badge">{currentIndex + 1} / {items.length}</span>
        {currentIndex < items.length - 1 ? (
          <button className="btn-secondary" onClick={() => setCurrentIndex(i => i + 1)}>
            Next
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!allReviewed || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        )}
      </div>
      {currentItem && (
        <div className="doc-review-actions__decisions">
          {approveStatus && (
            <button
              className={`btn-approve${currentSelection === approveStatus.reviewStatusId ? ' btn-approve--active' : ''}`}
              onClick={() => handleStatusToggle(currentReqId!, approveStatus.reviewStatusId)}
            >
              Approve
            </button>
          )}
          {denyStatus && (
            <button
              className={`btn-deny${currentSelection === denyStatus.reviewStatusId ? ' btn-deny--active' : ''}`}
              onClick={() => handleStatusToggle(currentReqId!, denyStatus.reviewStatusId)}
            >
              Deny
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={review ? 'Review All Documents' : buildTitle()}
      size="large"
      className="doc-review-modal"
      footer={footer}
    >
      {loading ? (
        <div className="doc-review-loading">Loading...</div>
      ) : review ? (
        <div className="doc-review-result">
          <p className="doc-review-result__meta">
            Reviewed on {review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : '—'} by{' '}
            {review.reviewedBy?.firstName} {review.reviewedBy?.lastName}
          </p>
          <table className="doc-review-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>Status</th>
                <th>Client Feedback</th>
              </tr>
            </thead>
            <tbody>
              {review.items?.map(item => {
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
      ) : items.length === 0 ? (
        <p className="notes-empty">No uploaded documents to review yet.</p>
      ) : (
        <div className="document-preview-container">
          {loadingPreview && (
            <div className="document-preview-loading">
              <LoadingSpinner />
            </div>
          )}
          {previewError && (
            <div className="alert alert-error">{previewError}</div>
          )}
          {!loadingPreview && !previewError && blobUrl && (
            <div className="document-preview-content">
              {renderPreview()}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
