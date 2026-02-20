import { useEffect, useMemo, useState } from 'react';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useLookups } from '../../shared/hooks/useLookups';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { DocumentPreviewModal } from '../../shared/components/DocumentPreviewModal';
import { InputField, SelectField, TextareaField } from '../../shared/components/FormField';
import type { DocumentWithDetails } from '../../shared/types/document.types';
import { formatTypeName, formatDate, getStatusBadgeClass } from '../../shared/lib/formatters';
import { validateFileType, validateFileSize } from '../../shared/lib/validation';

interface ClientDocumentUploadData {
  documentName: string;
  file: File | null;
  documentTypeId: number | null;
  clientNotes: string;
}

export default function ClientDocumentsPage() {
  const { documents, loading, error, refetch, uploadDocument, deleteDocument, uploading } = useClientDocuments();
  const { documentTypes } = useLookups();
  const { session, user } = useAuth();
  const { serviceRequestId, loading: srLoading } = useClientServiceRequest();

  const [filteredDocuments, setFilteredDocuments] = useState<DocumentWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterStrataName, setFilterStrataName] = useState('');
  const [filterStrataPlan, setFilterStrataPlan] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<ClientDocumentUploadData>({
    documentName: '',
    file: null,
    documentTypeId: null,
    clientNotes: ''
  });
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [previewDocumentName, setPreviewDocumentName] = useState('');
  const [previewDocument, setPreviewDocument] = useState<DocumentWithDetails | null>(null);

  const isDesktop = useMediaQuery('(min-width: 600px)');

  useEffect(() => {
    let result = documents;

    if (!showArchived) {
      result = result.filter((d) => !d.fileName.includes('- Archived'));
    }

    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase().trim();
      result = result.filter((d) => {
        const fileName = (d.fileName || '').toLowerCase();
        const strataPlan = (d.serviceRequest.strata.strataPlan || '').toLowerCase();
        const complexName = (d.serviceRequest.strata.complexName || '').toLowerCase();
        const typeName = formatTypeName(d.documentType.typeName || '').toLowerCase();
        const statusName = (d.reviewStatus?.statusName || '').toLowerCase();
        return (
          fileName.includes(search) ||
          strataPlan.includes(search) ||
          complexName.includes(search) ||
          typeName.includes(search) ||
          statusName.includes(search)
        );
      });
    }

    if (filterDocType) {
      result = result.filter((d) => d.documentType.documentTypeId === parseInt(filterDocType, 10));
    }

    if (filterStrataName) {
      result = result.filter((d) => d.serviceRequest.strata.strataId === parseInt(filterStrataName, 10));
    }

    if (filterStrataPlan) {
      result = result.filter((d) => d.serviceRequest.strata.strataId === parseInt(filterStrataPlan, 10));
    }

    setFilteredDocuments(result);
  }, [documents, searchQuery, filterDocType, filterStrataName, filterStrataPlan, showArchived]);

  const strataOptions = useMemo(() => {
    const strataById = new Map<number, { strataId: number; strataPlan: string | null; complexName: string | null }>();
    documents.forEach((doc) => {
      const strata = doc.serviceRequest.strata;
      if (!strataById.has(strata.strataId)) {
        strataById.set(strata.strataId, strata);
      }
    });
    return Array.from(strataById.values());
  }, [documents]);

  const columns: Column<DocumentWithDetails>[] = [
    {
      key: 'fileName',
      header: 'File Name',
      render: (doc) => (
        <button className="btn-link" onClick={() => handlePreview(doc)} title="View document">
          {doc.fileName}
        </button>
      )
    },
    {
      key: 'strata',
      header: 'Strata',
      render: (doc) => doc.serviceRequest.strata.complexName || doc.serviceRequest.strata.strataPlan || '-'
    },
    {
      key: 'strataId',
      header: 'Strata ID',
      render: (doc) => doc.serviceRequest.strata.strataPlan || '-'
    },
    {
      key: 'documentType',
      header: 'Document Type',
      render: (doc) => formatTypeName(doc.documentType.typeName)
    },
    {
      key: 'uploadedAt',
      header: 'Upload Date',
      render: (doc) => formatDate(doc.uploadedAt)
    },
    {
      key: 'status',
      header: 'Status',
      render: (doc) => (
        <span className={getStatusBadgeClass(doc.reviewStatus?.statusName)}>
          {doc.reviewStatus?.statusName || 'Pending'}
        </span>
      )
    }
  ];

  const handlePreview = (doc: DocumentWithDetails) => {
    setPreviewDocumentId(doc.serviceRequestDocumentId);
    setPreviewDocumentName(doc.fileName);
    setPreviewDocument(doc);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setPreviewDocumentId(null);
    setPreviewDocumentName('');
    setPreviewDocument(null);
  };

  const handleDelete = async (doc: DocumentWithDetails) => {
    if (!confirm(`Are you sure you want to delete "${doc.fileName}"?`)) return;

    try {
      await deleteDocument(doc.serviceRequestDocumentId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const openUploadModal = () => {
    setUploadForm({
      documentName: '',
      file: null,
      documentTypeId: null,
      clientNotes: ''
    });
    setUploadError(null);
    setIsUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadForm((prev) => ({ ...prev, file }));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceRequestId) {
      setUploadError('No active service request found. Upload is currently unavailable.');
      return;
    }

    if (!uploadForm.file || !uploadForm.documentTypeId) {
      setUploadError('Please fill in all required fields');
      return;
    }

    const typeError = validateFileType(uploadForm.file);
    if (typeError) {
      setUploadError(typeError);
      return;
    }

    const sizeError = validateFileSize(uploadForm.file);
    if (sizeError) {
      setUploadError(sizeError);
      return;
    }

    setUploadError(null);

    const success = await uploadDocument(
      uploadForm.file,
      serviceRequestId,
      uploadForm.documentTypeId,
      uploadForm.clientNotes || undefined
    );

    if (success) {
      setIsUploadModalOpen(false);
      await refetch();
    }
  };

  const clientName = user?.role === 'client'
    ? `${user.firstName} ${user.lastName}`.trim()
    : '';

  if (srLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="documents-page">
      <div className="page-header">
        <h1>Documents</h1>
        <div className="add-document-button-desktop">
          <button className="btn-primary" onClick={openUploadModal} disabled={!serviceRequestId}>
            + Add New Document
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="filters-row">
          <div className="search-field">
            <InputField
              label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
            />
          </div>
          <SelectField
            label="Document Type"
            value={filterDocType}
            onChange={(e) => setFilterDocType(e.target.value)}
            options={documentTypes.map((dt) => ({ value: dt.documentTypeId, label: formatTypeName(dt.typeName) }))}
            placeholder="All Types"
          />
          <SelectField
            label="Strata Name"
            value={filterStrataName}
            onChange={(e) => setFilterStrataName(e.target.value)}
            options={strataOptions.filter((s) => s.complexName).map((s) => ({ value: s.strataId, label: s.complexName! }))}
            placeholder="All Strata"
          />
          <SelectField
            label="Strata Plan"
            value={filterStrataPlan}
            onChange={(e) => setFilterStrataPlan(e.target.value)}
            options={strataOptions.filter((s) => s.strataPlan).map((s) => ({ value: s.strataId, label: s.strataPlan! }))}
            placeholder="All Plans"
          />
          <div className="form-field archived-toggle">
            <label>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={() => setShowArchived((prev) => !prev)}
              />
              Show Archived
            </label>
          </div>
        </div>
      </div>

      <div className="add-document-button">
        <button className="btn-primary" onClick={openUploadModal} disabled={!serviceRequestId}>
          + Add New Document
        </button>
      </div>

      {!serviceRequestId && (
        <div className="error-banner">
          No active service request found. Upload is currently unavailable.
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}

      {isDesktop ? (
        <DataTable
          columns={columns}
          data={filteredDocuments}
          keyExtractor={(d) => d.serviceRequestDocumentId}
          loading={loading}
          emptyMessage="No documents found."
          onRowClick={(doc) => handlePreview(doc)}
          actionsColumnHeader="Action"
          actions={(doc) => (
            <button className="btn-edit" onClick={() => handlePreview(doc)}>View</button>
          )}
        />
      ) : (
        <>
          {loading && <LoadingSpinner />}
          {!loading && filteredDocuments.length === 0 && (
            <div className="data-table-empty">
              <p>No documents found.</p>
            </div>
          )}
          {!loading && filteredDocuments.length > 0 && (
            <div className="documents-mobile-list">
              {filteredDocuments.map((doc) => (
                <div key={doc.serviceRequestDocumentId} className="documents-mobile-table-wrap">
                  <table className="data-table documents-table-mobile">
                    <tbody>
                      <tr>
                        <td className="mobile-label-col">File Name</td>
                        <td className="mobile-value-col">{doc.fileName}</td>
                      </tr>
                      <tr>
                        <td className="mobile-label-col">Strata</td>
                        <td className="mobile-value-col">
                          {doc.serviceRequest.strata.complexName || doc.serviceRequest.strata.strataPlan || '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="mobile-label-col">Strata ID</td>
                        <td className="mobile-value-col">{doc.serviceRequest.strata.strataPlan || '-'}</td>
                      </tr>
                      <tr>
                        <td className="mobile-label-col">Document Type</td>
                        <td className="mobile-value-col">{formatTypeName(doc.documentType.typeName)}</td>
                      </tr>
                      <tr>
                        <td className="mobile-label-col">Upload Date</td>
                        <td className="mobile-value-col">{formatDate(doc.uploadedAt)}</td>
                      </tr>
                      <tr>
                        <td className="mobile-label-col">Status</td>
                        <td className="mobile-value-col">
                          <span className={getStatusBadgeClass(doc.reviewStatus?.statusName)}>
                            {doc.reviewStatus?.statusName || 'Pending'}
                          </span>
                        </td>
                      </tr>
                      <tr onClick={(e) => e.stopPropagation()}>
                        <td className="mobile-label-col">Action</td>
                        <td className="mobile-value-col actions-cell">
                          <button className="btn-edit" onClick={() => handlePreview(doc)}>View</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document"
        size="medium"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleUploadSubmit} disabled={uploading || !serviceRequestId}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </>
        }
      >
        <form onSubmit={handleUploadSubmit}>
          {uploadError && <div className="form-error">{uploadError}</div>}

          <InputField
            label="Document Name"
            required
            value={uploadForm.documentName}
            onChange={(e) => setUploadForm((prev) => ({ ...prev, documentName: e.target.value }))}
            placeholder="Enter document name"
          />

          <InputField
            label="Uploaded By"
            value={clientName}
            disabled
          />

          <div className="form-field">
            <label>Select File <span className="required">*</span></label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg"
              onChange={handleFileChange}
            />
          </div>

          <SelectField
            label="Document Type"
            required
            value={uploadForm.documentTypeId?.toString() || ''}
            onChange={(e) => setUploadForm((prev) => ({
              ...prev,
              documentTypeId: e.target.value ? parseInt(e.target.value, 10) : null
            }))}
            options={documentTypes.map((dt) => ({ value: dt.documentTypeId, label: formatTypeName(dt.typeName) }))}
            placeholder="Select document type"
          />

          <TextareaField
            label="Client Notes"
            value={uploadForm.clientNotes}
            onChange={(e) => setUploadForm((prev) => ({ ...prev, clientNotes: e.target.value }))}
            placeholder="Add any notes..."
            rows={3}
          />
        </form>
      </Modal>

      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={handleClosePreview}
        documentId={previewDocumentId}
        documentName={previewDocumentName}
        token={session?.access_token || ''}
        onDelete={previewDocument ? () => handleDelete(previewDocument) : undefined}
      />
    </div>
  );
}
