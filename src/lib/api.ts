import type { Endpoint, EndpointSummary, SessionLimits } from '../types';

type RequestFn = <T = unknown>(path: string, options?: RequestInit) => Promise<T>;

export const listEndpoints = (request: RequestFn) =>
  request<{ endpoints: EndpointSummary[]; limits: SessionLimits }>('/endpoints');

export const createEndpoint = (request: RequestFn) =>
  request<{ endpoint: Endpoint; limits: { endpointsUsed: number; endpointsMax: number } }>('/endpoints', { method: 'POST' });

export const getEndpoint = (request: RequestFn, id: string) =>
  request<{ endpoint: Endpoint }>(`/endpoints/${id}`);

export const toggleEndpoint = (request: RequestFn, id: string, active: boolean) =>
  request<{ endpoint: Endpoint }>(`/endpoints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });

export const renameEndpoint = (request: RequestFn, id: string, name: string) =>
  request<{ endpoint: Endpoint }>(`/endpoints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });

export const setForwardUrl = (request: RequestFn, id: string, forwardUrl: string) =>
  request<{ endpoint: Endpoint }>(`/endpoints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ forwardUrl }),
  });

export const deleteEndpoint = (request: RequestFn, id: string) =>
  request<{ ok: boolean }>(`/endpoints/${id}`, { method: 'DELETE' });

export const clearCalls = (request: RequestFn, id: string) =>
  request<{ ok: boolean }>(`/endpoints/${id}/calls`, { method: 'DELETE' });
