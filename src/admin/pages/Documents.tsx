import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
import { InputField, TextareaField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import type { DocumentWithDetails, DocumentUploadData } from '../../shared/types/document.types';
import { STRATA_ID_PATTERN, formatStrataId } from '../../shared/utils/strataUtils';
import { API_BASE } from '../../shared/lib/api';
import { formatTypeName, formatDate, getStatusBadgeClass } from '../../shared/lib/formatters';

export default function DocumentsPage() {
  const { documents, loading, error, updateDocumentStatus, uploadDocument, uploading, deleteDocument, syncDocuments } = useDocuments();
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
    notes: '',
    propertyTypeId: null,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [strataPropertyTypes, setStrataPropertyTypes] = useState<{ propertyTypeId: number; propertyTypeName: string }[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [previewDocumentName, setPreviewDocumentName] = useState('');
  const [previewDocument, setPreviewDocument] = useState<DocumentWithDetails | null>(null);

  const isDesktop = useMediaQuery('(min-width: 900px)');

  useEffect(() => {
    if (!uploadForm.strataId || !STRATA_ID_PATTERN.test(uploadForm.strataId)) {
      setStrataPropertyTypes([]);
      return;
    }

    const lookup = async () => {
      try {
        const res = await authFetch(`${API_BASE}/admin/strata/search?q=${encodeURIComponent(uploadForm.strataId!)}`);
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          const match = data.data.find((s: { strataPlan: string }) =>
            s.strataPlan?.toUpperCase() === uploadForm.strataId!.toUpperCase()
          );
          if (match?.complexName) {
            setUploadForm(prev => ({ ...prev, strataName: match.complexName }));
          }
          if (match?.strataPropertyTypes) {
            setStrataPropertyTypes(
              match.strataPropertyTypes.map((spt: { propertyType: { propertyTypeId: number; propertyTypeName: string } }) => spt.propertyType)
            );
          } else {
            setStrataPropertyTypes([]);
          }
        } else {
          setStrataPropertyTypes([]);
        }
      } catch {
        setStrataPropertyTypes([]);
      }
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
  }, [documents, searchQuery, filterDocType, filterStrataName, filterStrataPlan, showArchived]);

  const autoOpenedUploadRef = useRef(false);
  useEffect(() => {
    if (!location.state?.openUpload || autoOpenedUploadRef.current) return;
    autoOpenedUploadRef.current = true;
    openUploadModal();
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
        selectedDocument.fileNumberDocumentId,
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
      await deleteDocument(doc.fileNumberDocumentId);
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
    setUploadForm({
      documentName: '',
      file: null,
      documentTypeId: null,
      strataName: '',
      strataId: '',
      notes: '',
      propertyTypeId: null,
    });
    setStrataPropertyTypes([]);
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

    setUploadError(null);

    const selectedPt = strataPropertyTypes.find(pt => pt.propertyTypeId === uploadForm.propertyTypeId);

    try {
      const result = await uploadDocument(
        uploadForm.file,
        uploadForm.documentTypeId,
        uploadForm.strataId,
        uploadForm.strataName || undefined,
        uploadForm.notes || undefined,
        uploadForm.propertyTypeId || undefined,
        selectedPt?.propertyTypeName || undefined
      );

      // Auto-configure document requirement so it appears on the strata Documents tab
      const srId = result?.document?.file_number_id;
      if (srId && uploadForm.documentTypeId) {
        try {
          await authFetch(`${API_BASE}/admin/file-numbers/${srId}/document-requirements/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentTypeId: uploadForm.documentTypeId,
              propertyTypeId: uploadForm.propertyTypeId || null,
            }),
          });
        } catch {
          // Non-critical — document uploaded successfully, requirement config is best-effort
        }
      }

      setIsUploadModalOpen(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const adminName = user?.role === 'admin' ? user.fullName : '';

  if (loading) return <LoadingSpinner />;

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
          keyExtractor={(d) => d.fileNumberDocumentId}
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

          <FormRow>
            <InputField
              label="Strata ID"
              required
              value={uploadForm.strataId}
              onChange={(e) => setUploadForm(prev => ({ ...prev, strataId: formatStrataId(e.target.value), propertyTypeId: null }))}
              placeholder="e.g. ABC 12345"
            />
            <InputField
              label="Strata Name"
              value={uploadForm.strataName}
              disabled
              placeholder="Auto-populated from Strata ID"
            />
          </FormRow>

          <SingleSelectDropdown
            label="Document Type"
            required
            value={uploadForm.documentTypeId?.toString() || ''}
            onChange={(val) => setUploadForm(prev => ({ ...prev, documentTypeId: val ? parseInt(val) : null }))}
            options={documentTypes.map(dt => ({ value: dt.documentTypeId, label: formatTypeName(dt.typeName) })).filter((opt, i, arr) => arr.findIndex(o => o.label === opt.label) === i).sort((a, b) => a.label.localeCompare(b.label))}
            placeholder="Select document type"
          />

          {strataPropertyTypes.length > 0 && (
            <SingleSelectDropdown
              label="Section (Property Type)"
              value={uploadForm.propertyTypeId?.toString() || ''}
              onChange={(val) => setUploadForm(prev => ({ ...prev, propertyTypeId: val ? parseInt(val) : null }))}
              options={strataPropertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))}
              placeholder="Select section"
            />
          )}

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
        onDelete={previewDocument ? () => handleDelete(previewDocument) : undefined}
      />
    </div>
  );
}
