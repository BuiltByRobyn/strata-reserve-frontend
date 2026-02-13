import { useState, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import type { DocumentWithDetails, RequiredDocumentChecklist } from '../types/document.types';
import type { ApiListResponse } from '../types/entities.types';
import { API_BASE } from '../lib/api';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const useClientDocuments = () => {
  const authFetch = useAuthFetch();
  const { session } = useAuth();
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocumentChecklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchMyDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`${API_BASE}/client/documents`);
      const data: ApiListResponse<DocumentWithDetails> = await response.json();

      if (data.success) {
        setDocuments(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch documents');
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchRequiredDocuments = useCallback(async (serviceRequestId: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`${API_BASE}/client/service-requests/${serviceRequestId}/required-documents`);
      const data: ApiListResponse<RequiredDocumentChecklist> = await response.json();

      if (data.success) {
        setRequiredDocuments(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch required documents');
      }
    } catch (err) {
      console.error('Error fetching required documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load required documents');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const uploadDocument = useCallback(async (
    file: File,
    serviceRequestId: number,
    documentTypeId: number,
    notes?: string
  ): Promise<boolean> => {
    const token = session?.access_token;
    if (!token) {
      setError('Not authenticated');
      return false;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('service_request_id', serviceRequestId.toString());
      formData.append('document_type_id', documentTypeId.toString());
      if (notes) {
        formData.append('notes', notes);
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

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return true;
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      return false;
    } finally {
      setUploading(false);
    }
  }, [session]);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);

  const previewDocument = useCallback(async (documentId: number, fileName?: string): Promise<void> => {
    const token = session?.access_token;
    if (!token) {
      setError('Not authenticated');
      return;
    }

    setPreviewLoading(true);
    setPreviewUrl(null);
    setPreviewFileName(fileName || null);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/preview-document`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get preview link');
      }

      setPreviewUrl(data.url);
      if (data.fileName) {
        setPreviewFileName(data.fileName);
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(err instanceof Error ? err.message : 'Failed to preview document');
      setPreviewFileName(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [session]);

  const closePreview = useCallback(() => {
    setPreviewUrl(null);
    setPreviewFileName(null);
  }, []);

  const getDocumentsByServiceRequest = useCallback(async (serviceRequestId: number) => {
    try {
      const response = await authFetch(`${API_BASE}/client/service-requests/${serviceRequestId}/documents`);
      const data: ApiListResponse<DocumentWithDetails> = await response.json();

      if (data.success) {
        return data.data || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching service request documents:', err);
      return [];
    }
  }, [authFetch]);

  return {
    documents,
    requiredDocuments,
    loading,
    error,
    uploading,
    fetchMyDocuments,
    fetchRequiredDocuments,
    uploadDocument,
    previewDocument,
    previewLoading,
    previewUrl,
    previewFileName,
    closePreview,
    getDocumentsByServiceRequest
  };
};
