import { useMemo } from 'react';
import { useAuthFetch } from './useAuthFetch';
import { createApiClient } from '../lib/apiClient';

export function useApiClient() {
  const authFetch = useAuthFetch();
  return useMemo(() => createApiClient(authFetch), [authFetch]);
}
