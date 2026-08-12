import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  existingRows: [] as Array<{ id: string; status: string }>,
  updateRows: [{ id: 'subscriber_1' }] as Array<{ id: string }>,
  calls: [] as Array<{ text: string; values: unknown[] }>,
  sql: vi.fn(),
  neon: vi.fn(),
}));

vi.mock('@neondatabase/serverless', () => ({
  neon: mockState.neon,
}));

import { onRequestPost } from './api/launch-list';
import { onRequestGet } from './unsubscribe/[[token]]';

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    IRON_SPRUE_DATABASE_URL: 'postgresql://iron-sprue-dev.example/launch',
    IRON_SPRUE_RESEND_API_KEY: 'test_resend_key',
    IRON_SPRUE_EMAIL_FROM: 'Iron Sprue <launch@ironsprue.co.uk>',
    IRON_SPRUE_SUPPORT_EMAIL: 'info@ironsprue.co.uk',
    IRON_SPRUE_SITE_URL: 'https://www.ironsprue.co.uk',
    DATABASE_URL: 'postgresql://tcg.example/storefront',
    TCG_HOBBY_DATABASE_URL: 'postgresql://tcg.example/storefront',
    ...overrides,
  };
}

function signupRequest(body: unknown) {
  return new Request('https://www.ironsprue.co.uk/api/launch-list', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function signupFormRequest(body: Record<string, string>) {
  return new Request('https://www.ironsprue.co.uk/api/launch-list', {
    method: 'POST',
    body: new URLSearchParams(body),
  });
}

beforeEach(() => {
  mockState.existingRows = [];
  mockState.updateRows = [{ id: 'subscriber_1' }];
  mockState.calls = [];
  mockState.sql = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join(' ');
    mockState.calls.push({ text, values });
    if (/select id, status/i.test(text)) return mockState.existingRows;
    if (/insert into iron_sprue_launch_subscribers/i.test(text)) return [{ id: 'subscriber_1' }];
    if (/update iron_sprue_launch_subscribers/i.test(text)) return mockState.updateRows;
    return [];
  });
  mockState.neon.mockReset();
  mockState.neon.mockReturnValue(mockState.sql);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'resend_123' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })));
});

describe('Iron Sprue launch-list Pages Functions', () => {
  it('records a consented signup and sends one Resend confirmation', async () => {
    const response = await onRequestPost({
      request: signupRequest({ email: ' Test@Example.com ', consent: true }),
      env: env(),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, duplicate: false });
    expect(mockState.neon).toHaveBeenCalledWith('postgresql://iron-sprue-dev.example/launch');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockState.calls.some(({ text }) => /email_status = 'SENT'/i.test(text))).toBe(true);
  });

  it('records consent from the storefront form post shape', async () => {
    const response = await onRequestPost({
      request: signupFormRequest({ email: 'forms@example.com', consent: 'on' }),
      env: env(),
    });

    expect(response.status).toBe(200);
    expect(mockState.neon).toHaveBeenCalledWith('postgresql://iron-sprue-dev.example/launch');
    expect(mockState.calls.some(({ text }) => /insert into iron_sprue_launch_subscribers/i.test(text))).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects signup without affirmative marketing consent', async () => {
    const response = await onRequestPost({
      request: signupRequest({ email: 'test@example.com' }),
      env: env(),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ message: expect.stringMatching(/consent/i) });
    expect(mockState.neon).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns duplicate success without sending another email', async () => {
    mockState.existingRows = [{ id: 'subscriber_1', status: 'ACTIVE' }];

    const response = await onRequestPost({
      request: signupRequest({ email: 'test@example.com', consent: true }),
      env: env(),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, duplicate: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(mockState.calls.some(({ text }) => /insert into iron_sprue_launch_subscribers/i.test(text))).toBe(false);
  });

  it('records provider failure as retryable without reporting success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'sender rejected' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })));

    const response = await onRequestPost({
      request: signupRequest({ email: 'test@example.com', consent: true }),
      env: env(),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ message: 'Signup is temporarily unavailable.' });
    expect(mockState.calls.some(({ text }) => /email_status = 'FAILED'/i.test(text))).toBe(true);
  });

  it('fails closed if the Iron Sprue URL matches a TCG Hobby database URL', async () => {
    const response = await onRequestPost({
      request: signupRequest({ email: 'test@example.com', consent: true }),
      env: env({ IRON_SPRUE_DATABASE_URL: 'postgresql://tcg.example/storefront' }),
    });

    expect(response.status).toBe(503);
    expect(mockState.neon).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts honeypot submissions without database or email calls', async () => {
    const response = await onRequestPost({
      request: signupRequest({ email: 'bot@example.com', consent: true, website: 'spam' }),
      env: env(),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(mockState.neon).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('unsubscribes by opaque token hash without exposing the email address', async () => {
    const response = await onRequestGet({
      params: { token: 'a'.repeat(64) },
      env: env(),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('You have been unsubscribed');
    expect(mockState.calls.some(({ text }) => /status = 'UNSUBSCRIBED'/i.test(text))).toBe(true);
    expect(mockState.calls.flatMap(({ values }) => values).some((value) => String(value).includes('@'))).toBe(false);
  });
});
