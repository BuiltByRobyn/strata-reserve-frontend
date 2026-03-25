import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { useAuth } from '../../shared/contexts/AuthContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { NoFileNumberState } from '../../shared/components/NoFileNumberState';
import { DocumentPreviewModal } from '../../shared/components/DocumentPreviewModal';
import { Modal } from '../../shared/components/Modal';
import { PropertyTypeSelector } from '../components/PropertyTypeSelector';
import { VersionDocumentRow } from '../components/VersionDocumentRow';
import { validateFileType, validateFileSize } from '../../shared/utils/validation';
import { groupByDocumentType } from '../../shared/utils/documentUtils';
import type { RequiredDocumentChecklist, NaStatusValue } from '../../shared/types/document.types';

export default function ClientDocumentsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeRequest, fileId, loading: srLoading } = useClientFileNumber();
  const {
    requiredDocuments,
    loading,
    error,
    fetchRequiredDocuments,
    uploadDocument,
    setNaStatus,
    uploading,
  } = useClientDocuments();

  const [requiredDocsReady, setRequiredDocsReady] = useState(false);
  const [expandedDocTypes, setExpandedDocTypes] = useState<Set<string>>(new Set());
  const [pendingUpload, setPendingUpload] = useState<{ req: RequiredDocumentChecklist; isReplace: boolean } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [previewDocName, setPreviewDocName] = useState('');

  const [showDenialModal, setShowDenialModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const denialShownRef = useRef<Set<string>>(new Set());
  const strataPlan = activeRequest?.strata?.strataPlan || '';

  const clientPropertyTypeIds = useMemo(
    () => activeRequest?.clientPropertyTypes?.map(cpt => cpt.propertyTypeId) || [],
    [activeRequest]
  );

  const filteredRequirements = useMemo(() => {
    if (clientPropertyTypeIds.length === 0) {
      return requiredDocuments.filter(d => !d.propertyType);
    }
    return requiredDocuments.filter(
      d => !d.propertyType || clientPropertyTypeIds.includes(d.propertyType.propertyTypeId)
    );
  }, [requiredDocuments, clientPropertyTypeIds]);

  const allAnswered = useMemo(
    () => filteredRequirements.length > 0 &&
      filteredRequirements.every(d => {
        const isDenied = (() => {
          const s = d.reviewStatus?.statusName?.toLowerCase() ?? '';
          return s.includes('deny') || s.includes('reject');
        })();
        if (isDenied) {
          if (!d.uploadedDocument || !d.reviewedAt) return false;
          return new Date(d.uploadedDocument.uploadedAt) > new Date(d.reviewedAt);
        }
        return !!d.uploadedDocument || !!d.naStatus;
      }),
    [filteredRequirements]
  );

  const deniedRequirements = useMemo(
    () => filteredRequirements.filter(r => {
      const s = r.reviewStatus?.statusName?.toLowerCase() ?? '';
      return s.includes('deny') || s.includes('reject');
    }),
    [filteredRequirements]
  );

  const hasReview = useMemo(
    () => filteredRequirements.some(r => r.reviewId !== null),
    [filteredRequirements]
  );

  const allApproved = useMemo(
    () => hasReview && filteredRequirements.length > 0 &&
      filteredRequirements.every(r => r.reviewStatus?.statusName?.toLowerCase().includes('approv')),
    [hasReview, filteredRequirements]
  );

  const groupedByPropertyType = useMemo(() => {
    const map = new Map<string, RequiredDocumentChecklist[]>();
    for (const req of filteredRequirements) {
      const groupKey = req.propertyType?.propertyTypeName || 'General';
      if (!map.has(groupKey)) map.set(groupKey, []);
      map.get(groupKey)!.push(req);
    }
    return map;
  }, [filteredRequirements]);

  useEffect(() => {
    if (!fileId) return;
    setRequiredDocsReady(false);
    fetchRequiredDocuments(fileId).then(() => setRequiredDocsReady(true));
  }, [fileId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!requiredDocsReady || !fileId) return;

    const deniedKeys = new Set<string>();
    for (const req of deniedRequirements) {
      const groupName = req.propertyType?.propertyTypeName || 'General';
      deniedKeys.add(`${groupName}__${req.documentType.typeName}`);
    }
    if (deniedKeys.size > 0) {
      setExpandedDocTypes(prev => new Set([...prev, ...deniedKeys]));
    }

    if (deniedRequirements.length > 0) {
      const reviewId = deniedRequirements[0].reviewId;
      const seenKey = reviewId ? `denial_notified_${fileId}_${reviewId}` : null;
      if (seenKey && !localStorage.getItem(seenKey) && !denialShownRef.current.has(seenKey)) {
        denialShownRef.current.add(seenKey);
        localStorage.setItem(seenKey, 'true');
        setShowDenialModal(true);
      }
    }
  }, [requiredDocsReady]);

  const handleUploadClick = (req: RequiredDocumentChecklist, isReplace: boolean) => {
    setPendingUpload({ req, isReplace });
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload || !strataPlan || !fileId) return;

    const typeError = validateFileType(file);
    if (typeError) { setUploadError(typeError); setPendingUpload(null); if (fileInputRef.current) fileInputRef.current.value = ''; return; }

    const sizeError = validateFileSize(file);
    if (sizeError) { setUploadError(sizeError); setPendingUpload(null); if (fileInputRef.current) fileInputRef.current.value = ''; return; }

    const { req, isReplace } = pendingUpload;
    setUploadError(null);

    await uploadDocument({
      file,
      documentTypeId: req.documentType.documentTypeId,
      strataId: strataPlan,
      fnDocRequirementId: req.fnDocRequirementId,
      fileId,
      isReplace,
      propertyTypeId: req.propertyType?.propertyTypeId,
      propertyTypeName: req.propertyType?.propertyTypeName,
      strataName: activeRequest?.strata?.complexName || strataPlan,
    });

    setPendingUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingUpload, strataPlan, fileId, uploadDocument, activeRequest]);

  const handleSetNaStatus = useCallback(async (req: RequiredDocumentChecklist, status: NaStatusValue) => {
    if (!fileId) return;
    if (req.naStatus === status) return;
    await setNaStatus(fileId, req.fnDocRequirementId, status);
  }, [fileId, setNaStatus]);

  const handleDismissDenialModal = () => {
    setShowDenialModal(false);
  };

  const handlePreview = (req: RequiredDocumentChecklist) => {
    if (!req.uploadedDocument) return;
    setPreviewDocId(req.uploadedDocument.fileNumberDocumentId);
    setPreviewDocName(req.uploadedDocument.fileName);
    setPreviewOpen(true);
  };

  const currentReviewId = deniedRequirements.length > 0 ? (deniedRequirements[0].reviewId ?? 0) : 0;
  const docsFinalized = fileId
    ? localStorage.getItem(`docs_finalized_${fileId}`) === String(currentReviewId)
    : false;

  const handleFinalize = () => {
    if (fileId) localStorage.setItem(`docs_finalized_${fileId}`, String(currentReviewId));
    navigate('/client/dashboard', { state: { justFinalizedDocs: true } });
  };

  if (srLoading || (fileId !== null && !requiredDocsReady)) return <LoadingSpinner />;

  if (!fileId) {
    return (
      <div className="page-container page-container--full">
        <h1>Documents</h1>
        <NoFileNumberState />
      </div>
    );
  }

  if (clientPropertyTypeIds.length === 0 && activeRequest?.strata?.strataPropertyTypes?.length) {
    return (
      <div className="client-documents-page">
        <div className="page-header">
          <h1>Documents</h1>
          <p className="page-subtitle">We just need a little information before we can show your documents.</p>
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
          Upload the required documents for your strata. Mark any unavailable documents as Not Available or Not Applicable.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {uploadError && <div className="error-banner">{uploadError}</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
        className="file-input-hidden"
        onChange={handleFileSelected}
      />

      {!loading && filteredRequirements.length === 0 ? (
        <div className="empty-state">
          <p>No documents have been requested for this file number yet.</p>
        </div>
      ) : (
        <>
          <div className="document-list">
            {Array.from(groupedByPropertyType.entries()).map(([groupName, reqs]) => {
              const docTypeGroups = groupByDocumentType(reqs);

              return (
                <div key={groupName} className="document-group">
                  <h3 className="document-group-title">{groupName}</h3>
                  {Array.from(docTypeGroups.entries()).map(([typeName, versions]) => {
                    const key = `${groupName}__${typeName}`;
                    const isExpanded = expandedDocTypes.has(key);
                    return (
                      <div key={typeName} className="document-type-group">
                        <button
                          className="document-type-group__header"
                          onClick={() => setExpandedDocTypes(prev => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key); else next.add(key);
                            return next;
                          })}
                        >
                          <span className={`document-type-group__arrow${isExpanded ? ' expanded' : ''}`}>▶</span>
                          <span className="document-name">{typeName}</span>
                        </button>
                        {isExpanded && (
                          <div className="version-list">
                            {versions.map(req => {
                              const isDenied = (() => {
                                const s = req.reviewStatus?.statusName?.toLowerCase() ?? '';
                                return s.includes('deny') || s.includes('reject');
                              })();
                              return (
                                <VersionDocumentRow
                                  key={req.fnDocRequirementId}
                                  requirement={req}
                                  uploading={uploading && pendingUpload?.req.fnDocRequirementId === req.fnDocRequirementId}
                                  onUpload={handleUploadClick}
                                  onSetNaStatus={handleSetNaStatus}
                                  onPreview={handlePreview}
                                  readOnly={(hasReview && !isDenied) || docsFinalized}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {allApproved ? (
            <div className="all-answered-banner">
              <p>All documents have been approved.</p>
            </div>
          ) : allAnswered && (
            <div className="all-answered-banner">
              <p>{docsFinalized ? 'Your documents will be reviewed shortly.' : 'All documents have been addressed. You can now finalize and submit.'}</p>
            </div>
          )}

          <div className="documents-actions">
            <button
              className="btn-primary btn-nav"
              onClick={handleFinalize}
              disabled={!allAnswered || docsFinalized}
            >
              Finalize and Submit
            </button>
          </div>
        </>
      )}

      <DocumentPreviewModal
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewDocId(null); setPreviewDocName(''); }}
        documentId={previewDocId}
        documentName={previewDocName}
        token={session?.access_token || ''}
      />

      <Modal
        isOpen={showDenialModal}
        onClose={handleDismissDenialModal}
        title="Documents Require Your Attention"
        size="medium"
        footer={
          <button className="btn-primary" onClick={handleDismissDenialModal}>
            Got It
          </button>
        }
      >
        <div className="denial-notification">
          <p className="denial-notification__intro">
            One or more of your documents have been denied. Please review the feedback below and re-upload the corrected documents.
          </p>
          <ul className="denial-notification__list">
            {deniedRequirements.map(req => (
              <li key={req.fnDocRequirementId} className="denial-notification__item">
                <p className="denial-notification__doc-name">
                  {req.documentType.typeName}
                  {req.versionLabel && req.versionLabel !== 'Default' && ` — ${req.versionLabel}`}
                  {req.propertyType && ` (${req.propertyType.propertyTypeName})`}
                </p>
                {req.denialNote && (
                  <p className="denial-notification__note">{req.denialNote}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
