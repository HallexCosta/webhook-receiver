import { redis } from './redis.js';

// --- Tier Config ---

export interface TierLimits {
  maxEndpoints: number;
  maxCalls: number;
  ttl: number; // 0 = no expiry
}

const TIER_LIMITS: Record<string, TierLimits> = {
  freemium: { maxEndpoints: 3, maxCalls: 25, ttl: 86400 },
  paid: { maxEndpoints: 10, maxCalls: 100, ttl: 0 },
};

export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.freemium;
}

// --- Passphrase Generation ---

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function generatePassphrase(email: string): Promise<string> {
  const salt = process.env.PASSPHRASE_SALT || 'default-salt';
  return sha256Hex(email.toLowerCase().trim() + salt);
}

export function formatPassphrase(hash: string): string {
  return hash.match(/.{1,8}/g)?.join('-') || hash;
}

// --- User Registration (idempotent) ---

export interface UserData {
  email: string;
  tier: string;
  createdAt: number;
}

export async function registerUser(email: string): Promise<{
  passphrase: string;
  isNew: boolean;
}> {
  const normalized = email.toLowerCase().trim();

  // Check if email already registered
  const existing = await redis.get(`email:${normalized}`) as string | null;
  if (existing) {
    return { passphrase: existing, isNew: false };
  }

  // Generate passphrase and store
  const passphrase = await generatePassphrase(normalized);

  const p = redis.pipeline();
  p.set(`email:${normalized}`, passphrase);
  p.hset(`passphrase:${passphrase}`, {
    email: normalized,
    tier: 'freemium',
    createdAt: Date.now(),
  } satisfies UserData);
  await p.exec();

  return { passphrase, isNew: true };
}

// --- Login ---

export async function loginUser(passphrase: string): Promise<UserData | null> {
  const data = await redis.hgetall(`passphrase:${passphrase}`) as Record<string, string> | null;
  if (!data || Object.keys(data).length === 0) return null;
  return {
    email: data.email,
    tier: data.tier,
    createdAt: Number(data.createdAt),
  };
}

// --- Get User ---

export async function getUserByPassphrase(passphrase: string): Promise<UserData | null> {
  return loginUser(passphrase);
}
