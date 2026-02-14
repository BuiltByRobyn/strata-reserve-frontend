import { useState, useEffect, useRef } from 'react';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';
import { useAuth } from '../../shared/contexts/AuthContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';
import { DocumentPreviewModal } from '../../shared/components/DocumentPreview/DocumentPreviewModal';
import type { RequiredDocumentChecklist } from '../../shared/types/document.types';
import { formatTypeName } from '../../shared/lib/formatters';
import { validateFileType, validateFileSize } from '../../shared/lib/validation';

export default function ClientDocumentsPage() {
  const {
    requiredDocuments,
    loading,
    error,
    uploading,
    fetchRequiredDocuments,
    uploadDocument,
  } = useClientDocuments();

  const { session } = useAuth();
  const { serviceRequestId, loading: srLoading } = useClientServiceRequest();
  const [uploadingDocTypeId, setUploadingDocTypeId] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [previewDocumentName, setPreviewDocumentName] = useState('');

  useEffect(() => {
    if (serviceRequestId) {
      fetchRequiredDocuments(serviceRequestId);
    }
  }, [serviceRequestId, fetchRequiredDocuments]);

  const groupedDocuments = requiredDocuments.reduce<Record<string, RequiredDocumentChecklist[]>>((groups, doc) => {
    const category = doc.documentType.typeName;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(doc);
    return groups;
  }, {});

  const handleUploadClick = (documentTypeId: number) => {
    setUploadingDocTypeId(documentTypeId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDocTypeId || !serviceRequestId) return;

    const typeError = validateFileType(file);
    if (typeError) { alert(typeError); return; }

    const sizeError = validateFileSize(file);
    if (sizeError) { alert(sizeError); return; }

    const success = await uploadDocument(file, serviceRequestId, uploadingDocTypeId);
    if (success) {
      setUploadSuccess(uploadingDocTypeId);
      setTimeout(() => setUploadSuccess(null), 3000);
      fetchRequiredDocuments(serviceRequestId);
    }

    setUploadingDocTypeId(null);
    e.target.value = '';
  };

  const handlePreview = (doc: RequiredDocumentChecklist) => {
    if (doc.uploadedDocument) {
      setPreviewDocumentId(doc.uploadedDocument.serviceRequestDocumentId);
      setPreviewDocumentName(doc.uploadedDocument.fileName);
      setPreviewModalOpen(true);
    }
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setPreviewDocumentId(null);
    setPreviewDocumentName('');
  };

  const isDocumentUploaded = (doc: RequiredDocumentChecklist): boolean => {
    return !!doc.uploadedDocument;
  };

  if (srLoading) return <LoadingSpinner />;

  if (!serviceRequestId) {
    return (
      <div className="client-documents-page">
        <div className="page-header">
          <h1>Documents</h1>
          <p className="page-subtitle">Upload required documents for your service request</p>
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
        <p className="page-subtitle">Upload required documents for your service request</p>
      </div>

      <div className="warning-banner">
        Please upload all mandatory documents to proceed with your service request.
      </div>

      {error && <div className="error-banner">{error}</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.doc,.docx"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

      {loading ? (
        <LoadingSpinner />
      ) : Object.keys(groupedDocuments).length === 0 ? (
        <div className="empty-state">
          <p>No required documents configured for this service request.</p>
        </div>
      ) : (
        <div className="document-categories">
          {Object.entries(groupedDocuments).map(([category, docs]) => (
            <div key={category} className="document-category">
              <h2 className="category-title">{formatTypeName(category)}</h2>
              <div className="document-list">
                {docs.map((doc) => (
                  <div
                    key={doc.requiredDocumentId}
                    className={`document-item ${isDocumentUploaded(doc) ? 'uploaded' : ''}`}
                    onClick={() => handlePreview(doc)}
                    style={{ cursor: isDocumentUploaded(doc) ? 'pointer' : 'default' }}
                  >
                    <div className="document-info">
                      <span className="document-name">{formatTypeName(doc.documentType.typeName)}</span>
                      {doc.isRequired && <span className="mandatory-badge">MANDATORY</span>}
                      {isDocumentUploaded(doc) && <span className="uploaded-badge">Uploaded</span>}
                      {uploadSuccess === doc.documentType.documentTypeId && (
                        <span className="success-badge">Upload successful!</span>
                      )}
                    </div>
                    <div className="document-actions">
                      {!isDocumentUploaded(doc) && (
                        <>
                          <button
                            className="btn-upload"
                            onClick={() => handleUploadClick(doc.documentType.documentTypeId)}
                            disabled={uploading && uploadingDocTypeId === doc.documentType.documentTypeId}
                          >
                            {uploading && uploadingDocTypeId === doc.documentType.documentTypeId
                              ? 'Uploading...'
                              : 'Upload'}
                          </button>
                          <button className="btn-not-available">Not Available</button>
                          <button className="btn-not-applicable">Not Applicable</button>
                        </>
                      )}
                      {isDocumentUploaded(doc) && (
                        <>
                          <span className="check-icon">&#10003;</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={handleClosePreview}
        documentId={previewDocumentId}
        documentName={previewDocumentName}
        token={session!.access_token}
      />
    </div>
  );
}
