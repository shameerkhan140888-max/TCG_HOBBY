import { describe, expect, it } from 'vitest';
import { canonicalizeInternalRequest, copyProxyRequestHeaders, isAllowedProxyRoute, signInternalRequest } from './node-proxy';

describe('Iron Sprue Node proxy contract', () => {
  it('allows only explicit customer commerce routes', () => {
    expect(isAllowedProxyRoute('POST', '/api/customer/register')).toBe(true);
    expect(isAllowedProxyRoute('PATCH', '/api/cart/items/product_1')).toBe(true);
    expect(isAllowedProxyRoute('POST', '/api/cart/resolve')).toBe(true);
    expect(isAllowedProxyRoute('POST', '/api/checkout/session')).toBe(true);
    expect(isAllowedProxyRoute('POST', '/api/checkout/cancel')).toBe(true);
    expect(isAllowedProxyRoute('GET', '/api/checkout/status/cs_test_123')).toBe(true);
    expect(isAllowedProxyRoute('GET', '/api/shipping-methods')).toBe(true);
    expect(isAllowedProxyRoute('GET', '/api/catalogue')).toBe(false);
    expect(isAllowedProxyRoute('POST', '/api/admin/products')).toBe(false);
    expect(isAllowedProxyRoute('POST', '/api/stripe/webhook')).toBe(false);
  });

  it('strips hop-by-hop and spoofed internal headers', () => {
    const headers = copyProxyRequestHeaders(new Headers({
      connection: 'keep-alive',
      cookie: 'customer=1',
      'x-iron-sprue-internal-signature': 'spoofed',
      'x-iron-sprue-internal-key-id': 'spoofed-key',
      'content-type': 'application/json',
    }));
    expect(headers.get('cookie')).toBe('customer=1');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.has('connection')).toBe(false);
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
});
