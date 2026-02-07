import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type { DocumentWithDetails } from '../types/document.types';
import type { ApiListResponse, ApiSingleResponse } from '../types/entities.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface DocumentsState {
  documents: DocumentWithDetails[];
  loading: boolean;
  error: string | null;
}

export const useDocuments = () => {
  const authFetch = useAuthFetch();
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
    try {
      const response = await authFetch(`${API_BASE}/admin/documents/${id}`, {
        method: 'DELETE'
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
  }, [authFetch, fetchDocuments]);

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
    searchDocuments
  };
};
