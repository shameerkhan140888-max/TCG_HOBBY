import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'route.ts'), 'utf8');

describe('Iron Sprue Cloudflare Stripe webhook route', () => {
  it('forwards to the Railway API without importing local database or Stripe processors', () => {
    expect(source).toContain('/api/stripe/iron-sprue/webhook');
    expect(source).toContain('IRON_SPRUE_PRODUCTION_API_BASE_URL');
    expect(source).not.toContain('@capital-hobby/database');
    expect(source).not.toContain('@capital-hobby/database/storefront');
    expect(source).not.toContain("from 'stripe'");
    expect(source).not.toContain('node:fs');
    expect(source).not.toContain('node:path');
  });
});
