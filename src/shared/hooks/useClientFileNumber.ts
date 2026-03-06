import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import { useAuth } from '../contexts/AuthContext';
import type { FileNumber } from '../types/entities.types';

export const useClientFileNumber = () => {
  const api = useApiClient();
  const { user } = useAuth();
  const [activeRequest, setActiveRequest] = useState<FileNumber | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveRequest = useCallback(async () => {
    if (!user || user.role !== 'client') {
      setActiveRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get<FileNumber>('/client/file-numbers/active');
      setActiveRequest(data || null);
    } catch {
      setActiveRequest(null);
    } finally {
      setLoading(false);
    }
  }, [api, user?.role]);

  useEffect(() => {
    fetchActiveRequest();
  }, [fetchActiveRequest]);

  const submitForReview = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!activeRequest) return { success: false, error: 'No active request' };
    try {
      await api.post(`/client/file-numbers/${activeRequest.fileNumberId}/submit`);
      await fetchActiveRequest();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [activeRequest, api, fetchActiveRequest]);

  return {
    activeRequest,
    fileNumberId: activeRequest?.fileNumberId ?? null,
    loading,
    refetch: fetchActiveRequest,
    submitForReview,
  };
};
