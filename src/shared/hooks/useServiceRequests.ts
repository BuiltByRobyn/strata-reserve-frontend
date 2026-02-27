import { useState, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type {
  ServiceRequest,
  ServiceRequestWithDetails,
  CreateServiceRequestInput,
} from '../types/entities.types';
import type { ServiceRequestsState } from '../types/hooks.types';

export const useServiceRequests = () => {
  const api = useApiClient();
  const [state, setState] = useState<ServiceRequestsState>({
    serviceRequests: [],
    loading: false,
    error: null
  });

  const fetchServiceRequests = useCallback(async (filters?: { strataId?: number; archived?: boolean }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params: Record<string, string | number | boolean | undefined> = {};
      if (filters?.strataId) params.strataId = filters.strataId;
      if (filters?.archived !== undefined) params.archived = filters.archived;

      const serviceRequests = await api.get<ServiceRequest[]>('/admin/service-requests', { params });
      setState({ serviceRequests: serviceRequests || [], loading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load service requests'
      }));
    }
  }, [api]);

  const getActiveByStrata = useCallback(async (strataId: number): Promise<ServiceRequest | null> => {
    try {
      return await api.get<ServiceRequest>('/admin/service-requests/active', {
        params: { strataId },
      });
    } catch {
      return null;
    }
  }, [api]);

  const getServiceRequestById = useCallback(async (id: number): Promise<ServiceRequestWithDetails | null> => {
    try {
      return await api.get<ServiceRequestWithDetails>('/admin/service-requests/detail', {
        params: { id },
      });
    } catch {
      return null;
    }
  }, [api]);

  const createServiceRequest = useCallback(async (input: CreateServiceRequestInput): Promise<ServiceRequest | null> => {
    const result = await api.post<ServiceRequest>('/admin/service-requests', input);
    return result;
  }, [api]);

  const deleteServiceRequest = useCallback(async (id: number): Promise<boolean> => {
    await api.del(`/admin/service-requests?id=${id}`);
    return true;
  }, [api]);

  return {
    ...state,
    refetch: fetchServiceRequests,
    getActiveByStrata,
    getServiceRequestById,
    createServiceRequest,
    deleteServiceRequest
  };
};
