import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(async () => new Map([['x-forwarded-for', '203.0.113.10'], ['x-vercel-id', 'lhr1::request-123']])),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  sendSubscriberConfirmationEmail: vi.fn(),
  upsertMarketingSubscriberSignup: vi.fn(),
  validateSubscriberEmail: vi.fn((email: string) => {
    const normalized = email.trim().toLowerCase();
    return normalized.includes('@')
      ? { ok: true as const, email: normalized }
      : { ok: false as const, email: normalized, error: 'Enter a valid email address.' };
  }),
  isSignupRateLimited: vi.fn(() => false),
}));

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@tcg-hobby/database', () => ({
  upsertMarketingSubscriberSignup: mocks.upsertMarketingSubscriberSignup,
  validateSubscriberEmail: mocks.validateSubscriberEmail,
}));

vi.mock('./marketing-email', () => ({
  sendSubscriberConfirmationEmail: mocks.sendSubscriberConfirmationEmail,
}));

vi.mock('./signup-rate-limit', () => ({
  isSignupRateLimited: mocks.isSignupRateLimited,
}));

import { LAUNCH_MARKETING_CONSENT_VALUE } from './launch-consent';
import { captureLaunchEmailAction } from './launch-actions';

function createSignupForm(consentValue?: string) {
  const formData = new FormData();
  formData.set('email', 'Collector@Example.Test');
  formData.set('firstName', 'Mia');
  formData.set('source', 'coming-soon-page');
  formData.set('returnTo', '/');

  if (typeof consentValue === 'string') {
    formData.set('marketingConsent', consentValue);
  }

  return formData;
}

