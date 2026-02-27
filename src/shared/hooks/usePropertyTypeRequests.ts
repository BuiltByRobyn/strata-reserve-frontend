import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { PropertyTypeRequest } from '../types/entities.types';

export const usePropertyTypeRequests = () => {
  const api = useApiClient();
  const [requests, setRequests] = useState<PropertyTypeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PropertyTypeRequest[]>('/admin/property-type-requests/pending');
      setRequests(data || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const approveRequest = useCallback(async (id: number): Promise<boolean> => {
    try {
      await api.post(`/admin/property-type-requests/${id}/approve`);
      await fetchPending();
      return true;
    } catch {
      return false;
    }
  }, [api, fetchPending]);

  const rejectRequest = useCallback(async (id: number, rejectionReason: string): Promise<boolean> => {
    try {
      await api.post(`/admin/property-type-requests/${id}/reject`, { rejectionReason });
      await fetchPending();
      return true;
    } catch {
      return false;
    }
  }, [api, fetchPending]);

  return { requests, loading, approveRequest, rejectRequest, refetch: fetchPending };
};
