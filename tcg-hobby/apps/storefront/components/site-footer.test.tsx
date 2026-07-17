import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SiteFooter } from './site-footer';

const mocks = vi.hoisted(() => ({
  socialLinks: [] as Array<{ label: 'Facebook' | 'Instagram' | 'TikTok'; href: string }>,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../lib/site', () => ({
  getSiteSocialLinks: () => mocks.socialLinks,
}));

vi.mock('../lib/launch-actions', () => ({
  captureLaunchEmailAction: vi.fn(),
}));

vi.mock('../lib/launch-consent', () => ({
  LAUNCH_MARKETING_CONSENT_ERROR: 'Please confirm that you agree to receive launch news and product updates.',
  LAUNCH_MARKETING_CONSENT_VALUE: 'accepted',
}));

describe('SiteFooter', () => {
  beforeEach(() => {
    mocks.socialLinks = [];
  });

  it('renders one compact newsletter signup and the legal links', () => {
    const markup = renderToStaticMarkup(<SiteFooter />);
    const newsletterIndex = markup.indexOf('id="newsletter"');
    const footerIndex = markup.indexOf('<footer');
    const newsletterCloseIndex = markup.indexOf('</section>');
    const titleIndex = markup.indexOf('Join the newsletter');
    const consentIndex = markup.indexOf('name="marketingConsent"');
    const firstNameIndex = markup.indexOf('name="firstName"');
    const emailIndex = markup.indexOf('name="email"');
    const submitIndex = markup.indexOf('Be first to know');

    expect(markup.match(/id="newsletter"/g)).toHaveLength(1);
    expect(markup).toContain('Join the newsletter');
    expect(markup).toContain('Release alerts and product updates.');
    expect(markup).toContain('name="marketingConsent"');
    expect(markup).toContain('required=""');
    expect(markup).toContain('First name (optional)');
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="/terms"');
    expect(markup).toContain('href="/contact"');
    expect(markup).toContain('href="/delivery-returns"');
    expect(markup).toContain('href="/faq"');
    expect(markup).toContain('href="/about"');
    expect(markup).toContain('About Us');
    expect(markup).toContain('aria-label="Legal links"');
    expect(markup).toContain('aria-label="Help links"');
    expect(markup).toContain('Capital Hobby Group Ltd');
    expect(markup).toContain('Trading as TCG Hobby');
    expect(markup).toContain('Company Number 17336948');
    expect(markup).toContain('Registered Office:</span> 4-6 Greatorex Street, London, United Kingdom, E1 5NF');
    expect(titleIndex).toBeGreaterThan(newsletterIndex);
    expect(footerIndex).toBeGreaterThan(newsletterIndex);
    expect(newsletterCloseIndex).toBeLessThan(footerIndex);
    expect(consentIndex).toBeGreaterThan(titleIndex);
    expect(firstNameIndex).toBeGreaterThan(consentIndex);
    expect(emailIndex).toBeGreaterThan(firstNameIndex);
    expect(submitIndex).toBeGreaterThan(emailIndex);
  });

  it('hides the social column when no social URLs are configured', () => {
    const markup = renderToStaticMarkup(<SiteFooter />);

    expect(markup).not.toContain('Social links will appear here when configured');
    expect(markup).not.toContain('aria-label="Social links"');
  });

  it('renders configured Facebook, Instagram and TikTok links only', () => {
    mocks.socialLinks = [
      { label: 'Facebook', href: 'https://www.facebook.com/tcghobby' },
      { label: 'Instagram', href: 'https://instagram.com/tcghobby' },
      { label: 'TikTok', href: 'https://www.tiktok.com/@tcghobby' },
    ];

    const markup = renderToStaticMarkup(<SiteFooter />);

    expect(markup).toContain('aria-label="Social links"');
    expect(markup).toContain('Follow TCG Hobby on Facebook');
    expect(markup).toContain('Instagram');
    expect(markup).toContain('TikTok');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });
});
