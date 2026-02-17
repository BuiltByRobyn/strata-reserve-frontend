import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import type { ServiceRequest, ApiSingleResponse } from '../types/entities.types';
import { API_BASE } from '../lib/api';

export const useClientServiceRequest = () => {
  const authFetch = useAuthFetch();
  const { user } = useAuth();
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveRequest = useCallback(async () => {
    if (!user || user.role !== 'client') {
      setActiveRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/client/service-requests/active`);
      const data: ApiSingleResponse<ServiceRequest> = await response.json();
      if (data.success) {
        setActiveRequest(data.data || null);
      } else {
        setActiveRequest(null);
      }
    } catch {
      setActiveRequest(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    fetchActiveRequest();
  }, [fetchActiveRequest]);

  return {
    activeRequest,
    serviceRequestId: activeRequest?.serviceRequestId ?? null,
    loading,
    refetch: fetchActiveRequest,
  };
};
