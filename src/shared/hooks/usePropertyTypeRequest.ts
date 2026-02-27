import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import { useAuth } from '../contexts/AuthContext';
import type { PropertyTypeRequest } from '../types/entities.types';

export const usePropertyTypeRequest = () => {
  const api = useApiClient();
  const { user } = useAuth();
  const [request, setRequest] = useState<PropertyTypeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequest = useCallback(async () => {
    if (!user || user.role !== 'client') {
      setRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get<PropertyTypeRequest>('/client/property-type-request');
      setRequest(data || null);
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const submitRequest = useCallback(async (propertyTypeIds: number[]): Promise<{ success: boolean; error?: string }> => {
    setSubmitting(true);
    try {
      await api.post('/client/property-type-request', { propertyTypeIds });
      await fetchRequest();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    } finally {
      setSubmitting(false);
    }
  }, [api, fetchRequest]);

  return { request, loading, submitting, submitRequest, refetch: fetchRequest };
};
