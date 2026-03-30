import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import { useAuth } from '../contexts/AuthContext';
import type { DocumentWithDetails } from '../types/document.types';
import type { DocumentsState } from '../types/hooks.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/constants';
import { supabaseUploadDocument, supabaseDeleteDocument } from '../lib/documentService';

export const useDocuments = () => {
  const api = useApiClient();
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
      const documents = await api.get<DocumentWithDetails[]>('/admin/documents');
      setState({ documents: documents || [], loading: false, error: null });
    } catch (error) {
      console.error('Error fetching documents:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load documents'
      }));
    }
  }, [api]);

  const getDocumentById = useCallback(async (id: number): Promise<DocumentWithDetails | null> => {
    try {
      return await api.get<DocumentWithDetails>(`/admin/documents/${id}`);
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  }, [api]);

  const updateDocumentStatus = useCallback(async (id: number, reviewStatusId: number, notes?: string): Promise<boolean> => {
    try {
      await api.put(`/admin/documents/${id}/status`, { reviewStatusId, notes });
      await fetchDocuments();
      return true;
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }, [api, fetchDocuments]);

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
    notes?: string,
    propertyTypeId?: number,
    propertyTypeName?: string
  ): Promise<{ document: any; autoLinked?: boolean }> => {
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');

    setUploading(true);
    try {
      const result = await supabaseUploadDocument({ token, file, documentTypeId, strataId, strataName, notes, propertyTypeId, propertyTypeName });
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  }, [session, fetchDocuments]);

  const syncDocuments = useCallback(async (): Promise<{ total: number; removed: number; added: number } | null> => {
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

      await fetchDocuments();
      return { total: data.total, removed: data.removed, added: data.added ?? 0 };
    } catch (error) {
      console.error('Error syncing documents:', error);
      throw error;
    }
  }, [session, fetchDocuments]);

  const searchDocuments = useCallback(async (query: string): Promise<DocumentWithDetails[]> => {
    try {
      return await api.get<DocumentWithDetails[]>('/admin/documents/search', {
        params: { q: query },
      });
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }, [api]);

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
