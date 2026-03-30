import { useState, useEffect, useRef } from 'react';
import { useDocuments } from '../../shared/hooks/useDocuments';
import { useStrata } from '../../shared/hooks/useStrata';
import { useLookups } from '../../shared/hooks/useLookups';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { Modal } from '../../shared/components/Modal';
import { InputField, TextareaField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { API_BASE } from '../../shared/lib/api';
import { formatTypeName } from '../../shared/utils/formatters';
import type { BaseModalProps } from '../../shared/types/component.types';

const initialForm = { documentName: '', file: null as File | null, documentTypeId: null as number | null, strataId: null as number | null, notes: '', propertyTypeId: null as number | null };

export function UploadDocumentModal({ isOpen, onClose }: BaseModalProps) {
  const { uploadDocument, uploading, refetch } = useDocuments();
  const { stratas } = useStrata();
  const { documentTypes } = useLookups();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const [uploadForm, setUploadForm] = useState(initialForm);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [activeFileError, setActiveFileError] = useState<string | null>(null);

  const adminName = user?.role === 'admin' ? user.fullName : '';
  const selectedStrata = stratas.find(s => s.strataId === uploadForm.strataId);
  const strataPropertyTypes = selectedStrata?.strataPropertyTypes?.map(spt => spt.propertyType) ?? [];

  useEffect(() => {
    if (!isOpen) return;
    setUploadForm(initialForm);
    setUploadError(null);
    setActiveFileError(null);
  }, [isOpen]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }));
  };

  const isFormValid =
    !!uploadForm.file &&
    !!uploadForm.documentTypeId &&
    !!uploadForm.strataId &&
    !activeFileError &&
    (strataPropertyTypes.length === 0 || !!uploadForm.propertyTypeId);

  const handleUploadSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setUploadError(null);
    if (!selectedStrata?.strataPlan) return;
    const selectedPt = strataPropertyTypes.find(pt => pt.propertyTypeId === uploadForm.propertyTypeId);
    const docTypeId = uploadForm.documentTypeId;
    const propTypeId = uploadForm.propertyTypeId;
    try {
      const result = await uploadDocument(uploadForm.file!, docTypeId!, selectedStrata.strataPlan, selectedStrata.complexName || undefined, uploadForm.notes || undefined, propTypeId || undefined, selectedPt?.propertyTypeName || undefined);
      onClose();
      const srId = result?.document?.file_id;
      const autoLinked = result?.autoLinked;
      if (srId && docTypeId && !autoLinked) {
        authFetch(`${API_BASE}/admin/file-numbers/${srId}/document-requirements/version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentTypeId: docTypeId, propertyTypeId: propTypeId || null }),
        }).catch(() => {});
      }
      setTimeout(() => refetch(), 100);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Document"
      size="medium"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => handleUploadSubmit()} disabled={!isFormValid || uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </>
      }
    >
      <form ref={formRef} onSubmit={handleUploadSubmit}>
        {uploadError && <div className="form-error">{uploadError}</div>}

        <InputField label="Document Name" required value={uploadForm.documentName} onChange={(e) => setUploadForm(prev => ({ ...prev, documentName: e.target.value }))} placeholder="Enter document name" />

        <InputField label="Uploaded By" value={adminName} disabled />

        <div className="form-field">
          <label>Select File <span className="required">*</span></label>
          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg" onChange={handleFileChange} />
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
          <InputField label="Strata Name" value={selectedStrata?.complexName || ''} disabled placeholder="Strata name" />
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
          {strataPropertyTypes.length > 0 && (
            <SingleSelectDropdown
              label="Property Type"
              required
              value={uploadForm.propertyTypeId?.toString() || ''}
              onChange={(val) => setUploadForm(prev => ({ ...prev, propertyTypeId: val ? parseInt(val) : null }))}
              options={strataPropertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))}
              placeholder="Select property type"
            />
          )}
        </FormRow>

        <TextareaField label="Notes" value={uploadForm.notes || ''} onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Add any notes..." rows={3} />
      </form>
    </Modal>
  );
}
