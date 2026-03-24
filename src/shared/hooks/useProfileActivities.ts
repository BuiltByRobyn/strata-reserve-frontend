import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';

export interface ProfileActivity {
  activityLogId: number;
  strataProfileId: number;
  changedFields: Record<string, unknown>;
  changedAt: string;
  strataProfile: {
    strata: { strataId: number; strataPlan: string | null; complexName: string | null } | null;
    profile: { firstName: string | null; lastName: string | null; displayName: string | null } | null;
  };
}

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
