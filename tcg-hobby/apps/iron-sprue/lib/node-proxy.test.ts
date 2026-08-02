import { describe, expect, it } from 'vitest';
import { copyProxyRequestHeaders, isAllowedProxyRoute, signInternalRequest } from './node-proxy';

describe('Iron Sprue Node proxy contract', () => {
  it('allows only explicit customer commerce routes', () => {
    expect(isAllowedProxyRoute('POST', '/api/customer/register')).toBe(true);
    expect(isAllowedProxyRoute('PATCH', '/api/cart/items/product_1')).toBe(true);
    expect(isAllowedProxyRoute('POST', '/api/checkout/session')).toBe(true);
    expect(isAllowedProxyRoute('GET', '/api/catalogue')).toBe(false);
    expect(isAllowedProxyRoute('POST', '/api/admin/products')).toBe(false);
    expect(isAllowedProxyRoute('POST', '/api/stripe/webhook')).toBe(false);
  });

  it('strips hop-by-hop and spoofed internal headers', () => {
    const headers = copyProxyRequestHeaders(new Headers({
      connection: 'keep-alive',
      cookie: 'customer=1',
      'x-iron-sprue-internal-signature': 'spoofed',
      'content-type': 'application/json',
    }));
    expect(headers.get('cookie')).toBe('customer=1');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.has('connection')).toBe(false);
    expect(headers.has('x-iron-sprue-internal-signature')).toBe(false);
  });

  it('signs method, route, timestamp, nonce and body', async () => {
    const signature = await signInternalRequest({
      method: 'post',
      pathname: '/api/checkout/session',
      timestamp: '2026-08-02T00:00:00.000Z',
      nonce: 'nonce-1',
      body: '{"cart":[]}',
      secret: 'internal-secret',
    });
    const changed = await signInternalRequest({
      method: 'post',
      pathname: '/api/checkout/session',
      timestamp: '2026-08-02T00:00:00.000Z',
      nonce: 'nonce-2',
      body: '{"cart":[]}',
      secret: 'internal-secret',
    });
    expect(signature).toHaveLength(64);
    expect(changed).not.toBe(signature);
  });
});
