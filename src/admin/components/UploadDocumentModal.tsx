import { useState, useEffect } from 'react';
import { useDocuments } from '../../shared/hooks/useDocuments';
import { useLookups } from '../../shared/hooks/useLookups';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { Modal } from '../../shared/components/Modal';
import { InputField, TextareaField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { STRATA_ID_PATTERN, formatStrataId, validateStrataId } from '../../shared/utils/strataUtils';
import { API_BASE } from '../../shared/lib/api';
import { formatTypeName } from '../../shared/utils/formatters';
import type { BaseModalProps } from '../../shared/types/component.types';

const initialForm = { documentName: '', file: null as File | null, documentTypeId: null as number | null, strataName: '', strataId: '', notes: '', propertyTypeId: null as number | null };

export function UploadDocumentModal({ isOpen, onClose }: BaseModalProps) {
  const { uploadDocument, uploading } = useDocuments();
  const { documentTypes } = useLookups();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const [uploadForm, setUploadForm] = useState(initialForm);
  const [strataPropertyTypes, setStrataPropertyTypes] = useState<{ propertyTypeId: number; propertyTypeName: string }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [strataIdError, setStrataIdError] = useState<string | null>(null);

  const adminName = user?.role === 'admin' ? user.fullName : '';

  useEffect(() => {
    if (!isOpen) return;
    setUploadForm(initialForm);
    setStrataPropertyTypes([]);
    setUploadError(null);
    setStrataIdError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!uploadForm.strataId || !STRATA_ID_PATTERN.test(uploadForm.strataId)) {
      setStrataPropertyTypes([]);
      return;
    }
    const lookup = async () => {
      try {
        const res = await authFetch(`${API_BASE}/admin/strata/search?q=${encodeURIComponent(uploadForm.strataId)}`);
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          const match = data.data.find((s: { strataPlan: string }) => s.strataPlan?.toUpperCase() === uploadForm.strataId.toUpperCase());
          if (match?.complexName) setUploadForm(prev => ({ ...prev, strataName: match.complexName }));
          setStrataPropertyTypes(match?.strataPropertyTypes?.map((spt: { propertyType: { propertyTypeId: number; propertyTypeName: string } }) => spt.propertyType) ?? []);
        } else {
          setStrataPropertyTypes([]);
        }
      } catch {
        setStrataPropertyTypes([]);
      }
    };
    lookup();
  }, [uploadForm.strataId, authFetch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }));
  };

  const isFormValid =
    !!uploadForm.file &&
    !!uploadForm.documentTypeId &&
    validateStrataId(uploadForm.strataId) &&
    !strataIdError;

  const handleUploadSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setUploadError(null);
    const selectedPt = strataPropertyTypes.find(pt => pt.propertyTypeId === uploadForm.propertyTypeId);
    try {
      const result = await uploadDocument(uploadForm.file, uploadForm.documentTypeId, uploadForm.strataId, uploadForm.strataName || undefined, uploadForm.notes || undefined, uploadForm.propertyTypeId || undefined, selectedPt?.propertyTypeName || undefined);
      const srId = result?.document?.file_number_id;
      if (srId && uploadForm.documentTypeId) {
        try {
          await authFetch(`${API_BASE}/admin/file-numbers/${srId}/document-requirements/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentTypeId: uploadForm.documentTypeId, propertyTypeId: uploadForm.propertyTypeId || null }),
          });
        } catch { /* non-critical */ }
      }
      onClose();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
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
      <form onSubmit={handleUploadSubmit}>
        {uploadError && <div className="form-error">{uploadError}</div>}

        <InputField label="Document Name" required value={uploadForm.documentName} onChange={(e) => setUploadForm(prev => ({ ...prev, documentName: e.target.value }))} placeholder="Enter document name" />

        <InputField label="Uploaded By" value={adminName} disabled />

        <div className="form-field">
          <label>Select File <span className="required">*</span></label>
          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg" onChange={handleFileChange} />
        </div>

        <FormRow>
          <InputField
              label="Strata ID"
              required
              value={uploadForm.strataId}
              onChange={(e) => {
                const formatted = formatStrataId(e.target.value);
                if (formatted.length > 0 && !validateStrataId(formatted)) {
                  setStrataIdError('Format: ABC 12345 (3 letters, space, 1–5 digits)');
                } else {
                  setStrataIdError(null);
                }
                setUploadForm(prev => ({ ...prev, strataId: formatted, propertyTypeId: null }));
              }}
              placeholder="e.g. ABC 12345"
              error={strataIdError || undefined}
            />
          <InputField label="Strata Name" value={uploadForm.strataName} disabled placeholder="Auto-populated from Strata ID" />
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

        <TextareaField label="Notes" value={uploadForm.notes || ''} onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Add any notes..." rows={3} />
      </form>
    </Modal>
  );
}
