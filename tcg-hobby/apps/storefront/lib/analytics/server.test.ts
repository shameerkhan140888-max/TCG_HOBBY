import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendMetaConversionsApiEvent, trackCompleteRegistrationServer } from './server';

describe('Meta Conversions API server tracking', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not send when the server token or enable flag is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendMetaConversionsApiEvent({ data: [] })).resolves.toEqual({ sent: false, reason: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends CompleteRegistration with matching server event_id and hashed email', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN', 'server-token');
    vi.stubEnv('META_CONVERSIONS_API_ENABLED', 'true');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE', 'TEST123');

    await expect(trackCompleteRegistrationServer({
      eventId: 'event-123',
      email: 'Collector@Example.Test',
      userAgent: 'Vitest',
      eventSourceUrl: 'https://tcg-hobby.co.uk/',
    })).resolves.toEqual({ sent: true });

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [, init] = firstCall as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(body.data[0]).toMatchObject({
      event_name: 'CompleteRegistration',
      event_id: 'event-123',
      action_source: 'website',
      event_source_url: 'https://tcg-hobby.co.uk/',
    });
    expect(body.data[0].user_data.em[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(body.data[0].user_data.em[0]).not.toBe('Collector@Example.Test');
    expect(body.data[0].user_data.client_user_agent).toBe('Vitest');
    expect(body.test_event_code).toBe('TEST123');
    expect(body.access_token).toBe('server-token');
  });

  it('returns safely when Meta is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN', 'server-token');
    vi.stubEnv('META_CONVERSIONS_API_ENABLED', 'true');

    await expect(trackCompleteRegistrationServer({
      eventId: 'event-123',
      email: 'collector@example.test',
    })).resolves.toEqual({ sent: false, reason: 'meta_error', status: 500 });
  });
});
