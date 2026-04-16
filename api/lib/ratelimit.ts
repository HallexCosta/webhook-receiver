import { redis } from './redis.js';

const MAX_ATTEMPTS = 3;
const BASE_BLOCK_SECONDS = 3600; // 1 hour

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const state = await redis.hgetall(key) as {
    attempts?: string;
    blockedUntil?: string;
    blockLevel?: string;
  } | null;

  if (!state || Object.keys(state).length === 0) {
    return { allowed: true };
  }

  const blockedUntil = Number(state.blockedUntil || 0);
  if (blockedUntil > Date.now()) {
    return {
      allowed: false,
      retryAfter: Math.ceil((blockedUntil - Date.now()) / 1000),
    };
  }

  return { allowed: true };
}

export async function incrementRateLimit(key: string): Promise<RateLimitResult> {
  const state = await redis.hgetall(key) as {
    attempts?: string;
    blockedUntil?: string;
    blockLevel?: string;
  } | null;

  const now = Date.now();
  const prevBlockedUntil = Number(state?.blockedUntil || 0);
  const blockLevel = Number(state?.blockLevel || 0);

  // If was blocked but block expired, reset attempts but keep blockLevel
  const wasBlocked = prevBlockedUntil > 0 && prevBlockedUntil <= now;
  const currentAttempts = wasBlocked ? 1 : (Number(state?.attempts || 0) + 1);

  if (currentAttempts >= MAX_ATTEMPTS) {
    const newBlockLevel = blockLevel + 1;
    const blockDuration = BASE_BLOCK_SECONDS * Math.pow(3, newBlockLevel - 1);
    const blockedUntil = now + blockDuration * 1000;

    const p = redis.pipeline();
    p.hset(key, { attempts: 0, blockedUntil, blockLevel: newBlockLevel });
    p.expire(key, Math.max(blockDuration + 3600, 86400));
    await p.exec();

    return { allowed: false, retryAfter: blockDuration };
  }

  const p = redis.pipeline();
  p.hset(key, {
    attempts: currentAttempts,
    blockedUntil: prevBlockedUntil,
    blockLevel,
  });
  p.expire(key, 86400);
  await p.exec();

  return { allowed: true };
}

export async function resetRateLimit(key: string): Promise<void> {
  await redis.del(key);
}
