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
} from './lib/redis.js';
import type { WebhookCall, ForwardingResult } from './lib/redis.js';
import {
  registerUser,
  loginUser,
  getUserByPassphrase,
  getTierLimits,
  formatPassphrase,
} from './lib/auth.js';
import {
  checkRateLimit,
  incrementRateLimit,
  resetRateLimit,
} from './lib/ratelimit.js';
import { nanoid } from 'nanoid';

const app = new Hono().basePath('/api');

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowHeaders: ['*'],
}));

// --- Session auth middleware (validates passphrase in Redis) ---

const sessionAuth = async (c: Context, next: Next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ') || auth.length < 10) {
    return c.json({ error: 'Passphrase required' }, 401);
  }
  const token = auth.slice(7);
  const user = await getUserByPassphrase(token);
  if (!user) {
    return c.json({ error: 'Invalid passphrase' }, 401);
  }
  c.set('sessionToken', token);
  c.set('user', user);
  c.set('tierLimits', getTierLimits(user.tier));
  await next();
};

// Health check
app.get('/health', (c) => c.json({ ok: true }));

// --- Auth routes (PUBLIC) ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/auth/register', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  if (!email || !EMAIL_REGEX.test(email)) {
    return c.json({ error: 'Email invalido' }, 400);
  }
  const result = await registerUser(email);

  if (result.emailAlreadyExists) {
    // Send notification email in background — don't await to keep response fast
    import('./lib/email.js').then(({ sendExistingAccountEmail }) =>
      sendExistingAccountEmail(email.toLowerCase().trim()),
    );
    // Return same shape as success — attacker can't tell if email exists
    return c.json({
      message: 'Verifique seu email para continuar.',
    });
  }

  return c.json({
    passphrase: result.passphrase,
    passphraseFormatted: formatPassphrase(result.passphrase!),
    message: 'Conta criada! Salve sua passphrase.',
  });
});

app.post('/auth/login', async (c) => {
  const { passphrase } = await c.req.json<{ passphrase: string }>();
  if (!passphrase || passphrase.length < 10) {
    return c.json({ error: 'Passphrase invalida' }, 400);
  }

  // Normalize: remove dashes if formatted
  const normalized = passphrase.replace(/-/g, '').toLowerCase().trim();

  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  // Check rate limits (both IP and passphrase)
  const ipCheck = await checkRateLimit(`ratelimit:ip:${ip}`);
  const passCheck = await checkRateLimit(`ratelimit:pass:${normalized}`);

  if (!ipCheck.allowed || !passCheck.allowed) {
    const retryAfter = Math.max(ipCheck.retryAfter || 0, passCheck.retryAfter || 0);
    const hours = Math.ceil(retryAfter / 3600);
    return c.json({
      error: `Muitas tentativas. Tente novamente em ${hours}h.`,
      retryAfter,
    }, 429);
  }

  const user = await loginUser(normalized);
  if (!user) {
    // Increment rate limits on failure
    await incrementRateLimit(`ratelimit:ip:${ip}`);
    await incrementRateLimit(`ratelimit:pass:${normalized}`);
    return c.json({ error: 'Passphrase invalida' }, 401);
  }

  // Success — reset IP rate limit
  await resetRateLimit(`ratelimit:ip:${ip}`);

  return c.json({
    ok: true,
    email: user.email,
    tier: user.tier,
    passphrase: normalized,
  });
});

app.get('/auth/me', sessionAuth, async (c) => {
  const user = c.get('user');
  const tierLimits = c.get('tierLimits');
  return c.json({ ...user, limits: tierLimits });
});

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

  // Extract source domain from headers
  let source: string | null = null;
  const origin = c.req.header('origin');
  const referer = c.req.header('referer');
  const userAgent = c.req.header('user-agent') || '';
  if (origin) {
    try { source = new URL(origin).hostname; } catch { source = origin; }
  } else if (referer) {
    try { source = new URL(referer).hostname; } catch { source = referer; }
  } else if (userAgent && !userAgent.startsWith('curl') && !userAgent.startsWith('node')) {
    const match = userAgent.match(/^([A-Za-z0-9_-]+)/);
    if (match) source = match[1];
  }

  const call: WebhookCall = {
    id: nanoid(12),
    method: c.req.method,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    body,
    query: c.req.query(),
    contentType: c.req.header('content-type') || null,
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
    source,
    timestamp: Date.now(),
    ...(forwarding ? { forwarding } : {}),
  };

  // Get user's tier limits for the endpoint owner
  const ownerUser = await getUserByPassphrase(endpoint.sessionToken);
  const limits = ownerUser ? getTierLimits(ownerUser.tier) : undefined;

  await addCall(endpoint.id, call, limits ? { maxCalls: limits.maxCalls, ttl: limits.ttl } : undefined);

  return c.json({ ok: true });
});

// --- Dashboard routes (session-scoped, tier-aware) ---

app.use('/endpoints/*', sessionAuth);
app.use('/endpoints', sessionAuth);

// List endpoints
app.get('/endpoints', async (c) => {
  const sessionToken = c.get('sessionToken');
  const tierLimits = c.get('tierLimits');
  const endpoints = await listEndpoints(sessionToken);
  return c.json({
    endpoints,
    limits: {
      endpointsUsed: endpoints.length,
      endpointsMax: tierLimits.maxEndpoints,
      callsMaxPerEndpoint: tierLimits.maxCalls,
      retentionHours: tierLimits.ttl > 0 ? tierLimits.ttl / 3600 : 0,
    },
  });
});

// Create endpoint
app.post('/endpoints', async (c) => {
  const sessionToken = c.get('sessionToken');
  const tierLimits = c.get('tierLimits');
  try {
    const endpoint = await createEndpoint(sessionToken, {
      maxEndpoints: tierLimits.maxEndpoints,
      ttl: tierLimits.ttl,
    });
    const count = await getSessionEndpointCount(sessionToken);
    return c.json({
      endpoint,
      limits: {
        endpointsUsed: count,
        endpointsMax: tierLimits.maxEndpoints,
      },
    }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === 'LIMIT_REACHED') {
      return c.json({
        error: `Limite de ${tierLimits.maxEndpoints} endpoints atingido`,
        limits: { endpointsUsed: tierLimits.maxEndpoints, endpointsMax: tierLimits.maxEndpoints },
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
