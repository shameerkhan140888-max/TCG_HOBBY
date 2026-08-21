import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('Iron Sprue security headers', () => {
  it('allows only the Stripe endpoints required by the embedded Payment Element', async () => {
    const headers = await nextConfig.headers?.();
    const csp = headers?.[0]?.headers.find((header) => header.key === 'Content-Security-Policy')?.value ?? '';

    expect(csp).toContain('https://js.stripe.com');
    expect(csp).toContain('frame-src https://js.stripe.com https://hooks.stripe.com');
    expect(csp).toContain('connect-src');
    expect(csp).toContain('https://api.stripe.com');
    expect(csp).toContain('frame-ancestors \'none\'');
  });
});
