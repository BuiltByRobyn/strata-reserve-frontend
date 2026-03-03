import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useAuthFetch = () => {
  const { session } = useAuth();

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = session?.access_token;

    if (!token) {
      throw new Error('No authentication token available');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }, [session?.access_token]);

  return authFetch;
};
