import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import { useAuth } from '../contexts/AuthContext';
import type { DocumentWithDetails, RequiredDocumentChecklist } from '../types/document.types';
import type { NaStatusValue } from '../types/document.types';
import type { DocumentsState } from '../types/hooks.types';
import { supabaseUploadDocument, supabaseDeleteDocument } from '../lib/documentService';

export const useClientDocuments = () => {
  const api = useApiClient();
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
      const documents = await api.get<DocumentWithDetails[]>('/client/documents');
      setState({ documents: documents || [], loading: false, error: null });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load documents'
      }));
    }
  }, [api]);

  const getDocumentById = useCallback(async (id: number): Promise<DocumentWithDetails | null> => {
    try {
      return await api.get<DocumentWithDetails>(`/client/documents/${id}`);
    } catch {
      return null;
    }
  }, [api]);

  const searchDocuments = useCallback(async (query: string): Promise<DocumentWithDetails[]> => {
    try {
      return await api.get<DocumentWithDetails[]>('/client/documents/search', {
        params: { q: query },
      });
    } catch {
      return [];
    }
  }, [api]);

  const fetchRequiredDocuments = useCallback(async (fileId: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await api.get<RequiredDocumentChecklist[]>(
        `/client/file-numbers/${fileId}/required-documents`
      );
      setRequiredDocuments(data || []);
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load requested documents'
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [api]);

  const uploadDocument = useCallback(async (params: {
    file: File;
    documentTypeId: number;
    strataId: string;
    fnDocRequirementId: number;
    fileId: number;
    isReplace?: boolean;
    notes?: string;
    propertyTypeId?: number;
    propertyTypeName?: string;
    strataName?: string;
  }): Promise<boolean> => {
    const token = session?.access_token;
    if (!token) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return false;
    }

    setUploading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      await supabaseUploadDocument({ token, ...params });
      await api.post(`/client/file-numbers/${params.fileId}/requirements/${params.fnDocRequirementId}/uploaded`, { isReplace: params.isReplace ?? false });
      await fetchRequiredDocuments(params.fileId);
      return true;
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Upload failed'
      }));
      return false;
    } finally {
      setUploading(false);
    }
  }, [session, api, fetchRequiredDocuments]);

  const setNaStatus = useCallback(async (fileId: number, reqId: number, status: NaStatusValue): Promise<boolean> => {
    try {
      await api.post(`/client/file-numbers/${fileId}/requirements/${reqId}/na-status`, { status });
      await fetchRequiredDocuments(fileId);
      return true;
    } catch {
      return false;
    }
  }, [api, fetchRequiredDocuments]);

  const getDocumentsByFileNumber = useCallback(async (fileId: number) => {
    try {
      return await api.get<DocumentWithDetails[]>(
        `/client/file-numbers/${fileId}/documents`
      );
    } catch {
      return [];
    }
  }, [api]);

  const deleteDocument = useCallback(async (id: number): Promise<boolean> => {
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');

    try {
      await supabaseDeleteDocument(token, id);
      await fetchMyDocuments();
      return true;
    } catch (error) {
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
    setNaStatus,
    getDocumentsByFileNumber,
    deleteDocument
  };
};
