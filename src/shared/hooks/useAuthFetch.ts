// Simple auth fetch that doesn't rely on context
// Uses useCallback to prevent infinite re-renders
import { useCallback } from 'react';

export const useAuthFetch = () => {
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    // In a real app, you'd get the token from localStorage or a cookie
    // const token = localStorage.getItem('auth_token');
    
    const headers = {
      ...options.headers,
      // 'Authorization': `Bearer ${token}`,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }, []);

  return authFetch;
};
