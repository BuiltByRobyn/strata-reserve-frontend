import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type { TimelineData, UpdateTimelinesInput } from '../types/timeline.types';
import type { ApiSingleResponse } from '../types/entities.types';
import { API_BASE } from '../lib/api';

export const useTimelines = (serviceRequestId: number | null) => {
  const authFetch = useAuthFetch();
  const [timelines, setTimelines] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimelines = useCallback(async () => {
    if (!serviceRequestId) {
      setTimelines(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(
        `${API_BASE}/client/service-requests/${serviceRequestId}/timelines`
      );
      const data: ApiSingleResponse<TimelineData> = await response.json();
      if (data.success) {
        setTimelines(data.data || null);
      } else {
        throw new Error(data.error || 'Failed to fetch timelines');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timelines');
    } finally {
      setLoading(false);
    }
  }, [authFetch, serviceRequestId]);

  const updateTimelines = useCallback(async (input: UpdateTimelinesInput): Promise<TimelineData | null> => {
    if (!serviceRequestId) return null;
    const response = await authFetch(
      `${API_BASE}/client/service-requests/${serviceRequestId}/timelines`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );
    const data: ApiSingleResponse<TimelineData> = await response.json();
    if (data.success && data.data) {
      setTimelines(data.data);
      return data.data;
    }
    throw new Error(data.error || 'Failed to update timelines');
  }, [authFetch, serviceRequestId]);

  useEffect(() => {
    fetchTimelines();
  }, [fetchTimelines]);

  return { timelines, loading, error, refetch: fetchTimelines, updateTimelines };
};

export const useAdminStrataTimelines = (strataId: number | null) => {
  const authFetch = useAuthFetch();
  const [timelines, setTimelines] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTimelines = useCallback(async () => {
    if (!strataId) {
      setTimelines(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${strataId}/timelines`);
      const data: ApiSingleResponse<TimelineData> = await response.json();
      if (data.success) {
        setTimelines(data.data || null);
      }
    } catch {
      setTimelines(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, strataId]);

  const updateTimelines = useCallback(async (serviceRequestId: number, input: UpdateTimelinesInput): Promise<TimelineData | null> => {
    const response = await authFetch(
      `${API_BASE}/admin/service-requests/${serviceRequestId}/timelines`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );
    const data: ApiSingleResponse<TimelineData> = await response.json();
    if (data.success && data.data) {
      setTimelines(data.data);
      return data.data;
    }
    throw new Error(data.error || 'Failed to update timelines');
  }, [authFetch]);

  useEffect(() => {
    fetchTimelines();
  }, [fetchTimelines]);

  return { timelines, loading, refetch: fetchTimelines, updateTimelines };
};
