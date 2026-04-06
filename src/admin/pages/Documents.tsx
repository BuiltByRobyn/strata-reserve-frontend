import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDocuments } from '../../shared/hooks/useDocuments';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useStrata } from '../../shared/hooks/useStrata';
import { useLookups } from '../../shared/hooks/useLookups';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { DocumentPreviewModal } from '../../shared/components/DocumentPreviewModal';
import { InputField, TextareaField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import type { DocumentWithDetails } from '../../shared/types/document.types';
import { API_BASE } from '../../shared/lib/api';
import { formatTypeName, formatDate, getStatusBadgeClass } from '../../shared/utils/formatters';

export default function DocumentsPage() {
  const { documents, loading, error, updateDocumentStatus, uploadDocument, uploading, deleteDocument, syncDocuments, refetch } = useDocuments();
  const { canDelete, isInspector } = usePermissions();
  const { stratas } = useStrata();
  const { documentTypes, reviewStatuses } = useLookups();
  const { session, user } = useAuth();
  const authFetch = useAuthFetch();
  const location = useLocation();

  const [filteredDocuments, setFilteredDocuments] = useState<DocumentWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterStrataName, setFilterStrataName] = useState<string>(location.state?.strataId || '');
  const [filterStrataPlan, setFilterStrataPlan] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithDetails | null>(null);
  const [statusForm, setStatusForm] = useState({ reviewStatusId: '', notes: '' });

  const [uploadForm, setUploadForm] = useState({ documentName: '', file: null as File | null, documentTypeId: null as number | null, strataId: null as number | null, notes: '', propertyTypeId: null as number | null });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const [activeFileError, setActiveFileError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [previewDocumentName, setPreviewDocumentName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DocumentWithDetails | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentWithDetails | null>(null);

  const isDesktop = useMediaQuery('(min-width: 900px)');

  const selectedUploadStrata = stratas.find(s => s.strataId === uploadForm.strataId);
  const uploadStrataPropertyTypes = selectedUploadStrata?.strataPropertyTypes?.map(spt => spt.propertyType) ?? [];

  useEffect(() => {
    if (!uploadForm.strataId) {
      setActiveFileError(null);
      return;
    }
    const checkActiveFile = async () => {
      try {
        const res = await authFetch(`${API_BASE}/admin/file-numbers/active?strataId=${uploadForm.strataId}`);
        const data = await res.json();
        setActiveFileError(!data.data ? 'This strata does not have an active file number' : null);
      } catch {
        setActiveFileError('This strata does not have an active file number');
      }
    };
    checkActiveFile();
  }, [uploadForm.strataId, authFetch]);

  useEffect(() => {
    let result = documents;

    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase().trim();
      result = result.filter(d => {
        const fileName = (d.fileName || '').toLowerCase();
        const strataPlan = (d.fileNumber.strata.strataPlan || '').toLowerCase();
        const complexName = (d.fileNumber.strata.complexName || '').toLowerCase();
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
      result = result.filter(d => d.fileNumber.strata.strataId === parseInt(filterStrataName));
    }

    if (filterStrataPlan) {
      result = result.filter(d => d.fileNumber.strata.strataId === parseInt(filterStrataPlan));
    }

    setFilteredDocuments(result);
  }, [documents, searchQuery, filterDocType, filterStrataName, filterStrataPlan]);

  const autoOpenedUploadRef = useRef(false);
  useEffect(() => {
    if (!location.state?.openUpload || autoOpenedUploadRef.current) return;
    autoOpenedUploadRef.current = true;
    openUploadModal();
    window.history.replaceState({}, '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    const documentId = location.state?.documentId as number | undefined;
    if (!documentId || autoOpenedRef.current || loading || documents.length === 0) return;
    const match = documents.find(d => d.fileNumberDocumentId === documentId);
    if (match) {
      autoOpenedRef.current = true;
      setPreviewDocumentId(match.fileNumberDocumentId);
      setPreviewDocumentName(match.fileName);
      setPreviewDocument(match);
      setPreviewModalOpen(true);
    }
  }, [documents, loading, location.state]);

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
      render: (doc) => doc.fileNumber.strata.complexName || doc.fileNumber.strata.strataPlan || '-'
    },
    {
      key: 'strataId',
      header: 'Strata ID',
      render: (doc) => doc.fileNumber.strata.strataPlan || '-'
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

  const handleStatusUpdate = async () => {
    if (!selectedDocument || !statusForm.reviewStatusId) return;

    try {
      await updateDocumentStatus(
        selectedDocument.fileNumberDocumentId,
        parseInt(statusForm.reviewStatusId),
        statusForm.notes || undefined
      );
      setIsStatusModalOpen(false);
      setSelectedDocument(null);
    } catch {
    }
  };

  const handleDelete = (doc: DocumentWithDetails) => {
    setDeleteTarget(doc);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteDocument(deleteTarget.fileNumberDocumentId);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const result = await syncDocuments();
      if (result) {
        const parts: string[] = [];
        if (result.added > 0) parts.push(`${result.added} new document${result.added === 1 ? '' : 's'} added`);
        if (result.removed > 0) parts.push(`${result.removed} orphaned record${result.removed === 1 ? '' : 's'} removed`);
        if (parts.length > 0) {
          setSyncMessage(`Sync complete: ${parts.join(', ')} (${result.total} checked).`);
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
    setPreviewDocumentId(doc.fileNumberDocumentId);
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
    setUploadForm({ documentName: '', file: null, documentTypeId: null, strataId: null, notes: '', propertyTypeId: null });
    setUploadError(null);
    setActiveFileError(null);
    setIsUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadForm(prev => ({ ...prev, file }));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file || !uploadForm.documentTypeId || !uploadForm.strataId || !selectedUploadStrata?.strataPlan) {
      setUploadError('Please fill in all required fields');
      return;
    }

    setUploadError(null);

    const selectedPt = uploadStrataPropertyTypes.find(pt => pt.propertyTypeId === uploadForm.propertyTypeId);

    const docTypeId = uploadForm.documentTypeId;
    const propTypeId = uploadForm.propertyTypeId;
    try {
      const result = await uploadDocument(
        uploadForm.file,
        docTypeId!,
        selectedUploadStrata.strataPlan,
        selectedUploadStrata.complexName || undefined,
        uploadForm.notes || undefined,
        propTypeId || undefined,
        selectedPt?.propertyTypeName || undefined
      );

      setIsUploadModalOpen(false);
      const srId = result?.document?.file_id;
      const autoLinked = result?.autoLinked;
      if (srId && docTypeId && !autoLinked) {
        authFetch(`${API_BASE}/admin/file-numbers/${srId}/document-requirements/version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentTypeId: docTypeId,
            propertyTypeId: propTypeId || null,
          }),
        }).catch(() => {});
      }

      setTimeout(() => refetch(), 100);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      uploadFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const adminName = user?.role === 'admin' ? user.fullName : '';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="documents-page">
        <div className="page-header">
          <h1>Documents</h1>
          <div className="add-document-button-desktop">
            {!isInspector && (
              <button className="btn-secondary" onClick={handleSync} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync with Dropbox'}
              </button>
            )}
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
          <SingleSelectDropdown
            label="Document Type"
            value={filterDocType}
            onChange={(val) => setFilterDocType(val)}
            options={documentTypes.map(dt => ({ value: dt.documentTypeId, label: formatTypeName(dt.typeName) })).filter((opt, i, arr) => arr.findIndex(o => o.label === opt.label) === i).sort((a, b) => a.label.localeCompare(b.label))}
            placeholder="All Types"
          />
          <SingleSelectDropdown
            label="Strata Name"
            value={filterStrataName}
            onChange={(val) => setFilterStrataName(val)}
            options={stratas.filter(s => s.complexName).map(s => ({ value: s.strataId, label: s.complexName! })).sort((a, b) => a.label.localeCompare(b.label))}
            placeholder="All Strata"
          />
          <SingleSelectDropdown
            label="Strata Plan"
            value={filterStrataPlan}
            onChange={(val) => setFilterStrataPlan(val)}
            options={stratas.filter(s => s.strataPlan).map(s => ({ value: s.strataId, label: s.strataPlan! })).sort((a, b) => a.label.localeCompare(b.label))}
            placeholder="All Plans"
          />
        </div>

      </div>

      <div className="add-document-button">
        {!isInspector && (
          <button className="btn-secondary" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync with Dropbox'}
          </button>
        )}
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
          keyExtractor={(d) => d.fileNumberDocumentId}
          loading={loading}
          emptyMessage="No documents found."
          onRowClick={(doc) => handlePreview(doc)}
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
                  key={doc.fileNumberDocumentId}
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
                          {doc.fileNumber.strata.complexName || doc.fileNumber.strata.strataPlan || '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="mobile-label-col">Strata ID</td>
                        <td className="mobile-value-col">{doc.fileNumber.strata.strataPlan || '-'}</td>
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
            <p><strong>Strata:</strong> {selectedDocument.fileNumber.strata.complexName || selectedDocument.fileNumber.strata.strataPlan}</p>

            <SingleSelectDropdown
              label="Status"
              required
              value={statusForm.reviewStatusId}
              onChange={(val) => setStatusForm(prev => ({ ...prev, reviewStatusId: val }))}
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
            <button className="btn-primary" onClick={handleUploadSubmit} disabled={uploading || !!activeFileError || !uploadForm.file || !uploadForm.documentTypeId || !uploadForm.strataId || (uploadStrataPropertyTypes.length > 0 && !uploadForm.propertyTypeId)}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </>
        }
      >
        <form ref={uploadFormRef} onSubmit={handleUploadSubmit}>
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

          <FormRow>
            <SingleSelectDropdown
              label="Strata Plan"
              required
              value={uploadForm.strataId?.toString() || ''}
              onChange={(val) => setUploadForm(prev => ({ ...prev, strataId: val ? parseInt(val) : null, propertyTypeId: null }))}
              options={stratas.map(s => ({ value: s.strataId, label: s.strataPlan || s.complexName || `Strata ${s.strataId}` })).sort((a, b) => a.label.localeCompare(b.label))}
              placeholder="Select Strata Plan"
              error={activeFileError || undefined}
            />
            <InputField
              label="Strata Name"
              value={selectedUploadStrata?.complexName || ''}
              disabled
              placeholder="Strata name"
            />
          </FormRow>

          <FormRow>
            <SingleSelectDropdown
              label="Document Type"
              required
              value={uploadForm.documentTypeId?.toString() || ''}
              onChange={(val) => setUploadForm(prev => ({ ...prev, documentTypeId: val ? parseInt(val) : null }))}
              options={documentTypes.map(dt => ({ value: dt.documentTypeId, label: formatTypeName(dt.typeName) })).filter((opt, i, arr) => arr.findIndex(o => o.label === opt.label) === i).sort((a, b) => a.label.localeCompare(b.label))}
              placeholder="Select document type"
            />
            {uploadStrataPropertyTypes.length > 0 && (
              <SingleSelectDropdown
                label="Property Type"
                required
                value={uploadForm.propertyTypeId?.toString() || ''}
                onChange={(val) => setUploadForm(prev => ({ ...prev, propertyTypeId: val ? parseInt(val) : null }))}
                options={uploadStrataPropertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))}
                placeholder="Select property type"
              />
            )}
          </FormRow>

          <TextareaField
            label="Notes"
            value={uploadForm.notes || ''}
            onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
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
        onDelete={canDelete && previewDocument ? () => handleDelete(previewDocument) : undefined}
      />

      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
          title="Delete Document"
          size="small"
          footer={
            <>
              <button className="btn-secondary" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={deleteSubmitting}>
                Cancel
              </button>
              <button className="btn-delete" onClick={handleConfirmDelete} disabled={deleteSubmitting}>
                {deleteSubmitting ? 'Deleting...' : 'Delete Document'}
              </button>
            </>
          }
        >
          {deleteError && <div className="form-error">{deleteError}</div>}
          <div className="delete-confirmation">
            <p>Are you sure you want to delete "{deleteTarget.fileName}"?</p>
            <p className="delete-warning">This action cannot be undone.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
