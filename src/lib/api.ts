import type { Endpoint, EndpointSummary, SessionLimits, User } from '../types';

type RequestFn = <T = unknown>(path: string, options?: RequestInit) => Promise<T>;

// --- Auth (raw fetch, no token needed) ---

export const register = (email: string) =>
  fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');
    return data as { passphrase: string; passphraseFormatted: string; isNew: boolean };
  });

export const login = (passphrase: string) =>
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase }),
  }).then(async (res) => {
    const data = await res.json();
    if (res.status === 429) throw new Error(data.error || 'Rate limited');
    if (!res.ok) throw new Error(data.error || 'Passphrase invalida');
    return data as { ok: boolean; email: string; tier: string; passphrase: string };
  });

export const getMe = (token: string) =>
  fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (res) => {
    if (!res.ok) throw new Error('Unauthorized');
    return res.json() as Promise<User>;
  });

// --- Endpoints (authenticated) ---

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
