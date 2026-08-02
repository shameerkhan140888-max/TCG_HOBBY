export const ACCESS_COOKIE_NAME = 'iron_sprue_staging_access';
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;
export const ACCESS_LOGIN_PATH = '/access';
export const ACCESS_SUBMIT_PATH = '/api/staging-access';
export const ACCESS_LOGOUT_PATH = '/api/staging-access/logout';

const encoder = new TextEncoder();
const attempts = new Map<string, { count: number; resetAt: number }>();

export type AccessMode = 'protected' | 'public';
export type AccessEnv = Partial<Record<string, string | undefined>>;

export function storefrontAccessMode(env: AccessEnv = process.env): AccessMode {
  return env.STOREFRONT_ACCESS_MODE === 'public' ? 'public' : 'protected';
}

export function noindexHeaders() {
  return {
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  };
}

export function isAccessExemptPath(pathname: string) {
  if (pathname === ACCESS_LOGIN_PATH || pathname === ACCESS_SUBMIT_PATH || pathname === ACCESS_LOGOUT_PATH) return true;
  if (pathname === '/robots.txt' || pathname === '/favicon.ico') return true;
  if (pathname.startsWith('/_next/') || pathname.startsWith('/brand/') || pathname.startsWith('/access-assets/')) return true;
  if (pathname === '/api/health' || pathname === '/api/readiness') return true;
  if (pathname === '/api/stripe/webhook') return true;
  return false;
}

export function assertPasswordAttemptAllowed(key: string, now = Date.now()) {
  const windowMs = 15 * 60 * 1000;
  const limit = 8;
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new Error('Too many attempts.');
  }
}

export function resetPasswordAttemptLimitForTests() {
  attempts.clear();
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

function constantTimeEqual(left: string, right: string) {
  const max = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < max; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export async function verifyStagingPassword(input: string, env: AccessEnv = process.env) {
  const provided = input.trim();
  if (!provided) return false;

  const configuredHash = env.IRON_SPRUE_STAGING_PASSWORD_SHA256?.trim().toLowerCase();
  if (configuredHash) {
    return constantTimeEqual(await sha256(provided), configuredHash);
  }

  const configuredPassword = env.IRON_SPRUE_STAGING_PASSWORD;
  if (!configuredPassword) return false;
  return constantTimeEqual(await sha256(provided), await sha256(configuredPassword));
}

async function hmac(secret: string, payload: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

export async function createAccessCookieValue(env: AccessEnv = process.env, now = Date.now()) {
  const secret = env.IRON_SPRUE_STAGING_ACCESS_SECRET;
  if (!secret) throw new Error('Staging access is not configured.');
  const expiresAt = now + ACCESS_COOKIE_MAX_AGE_SECONDS * 1000;
  const payload = `v1.${expiresAt}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifyAccessCookieValue(cookieValue: string | undefined, env: AccessEnv = process.env, now = Date.now()) {
  if (!cookieValue) return false;
  const [version, expiresAtRaw, signature] = cookieValue.split('.');
  if (version !== 'v1' || !expiresAtRaw || !signature) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
  const secret = env.IRON_SPRUE_STAGING_ACCESS_SECRET;
  if (!secret) return false;
  const expected = await hmac(secret, `${version}.${expiresAtRaw}`);
  return constantTimeEqual(signature, expected);
}