describe('captureLaunchEmailAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsertMarketingSubscriberSignup.mockResolvedValue({
      subscriberId: 'subscriber-1',
      email: 'collector@example.test',
      firstName: 'Mia',
      created: true,
      shouldSendConfirmation: true,
      unsubscribeToken: 'token-1',
    });
  });

  it('rejects missing marketing consent before persistence or confirmation email', async () => {
    await expect(captureLaunchEmailAction(createSignupForm())).rejects.toThrow('NEXT_REDIRECT:/?subscriberSignup=consent#join-launch-list');

    expect(mocks.upsertMarketingSubscriberSignup).not.toHaveBeenCalled();
    expect(mocks.sendSubscriberConfirmationEmail).not.toHaveBeenCalled();
  });

  it.each(['false', 'on', 'yes'])('rejects malformed marketing consent value %s', async (value) => {
    await expect(captureLaunchEmailAction(createSignupForm(value))).rejects.toThrow('NEXT_REDIRECT:/?subscriberSignup=consent#join-launch-list');

    expect(mocks.upsertMarketingSubscriberSignup).not.toHaveBeenCalled();
    expect(mocks.sendSubscriberConfirmationEmail).not.toHaveBeenCalled();
  });

  it('creates an eligible consented subscriber and sends confirmation email', async () => {
    await expect(captureLaunchEmailAction(createSignupForm(LAUNCH_MARKETING_CONSENT_VALUE))).rejects.toThrow(
      'NEXT_REDIRECT:/?subscriberSignup=saved#join-launch-list',
    );

    expect(mocks.upsertMarketingSubscriberSignup).toHaveBeenCalledWith({
      email: 'collector@example.test',
      firstName: 'Mia',
      marketingConsent: true,
      source: 'coming-soon-page',
      consentSource: 'coming-soon-page',
      consentIp: '203.0.113.10',
    });
    expect(mocks.sendSubscriberConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({
      subscriberId: 'subscriber-1',
      email: 'collector@example.test',
      shouldSendConfirmation: true,
    }));
  });

  it('returns the same generic success path for active duplicates without a second email', async () => {
    mocks.upsertMarketingSubscriberSignup.mockResolvedValueOnce({
      subscriberId: 'subscriber-1',
      email: 'collector@example.test',
      firstName: 'Mia',
      created: false,
      shouldSendConfirmation: false,
      unsubscribeToken: 'token-1',
    });

    await expect(captureLaunchEmailAction(createSignupForm(LAUNCH_MARKETING_CONSENT_VALUE))).rejects.toThrow(
      'NEXT_REDIRECT:/?subscriberSignup=saved#join-launch-list',
    );

    expect(mocks.upsertMarketingSubscriberSignup).toHaveBeenCalledTimes(1);
    expect(mocks.sendSubscriberConfirmationEmail).not.toHaveBeenCalled();
  });

  it.each(['unsubscribed', 'suppressed', 'bounced'])('returns generic success for %s duplicate records without email', async () => {
    mocks.upsertMarketingSubscriberSignup.mockResolvedValueOnce({
      subscriberId: 'subscriber-1',
      email: 'collector@example.test',
      firstName: null,
      created: false,
      shouldSendConfirmation: false,
      unsubscribeToken: 'token-1',
    });

    await expect(captureLaunchEmailAction(createSignupForm(LAUNCH_MARKETING_CONSENT_VALUE))).rejects.toThrow(
      'NEXT_REDIRECT:/?subscriberSignup=saved#join-launch-list',
    );

    expect(mocks.sendSubscriberConfirmationEmail).not.toHaveBeenCalled();
  });

  it('keeps the honeypot path quiet without writing subscriber data', async () => {
    const formData = createSignupForm();
    formData.set('company', 'bot company');

    await expect(captureLaunchEmailAction(formData)).rejects.toThrow('NEXT_REDIRECT:/?subscriberSignup=spam#join-launch-list');

    expect(mocks.upsertMarketingSubscriberSignup).not.toHaveBeenCalled();
    expect(mocks.sendSubscriberConfirmationEmail).not.toHaveBeenCalled();
  });

  it('rejects invalid email safely without subscriber persistence or email', async () => {
    const formData = createSignupForm(LAUNCH_MARKETING_CONSENT_VALUE);
    formData.set('email', 'not-an-email');

    await expect(captureLaunchEmailAction(formData)).rejects.toThrow('NEXT_REDIRECT:/?subscriberSignup=invalid#join-launch-list');

    expect(mocks.upsertMarketingSubscriberSignup).not.toHaveBeenCalled();
    expect(mocks.sendSubscriberConfirmationEmail).not.toHaveBeenCalled();
  });

  it('returns success when the subscriber is saved but the confirmation email fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.sendSubscriberConfirmationEmail.mockRejectedValueOnce(new Error('Resend unavailable'));

    await expect(captureLaunchEmailAction(createSignupForm(LAUNCH_MARKETING_CONSENT_VALUE))).rejects.toThrow(
      'NEXT_REDIRECT:/?subscriberSignup=saved#join-launch-list',
    );

    expect(mocks.upsertMarketingSubscriberSignup).toHaveBeenCalledTimes(1);
    expect(mocks.sendSubscriberConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith('Launch confirmation email failed after subscriber persistence.', {
      subscriberId: 'subscriber-1',
    });

    consoleError.mockRestore();
  });

  it('returns the save failure path only when subscriber persistence fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.upsertMarketingSubscriberSignup.mockRejectedValueOnce(new Error('Database unavailable'));

    await expect(captureLaunchEmailAction(createSignupForm(LAUNCH_MARKETING_CONSENT_VALUE))).rejects.toThrow(
      'NEXT_REDIRECT:/?subscriberSignup=save#join-launch-list',
    );

    expect(mocks.sendSubscriberConfirmationEmail).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'launch_signup_persistence_failed',
      expect.objectContaining({
        event: 'launch_signup_persistence_failed',
        request: { correlationId: 'lhr1::request-123' },
        operation: expect.objectContaining({
          name: 'upsertMarketingSubscriberSignup',
          stage: 'before_persistence_confirmed',
          model: 'MarketingSubscriber',
        }),
        error: expect.objectContaining({
          name: 'Error',
        }),
      }),
    );

    const loggedPayload = JSON.stringify(consoleError.mock.calls);
    expect(loggedPayload).not.toContain('Collector@Example.Test');
    expect(loggedPayload).not.toContain('collector@example.test');
    expect(loggedPayload).not.toContain('Mia');

    consoleError.mockRestore();
  });

  it('logs safe Prisma diagnostics when subscriber persistence fails with a known request error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const prismaError = Object.assign(new Error('Unique constraint failed'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: {
        modelName: 'MarketingSubscriber',
        target: ['email'],
      },
    });
    mocks.upsertMarketingSubscriberSignup.mockRejectedValueOnce(prismaError);

    await expect(captureLaunchEmailAction(createSignupForm(LAUNCH_MARKETING_CONSENT_VALUE))).rejects.toThrow(
      'NEXT_REDIRECT:/?subscriberSignup=save#join-launch-list',
    );

    expect(mocks.sendSubscriberConfirmationEmail).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'launch_signup_persistence_failed',
      expect.objectContaining({
        database: expect.objectContaining({
          provider: expect.any(String),
        }),
        operation: expect.objectContaining({
          model: 'MarketingSubscriber',
        }),
        error: {
          name: 'PrismaClientKnownRequestError',
          code: 'P2002',
          clientVersion: '6.19.3',
          target: ['email'],
        },
      }),
    );

    const loggedPayload = JSON.stringify(consoleError.mock.calls);
    expect(loggedPayload).not.toContain('Collector@Example.Test');
    expect(loggedPayload).not.toContain('collector@example.test');
    expect(loggedPayload).not.toContain('Mia');

    consoleError.mockRestore();
  });
});
