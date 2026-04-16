import { useCallback } from 'react';

export function useApi(token: string) {
  const request = useCallback(
    async <T = unknown>(path: string, options?: RequestInit): Promise<T> => {
      const res = await fetch(`/api${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
      });

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
