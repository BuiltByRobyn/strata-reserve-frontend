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
import { PropertyTypeSelector } from '../components/PropertyTypeSelector';
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
  const [uploadingPropertyTypeId, setUploadingPropertyTypeId] = useState<number | undefined>(undefined);
  const [uploadingPropertyTypeName, setUploadingPropertyTypeName] = useState<string | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requiredDocsReady, setRequiredDocsReady] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [previewDocName, setPreviewDocName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const strataPlan = activeRequest?.strata?.strataPlan || '';
  const isSubmitted = !!activeRequest?.submittedForReviewDate;

  const clientPropertyTypeIds = useMemo(() => {
    return activeRequest?.clientPropertyTypes?.map(cpt => cpt.propertyTypeId) || [];
  }, [activeRequest]);

  const filteredDocuments = useMemo(() => {
    let docs: RequiredDocumentChecklist[];
    if (clientPropertyTypeIds.length === 0) {
      docs = requiredDocuments.filter(d => !d.propertyType);
    } else {
      docs = requiredDocuments.filter(d =>
        !d.propertyType || clientPropertyTypeIds.includes(d.propertyType.propertyTypeId)
      );
    }
    return [...docs].sort((a, b) => {
      const nameA = a.propertyType?.propertyTypeName || '';
      const nameB = b.propertyType?.propertyTypeName || '';
      return nameA.localeCompare(nameB);
    });
  }, [requiredDocuments, clientPropertyTypeIds]);

  const allMandatoryUploaded = useMemo(() => {
    return filteredDocuments
      .filter(d => d.isRequired)
      .every(d => !!d.uploadedDocument);
  }, [filteredDocuments]);

  useEffect(() => {
    if (serviceRequestId) {
      fetchRequiredDocuments(serviceRequestId).then(() => setRequiredDocsReady(true));
    }
  }, [serviceRequestId, fetchRequiredDocuments]);

  useEffect(() => {
    if (isSubmitted) {
      setShowThankYou(true);
    }
  }, [isSubmitted]);

  const totalPages = Math.ceil(filteredDocuments.length / DOCS_PER_PAGE);
  const pageItems = filteredDocuments.slice(
    page * DOCS_PER_PAGE,
    (page + 1) * DOCS_PER_PAGE,
  );
  const isLastPage = page >= totalPages - 1;

  const handleUploadClick = (documentTypeId: number, propertyTypeId?: number, propertyTypeName?: string) => {
    setUploadingTypeId(documentTypeId);
    setUploadingPropertyTypeId(propertyTypeId);
    setUploadingPropertyTypeName(propertyTypeName);
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTypeId || !strataPlan) return;

    const typeError = validateFileType(file);
    if (typeError) { setUploadError(typeError); setUploadingTypeId(null); setUploadingPropertyTypeId(undefined); setUploadingPropertyTypeName(undefined); return; }

    const sizeError = validateFileSize(file);
    if (sizeError) { setUploadError(sizeError); setUploadingTypeId(null); setUploadingPropertyTypeId(undefined); setUploadingPropertyTypeName(undefined); return; }

    setUploadError(null);
    const success = await uploadDocument(file, uploadingTypeId, strataPlan, undefined, uploadingPropertyTypeId, uploadingPropertyTypeName);

    if (success && serviceRequestId) {
      await fetchRequiredDocuments(serviceRequestId);
    }

    setUploadingTypeId(null);
    setUploadingPropertyTypeId(undefined);
    setUploadingPropertyTypeName(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadingTypeId, uploadingPropertyTypeId, uploadingPropertyTypeName, strataPlan, uploadDocument, serviceRequestId, fetchRequiredDocuments]);

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

  if (srLoading || loading || (serviceRequestId && !requiredDocsReady)) return <LoadingSpinner />;

  if (!serviceRequestId) {
    return (
      <div className="page-container">
        <h1>Documents</h1>
        <p>No active service request found. Please contact your administrator.</p>
      </div>
    );
  }

  if (clientPropertyTypeIds.length === 0 && activeRequest?.strata?.strataPropertyTypes?.length) {
    return (
      <div className="client-documents-page">
        <div className="page-header">
          <h1>Documents</h1>
          <p className="page-subtitle">
            We just need a little information before we can show your documents.
          </p>
        </div>
        <PropertyTypeSelector
          availablePropertyTypes={activeRequest.strata.strataPropertyTypes}
          onRequestSubmitted={() => {}}
        />
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

      {filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <p>No required documents found for this service request.</p>
        </div>
      ) : (
        <>
          <div className="document-list">
            {(() => {
              const groups: { name: string; items: { item: RequiredDocumentChecklist; globalIndex: number }[] }[] = [];
              pageItems.forEach((item, index) => {
                const groupName = item.propertyType?.propertyTypeName || 'General';
                let group = groups.find(g => g.name === groupName);
                if (!group) {
                  group = { name: groupName, items: [] };
                  groups.push(group);
                }
                group.items.push({ item, globalIndex: page * DOCS_PER_PAGE + index + 1 });
              });
              return groups.map(group => (
                <div key={group.name} className="document-group">
                  <h3 className="document-group-title">{group.name}</h3>
                  {group.items.map(({ item, globalIndex }) => {
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
                          <span className="document-number">{globalIndex}.</span>
                          <span className="document-name">{typeName}</span>
                        </div>
                        <div className="document-badges">
                          {isUploaded
                            ? <span className="uploaded-badge">Uploaded</span>
                            : item.isRequired && <span className="mandatory-badge">Mandatory</span>
                          }
                        </div>

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
                                onClick={() => handleUploadClick(item.documentType.documentTypeId, item.propertyType?.propertyTypeId, item.propertyType?.propertyTypeName)}
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
                                onClick={() => handleUploadClick(item.documentType.documentTypeId, item.propertyType?.propertyTypeId, item.propertyType?.propertyTypeName)}
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
              ));
            })()}
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
