import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(async () => new Map([['x-forwarded-for', '203.0.113.55']])),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  send: vi.fn(),
  isSignupRateLimited: vi.fn(() => false),
  validateSubscriberEmail: vi.fn((email: string) => {
    const normalized = email.trim().toLowerCase();
    return normalized.includes('@')
      ? { ok: true as const, email: normalized }
      : { ok: false as const, email: normalized, error: 'Enter a valid email address.' };
  }),
}));

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mocks.send,
    },
  })),
}));

vi.mock('@tcg-hobby/database', () => ({
  validateSubscriberEmail: mocks.validateSubscriberEmail,
}));

vi.mock('./signup-rate-limit', () => ({
  isSignupRateLimited: mocks.isSignupRateLimited,
}));

import { sendContactEnquiryAction } from './contact-actions';

function createContactForm(overrides: Partial<Record<'name' | 'email' | 'subject' | 'message' | 'company', string>> = {}) {
  const formData = new FormData();
  formData.set('returnTo', '/contact');
  formData.set('name', overrides.name ?? 'Mia Carter');
  formData.set('email', overrides.email ?? 'mia@example.test');
  formData.set('subject', overrides.subject ?? 'Launch question');
  formData.set('message', overrides.message ?? 'Can you help with launch information?');

  if (overrides.company) {
    formData.set('company', overrides.company);
  }

  return formData;
}

describe('sendContactEnquiryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 'resend-test-key');
    vi.stubEnv('NODE_ENV', 'test');
    mocks.send.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends validated contact enquiries through Resend', async () => {
    await expect(sendContactEnquiryAction(createContactForm())).rejects.toThrow('NEXT_REDIRECT:/contact?contactStatus=sent#contact-form');

    expect(mocks.isSignupRateLimited).toHaveBeenCalledWith('contact:mia@example.test:203.0.113.55');
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'TCG Hobby Website <no-reply@tcg-hobby.co.uk>',
      to: 'info@tcg-hobby.co.uk',
      replyTo: 'mia@example.test',
      subject: 'TCG Hobby contact: Launch question',
      html: expect.stringContaining('Capital Hobby Group Ltd'),
      text: expect.stringContaining('Company Number 17336948'),
    }));
  });

  it('rejects missing or invalid fields without sending', async () => {
    await expect(sendContactEnquiryAction(createContactForm({ email: 'bad-email' }))).rejects.toThrow(
      'NEXT_REDIRECT:/contact?contactStatus=invalid#contact-form',
    );

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('rejects honeypot submissions without sending', async () => {
    await expect(sendContactEnquiryAction(createContactForm({ company: 'bot company' }))).rejects.toThrow(
      'NEXT_REDIRECT:/contact?contactStatus=invalid#contact-form',
    );

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('rate limits contact submissions without sending', async () => {
    mocks.isSignupRateLimited.mockReturnValueOnce(true);

    await expect(sendContactEnquiryAction(createContactForm())).rejects.toThrow('NEXT_REDIRECT:/contact?contactStatus=limited#contact-form');

    expect(mocks.send).not.toHaveBeenCalled();
  });
});
