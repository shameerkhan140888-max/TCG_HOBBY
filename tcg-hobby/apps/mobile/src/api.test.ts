import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ NativeModules: { SourceCode: { scriptURL: 'http://127.0.0.1:8081/index.bundle' } } }));

import { ApiError, apiRequest } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('mobile API client', () => {
  it('retries one idempotent GET after a network failure', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', request);

    await expect(apiRequest('/v1/health')).resolves.toEqual({ status: 'ok' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('never retries a mutation automatically', async () => {
    const request = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', request);

    await expect(apiRequest('/v1/basket/items', { method: 'POST', body: '{}' })).rejects.toMatchObject({ code: 'NETWORK' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('maps safe server errors without exposing response internals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'UNAUTHORISED', message: 'Sign in to continue.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })));
    await expect(apiRequest('/v1/account')).rejects.toEqual(new ApiError('UNAUTHORISED', 'Sign in to continue.', 401));
  });
});
