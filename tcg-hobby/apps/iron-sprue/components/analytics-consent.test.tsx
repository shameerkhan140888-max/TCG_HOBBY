import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IronSprueCookieConsentBanner } from './analytics-consent';

describe('Iron Sprue cookie consent banner', () => {
  it('offers a compact path to necessary-only, preferences and optional analytics consent', () => {
    const markup = renderToStaticMarkup(<IronSprueCookieConsentBanner />);

    expect(markup).toContain('Cookie preferences');
    expect(markup).toContain('Necessary only');
    expect(markup).toContain('Manage preferences');
    expect(markup).toContain('Accept analytics');
  });
});
