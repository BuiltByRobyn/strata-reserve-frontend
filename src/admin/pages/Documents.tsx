import { useState, useEffect } from 'react';
import { useDocuments } from '../../shared/hooks/useDocuments';
import { useLookups } from '../../shared/hooks/useLookups';
import { useAuth } from '../../shared/contexts/AuthContext';
import { DataTable, type Column } from '../../shared/components/DataTable/DataTable';
import { Modal } from '../../shared/components/Modal/Modal';
import { InputField, SelectField, TextareaField, FormRow } from '../../shared/components/FormField/FormField';
import type { DocumentWithDetails, DocumentUploadData } from '../../shared/types/document.types';
import { STRATA_ID_PATTERN, formatStrataId } from '../../shared/utils/strataUtils';
import './Documents.scss';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const formatTypeName = (name: string): string =>
  name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function DocumentsPage() {
  const { documents, loading, error, refetch, updateDocumentStatus, deleteDocument, searchDocuments } = useDocuments();
  const { documentTypes, reviewStatuses } = useLookups();
  const { session, user } = useAuth();

  const [filteredDocuments, setFilteredDocuments] = useState<DocumentWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterStrata, setFilterStrata] = useState('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithDetails | null>(null);
  const [statusForm, setStatusForm] = useState({ reviewStatusId: '', notes: '' });

  const [uploadForm, setUploadForm] = useState<DocumentUploadData>({
    documentName: '',
    file: null,
    documentTypeId: null,
    strataName: '',
    strataId: '',
    adminNotes: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    let result = documents;

    if (filterDocType) {
      result = result.filter(d => d.documentType.documentTypeId === parseInt(filterDocType));
    }

    if (filterStrata) {
      result = result.filter(d =>
        d.serviceRequest.strata.strataPlan?.toLowerCase().includes(filterStrata.toLowerCase()) ||
        d.serviceRequest.strata.complexName?.toLowerCase().includes(filterStrata.toLowerCase())
      );
    }

    setFilteredDocuments(result);
  }, [documents, filterDocType, filterStrata]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      refetch();
      return;
    }
    const results = await searchDocuments(searchQuery);
    setFilteredDocuments(results);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const getStatusBadgeClass = (statusName?: string): string => {
    if (!statusName) return 'status-badge pending';
    switch (statusName.toLowerCase()) {
      case 'approved': return 'status-badge approved';
      case 'rejected': return 'status-badge rejected';
      case 'needs revision': return 'status-badge needs-revision';
      default: return 'status-badge pending';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const columns: Column<DocumentWithDetails>[] = [
    {
      key: 'fileName',
      header: 'File Name',
      render: (doc) => doc.fileName
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

  const openStatusModal = (doc: DocumentWithDetails) => {
    setSelectedDocument(doc);
    setStatusForm({
      reviewStatusId: doc.reviewStatus?.reviewStatusId?.toString() || '',
      notes: doc.notes || ''
    });
    setIsStatusModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedDocument || !statusForm.reviewStatusId) return;

    try {
      await updateDocumentStatus(
        selectedDocument.serviceRequestDocumentId,
        parseInt(statusForm.reviewStatusId),
        statusForm.notes || undefined
      );
      setIsStatusModalOpen(false);
      setSelectedDocument(null);
    } catch (err) {
      console.error('Error updating status:', err);
    }
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
      strataName: '',
      strataId: '',
      adminNotes: ''
    });
    setUploadError(null);
    setIsUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadForm(prev => ({ ...prev, file }));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file || !uploadForm.documentTypeId || !uploadForm.strataId) {
      setUploadError('Please fill in all required fields');
      return;
    }

    if (!STRATA_ID_PATTERN.test(uploadForm.strataId)) {
      setUploadError('Strata ID must be 3 letters, a space, and 5 numbers (e.g. ABC 12345)');
      return;
    }

    const token = session?.access_token;
    if (!token) {
      setUploadError('Not authenticated');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('document_type_id', uploadForm.documentTypeId.toString());
      formData.append('strata_id', uploadForm.strataId);
      if (uploadForm.strataName) {
        formData.append('strata_name', uploadForm.strataName);
      }
      if (uploadForm.adminNotes) {
        formData.append('notes', uploadForm.adminNotes);
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upload-document`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        }
      );

      const data = await response.json();
      console.log('Upload response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setIsUploadModalOpen(false);
      setUploadError(null);
      refetch();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const adminName = user?.role === 'admin' ? user.fullName : '';

  return (
    <div className="documents-page">
      <div className="page-header">
        <h1>Documents</h1>
        <button className="btn-primary" onClick={openUploadModal}>
          + Add New Document
        </button>
      </div>

      <div className="filters-row">
        <div className="search-field">
          <InputField
            label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search documents..."
          />
          <button className="btn-search" onClick={handleSearch}>Search</button>
        </div>
        <SelectField
          label="Document Type"
          value={filterDocType}
          onChange={(e) => setFilterDocType(e.target.value)}
          options={documentTypes.map(dt => ({ value: dt.documentTypeId, label: formatTypeName(dt.typeName) }))}
          placeholder="All Types"
        />
        <InputField
          label="Strata"
          value={filterStrata}
          onChange={(e) => setFilterStrata(e.target.value)}
          placeholder="Filter by strata..."
        />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataTable
        columns={columns}
        data={filteredDocuments}
        keyExtractor={(d) => d.serviceRequestDocumentId}
        loading={loading}
        emptyMessage="No documents found."
        actions={(doc) => (
          <>
            <button className="btn-edit" onClick={() => openStatusModal(doc)}>Review</button>
            <button className="btn-delete" onClick={() => handleDelete(doc)}>Delete</button>
          </>
        )}
      />

      {/* Status Review Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Review Document"
        size="small"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsStatusModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleStatusUpdate} disabled={!statusForm.reviewStatusId}>
              Update Status
            </button>
          </>
        }
      >
        {selectedDocument && (
          <div className="review-form">
            <p><strong>File:</strong> {selectedDocument.fileName}</p>
            <p><strong>Type:</strong> {formatTypeName(selectedDocument.documentType.typeName)}</p>
            <p><strong>Strata:</strong> {selectedDocument.serviceRequest.strata.complexName || selectedDocument.serviceRequest.strata.strataPlan}</p>

            <SelectField
              label="Status"
              required
              value={statusForm.reviewStatusId}
              onChange={(e) => setStatusForm(prev => ({ ...prev, reviewStatusId: e.target.value }))}
              options={reviewStatuses.map(rs => ({ value: rs.reviewStatusId, label: rs.statusName }))}
              placeholder="Select status"
            />
            <TextareaField
              label="Notes"
              value={statusForm.notes}
              onChange={(e) => setStatusForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add review notes..."
              rows={3}
            />
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document"
        size="medium"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleUploadSubmit} disabled={uploading}>
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
            onChange={(e) => setUploadForm(prev => ({ ...prev, documentName: e.target.value }))}
            placeholder="Enter document name"
          />

          <InputField
            label="Uploaded By"
            value={adminName}
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
            onChange={(e) => setUploadForm(prev => ({ ...prev, documentTypeId: e.target.value ? parseInt(e.target.value) : null }))}
            options={documentTypes.map(dt => ({ value: dt.documentTypeId, label: formatTypeName(dt.typeName) }))}
            placeholder="Select document type"
          />

          <FormRow>
            <InputField
              label="Strata Name"
              value={uploadForm.strataName}
              onChange={(e) => setUploadForm(prev => ({ ...prev, strataName: e.target.value }))}
              placeholder="Strata name"
            />
            <InputField
              label="Strata ID"
              required
              value={uploadForm.strataId}
              onChange={(e) => setUploadForm(prev => ({ ...prev, strataId: formatStrataId(e.target.value) }))}
              placeholder="e.g. ABC 12345"
            />
          </FormRow>

          <TextareaField
            label="Admin Notes"
            value={uploadForm.adminNotes || ''}
            onChange={(e) => setUploadForm(prev => ({ ...prev, adminNotes: e.target.value }))}
            placeholder="Add any notes..."
            rows={3}
          />
        </form>
      </Modal>
    </div>
  );
}
