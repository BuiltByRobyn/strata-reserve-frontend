import type { ApiResponse, AuthFetchFn } from '../types/entities.types';
import { API_BASE } from './api';

export const REQUEST_TIMEOUT_MS = 30_000;

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMsg = `Server error: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) errorMsg = body.error;
    } catch {
      // body wasn't JSON, use status text
    }
    throw new Error(errorMsg);
  }

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data as T;
}

export function createApiClient(authFetch: AuthFetchFn) {
  function buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = `${API_BASE}${path}`;
    if (!params) return url;

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return qs ? `${url}?${qs}` : url;
  }

  return {
    async get<T>(
      path: string,
      options?: {
        params?: Record<string, string | number | boolean | undefined>;
        timeout?: number;
        signal?: AbortSignal;
      }
    ): Promise<T> {
      const url = buildUrl(path, options?.params);
      const fetchOptions: RequestInit = {};

      if (options?.signal) {
        fetchOptions.signal = options.signal;
      } else if (options?.timeout) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), options.timeout);
        fetchOptions.signal = controller.signal;
      }

      const response = await authFetch(url, fetchOptions);
      return parseResponse<T>(response);
    },

    async post<T>(path: string, body?: unknown): Promise<T> {
      const response = await authFetch(buildUrl(path), {
        method: 'POST',
        headers: JSON_HEADERS,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      return parseResponse<T>(response);
    },

    async put<T>(path: string, body: unknown): Promise<T> {
      const response = await authFetch(buildUrl(path), {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      return parseResponse<T>(response);
    },

    async del<T = void>(path: string, body?: unknown): Promise<T> {
      const options: RequestInit = { method: 'DELETE' };
      if (body !== undefined) {
        options.headers = JSON_HEADERS;
        options.body = JSON.stringify(body);
      }
      const response = await authFetch(buildUrl(path), options);
      return parseResponse<T>(response);
    },

    /** For requests needing raw Response (e.g., file uploads via FormData) */
    async rawFetch(path: string, options?: RequestInit): Promise<Response> {
      return authFetch(buildUrl(path), options);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const publicClient = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`);
    return parseResponse<T>(response);
  },
};
