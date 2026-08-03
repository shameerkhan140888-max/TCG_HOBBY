import { describe, expect, it } from 'vitest';
import { buildSignupEmail, normalizeLaunchListEmail, safeSiteUrl, validateLaunchListSignup } from './launch-list';

describe('Iron Sprue launch-list helpers', () => {
  it('normalises email and requires explicit consent', () => {
    expect(normalizeLaunchListEmail('  TEST@Example.COM ')).toBe('test@example.com');
    expect(validateLaunchListSignup({ email: 'test@example.com', consent: false })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(validateLaunchListSignup({ email: 'test@example.com', consent: true })).toMatchObject({
      ok: true,
      email: 'test@example.com',
    });
  });

  it('accepts honeypot submissions without recording them', () => {
    expect(validateLaunchListSignup({ email: 'bot@example.com', consent: true, website: 'https://spam.example' })).toMatchObject({
      ok: false,
      bot: true,
      status: 202,
    });
  });

  it('builds an unsubscribe email without exposing the subscriber email in the URL', () => {
    const email = buildSignupEmail({ siteUrl: 'https://www.ironsprue.co.uk', unsubscribeToken: 'opaque-token' });
    expect(email.subject).toContain('Iron Sprue');
    expect(email.text).toContain('/unsubscribe/opaque-token');
    expect(email.text).not.toContain('@example.com');
  });

  it('rejects unsafe public site URLs', () => {
    expect(safeSiteUrl('https://www.ironsprue.co.uk/path')).toBe('https://www.ironsprue.co.uk');
    expect(() => safeSiteUrl('http://localhost:3000')).toThrow(/public HTTPS/);
  });
});
