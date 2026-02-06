import { useAuth } from '../contexts/AuthContext';

export const useAuthFetch = () => {
  const { session } = useAuth();

  const authFetch = async (url: string, options: RequestInit = {}) => {
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
  };

  return authFetch;
};
