const encoder = new TextEncoder();

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

export async function signInternalRequest(input: { method: string; pathname: string; body: string; timestamp: string; nonce: string; secret: string }) {
  const payload = [input.method.toUpperCase(), input.pathname, input.timestamp, input.nonce, input.body].join('\n');
  const key = await crypto.subtle.importKey('raw', encoder.encode(input.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

export function copyProxyRequestHeaders(source: Headers) {
  const headers = new Headers();
  source.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (hopByHopHeaders.has(lower)) return;
    if (lower.startsWith('x-iron-sprue-internal-')) return;
    if (lower === 'host' || lower === 'content-length') return;
    headers.set(key, value);
  });
  return headers;
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
