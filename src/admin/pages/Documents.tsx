import { useState, useEffect } from 'react';
import { useDocuments } from '../../shared/hooks/useDocuments';
import { useStrata } from '../../shared/hooks/useStrata';
import { useLookups } from '../../shared/hooks/useLookups';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { DocumentPreviewModal } from '../../shared/components/DocumentPreviewModal';
import { InputField, SelectField, TextareaField, FormRow } from '../../shared/components/FormField';
import type { DocumentWithDetails, DocumentUploadData } from '../../shared/types/document.types';
import { STRATA_ID_PATTERN, formatStrataId } from '../../shared/utils/strataUtils';
import { API_BASE } from '../../shared/lib/api';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../shared/lib/constants';
import { formatTypeName, formatDate, getStatusBadgeClass } from '../../shared/lib/formatters';

export default function DocumentsPage() {
  const { documents, loading, error, refetch, updateDocumentStatus, deleteDocument, syncDocuments } = useDocuments();
  const { stratas } = useStrata();
  const { documentTypes, reviewStatuses } = useLookups();
  const { session, user } = useAuth();
  const authFetch = useAuthFetch();

  const [filteredDocuments, setFilteredDocuments] = useState<DocumentWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterStrataName, setFilterStrataName] = useState('');
  const [filterStrataPlan, setFilterStrataPlan] = useState('');
  const [showArchived, setShowArchived] = useState(false);

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
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [previewDocumentName, setPreviewDocumentName] = useState('');
  const [previewDocument, setPreviewDocument] = useState<DocumentWithDetails | null>(null);

  const isDesktop = useMediaQuery('(min-width: 600px)');

  useEffect(() => {
    if (!STRATA_ID_PATTERN.test(uploadForm.strataId)) return;

    const lookup = async () => {
      try {
        const res = await authFetch(`${API_BASE}/admin/strata/search?q=${encodeURIComponent(uploadForm.strataId)}`);
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          const match = data.data.find((s: { strataPlan: string }) =>
            s.strataPlan?.toUpperCase() === uploadForm.strataId.toUpperCase()
          );
          if (match?.complexName) {
            setUploadForm(prev => ({ ...prev, strataName: match.complexName }));
          }
        }
      } catch { /* ignore lookup failures */ }
    };
    lookup();
  }, [uploadForm.strataId, authFetch]);

  useEffect(() => {
    let result = documents;

    if (!showArchived) {
      result = result.filter(d => !d.fileName.includes('- Archived'));
    }

    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase().trim();
      result = result.filter(d => {
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
      result = result.filter(d => d.documentType.documentTypeId === parseInt(filterDocType));
    }

    if (filterStrataName) {
      result = result.filter(d => d.serviceRequest.strata.strataId === parseInt(filterStrataName));
    }

    if (filterStrataPlan) {
      result = result.filter(d => d.serviceRequest.strata.strataId === parseInt(filterStrataPlan));
    }

    setFilteredDocuments(result);
  }, [documents, searchQuery, filterDocType, filterStrataName, filterStrataPlan, showArchived]);

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

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const result = await syncDocuments();
      if (result) {
        if (result.removed > 0) {
          setSyncMessage(`Sync complete: ${result.removed} orphaned record${result.removed === 1 ? '' : 's'} removed out of ${result.total} checked.`);
        } else {
          setSyncMessage(`Sync complete: All ${result.total} documents verified.`);
        }
      }
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

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
          headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
          body: formData
        }
      );

      const data = await response.json();

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
          <div className="add-document-button-desktop">
            <button className="btn-secondary" onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync with Dropbox'}
            </button>
            <button className="btn-primary" onClick={openUploadModal}>
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
            options={documentTypes.map(dt => ({ value: dt.documentTypeId, label: formatTypeName(dt.typeName) }))}
            placeholder="All Types"
          />
          <SelectField
            label="Strata Name"
            value={filterStrataName}
            onChange={(e) => setFilterStrataName(e.target.value)}
            options={stratas.filter(s => s.complexName).map(s => ({ value: s.strataId, label: s.complexName! }))}
            placeholder="All Strata"
          />
          <SelectField
            label="Strata Plan"
            value={filterStrataPlan}
            onChange={(e) => setFilterStrataPlan(e.target.value)}
            options={stratas.filter(s => s.strataPlan).map(s => ({ value: s.strataId, label: s.strataPlan! }))}
            placeholder="All Plans"
          />
          <div className="form-field archived-toggle">
            <label>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={() => setShowArchived(prev => !prev)}
              />
              Show Archived
            </label>
          </div>
        </div>

      </div>

      <div className="add-document-button">
        <button className="btn-secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync with Dropbox'}
        </button>
        <button className="btn-primary" onClick={openUploadModal}>
          + Add New Document
        </button>
      </div>

      {syncMessage && <div className="info-banner">{syncMessage}</div>}
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
            <>
              <button className="btn-edit" onClick={() => openStatusModal(doc)}>Review</button>
            </>
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
                <div
                  key={doc.serviceRequestDocumentId}
                  className="documents-mobile-table-wrap clickable"
                  onClick={() => handlePreview(doc)}
                >
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
                          <button className="btn-edit" onClick={() => openStatusModal(doc)}>Review</button>
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

      {/* Status Review Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Review Document"
        size="medium"
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
              disabled
              placeholder="Auto-populated from Strata ID"
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

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={handleClosePreview}
        documentId={previewDocumentId}
        documentName={previewDocumentName}
        token={session!.access_token}
        onDelete={previewDocument ? () => handleDelete(previewDocument) : undefined}
      />
    </div>
  );
}
