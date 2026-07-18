import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Meta browser tracking', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('emits CompleteRegistration with the shared Meta eventID once', async () => {
    const fbq = vi.fn();
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.stubGlobal('window', { fbq });

    const { trackCompleteRegistrationOnce } = await import('./browser');

    expect(trackCompleteRegistrationOnce({ eventId: 'launch_signup_event_123' })).toBe(true);
    expect(trackCompleteRegistrationOnce({ eventId: 'launch_signup_event_123' })).toBe(false);

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith('track', 'CompleteRegistration', {}, { eventID: 'launch_signup_event_123' });
    expect(consoleInfo).toHaveBeenCalledWith('meta_complete_registration_browser_handoff_created', {
      event: 'meta_complete_registration_browser_handoff_created',
      eventName: 'CompleteRegistration',
      eventId: 'launch_signup_event_123',
    });
  });
});
