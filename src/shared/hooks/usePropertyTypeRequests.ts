import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type { PropertyTypeRequest, ApiListResponse, ApiSingleResponse } from '../types/entities.types';
import { API_BASE } from '../lib/api';

export const usePropertyTypeRequests = () => {
  const authFetch = useAuthFetch();
  const [requests, setRequests] = useState<PropertyTypeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/admin/property-type-requests/pending`);
      const data: ApiListResponse<PropertyTypeRequest> = await response.json();
      setRequests(data.success ? data.data || [] : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const approveRequest = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/property-type-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data: ApiSingleResponse<PropertyTypeRequest> = await response.json();
      if (data.success) {
        await fetchPending();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [authFetch, fetchPending]);

  const rejectRequest = useCallback(async (id: number, rejectionReason: string): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/property-type-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason })
      });
      const data: ApiSingleResponse<PropertyTypeRequest> = await response.json();
      if (data.success) {
        await fetchPending();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [authFetch, fetchPending]);

  return { requests, loading, approveRequest, rejectRequest, refetch: fetchPending };
};
