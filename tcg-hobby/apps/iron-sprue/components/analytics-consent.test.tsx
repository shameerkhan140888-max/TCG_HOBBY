import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IronSprueCookieConsentBanner } from './analytics-consent';

describe('Iron Sprue cookie consent banner', () => {
  it('does not render before stored consent has been checked', () => {
    const markup = renderToStaticMarkup(<IronSprueCookieConsentBanner />);

    expect(markup).toBe('');
  });
});
