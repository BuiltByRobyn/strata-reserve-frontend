import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { TimelineData, UpdateTimelinesInput } from '../types/timeline.types';

export const useTimelines = (fileNumberId: number | null) => {
  const api = useApiClient();
  const [timelines, setTimelines] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimelines = useCallback(async () => {
    if (!fileNumberId) {
      setTimelines(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.get<TimelineData>(
        `/client/file-numbers/${fileNumberId}/timelines`
      );
      setTimelines(data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timelines');
    } finally {
      setLoading(false);
    }
  }, [api, fileNumberId]);

  const updateTimelines = useCallback(async (input: UpdateTimelinesInput): Promise<TimelineData | null> => {
    if (!fileNumberId) return null;
    const data = await api.put<TimelineData>(
      `/client/file-numbers/${fileNumberId}/timelines`,
      input
    );
    setTimelines(data);
    return data;
  }, [api, fileNumberId]);

  useEffect(() => {
    fetchTimelines();
  }, [fetchTimelines]);

  return { timelines, loading, error, refetch: fetchTimelines, updateTimelines };
};

export const useAdminStrataTimelines = (strataId: number | null) => {
  const api = useApiClient();
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
      const data = await api.get<TimelineData>(`/admin/strata/${strataId}/timelines`);
      setTimelines(data || null);
    } catch {
      setTimelines(null);
    } finally {
      setLoading(false);
    }
  }, [api, strataId]);

  const updateTimelines = useCallback(async (fileNumberId: number, input: UpdateTimelinesInput): Promise<TimelineData | null> => {
    const data = await api.put<TimelineData>(
      `/admin/file-numbers/${fileNumberId}/timelines`,
      input
    );
    setTimelines(data);
    return data;
  }, [api]);

  useEffect(() => {
    fetchTimelines();
  }, [fetchTimelines]);

  return { timelines, loading, refetch: fetchTimelines, updateTimelines };
};
