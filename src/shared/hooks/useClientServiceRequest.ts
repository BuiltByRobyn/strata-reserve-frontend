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

  const strataId = user?.role === 'client' ? user.strataId : null;

  const fetchActiveRequest = useCallback(async () => {
    if (!strataId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/client/service-requests/active?strataId=${strataId}`);
      const data: ApiSingleResponse<ServiceRequest> = await response.json();
      if (data.success) {
        setActiveRequest(data.data || null);
      }
    } catch {
      setActiveRequest(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, strataId]);

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
