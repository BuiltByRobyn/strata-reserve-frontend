import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { ProfileActivity } from '../types/entities.types';

export type { ProfileActivity };

export const useProfileActivities = (hours: number) => {
  const api = useApiClient();
  const [activities, setActivities] = useState<ProfileActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ProfileActivity[]>(`/admin/profile-activities?hours=${hours}`);
      setActivities(data || []);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [api, hours]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, loading };
};
