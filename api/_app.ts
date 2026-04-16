import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context, Next } from 'hono';
import {
  createEndpoint,
  getEndpoint,
  getEndpointWithCalls,
  updateEndpoint,
  deleteEndpoint,
  isOwnedBySession,
  addCall,
  clearCalls,
  listEndpoints,
  getSessionEndpointCount,
  MAX_ENDPOINTS,
  MAX_CALLS,
  TTL,
} from './lib/redis.js';
import type { WebhookCall, ForwardingResult } from './lib/redis.js';
import { nanoid } from 'nanoid';

const app = new Hono().basePath('/api');

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowHeaders: ['*'],
}));

// --- Session auth middleware ---

const sessionAuth = async (c: Context, next: Next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ') || auth.length < 10) {
    return c.json({ error: 'Session token required' }, 401);
  }
  c.set('sessionToken', auth.slice(7));
  await next();
};

// Health check
app.get('/health', (c) => c.json({ ok: true }));

// --- Webhook receiver (PUBLIC) ---

app.all('/w/:id', async (c) => {
  const endpoint = await getEndpoint(c.req.param('id'));
  if (!endpoint || String(endpoint.active) === 'false') {
    return c.json({ error: 'Not found' }, 404);
  }

  let body: string | null = null;
  if (!['GET', 'HEAD'].includes(c.req.method)) {
    try {
      body = await c.req.text();
    } catch {
      body = null;
    }
  }

  // Forward if configured
  let forwarding: ForwardingResult | undefined;
  if (endpoint.forwardUrl) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const forwardHeaders = new Headers();
      forwardHeaders.set('content-type', c.req.header('content-type') || 'application/octet-stream');
      forwardHeaders.set('user-agent', c.req.header('user-agent') || 'webhook-receiver');

      const res = await fetch(endpoint.forwardUrl, {
        method: c.req.method,
        headers: forwardHeaders,
        body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      forwarding = {
        url: endpoint.forwardUrl,
        status: res.status,
        duration: Date.now() - start,
        success: res.ok,
      };
    } catch (err) {
      forwarding = {
        url: endpoint.forwardUrl,
        status: 0,
        duration: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  const call: WebhookCall = {
    id: nanoid(12),
    method: c.req.method,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    body,
    query: c.req.query(),
    contentType: c.req.header('content-type') || null,
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
    timestamp: Date.now(),
    ...(forwarding ? { forwarding } : {}),
  };

  await addCall(endpoint.id, call);

  return c.json({ ok: true });
});

// --- Dashboard routes (session-scoped) ---

app.use('/endpoints/*', sessionAuth);
app.use('/endpoints', sessionAuth);

// List endpoints
app.get('/endpoints', async (c) => {
  const sessionToken = c.get('sessionToken');
  const endpoints = await listEndpoints(sessionToken);
  const count = endpoints.length;
  return c.json({
    endpoints,
    limits: {
      endpointsUsed: count,
      endpointsMax: MAX_ENDPOINTS,
      callsMaxPerEndpoint: MAX_CALLS,
      retentionHours: TTL / 3600,
    },
  });
});

// Create endpoint
app.post('/endpoints', async (c) => {
  const sessionToken = c.get('sessionToken');
  try {
    const endpoint = await createEndpoint(sessionToken);
    const count = await getSessionEndpointCount(sessionToken);
    return c.json({
      endpoint,
      limits: {
        endpointsUsed: count,
        endpointsMax: MAX_ENDPOINTS,
      },
    }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === 'LIMIT_REACHED') {
      return c.json({
        error: `Limite de ${MAX_ENDPOINTS} endpoints atingido`,
        limits: { endpointsUsed: MAX_ENDPOINTS, endpointsMax: MAX_ENDPOINTS },
      }, 403);
    }
    throw err;
  }
});

// Get endpoint detail
app.get('/endpoints/:id', async (c) => {
  const sessionToken = c.get('sessionToken');
  const id = c.req.param('id');

  if (!(await isOwnedBySession(id, sessionToken))) {
    return c.json({ error: 'Not found' }, 404);
  }

  const endpoint = await getEndpointWithCalls(id);
  if (!endpoint) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ endpoint });
});

// Update endpoint (toggle, rename, forward URL)
app.patch('/endpoints/:id', async (c) => {
  const sessionToken = c.get('sessionToken');
  const id = c.req.param('id');

  if (!(await isOwnedBySession(id, sessionToken))) {
    return c.json({ error: 'Not found' }, 404);
  }

  const body = await c.req.json<{
    active?: boolean;
    name?: string;
    forwardUrl?: string;
  }>();

  const fields: Record<string, unknown> = {};
  if (body.active !== undefined) fields.active = body.active;
  if (body.name !== undefined) fields.name = body.name;
  if (body.forwardUrl !== undefined) fields.forwardUrl = body.forwardUrl;

  const endpoint = await updateEndpoint(id, fields);
  if (!endpoint) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ endpoint });
});

// Delete endpoint
app.delete('/endpoints/:id', async (c) => {
  const sessionToken = c.get('sessionToken');
  const id = c.req.param('id');

  if (!(await isOwnedBySession(id, sessionToken))) {
    return c.json({ error: 'Not found' }, 404);
  }

  await deleteEndpoint(sessionToken, id);
  return c.json({ ok: true });
});

// Clear call history
app.delete('/endpoints/:id/calls', async (c) => {
  const sessionToken = c.get('sessionToken');
  const id = c.req.param('id');

  if (!(await isOwnedBySession(id, sessionToken))) {
    return c.json({ error: 'Not found' }, 404);
  }

  await clearCalls(id);
  return c.json({ ok: true });
});

export { app };
