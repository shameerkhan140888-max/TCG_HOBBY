const encoder = new TextEncoder();
const INTERNAL_HEADER_PREFIX = 'x-iron-sprue-internal-';

export const IRON_SPRUE_STORE_CODE = 'IRON_SPRUE';
export const IRON_SPRUE_ENVIRONMENT = process.env.IRON_SPRUE_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development';

export const allowedProxyRoutes = [
  { method: 'POST', pattern: /^\/api\/customer\/register$/ },
  { method: 'POST', pattern: /^\/api\/customer\/login$/ },
  { method: 'POST', pattern: /^\/api\/customer\/logout$/ },
  { method: 'GET', pattern: /^\/api\/customer\/session$/ },
  { method: 'GET', pattern: /^\/api\/customer\/profile$/ },
  { method: 'PATCH', pattern: /^\/api\/customer\/profile$/ },
  { method: 'POST', pattern: /^\/api\/customer\/addresses$/ },
  { method: 'PATCH', pattern: /^\/api\/customer\/addresses\/[a-zA-Z0-9_-]+$/ },
  { method: 'DELETE', pattern: /^\/api\/customer\/addresses\/[a-zA-Z0-9_-]+$/ },
  { method: 'POST', pattern: /^\/api\/customer\/wishlist\/[a-zA-Z0-9_-]+$/ },
  { method: 'DELETE', pattern: /^\/api\/customer\/wishlist\/[a-zA-Z0-9_-]+$/ },
  { method: 'GET', pattern: /^\/api\/cart$/ },
  { method: 'POST', pattern: /^\/api\/cart\/items$/ },
  { method: 'PATCH', pattern: /^\/api\/cart\/items\/[a-zA-Z0-9_-]+$/ },
  { method: 'DELETE', pattern: /^\/api\/cart\/items\/[a-zA-Z0-9_-]+$/ },
  { method: 'DELETE', pattern: /^\/api\/cart$/ },
  { method: 'POST', pattern: /^\/api\/cart\/merge-guest$/ },
  { method: 'POST', pattern: /^\/api\/checkout\/session$/ },
  { method: 'GET', pattern: /^\/api\/checkout\/status\/[a-zA-Z0-9_-]+$/ },
  { method: 'GET', pattern: /^\/api\/customer\/orders$/ },
  { method: 'GET', pattern: /^\/api\/customer\/orders\/[a-zA-Z0-9_-]+$/ },
] as const;

export const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export function isAllowedProxyRoute(method: string, pathname: string) {
  const normalizedMethod = method.toUpperCase();
  return allowedProxyRoutes.some((route) => route.method === normalizedMethod && route.pattern.test(pathname));
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export type InternalRequestSignatureInput = {
  method: string;
  pathname: string;
  query?: string;
  body: string;
  timestamp: string;
  nonce: string;
  keyId: string;
  secret: string;
  store: string;
  environment: string;
};

export async function canonicalizeInternalRequest(input: Omit<InternalRequestSignatureInput, 'secret'>) {
  const canonicalQuery = input.query?.replace(/^\?/, '') ?? '';
  const bodyDigest = await sha256Hex(input.body);
  return [
    input.keyId,
    input.method.toUpperCase(),
    input.pathname,
    canonicalQuery,
    bodyDigest,
    input.timestamp,
    input.nonce,
    input.store,
    input.environment,
  ].join('\n');
}

export async function signInternalRequest(input: InternalRequestSignatureInput) {
  const payload = await canonicalizeInternalRequest(input);
  const key = await crypto.subtle.importKey('raw', encoder.encode(input.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

export function copyProxyRequestHeaders(source: Headers) {
  const headers = new Headers();
  source.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (hopByHopHeaders.has(lower)) return;
    if (lower.startsWith(INTERNAL_HEADER_PREFIX)) return;
    if (lower === 'host' || lower === 'content-length') return;
    headers.set(key, value);
  });
  return headers;
}

export function requireInternalSigningConfig() {
  const keyId = process.env.IRON_SPRUE_INTERNAL_API_KEY_ID?.trim();
  const secret = process.env.IRON_SPRUE_INTERNAL_API_SECRET?.trim();
  if (!keyId || !secret) {
    throw new Error('IRON_SPRUE_INTERNAL_API_KEY_ID and IRON_SPRUE_INTERNAL_API_SECRET are required for mutation proxying.');
  }
  return { keyId, secret, store: IRON_SPRUE_STORE_CODE, environment: IRON_SPRUE_ENVIRONMENT };
}

export function getNodeApiOrigin() {
  const origin = process.env.IRON_SPRUE_NODE_API_ORIGIN;
  if (!origin) throw new Error('IRON_SPRUE_NODE_API_ORIGIN is required for mutation proxying.');
  const url = new URL(origin);
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('IRON_SPRUE_NODE_API_ORIGIN must use HTTPS in production.');
  }
  return url.origin;
}
