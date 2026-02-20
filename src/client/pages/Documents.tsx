import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';
import { useAuth } from '../../shared/contexts/AuthContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { DocumentPreviewModal } from '../../shared/components/DocumentPreviewModal';
import { formatTypeName } from '../../shared/lib/formatters';
import { validateFileType, validateFileSize } from '../../shared/lib/validation';
import type { RequiredDocumentChecklist } from '../../shared/types/document.types';

const DOCS_PER_PAGE = 5;

export default function ClientDocumentsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeRequest, serviceRequestId, loading: srLoading, submitForReview } = useClientServiceRequest();
  const {
    requiredDocuments,
    loading,
    error,
    fetchRequiredDocuments,
    uploadDocument,
    uploading,
  } = useClientDocuments();

  const [page, setPage] = useState(0);
  const [naStatuses, setNaStatuses] = useState<Map<number, 'not_available' | 'not_applicable'>>(new Map());
  const [uploadingTypeId, setUploadingTypeId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [previewDocName, setPreviewDocName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const strataPlan = activeRequest?.strata?.strataPlan || '';
  const isSubmitted = !!activeRequest?.submittedForReviewDate;

  const allMandatoryUploaded = useMemo(() => {
    return requiredDocuments
      .filter(d => d.isRequired)
      .every(d => !!d.uploadedDocument);
  }, [requiredDocuments]);

  useEffect(() => {
    if (serviceRequestId) {
      fetchRequiredDocuments(serviceRequestId);
    }
  }, [serviceRequestId, fetchRequiredDocuments]);

  useEffect(() => {
    if (isSubmitted) {
      setShowThankYou(true);
    }
  }, [isSubmitted]);

  const totalPages = Math.ceil(requiredDocuments.length / DOCS_PER_PAGE);
  const pageItems = requiredDocuments.slice(
    page * DOCS_PER_PAGE,
    (page + 1) * DOCS_PER_PAGE,
  );
  const isLastPage = page >= totalPages - 1;

  const handleUploadClick = (documentTypeId: number) => {
    setUploadingTypeId(documentTypeId);
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTypeId || !strataPlan) return;

    const typeError = validateFileType(file);
    if (typeError) { setUploadError(typeError); setUploadingTypeId(null); return; }

    const sizeError = validateFileSize(file);
    if (sizeError) { setUploadError(sizeError); setUploadingTypeId(null); return; }

    setUploadError(null);
    const success = await uploadDocument(file, uploadingTypeId, strataPlan);

    if (success && serviceRequestId) {
      await fetchRequiredDocuments(serviceRequestId);
    }

    setUploadingTypeId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadingTypeId, strataPlan, uploadDocument, serviceRequestId, fetchRequiredDocuments]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  const handleSave = () => {
    navigate('/client/dashboard');
  };

  const handleSaveAndSubmit = async () => {
    setSubmitting(true);
    const success = await submitForReview();
    setSubmitting(false);
    if (success) {
      setShowThankYou(true);
    }
  };

  const handleThankYouClose = () => {
    setShowThankYou(false);
  };

  const toggleNaStatus = (docTypeId: number, status: 'not_available' | 'not_applicable') => {
    setNaStatuses(prev => {
      const next = new Map(prev);
      if (next.get(docTypeId) === status) {
        next.delete(docTypeId);
      } else {
        next.set(docTypeId, status);
      }
      return next;
    });
  };

  const handlePreview = (doc: RequiredDocumentChecklist) => {
    if (!doc.uploadedDocument) return;
    setPreviewDocId(doc.uploadedDocument.serviceRequestDocumentId);
    setPreviewDocName(doc.uploadedDocument.fileName);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewDocId(null);
    setPreviewDocName('');
  };

  if (srLoading || loading) return <LoadingSpinner />;

  if (!serviceRequestId) {
    return (
      <div className="client-documents-page">
        <div className="page-header">
          <h1>Documents</h1>
        </div>
        <div className="no-service-request">
          <p>No active service request found. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-documents-page">
      <div className="page-header">
        <h1>Documents</h1>
        <p className="page-subtitle">
          Upload the required documents for your strata. Mandatory documents must be provided.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {uploadError && <div className="error-banner">{uploadError}</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {requiredDocuments.length === 0 ? (
        <div className="empty-state">
          <p>No required documents found for this service request.</p>
        </div>
      ) : (
        <>
          <div className="document-list">
            {pageItems.map((item, index) => {
              const docNumber = page * DOCS_PER_PAGE + index + 1;
              const typeName = formatTypeName(item.documentType.typeName);
              const isUploaded = !!item.uploadedDocument;
              const naStatus = naStatuses.get(item.documentType.documentTypeId);
              const isUploadingThis = uploadingTypeId === item.documentType.documentTypeId && uploading;

              return (
                <div
                  key={item.requiredDocumentId}
                  className={`document-item${isUploaded ? ' uploaded' : ''}`}
                >
                  <div className="document-info">
                    <span className="document-number">{docNumber}.</span>
                    <span className="document-name">{typeName}</span>
                  </div>
                  {isUploaded
                    ? <span className="uploaded-badge">Uploaded</span>
                    : item.isRequired && <span className="mandatory-badge">Mandatory</span>
                  }

                  <div className="document-actions">
                    {isUploaded ? (
                      <>
                        <button
                          className="btn-view"
                          onClick={() => handlePreview(item)}
                        >
                          View
                        </button>
                        <button
                          className="btn-replace"
                          onClick={() => handleUploadClick(item.documentType.documentTypeId)}
                          disabled={isUploadingThis}
                        >
                          {isUploadingThis ? 'Uploading...' : 'Replace'}
                        </button>
                      </>
                    ) : naStatus ? (
                      <span className="na-status">
                        {naStatus === 'not_available' ? 'Not Available' : 'Not Applicable'}
                      </span>
                    ) : (
                      <>
                        <button
                          className="btn-upload"
                          onClick={() => handleUploadClick(item.documentType.documentTypeId)}
                          disabled={isUploadingThis}
                        >
                          {isUploadingThis ? 'Uploading...' : 'Upload'}
                        </button>
                        {!item.isRequired && (
                          <>
                            <button
                              className="btn-not-available"
                              onClick={() => toggleNaStatus(item.documentType.documentTypeId, 'not_available')}
                            >
                              Not Available
                            </button>
                            <button
                              className="btn-not-applicable"
                              onClick={() => toggleNaStatus(item.documentType.documentTypeId, 'not_applicable')}
                            >
                              Not Applicable
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="documents-pagination">
            {page > 0 && (
              <button
                className="btn-secondary btn-nav"
                onClick={() => handlePageChange(page - 1)}
              >
                Previous Step
              </button>
            )}

            {isLastPage ? (
              <>
                <button className="btn-secondary btn-nav" onClick={handleSave}>
                  Save
                </button>
                {allMandatoryUploaded && (
                  <button
                    className="btn-primary btn-nav"
                    onClick={handleSaveAndSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : isSubmitted ? 'Resubmit' : 'Save and Submit'}
                  </button>
                )}
              </>
            ) : (
              <button
                className="btn-primary btn-nav"
                onClick={() => handlePageChange(page + 1)}
              >
                Next Step
              </button>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={showThankYou}
        onClose={handleThankYouClose}
        title="Thank You"
        size="medium"
        footer={
          <button className="btn-primary" onClick={handleThankYouClose}>
            Close
          </button>
        }
      >
        <div className="thank-you-content">
          <p>Thank you for submitting your documents. We will review them shortly.</p>
        </div>
      </Modal>

      <DocumentPreviewModal
        isOpen={previewOpen}
        onClose={handleClosePreview}
        documentId={previewDocId}
        documentName={previewDocName}
        token={session?.access_token || ''}
      />
    </div>
  );
}
