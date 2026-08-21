import { describe, expect, it } from 'vitest';
import sitemap from './sitemap';

describe('Iron Sprue sitemap', () => {
  it('includes launch customer-information and visible product URLs', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith('/shop'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/about'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/delivery'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/returns'))).toBe(true);
    expect(urls.some((url) => url.includes('/products/'))).toBe(true);
  });
});
