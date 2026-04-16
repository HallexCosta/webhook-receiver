import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';

// --- Types ---

export interface WebhookCall {
  id: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  query: Record<string, string>;
  contentType: string | null;
  ip: string | null;
  timestamp: number;
  forwarding?: ForwardingResult;
}

export interface ForwardingResult {
  url: string;
  status: number;
  duration: number;
  success: boolean;
  error?: string;
}

export interface EndpointData {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  sessionToken: string;
  forwardUrl: string;
}

export interface EndpointWithCalls extends EndpointData {
  calls: WebhookCall[];
}

export interface EndpointSummary extends EndpointData {
  callCount: number;
}

// --- Constants ---

const TTL = 86400; // 24 hours
const MAX_ENDPOINTS = 3;
const MAX_CALLS = 25;

export { MAX_ENDPOINTS, MAX_CALLS, TTL };

// --- Redis Client ---

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// --- Session Helpers ---

export async function getSessionEndpointCount(sessionToken: string): Promise<number> {
  return await redis.scard(`session:${sessionToken}:endpoints`);
}

export async function getSessionEndpointIds(sessionToken: string): Promise<string[]> {
  return await redis.smembers(`session:${sessionToken}:endpoints`);
}

// --- Endpoint CRUD ---

export async function createEndpoint(sessionToken: string): Promise<EndpointData> {
  const count = await getSessionEndpointCount(sessionToken);
  if (count >= MAX_ENDPOINTS) {
    throw new Error('LIMIT_REACHED');
  }

  const id = nanoid(10);
  const endpoint: EndpointData = {
    id,
    name: `Endpoint #${count + 1}`,
    active: true,
    createdAt: Date.now(),
    sessionToken,
    forwardUrl: '',
  };

  const p = redis.pipeline();
  p.hset(`endpoint:${id}`, endpoint);
  p.sadd(`session:${sessionToken}:endpoints`, id);
  p.set(`endpoint_session:${id}`, sessionToken, { ex: TTL });
  p.expire(`endpoint:${id}`, TTL);
  p.expire(`session:${sessionToken}:endpoints`, TTL);
  await p.exec();

  return endpoint;
}

export async function getEndpoint(endpointId: string): Promise<EndpointData | null> {
  const data = await redis.hgetall(`endpoint:${endpointId}`);
  if (!data || Object.keys(data).length === 0) return null;
  return data as unknown as EndpointData;
}

export async function getEndpointWithCalls(endpointId: string): Promise<EndpointWithCalls | null> {
  const p = redis.pipeline();
  p.hgetall(`endpoint:${endpointId}`);
  p.lrange(`endpoint:${endpointId}:calls`, 0, MAX_CALLS - 1);
  const [endpointResult, callsResult] = await p.exec();

  const data = endpointResult as Record<string, unknown> | null;
  if (!data || Object.keys(data).length === 0) return null;

  const calls = (callsResult as unknown[] || []).map((c) =>
    typeof c === 'string' ? JSON.parse(c) : c,
  ) as WebhookCall[];

  return { ...(data as unknown as EndpointData), calls };
}

export async function updateEndpoint(
  endpointId: string,
  fields: Partial<Pick<EndpointData, 'active' | 'name' | 'forwardUrl'>>,
): Promise<EndpointData | null> {
  const existing = await getEndpoint(endpointId);
  if (!existing) return null;

  const p = redis.pipeline();
  p.hset(`endpoint:${endpointId}`, fields);
  p.expire(`endpoint:${endpointId}`, TTL);
  await p.exec();

  return { ...existing, ...fields };
}

export async function deleteEndpoint(sessionToken: string, endpointId: string): Promise<boolean> {
  const p = redis.pipeline();
  p.del(`endpoint:${endpointId}`);
  p.del(`endpoint:${endpointId}:calls`);
  p.del(`endpoint_session:${endpointId}`);
  p.srem(`session:${sessionToken}:endpoints`, endpointId);
  await p.exec();
  return true;
}

export async function isOwnedBySession(endpointId: string, sessionToken: string): Promise<boolean> {
  const owner = await redis.get(`endpoint_session:${endpointId}`);
  return owner === sessionToken;
}

// --- Calls ---

export async function addCall(endpointId: string, call: WebhookCall): Promise<void> {
  const p = redis.pipeline();
  p.lpush(`endpoint:${endpointId}:calls`, JSON.stringify(call));
  p.ltrim(`endpoint:${endpointId}:calls`, 0, MAX_CALLS - 1);
  p.expire(`endpoint:${endpointId}:calls`, TTL);
  p.expire(`endpoint:${endpointId}`, TTL);
  await p.exec();
}

export async function clearCalls(endpointId: string): Promise<void> {
  await redis.del(`endpoint:${endpointId}:calls`);
}

// --- List endpoints for session ---

export async function listEndpoints(sessionToken: string): Promise<EndpointSummary[]> {
  const ids = await getSessionEndpointIds(sessionToken);
  if (ids.length === 0) return [];

  const p = redis.pipeline();
  for (const id of ids) {
    p.hgetall(`endpoint:${id}`);
    p.llen(`endpoint:${id}:calls`);
  }
  const results = await p.exec();

  const endpoints: EndpointSummary[] = [];
  for (let i = 0; i < ids.length; i++) {
    const data = results[i * 2] as Record<string, unknown> | null;
    const callCount = (results[i * 2 + 1] as number) || 0;
    if (data && Object.keys(data).length > 0) {
      endpoints.push({ ...(data as unknown as EndpointData), callCount });
    }
  }

  return endpoints.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}
