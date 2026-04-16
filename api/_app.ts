import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';
import { nanoid } from 'nanoid';

// --- Types ---

interface WebhookCall {
  id: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  query: Record<string, string>;
  contentType: string | null;
  ip: string | null;
  timestamp: number;
}

interface Endpoint {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  calls: WebhookCall[];
}

// --- Store ---

const endpoints = new Map<string, Endpoint>();
let counter = 0;
const MAX_CALLS = 100;

// --- App ---

const app = new Hono().basePath('/api');
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowHeaders: ['*'],
}));

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'changeme';
const auth = bearerAuth({ token: AUTH_PASSWORD });

// Health check
app.get('/health', (c) => c.json({ ok: true }));

// Login
app.post('/auth/login', async (c) => {
  const { password } = await c.req.json<{ password: string }>();
  if (password !== AUTH_PASSWORD) {
    return c.json({ error: 'Invalid password' }, 401);
  }
  return c.json({ token: password });
});

// Webhook receiver (PUBLIC - no auth)
app.all('/w/:id', async (c) => {
  const endpoint = endpoints.get(c.req.param('id'));
  if (!endpoint || !endpoint.active) {
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

  const call: WebhookCall = {
    id: nanoid(12),
    method: c.req.method,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    body,
    query: c.req.query(),
    contentType: c.req.header('content-type') || null,
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
    timestamp: Date.now(),
  };

  endpoint.calls.unshift(call);
  if (endpoint.calls.length > MAX_CALLS) {
    endpoint.calls.pop();
  }

  return c.json({ ok: true });
});

// --- Dashboard routes (PROTECTED) ---

app.use('/endpoints/*', auth);
app.use('/endpoints', auth);

// List endpoints
app.get('/endpoints', (c) => {
  const list = [...endpoints.values()]
    .map(({ calls, ...rest }) => ({ ...rest, callCount: calls.length }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return c.json({ endpoints: list });
});

// Create endpoint
app.post('/endpoints', (c) => {
  counter++;
  const endpoint: Endpoint = {
    id: nanoid(10),
    name: `Endpoint #${counter}`,
    active: true,
    createdAt: Date.now(),
    calls: [],
  };
  endpoints.set(endpoint.id, endpoint);
  return c.json({ endpoint }, 201);
});

// Get endpoint detail
app.get('/endpoints/:id', (c) => {
  const endpoint = endpoints.get(c.req.param('id'));
  if (!endpoint) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }
  return c.json({ endpoint });
});

// Toggle active/inactive
app.patch('/endpoints/:id', async (c) => {
  const endpoint = endpoints.get(c.req.param('id'));
  if (!endpoint) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }
  const { active } = await c.req.json<{ active: boolean }>();
  endpoint.active = active;
  return c.json({ endpoint });
});

// Delete endpoint
app.delete('/endpoints/:id', (c) => {
  const id = c.req.param('id');
  if (!endpoints.has(id)) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }
  endpoints.delete(id);
  return c.json({ ok: true });
});

// Clear call history
app.delete('/endpoints/:id/calls', (c) => {
  const endpoint = endpoints.get(c.req.param('id'));
  if (!endpoint) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }
  endpoint.calls = [];
  return c.json({ ok: true });
});

export { app };
