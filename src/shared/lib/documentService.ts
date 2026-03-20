import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/constants';
import type { UploadDocumentParams } from '../types/document.types';

export async function supabaseUploadDocument(params: UploadDocumentParams): Promise<{ document: any }> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('document_type_id', params.documentTypeId.toString());
  formData.append('strata_id', params.strataId);
  if (params.strataName) formData.append('strata_name', params.strataName);
  if (params.notes) formData.append('notes', params.notes);
  if (params.propertyTypeId) formData.append('property_type_id', params.propertyTypeId.toString());
  if (params.propertyTypeName) formData.append('property_type_name', params.propertyTypeName);
  if (params.fnDocRequirementId) formData.append('fn_doc_requirement_id', params.fnDocRequirementId.toString());
  if (params.isReplace) formData.append('is_replace', 'true');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-document`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.token}`, apikey: SUPABASE_ANON_KEY },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function supabaseDeleteDocument(token: string, documentId: number): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-document`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentId }),
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to delete document');
}
