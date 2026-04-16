import type { Endpoint, EndpointSummary } from '../types';

type RequestFn = <T = unknown>(path: string, options?: RequestInit) => Promise<T>;

export const login = (request: RequestFn, password: string) =>
  request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

export const listEndpoints = (request: RequestFn) =>
  request<{ endpoints: EndpointSummary[] }>('/endpoints');

export const createEndpoint = (request: RequestFn) =>
  request<{ endpoint: Endpoint }>('/endpoints', { method: 'POST' });

export const getEndpoint = (request: RequestFn, id: string) =>
  request<{ endpoint: Endpoint }>(`/endpoints/${id}`);

export const toggleEndpoint = (request: RequestFn, id: string, active: boolean) =>
  request<{ endpoint: Endpoint }>(`/endpoints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });

export const deleteEndpoint = (request: RequestFn, id: string) =>
  request<{ ok: boolean }>(`/endpoints/${id}`, { method: 'DELETE' });

export const clearCalls = (request: RequestFn, id: string) =>
  request<{ ok: boolean }>(`/endpoints/${id}/calls`, { method: 'DELETE' });
