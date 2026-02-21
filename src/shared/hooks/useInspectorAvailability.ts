import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type {
  InspectorAvailableDate,
  CreateInspectorAvailableDateInput,
  UpdateInspectorAvailableDateInput,
  ApiListResponse,
  ApiSingleResponse
} from '../types/entities.types';
import type { InspectorAvailabilityState } from '../types/hooks.types';
import { API_BASE } from '../lib/api';

export const useInspectorAvailability = (inspectorProfileId?: string) => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<InspectorAvailabilityState>({
    availableDates: [],
    loading: true,
    error: null
  });

  // Fetch all available dates (optionally filtered by inspector)
  const fetchAvailableDates = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const url = inspectorProfileId 
        ? `${API_BASE}/admin/inspector-availability?inspectorProfileId=${inspectorProfileId}`
        : `${API_BASE}/admin/inspector-availability`;
        
      const response = await authFetch(url, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data: ApiListResponse<InspectorAvailableDate> = await response.json();
      
      if (data.success) {
        setState({ availableDates: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch available dates');
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
      const errorMessage = error instanceof Error 
        ? (error.name === 'AbortError' 
          ? 'Request timed out. Is the backend running?' 
          : error.message)
        : 'Failed to load available dates';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [authFetch, inspectorProfileId]);

  // Get available date by ID
  const getAvailableDateById = useCallback(async (id: number): Promise<InspectorAvailableDate | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/inspector-availability/${id}`);
      const data: ApiSingleResponse<InspectorAvailableDate> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching available date:', error);
      return null;
    }
  }, [authFetch]);

  // Create available date
  const createAvailableDate = useCallback(async (input: CreateInspectorAvailableDateInput): Promise<InspectorAvailableDate | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/inspector-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<InspectorAvailableDate> = await response.json();
      
      if (data.success && data.data) {
        await fetchAvailableDates();
        return data.data;
      }
      throw new Error(data.error || 'Failed to create available date');
    } catch (error) {
      console.error('Error creating available date:', error);
      throw error;
    }
  }, [authFetch, fetchAvailableDates]);

  // Update available date
  const updateAvailableDate = useCallback(async (id: number, input: UpdateInspectorAvailableDateInput): Promise<InspectorAvailableDate | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/inspector-availability/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<InspectorAvailableDate> = await response.json();
      
      if (data.success && data.data) {
        await fetchAvailableDates();
        return data.data;
      }
      throw new Error(data.error || 'Failed to update available date');
    } catch (error) {
      console.error('Error updating available date:', error);
      throw error;
    }
  }, [authFetch, fetchAvailableDates]);

  // Delete available date
  const deleteAvailableDate = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/inspector-availability/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchAvailableDates();
        return true;
      }
      throw new Error(data.error || 'Failed to delete available date');
    } catch (error) {
      console.error('Error deleting available date:', error);
      throw error;
    }
  }, [authFetch, fetchAvailableDates]);

  // Get available dates by date range
  const getAvailableDatesByRange = useCallback(async (
    startDate: string,
    endDate: string,
    profileId?: string,
    locationCodes?: string[]
  ): Promise<InspectorAvailableDate[]> => {
    try {
      let url = `${API_BASE}/admin/inspector-availability/range?startDate=${startDate}&endDate=${endDate}`;
      if (profileId) {
        url += `&inspectorProfileId=${profileId}`;
      }
      if (locationCodes?.length) {
        url += `&locationCodes=${locationCodes.join(',')}`;
      }
      
      const response = await authFetch(url);
      const data: ApiListResponse<InspectorAvailableDate> = await response.json();
      
      if (data.success) {
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching available dates by range:', error);
      return [];
    }
  }, [authFetch]);

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
