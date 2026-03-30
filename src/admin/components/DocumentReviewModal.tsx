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
  initialSelections,
  loading,
  token,
  onSubmit,
}: DocumentReviewModalProps) {
  const items = docRequirements
    .map(r => ({ req: r, doc: r.fileNumberDocuments[0] ?? null }));

  const hasNotReceived = items.some(({ doc, req }) => !doc && !req.naStatus);

  const approveStatus = reviewStatuses.find(rs => rs.statusName.toLowerCase().includes('approv'));
  const denyStatus = reviewStatuses.find(rs =>
    rs.statusName.toLowerCase().includes('deny') ||
    rs.statusName.toLowerCase().includes('reject')
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusSelections, setStatusSelections] = useState<Record<number, number>>({});
  const [notesSelections, setNotesSelections] = useState<Record<number, string>>({});
  const [denyModalOpen, setDenyModalOpen] = useState(false);
  const [denyNote, setDenyNote] = useState('');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileContentType, setFileContentType] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [docResultMap, setDocResultMap] = useState<Record<number, 'success' | 'error'>>({});

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setStatusSelections(initialSelections ?? {});
      setNotesSelections({});
      setDenyModalOpen(false);
      setDenyNote('');
      setDocResultMap({});
    }
  }, [isOpen, initialSelections]);

  const cleanupBlob = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    if (!isOpen || items.length === 0 || review) return;

    // Always clear previous preview state when switching items
    setBlobUrl(prev => { cleanupBlob(prev); return null; });
    setFileContentType('');
    setPreviewError(null);

    const currentDoc = items[currentIndex]?.doc;
    if (!currentDoc || !token) {
      setLoadingPreview(false);
      return;
    }

    let cancelled = false;
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
  }, [isOpen, currentIndex, token, review, docRequirements]);

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

  const handleConfirmDeny = () => {
    if (!currentReqId || !denyStatus) return;
    setStatusSelections(prev => ({ ...prev, [currentReqId]: denyStatus.reviewStatusId }));
    if (denyNote.trim()) {
      setNotesSelections(prev => ({ ...prev, [currentReqId]: denyNote.trim() }));
    }
    setDenyModalOpen(false);
    setDenyNote('');
    if (currentIndex < items.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleClose = () => {
    cleanupBlob(blobUrl);
    setBlobUrl(null);
    onClose();
  };

  const getReviewedItems = () =>
    items
      .filter(({ req }) => !!statusSelections[req.fnDocRequirementId])
      .map(({ req }) => ({
        fnDocRequirementId: req.fnDocRequirementId,
        reviewStatusId: statusSelections[req.fnDocRequirementId],
        notes: notesSelections[req.fnDocRequirementId],
      }));

  const handleSubmit = async (partial = false) => {
    if (!fileId) return;
    setSubmitting(true);
    try {
      await onSubmit(fileId, { items: getReviewedItems() }, partial);
      setDocResultMap(Object.fromEntries(items.map(({ req }) => [req.fnDocRequirementId, 'success'])));
    } catch {
      setDocResultMap(Object.fromEntries(items.map(({ req }) => [req.fnDocRequirementId, 'error'])));
    } finally {
      setSubmitting(false);
    }
  };

  const allReviewed = items.length > 0 && !hasNotReceived && items.every(({ req }) => !!statusSelections[req.fnDocRequirementId]);
  const allApprovedSelections = allReviewed && approveStatus &&
    items.every(({ req }) => statusSelections[req.fnDocRequirementId] === approveStatus.reviewStatusId);
  const hasAnySelection = Object.keys(statusSelections).length > 0;

  const currentItem = items[currentIndex];
  const currentReqId = currentItem?.req.fnDocRequirementId;
  const currentSelection = currentReqId !== undefined ? statusSelections[currentReqId] : undefined;

  const buildTitle = () => {
    if (!currentItem) return 'Review All Documents';
    const { req, doc } = currentItem;
    const typeName = req.documentType.typeName;
    const version = req.versionLabel && req.versionLabel !== 'Default' ? ` — ${req.versionLabel}` : '';
    if (!doc) return `${typeName}${version} — N/A`;
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

  const footer = loading ? null : review ? (
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
        <span className="doc-review-nav-badge">
          {currentIndex + 1} / {items.length}
          {docResultMap[currentReqId!] === 'success' && <span className="doc-result doc-result--success">Saved</span>}
          {docResultMap[currentReqId!] === 'error' && <span className="doc-result doc-result--error">Failed</span>}
        </span>
        {currentIndex < items.length - 1 ? (
          <button className="btn-secondary" onClick={() => setCurrentIndex(i => i + 1)}>
            Next
          </button>
        ) : allApprovedSelections ? (
          <button
            className="btn-primary"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        ) : hasAnySelection ? (
          <button
            className="btn-secondary"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Progress'}
          </button>
        ) : (
          <span />
        )}
      </div>
      {currentItem && (currentItem.doc || currentItem.req.naStatus) && (
        <div className="doc-review-actions__decisions">
          {approveStatus && (
            <button
              className={`btn-approve${currentSelection === approveStatus.reviewStatusId ? ' btn-approve--active' : ''}`}
              onClick={() => {
                handleStatusToggle(currentReqId!, approveStatus.reviewStatusId);
                if (currentSelection !== approveStatus.reviewStatusId && currentIndex < items.length - 1) {
                  setCurrentIndex(i => i + 1);
                }
              }}
            >
              Approve
            </button>
          )}
          {denyStatus && (
            <button
              className={`btn-deny${currentSelection === denyStatus.reviewStatusId ? ' btn-deny--active' : ''}`}
              onClick={() => {
                if (currentSelection === denyStatus.reviewStatusId) {
                  handleStatusToggle(currentReqId!, denyStatus.reviewStatusId);
                } else {
                  setDenyModalOpen(true);
                }
              }}
            >
              Deny
            </button>
          )}
        </div>
      )}
    </div>
  );

  const denyModalFooter = (
    <div className="deny-modal__actions">
      <button className="btn-secondary" onClick={() => { setDenyModalOpen(false); setDenyNote(''); }}>
        Cancel
      </button>
      <button className="btn-deny btn-deny--active" onClick={handleConfirmDeny}>
        Confirm Deny
      </button>
    </div>
  );

  return (
    <>
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
                    <td data-label="Document">{req?.documentType.typeName || '—'}</td>
                    <td data-label="Version">{req?.versionLabel || 'Default'}</td>
                    <td data-label="Status">
                      <span className={`status-badge status-badge--${item.reviewStatus.statusName.toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.reviewStatus.statusName}
                      </span>
                    </td>
                    <td data-label="Client Feedback">{item.notes || '—'}</td>
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
          {currentItem?.doc ? (
            <>
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
            </>
          ) : currentItem?.req.naStatus ? (
            <div className="doc-na-preview">
              <p>
                Client stated that this document is{' '}
                <strong>
                  {currentItem.req.naStatus.status === 'not_available' ? 'Not Available' : 'Not Applicable'}
                </strong>.
              </p>
            </div>
          ) : (
            <div className="doc-na-preview">
              <p>This document has <strong>Not Been Received</strong> from the client.</p>
            </div>
          )}
        </div>
      )}
    </Modal>
    <Modal
      isOpen={denyModalOpen}
      onClose={() => { setDenyModalOpen(false); setDenyNote(''); }}
      title="Deny Document"
      size="small"
      footer={denyModalFooter}
    >
      <div className="deny-modal">
        <div className="form-field">
          <label htmlFor="deny-feedback">Feedback for client</label>
          <textarea
            id="deny-feedback"
            className="deny-modal__textarea"
            value={denyNote}
            onChange={(e) => setDenyNote(e.target.value)}
            rows={4}
            placeholder="Explain why this document was denied..."
          />
        </div>
      </div>
    </Modal>
    </>
  );
}
