import { useState, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type {
  ServiceRequest,
  ServiceRequestWithDetails,
  CreateServiceRequestInput,
  ApiListResponse,
  ApiSingleResponse
} from '../types/entities.types';
import type { ServiceRequestsState } from '../types/hooks.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useServiceRequests = () => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<ServiceRequestsState>({
    serviceRequests: [],
    loading: false,
    error: null
  });

  const fetchServiceRequests = useCallback(async (filters?: { strataId?: number; archived?: boolean }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params = new URLSearchParams();
      if (filters?.strataId) params.set('strataId', String(filters.strataId));
      if (filters?.archived !== undefined) params.set('archived', String(filters.archived));
      const queryString = params.toString();
      const url = `${API_BASE}/admin/service-requests${queryString ? `?${queryString}` : ''}`;

      const response = await authFetch(url);
      const data: ApiListResponse<ServiceRequest> = await response.json();
      if (data.success) {
        setState({ serviceRequests: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch service requests');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load service requests'
      }));
    }
  }, [authFetch]);

  const getActiveByStrata = useCallback(async (strataId: number): Promise<ServiceRequest | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/service-requests/active?strataId=${strataId}`);
      const data: ApiSingleResponse<ServiceRequest> = await response.json();
      if (data.success) {
        return data.data || null;
      }
      return null;
    } catch {
      return null;
    }
  }, [authFetch]);

  const getServiceRequestById = useCallback(async (id: number): Promise<ServiceRequestWithDetails | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/service-requests/detail?id=${id}`);
      const data: ApiSingleResponse<ServiceRequestWithDetails> = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [authFetch]);

  const createServiceRequest = useCallback(async (input: CreateServiceRequestInput): Promise<ServiceRequest | null> => {
    const response = await authFetch(`${API_BASE}/admin/service-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data: ApiSingleResponse<ServiceRequest> = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.error || 'Failed to create service request');
  }, [authFetch]);

  const deleteServiceRequest = useCallback(async (id: number): Promise<boolean> => {
    const response = await authFetch(`${API_BASE}/admin/service-requests?id=${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      return true;
    }
    throw new Error(data.error || 'Failed to delete service request');
  }, [authFetch]);

  return {
    ...state,
    refetch: fetchServiceRequests,
    getActiveByStrata,
    getServiceRequestById,
    createServiceRequest,
    deleteServiceRequest
  };
};
