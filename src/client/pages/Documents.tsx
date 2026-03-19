import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { useAuth } from '../../shared/contexts/AuthContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { NoFileNumberState } from '../../shared/components/NoFileNumberState';
import { DocumentPreviewModal } from '../../shared/components/DocumentPreviewModal';
import { PropertyTypeSelector } from '../components/PropertyTypeSelector';
import { VersionDocumentRow } from '../components/VersionDocumentRow';
import { validateFileType, validateFileSize } from '../../shared/lib/validation';
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

  const [expandedDocTypes, setExpandedDocTypes] = useState<Set<string>>(new Set());
  const [pendingUpload, setPendingUpload] = useState<{ req: RequiredDocumentChecklist; isReplace: boolean } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [previewDocName, setPreviewDocName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
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
      filteredRequirements.every(d => !!d.uploadedDocument || !!d.naStatus),
    [filteredRequirements]
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
    if (fileId) fetchRequiredDocuments(fileId);
  }, [fileId, fetchRequiredDocuments]);

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

  const handlePreview = (req: RequiredDocumentChecklist) => {
    if (!req.uploadedDocument) return;
    setPreviewDocId(req.uploadedDocument.fileNumberDocumentId);
    setPreviewDocName(req.uploadedDocument.fileName);
    setPreviewOpen(true);
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    navigate('/client/dashboard');
    setFinalizing(false);
  };

  if (srLoading || loading) return <LoadingSpinner />;

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
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {filteredRequirements.length === 0 ? (
        <div className="empty-state">
          <p>No documents have been requested for this file number yet.</p>
        </div>
      ) : (
        <>
          <div className="document-list">
            {Array.from(groupedByPropertyType.entries()).map(([groupName, reqs]) => {
              const docTypeGroups = new Map<string, RequiredDocumentChecklist[]>();
              for (const req of reqs) {
                const key = req.documentType.typeName;
                if (!docTypeGroups.has(key)) docTypeGroups.set(key, []);
                docTypeGroups.get(key)!.push(req);
              }

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
                            {versions.map(req => (
                              <VersionDocumentRow
                                key={req.fnDocRequirementId}
                                requirement={req}
                                uploading={uploading && pendingUpload?.req.fnDocRequirementId === req.fnDocRequirementId}
                                onUpload={handleUploadClick}
                                onSetNaStatus={handleSetNaStatus}
                                onPreview={handlePreview}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {allAnswered && (
            <div className="all-answered-banner">
              <p>All documents have been addressed. You can now finalize and submit.</p>
            </div>
          )}

          <div className="documents-actions">
            <button
              className="btn-primary btn-nav"
              onClick={handleFinalize}
              disabled={!allAnswered || finalizing}
            >
              {finalizing ? 'Submitting...' : 'Finalize and Submit'}
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
    </div>
  );
}
