import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

describe('development email previews', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is unavailable in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await GET(new Request('https://tcg-hobby.co.uk/api/dev/email-preview?template=order'));
    expect(response.status).toBe(404);
  });

  it('renders documented order and signup scenarios without sending email', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://tcg-hobby.co.uk');
    const order = await GET(new Request('http://localhost/api/dev/email-preview?template=order&scenario=missing-image'));
    expect(order.status).toBe(200);
    await expect(order.text()).resolves.toContain('Product image unavailable');

    const signup = await GET(new Request('http://localhost/api/dev/email-preview?template=signup'));
    const signupHtml = await signup.text();
    expect(signupHtml).toContain('Welcome to TCG Hobby');
    expect(signupHtml).toContain('https://tcg-hobby.co.uk');
  });
});
