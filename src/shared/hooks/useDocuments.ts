import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import type { DocumentWithDetails } from '../types/document.types';
import type { ApiListResponse, ApiSingleResponse } from '../types/entities.types';
import type { DocumentsState } from '../types/hooks.types';
import { API_BASE } from '../lib/api';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/constants';
import { supabaseUploadDocument, supabaseDeleteDocument } from '../lib/documentService';

export const useDocuments = () => {
  const authFetch = useAuthFetch();
  const { session } = useAuth();
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: true,
    error: null
  });
  const [uploading, setUploading] = useState(false);

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
      await supabaseDeleteDocument(token, id);
      await fetchDocuments();
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }, [session, fetchDocuments]);

  const uploadDocument = useCallback(async (
    file: File,
    documentTypeId: number,
    strataId: string,
    strataName?: string,
    notes?: string
  ): Promise<boolean> => {
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');

    setUploading(true);
    try {
      await supabaseUploadDocument({ token, file, documentTypeId, strataId, strataName, notes });
      await fetchDocuments();
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  }, [session, fetchDocuments]);

  const syncDocuments = useCallback(async (): Promise<{ total: number; removed: number } | null> => {
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      if (data.removed > 0) {
        await fetchDocuments();
      }

      return { total: data.total, removed: data.removed };
    } catch (error) {
      console.error('Error syncing documents:', error);
      throw error;
    }
  }, [session, fetchDocuments]);

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
    uploading,
    refetch: fetchDocuments,
    getDocumentById,
    updateDocumentStatus,
    uploadDocument,
    deleteDocument,
    syncDocuments,
    searchDocuments
  };
};
