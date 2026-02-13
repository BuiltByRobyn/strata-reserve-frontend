import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import type { DocumentWithDetails } from '../types/document.types';
import type { ApiListResponse, ApiSingleResponse } from '../types/entities.types';
import type { DocumentsState } from '../types/hooks.types';
import { API_BASE } from '../lib/api';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const useDocuments = () => {
  const authFetch = useAuthFetch();
  const { session } = useAuth();
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: true,
    error: null
  });

  const fetchDocuments = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authFetch(`${API_BASE}/admin/documents`);
      const data: ApiListResponse<DocumentWithDetails> = await response.json();

      if (data.success) {
        setState({ documents: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load documents'
      }));
    }
  }, [authFetch]);

  const getDocumentById = useCallback(async (id: number): Promise<DocumentWithDetails | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/documents/${id}`);
      const data: ApiSingleResponse<DocumentWithDetails> = await response.json();

      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  }, [authFetch]);

  const updateDocumentStatus = useCallback(async (id: number, reviewStatusId: number, notes?: string): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/documents/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatusId, notes })
      });
      const data = await response.json();

      if (data.success) {
        await fetchDocuments();
        return true;
      }
      throw new Error(data.error || 'Failed to update document status');
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }, [authFetch, fetchDocuments]);

  const deleteDocument = useCallback(async (id: number): Promise<boolean> => {
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-document`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId: id }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchDocuments();
        return true;
      }
      throw new Error(data.error || 'Failed to delete document');
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }, [session, fetchDocuments]);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);

  const previewDocument = useCallback(async (documentId: number, fileName?: string): Promise<void> => {
    const token = session?.access_token;
    if (!token) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
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
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to preview document'
      }));
      setPreviewFileName(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [session]);

  const closePreview = useCallback(() => {
    setPreviewUrl(null);
    setPreviewFileName(null);
  }, []);

  const searchDocuments = useCallback(async (query: string): Promise<DocumentWithDetails[]> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/documents/search?q=${encodeURIComponent(query)}`);
      const data: ApiListResponse<DocumentWithDetails> = await response.json();

      if (data.success) {
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }, [authFetch]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    ...state,
    refetch: fetchDocuments,
    getDocumentById,
    updateDocumentStatus,
    deleteDocument,
    searchDocuments,
    previewDocument,
    previewLoading,
    previewUrl,
    previewFileName,
    closePreview
  };
};
