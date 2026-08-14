import { describe, expect, it, beforeEach } from 'vitest';
import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  assertPasswordAttemptAllowed,
  createAccessCookieValue,
  isAccessExemptPath,
  resetPasswordAttemptLimitForTests,
  storefrontAccessMode,
  verifyAccessCookieValue,
  verifyStagingPassword,
} from './staging-access';

describe('Iron Sprue staging access', () => {
  beforeEach(() => resetPasswordAttemptLimitForTests());

  it('defaults to public mode and only switches protected explicitly', () => {
    expect(storefrontAccessMode({})).toBe('public');
    expect(storefrontAccessMode({ STOREFRONT_ACCESS_MODE: 'public' })).toBe('public');
    expect(storefrontAccessMode({ STOREFRONT_ACCESS_MODE: 'protected' })).toBe('protected');
  });

  it('validates a server-side password secret without exposing it to client code', async () => {
    await expect(verifyStagingPassword('bench-pass', { IRON_SPRUE_STAGING_PASSWORD: 'bench-pass' })).resolves.toBe(true);
    await expect(verifyStagingPassword('wrong', { IRON_SPRUE_STAGING_PASSWORD: 'bench-pass' })).resolves.toBe(false);
  });

  it('creates signed cookies, rejects tampering and rejects expiry', async () => {
    const env = { IRON_SPRUE_STAGING_ACCESS_SECRET: 'rotation-secret' };
    const now = Date.UTC(2026, 7, 2);
    const cookie = await createAccessCookieValue(env, now);

    await expect(verifyAccessCookieValue(cookie, env, now + 1000)).resolves.toBe(true);
    await expect(verifyAccessCookieValue(`${cookie}x`, env, now + 1000)).resolves.toBe(false);
    await expect(verifyAccessCookieValue(cookie, env, now + ACCESS_COOKIE_MAX_AGE_SECONDS * 1000 + 1)).resolves.toBe(false);
  });

  it('uses explicit exemptions only', () => {
    expect(isAccessExemptPath('/access')).toBe(true);
    expect(isAccessExemptPath('/api/staging-access')).toBe(true);
    expect(isAccessExemptPath('/brand/iron-sprue-horizontal.svg')).toBe(true);
    expect(isAccessExemptPath('/api/stripe/webhook')).toBe(true);
    expect(isAccessExemptPath('/api/stripe/iron-sprue/webhook')).toBe(true);
    expect(isAccessExemptPath('/api/cart')).toBe(false);
    expect(isAccessExemptPath('/shop')).toBe(false);
  });

  it('rate limits repeated failed attempts by key', () => {
    for (let index = 0; index < 8; index += 1) {
      expect(() => assertPasswordAttemptAllowed('127.0.0.1', 1000)).not.toThrow();
    }
    expect(() => assertPasswordAttemptAllowed('127.0.0.1', 1000)).toThrow('Too many attempts.');
  });
});
