import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import type { DocumentWithDetails, RequiredDocumentChecklist } from '../types/document.types';
import type { ApiListResponse, ApiSingleResponse } from '../types/entities.types';
import { API_BASE } from '../lib/api';
import { supabaseUploadDocument, supabaseDeleteDocument } from '../lib/documentService';
import type { DocumentsState } from '../types/hooks.types';

export const useClientDocuments = () => {
  const authFetch = useAuthFetch();
  const { session } = useAuth();
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: true,
    error: null
  });
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocumentChecklist[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchMyDocuments = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authFetch(`${API_BASE}/client/documents`);
      const data: ApiListResponse<DocumentWithDetails> = await response.json();

      if (data.success) {
        setState({ documents: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch documents');
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load documents'
      }));
    }
  }, [authFetch]);

  const getDocumentById = useCallback(async (id: number): Promise<DocumentWithDetails | null> => {
    try {
      const response = await authFetch(`${API_BASE}/client/documents/${id}`);
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

  const searchDocuments = useCallback(async (query: string): Promise<DocumentWithDetails[]> => {
    try {
      const response = await authFetch(`${API_BASE}/client/documents/search?q=${encodeURIComponent(query)}`);
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

  const fetchRequiredDocuments = useCallback(async (serviceRequestId: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

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
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load required documents'
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [authFetch]);

  const uploadDocument = useCallback(async (
    file: File,
    documentTypeId: number,
    strataId: string,
    notes?: string,
    propertyTypeId?: number,
    propertyTypeName?: string
  ): Promise<boolean> => {
    const token = session?.access_token;
    if (!token) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return false;
    }

    setUploading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      await supabaseUploadDocument({ token, file, documentTypeId, strataId, notes, propertyTypeId, propertyTypeName });
      await fetchMyDocuments();
      return true;
    } catch (err) {
      console.error('Upload error:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Upload failed'
      }));
      return false;
    } finally {
      setUploading(false);
    }
  }, [session, fetchMyDocuments]);

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

  const deleteDocument = useCallback(async (id: number): Promise<boolean> => {
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');

    try {
      await supabaseDeleteDocument(token, id);
      await fetchMyDocuments();
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }, [session, fetchMyDocuments]);

  useEffect(() => {
    fetchMyDocuments();
  }, [fetchMyDocuments]);

  return {
    ...state,
    requiredDocuments,
    uploading,
    refetch: fetchMyDocuments,
    fetchMyDocuments,
    getDocumentById,
    searchDocuments,
    fetchRequiredDocuments,
    uploadDocument,
    getDocumentsByServiceRequest,
    deleteDocument
  };
};
