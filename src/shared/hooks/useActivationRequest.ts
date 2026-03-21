import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import { useAuth } from '../contexts/AuthContext';
import type { ActivationRequest } from '../types/entities.types';

export const useActivationRequest = () => {
  const api = useApiClient();
  const { user } = useAuth();
  const [request, setRequest] = useState<ActivationRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    if (!user || user.role !== 'client') {
      setRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get<ActivationRequest>('/client/activation-request');
      setRequest(data || null);
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [api, user?.role]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const createRequest = useCallback(async (): Promise<boolean> => {
    try {
      const data = await api.post<ActivationRequest>('/client/activation-request');
      setRequest(data || null);
      return true;
    } catch {
      return false;
    }
  }, [api]);

  return { request, loading, createRequest };
};
