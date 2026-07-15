import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ComingSoonPage from './coming-soon/page';
import ContactPage from './contact/page';
import PrivacyPage from './privacy/page';
import TermsPage from './terms/page';

vi.mock('../lib/site', async () => {
  const actual = await vi.importActual<typeof import('../lib/site')>('../lib/site');
  return {
    ...actual,
    getSiteUrl: () => 'https://tcg-hobby.co.uk',
  };
});

vi.mock('../lib/contact-actions', () => ({
  sendContactEnquiryAction: vi.fn(),
}));

vi.mock('../lib/launch-actions', () => ({
  captureLaunchEmailAction: vi.fn(),
}));

vi.mock('../lib/launch-consent', () => ({
  LAUNCH_MARKETING_CONSENT_ERROR: 'Please confirm that you agree to receive launch news and product updates.',
  LAUNCH_MARKETING_CONSENT_VALUE: 'accepted',
}));

describe('legal page launch signup links', () => {
  it('privacy page CTA points to the launch signup anchor', () => {
    const markup = renderToStaticMarkup(<PrivacyPage />);
    const matches = markup.match(/href="\/#join-launch-list"/g) ?? [];

    expect(markup).toContain('href="/#join-launch-list"');
    expect(matches).toHaveLength(1);
  });

  it('terms page CTA points to the launch signup anchor', () => {
    const markup = renderToStaticMarkup(<TermsPage />);
    const matches = markup.match(/href="\/#join-launch-list"/g) ?? [];

    expect(markup).toContain('href="/#join-launch-list"');
    expect(matches).toHaveLength(1);
  });

  it('contact page CTA points to the launch signup anchor', async () => {
    const markup = renderToStaticMarkup(await ContactPage({ searchParams: Promise.resolve({}) }));
    const matches = markup.match(/href="\/#join-launch-list"/g) ?? [];

    expect(markup).toContain('href="/#join-launch-list"');
    expect(matches).toHaveLength(1);
  });

  it('coming soon homepage contains the launch signup anchor once', async () => {
    const markup = renderToStaticMarkup(await ComingSoonPage({ searchParams: Promise.resolve({}) }));
    const matches = markup.match(/id="join-launch-list"/g) ?? [];

    expect(matches).toHaveLength(1);
  });
});
