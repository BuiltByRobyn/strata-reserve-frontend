import { useState, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type {
  FileNumber,
  FileNumberWithDetails,
  CreateFileNumberInput,
} from '../types/entities.types';
import type { FileNumbersState } from '../types/hooks.types';

export const useFileNumbers = () => {
  const api = useApiClient();
  const [state, setState] = useState<FileNumbersState>({
    fileNumbers: [],
    loading: false,
    error: null
  });

  const fetchFileNumbers = useCallback(async (filters?: { strataId?: number; archived?: boolean }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params: Record<string, string | number | boolean | undefined> = {};
      if (filters?.strataId) params.strataId = filters.strataId;
      if (filters?.archived !== undefined) params.archived = filters.archived;

      const fileNumbers = await api.get<FileNumber[]>('/admin/file-numbers', { params });
      setState({ fileNumbers: fileNumbers || [], loading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load file numbers'
      }));
    }
  }, [api]);

  const getActiveByStrata = useCallback(async (strataId: number): Promise<FileNumber | null> => {
    try {
      return await api.get<FileNumber>('/admin/file-numbers/active', {
        params: { strataId },
      });
    } catch {
      return null;
    }
  }, [api]);

  const getFileNumberById = useCallback(async (id: number): Promise<FileNumberWithDetails | null> => {
    try {
      return await api.get<FileNumberWithDetails>('/admin/file-numbers/detail', {
        params: { id },
      });
    } catch {
      return null;
    }
  }, [api]);

  const createFileNumber = useCallback(async (input: CreateFileNumberInput): Promise<FileNumber | null> => {
    const result = await api.post<FileNumber>('/admin/file-numbers', input);
    return result;
  }, [api]);

  const deleteFileNumber = useCallback(async (id: number): Promise<boolean> => {
    await api.del(`/admin/file-numbers?id=${id}`);
    return true;
  }, [api]);

  const offerAppointment = useCallback(async (id: number, data?: {
    dueDate?: string;
    appointmentTypeId?: number;
    inspectorProfileId?: string;
    secondInspectorProfileId?: string;
    notes?: string;
  }): Promise<void> => {
    await api.put(`/admin/file-numbers/${id}/offer-appointment`, data || {});
  }, [api]);

  return {
    ...state,
    refetch: fetchFileNumbers,
    getActiveByStrata,
    getFileNumberById,
    createFileNumber,
    deleteFileNumber,
    offerAppointment
  };
};
