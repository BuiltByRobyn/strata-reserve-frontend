import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import { REQUEST_TIMEOUT_MS } from '../lib/apiClient';
import type {
  InspectorAvailableDate,
  CreateInspectorAvailableDateInput,
  UpdateInspectorAvailableDateInput,
} from '../types/entities.types';
import type { InspectorAvailabilityState } from '../types/hooks.types';

export const useInspectorAvailability = (inspectorProfileId?: string) => {
  const api = useApiClient();
  const [state, setState] = useState<InspectorAvailabilityState>({
    availableDates: [],
    loading: true,
    error: null
  });

  const fetchAvailableDates = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params: Record<string, string | undefined> = {};
      if (inspectorProfileId) params.inspectorProfileId = inspectorProfileId;

      const availableDates = await api.get<InspectorAvailableDate[]>(
        '/admin/inspector-availability',
        { params, timeout: REQUEST_TIMEOUT_MS }
      );
      setState({ availableDates: availableDates || [], loading: false, error: null });
    } catch (error) {
      console.error('Error fetching available dates:', error);
      const errorMessage = error instanceof Error
        ? (error.name === 'AbortError'
          ? 'Request timed out. Is the backend running?'
          : error.message)
        : 'Failed to load available dates';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [api, inspectorProfileId]);

  const getAvailableDateById = useCallback(async (id: number): Promise<InspectorAvailableDate | null> => {
    try {
      return await api.get<InspectorAvailableDate>(`/admin/inspector-availability/${id}`);
    } catch (error) {
      console.error('Error fetching available date:', error);
      return null;
    }
  }, [api]);

  const createAvailableDate = useCallback(async (input: CreateInspectorAvailableDateInput): Promise<InspectorAvailableDate | null> => {
    try {
      const result = await api.post<InspectorAvailableDate>('/admin/inspector-availability', input);
      await fetchAvailableDates();
      return result;
    } catch (error) {
      console.error('Error creating available date:', error);
      throw error;
    }
  }, [api, fetchAvailableDates]);

  const updateAvailableDate = useCallback(async (id: number, input: UpdateInspectorAvailableDateInput): Promise<InspectorAvailableDate | null> => {
    try {
      const result = await api.put<InspectorAvailableDate>(`/admin/inspector-availability/${id}`, input);
      await fetchAvailableDates();
      return result;
    } catch (error) {
      console.error('Error updating available date:', error);
      throw error;
    }
  }, [api, fetchAvailableDates]);

  const deleteAvailableDate = useCallback(async (id: number): Promise<boolean> => {
    try {
      await api.del(`/admin/inspector-availability/${id}`);
      await fetchAvailableDates();
      return true;
    } catch (error) {
      console.error('Error deleting available date:', error);
      throw error;
    }
  }, [api, fetchAvailableDates]);

  const getAvailableDatesByRange = useCallback(async (
    startDate: string,
    endDate: string,
    profileId?: string,
    locationCodes?: string[]
  ): Promise<InspectorAvailableDate[]> => {
    try {
      const params: Record<string, string | undefined> = {
        startDate,
        endDate,
      };
      if (profileId) params.inspectorProfileId = profileId;
      if (locationCodes?.length) params.locationCodes = locationCodes.join(',');

      return await api.get<InspectorAvailableDate[]>(
        '/admin/inspector-availability/range',
        { params }
      );
    } catch (error) {
      console.error('Error fetching available dates by range:', error);
      return [];
    }
  }, [api]);

  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  return {
    ...state,
    refetch: fetchAvailableDates,
    getAvailableDateById,
    createAvailableDate,
    updateAvailableDate,
    deleteAvailableDate,
    getAvailableDatesByRange
  };
};
