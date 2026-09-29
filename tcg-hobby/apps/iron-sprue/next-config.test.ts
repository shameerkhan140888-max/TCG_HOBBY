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

  it('keeps static asset cache policy out of the dynamic Next header layer', async () => {
    const headers = await nextConfig.headers?.();
    expect(headers?.map((entry) => entry.source)).toEqual(['/(.*)']);
  });
});
