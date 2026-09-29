import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('Iron Sprue Cloudflare production headers', () => {
  it('allows the Railway production API and Stripe runtime origins in CSP', async () => {
    const headers = await nextConfig.headers?.();
    const globalHeaders = headers?.find((entry) => entry.source === '/(.*)')?.headers;
    const csp = globalHeaders?.find((header) => header.key === 'Content-Security-Policy')?.value;

    expect(csp).toContain('connect-src');
    expect(csp).toContain('https://considerate-unity-production-b734.up.railway.app');
    expect(csp).toContain('https://api.stripe.com');
    expect(csp).toContain('https://js.stripe.com');
    expect(csp).toContain('https://www.googletagmanager.com');
    expect(csp).toContain('https://www.google-analytics.com');
    expect(csp).toContain("img-src 'self' data: https:");
  });

  it('sets one canonical cache policy for safe public storefront assets', async () => {
    const headers = await nextConfig.headers?.();
    expect(headers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      }),
      expect.objectContaining({
        source: '/assets/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      }),
      expect.objectContaining({
        source: '/brand/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      }),
    ]));
  });
});
