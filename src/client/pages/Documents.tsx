import { useState, useEffect, useRef } from 'react';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';
import { Modal } from '../../shared/components/Modal/Modal';
import type { RequiredDocumentChecklist } from '../../shared/types/document.types';

const formatTypeName = (name: string): string =>
  name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const getFileExtension = (fileName: string): string =>
  fileName.split('.').pop()?.toLowerCase() || '';

export default function ClientDocumentsPage() {
  const {
    requiredDocuments,
    loading,
    error,
    uploading,
    fetchRequiredDocuments,
    uploadDocument,
    previewDocument,
    previewLoading,
    previewUrl,
    previewFileName,
    closePreview
  } = useClientDocuments();

  const { serviceRequestId, loading: srLoading } = useClientServiceRequest();
  const [uploadingDocTypeId, setUploadingDocTypeId] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF, JPEG, and DOC/DOCX files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum 10MB');
      return;
    }

    const success = await uploadDocument(file, serviceRequestId, uploadingDocTypeId);
    if (success) {
      setUploadSuccess(uploadingDocTypeId);
      setTimeout(() => setUploadSuccess(null), 3000);
      fetchRequiredDocuments(serviceRequestId);
    }

    setUploadingDocTypeId(null);
    e.target.value = '';
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
                    onClick={() => {
                      if (doc.uploadedDocument) {
                        previewDocument(doc.uploadedDocument.serviceRequestDocumentId, doc.uploadedDocument.fileName);
                      }
                    }}
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
                        <span className="check-icon">&#10003;</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      <Modal
        isOpen={previewLoading || !!previewUrl}
        onClose={closePreview}
        title={previewFileName || 'Document Preview'}
        size="preview"
      >
        {previewLoading ? (
          <LoadingSpinner />
        ) : previewUrl ? (
          (() => {
            const ext = getFileExtension(previewFileName || '');
            if (ext === 'pdf') {
              return <iframe src={previewUrl} title="Document Preview" />;
            }
            if (['jpg', 'jpeg', 'png'].includes(ext)) {
              return <img src={previewUrl} alt={previewFileName || 'Document'} />;
            }
            return (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Preview not available for this file type.</p>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', textDecoration: 'none', borderRadius: '4px' }}>
                  Download File
                </a>
              </div>
            );
          })()
        ) : null}
      </Modal>
    </div>
  );
}
