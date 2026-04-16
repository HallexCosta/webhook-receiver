import { useCallback } from 'react';

export class AuthError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

export function useApi(token: string | null) {
  const request = useCallback(
    async <T = unknown>(path: string, options?: RequestInit): Promise<T> => {
      const res = await fetch(`/api${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options?.headers,
        },
      });

      if (res.status === 401) throw new AuthError();
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [token],
  );

  return { request };
}
