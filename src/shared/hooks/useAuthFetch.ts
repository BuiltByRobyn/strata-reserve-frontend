// Simple auth fetch that doesn't rely on context
// For now, it just returns a fetch function without auth
// In production, you would get the token from localStorage or other storage

export const useAuthFetch = () => {
  const authFetch = async (url: string, options: RequestInit = {}) => {
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
  };

  return authFetch;
};
