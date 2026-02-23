import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import type { PropertyTypeRequest, ApiSingleResponse } from '../types/entities.types';
import { API_BASE } from '../lib/api';

export const usePropertyTypeRequest = () => {
  const authFetch = useAuthFetch();
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
      const response = await authFetch(`${API_BASE}/client/property-type-request`);
      const data: ApiSingleResponse<PropertyTypeRequest> = await response.json();
      setRequest(data.success ? data.data || null : null);
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const submitRequest = useCallback(async (propertyTypeIds: number[]): Promise<{ success: boolean; error?: string }> => {
    setSubmitting(true);
    try {
      const response = await authFetch(`${API_BASE}/client/property-type-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyTypeIds })
      });
      const data = await response.json();
      if (data.success) {
        await fetchRequest();
        return { success: true };
      }
      return { success: false, error: data.error || 'Submission failed' };
    } catch {
      return { success: false, error: 'Network error' };
    } finally {
      setSubmitting(false);
    }
  }, [authFetch, fetchRequest]);

  return { request, loading, submitting, submitRequest, refetch: fetchRequest };
};
