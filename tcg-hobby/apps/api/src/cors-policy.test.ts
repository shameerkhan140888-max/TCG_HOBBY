import { describe, expect, it } from 'vitest';
import { isCorsOriginAllowed, parseAllowedOrigins, resolveAllowedCorsOrigins } from './cors-policy.js';

describe('API CORS policy', () => {
  it('normalizes configured origins', () => {
    expect(parseAllowedOrigins(' https://ironsprue.co.uk/, https://www.tcg-hobby.co.uk ')).toEqual([
      'https://ironsprue.co.uk',
      'https://www.tcg-hobby.co.uk',
    ]);
  });

  it('fails closed to known production storefronts when production env is not configured', () => {
    const origins = resolveAllowedCorsOrigins(undefined, 'production');

    expect(isCorsOriginAllowed('https://ironsprue.co.uk', origins)).toBe(true);
    expect(isCorsOriginAllowed('https://admin.capitalhobbygroup.co.uk', origins)).toBe(true);
    expect(isCorsOriginAllowed('https://example.invalid', origins)).toBe(false);
  });

  it('preserves permissive local development when no origins are configured', () => {
    const origins = resolveAllowedCorsOrigins(undefined, 'development');

    expect(origins).toEqual([]);
    expect(isCorsOriginAllowed('http://localhost:3000', origins, { allowAnyWhenUnconfigured: true })).toBe(true);
  });

  it('allows server-to-server requests without a browser origin', () => {
    expect(isCorsOriginAllowed(undefined, [])).toBe(true);
  });
});
