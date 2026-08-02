import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LaunchEmailCapture } from './launch-email-capture';

vi.mock('../lib/launch-actions', () => ({
  captureLaunchEmailAction: vi.fn(),
}));

vi.mock('../lib/launch-consent', () => ({
  LAUNCH_MARKETING_CONSENT_ERROR: 'Please confirm that you agree to receive launch news and product updates.',
  LAUNCH_MARKETING_CONSENT_VALUE: 'accepted',
}));

describe('LaunchEmailCapture', () => {
  it('renders an unticked required marketing consent checkbox', () => {
    const markup = renderToStaticMarkup(<LaunchEmailCapture source="coming-soon-page" />);

    expect(markup).toContain('name="marketingConsent"');
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain('required=""');
    expect(markup).toContain('value="accepted"');
    expect(markup).not.toContain('checked=""');
    expect(markup).toContain('launch news, product updates and occasional marketing emails');
  });

  it('renders the branded consent validation message from server state', () => {
    const markup = renderToStaticMarkup(<LaunchEmailCapture source="coming-soon-page" error="consent" />);

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('Please confirm that you agree to receive launch news and product updates.');
  });

  it('renders privacy-safe generic success copy', () => {
    const markup = renderToStaticMarkup(<LaunchEmailCapture source="coming-soon-page" saved />);

    expect(markup).toContain('Thanks! If this email address is eligible');
    expect(markup).not.toContain('Please check your inbox for confirmation');
  });

  it('does not render internal save error codes as field messages', () => {
    const markup = renderToStaticMarkup(<LaunchEmailCapture source="coming-soon-page" error="save" />);

    expect(markup).toContain("We couldn&#x27;t complete your signup. Please try again.");
    expect(markup).not.toContain('>save<');
  });
});
