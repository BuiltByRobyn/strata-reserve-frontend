import { useState, useEffect, useCallback } from 'react';
import { publicClient } from '../lib/apiClient';
import type { HelpResource, HelpAudience } from '../types/help-resource.types';
import type { ApiClient } from '../lib/apiClient';

export const useHelpResources = (audience: HelpAudience, apiClient?: ApiClient) => {
  const [resources, setResources] = useState<HelpResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: HelpResource[];
      if (audience === 'client') {
        data = await publicClient.get<HelpResource[]>('/public/help-resources');
      } else if (apiClient) {
        data = await apiClient.get<HelpResource[]>('/api/help-resources');
      } else {
        setResources([]);
        setLoading(false);
        return;
      }
      setResources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [audience, apiClient]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  return { resources, loading, error, refetch: fetchResources };
};
