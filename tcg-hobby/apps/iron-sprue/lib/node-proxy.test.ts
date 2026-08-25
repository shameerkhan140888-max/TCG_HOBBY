import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonicalizeInternalRequest, copyProxyRequestHeaders, getNodeApiOrigin, isAllowedProxyRoute, signInternalRequest } from './node-proxy';

const originalProductionApiBaseUrl = process.env.IRON_SPRUE_PRODUCTION_API_BASE_URL;
const originalNodeApiOrigin = process.env.IRON_SPRUE_NODE_API_ORIGIN;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalProductionApiBaseUrl === undefined) delete process.env.IRON_SPRUE_PRODUCTION_API_BASE_URL;
  else process.env.IRON_SPRUE_PRODUCTION_API_BASE_URL = originalProductionApiBaseUrl;
  if (originalNodeApiOrigin === undefined) delete process.env.IRON_SPRUE_NODE_API_ORIGIN;
  else process.env.IRON_SPRUE_NODE_API_ORIGIN = originalNodeApiOrigin;
});

describe('Iron Sprue Node proxy contract', () => {
  it('allows only explicit customer commerce routes', () => {
    expect(isAllowedProxyRoute('POST', '/api/customer/register')).toBe(true);
    expect(isAllowedProxyRoute('PATCH', '/api/cart/items/product_1')).toBe(true);
    expect(isAllowedProxyRoute('POST', '/api/cart/resolve')).toBe(true);
    expect(isAllowedProxyRoute('POST', '/api/checkout/session')).toBe(true);
    expect(isAllowedProxyRoute('POST', '/api/checkout/payment-intent')).toBe(true);
    expect(isAllowedProxyRoute('POST', '/api/checkout/payment-intent/cancel')).toBe(true);
    expect(isAllowedProxyRoute('POST', '/api/checkout/cancel')).toBe(true);
    expect(isAllowedProxyRoute('GET', '/api/checkout/status/cs_test_123')).toBe(true);
    expect(isAllowedProxyRoute('GET', '/api/checkout/payment-status/pi_test_123')).toBe(true);
    expect(isAllowedProxyRoute('GET', '/api/shipping-methods')).toBe(true);
    expect(isAllowedProxyRoute('GET', '/api/catalogue')).toBe(false);
    expect(isAllowedProxyRoute('POST', '/api/admin/products')).toBe(false);
    expect(isAllowedProxyRoute('POST', '/api/stripe/webhook')).toBe(false);
  });

  it('strips hop-by-hop and spoofed internal headers', () => {
    const headers = copyProxyRequestHeaders(new Headers({
      connection: 'keep-alive',
      cookie: 'customer=1',
      origin: 'https://staging.ironsprue.co.uk',
      referer: 'https://staging.ironsprue.co.uk/products',
      'sec-fetch-site': 'same-origin',
      'sec-ch-ua-platform': '"Windows"',
      'x-iron-sprue-internal-signature': 'spoofed',
      'x-iron-sprue-internal-key-id': 'spoofed-key',
      'content-type': 'application/json',
    }));
    expect(headers.get('cookie')).toBe('customer=1');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.has('connection')).toBe(false);
    expect(headers.has('origin')).toBe(false);
    expect(headers.has('referer')).toBe(false);
    expect(headers.has('sec-fetch-site')).toBe(false);
    expect(headers.has('sec-ch-ua-platform')).toBe(false);
    expect(headers.has('x-iron-sprue-internal-signature')).toBe(false);
    expect(headers.has('x-iron-sprue-internal-key-id')).toBe(false);
  });

  it('canonicalizes method, route, query, body hash, timestamp, nonce, key, store and environment', async () => {
    const canonical = await canonicalizeInternalRequest({
      method: 'post',
      pathname: '/api/checkout/session',
      query: '?b=2&a=1',
      timestamp: '2026-08-02T00:00:00.000Z',
      nonce: 'nonce-1',
      body: '{"cart":[]}',
      keyId: 'iron-dev',
      store: 'IRON_SPRUE',
      environment: 'development',
    });

    expect(canonical.split('\n')).toHaveLength(9);
    expect(canonical).toContain('IRON_SPRUE');
    expect(canonical).toContain('development');
    expect(canonical).not.toContain('{"cart":[]}');
  });

  it('signs the canonical request and changes when replay or store context changes', async () => {
    const signature = await signInternalRequest({
      method: 'post',
      pathname: '/api/checkout/session',
      query: '?cart=guest',
      timestamp: '2026-08-02T00:00:00.000Z',
      nonce: 'nonce-1',
      body: '{"cart":[]}',
      keyId: 'iron-dev',
      store: 'IRON_SPRUE',
      environment: 'development',
      secret: 'internal-secret',
    });
    const changed = await signInternalRequest({
      method: 'post',
      pathname: '/api/checkout/session',
      query: '?cart=guest',
      timestamp: '2026-08-02T00:00:00.000Z',
      nonce: 'nonce-1',
      body: '{"cart":[]}',
      keyId: 'iron-dev',
      store: 'TCG_HOBBY',
      environment: 'development',
      secret: 'internal-secret',
    });
    expect(signature).toHaveLength(64);
    expect(changed).not.toBe(signature);
  });

  it('uses the explicit production API base URL for production mutation proxying', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('IRON_SPRUE_PRODUCTION_API_BASE_URL', 'https://considerate-unity-production-b734.up.railway.app/');
    vi.stubEnv('IRON_SPRUE_NODE_API_ORIGIN', 'https://local-node-api.example');

    expect(getNodeApiOrigin()).toBe('https://considerate-unity-production-b734.up.railway.app');
  });

  it('preserves the local node API origin outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('IRON_SPRUE_PRODUCTION_API_BASE_URL', 'https://considerate-unity-production-b734.up.railway.app');
    vi.stubEnv('IRON_SPRUE_NODE_API_ORIGIN', 'http://localhost:3001');

    expect(getNodeApiOrigin()).toBe('http://localhost:3001');
  });
});
