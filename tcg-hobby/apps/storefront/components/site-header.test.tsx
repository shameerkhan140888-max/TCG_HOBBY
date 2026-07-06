import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getCurrentCustomerSession } from '../lib/auth';
import { SiteHeader } from './site-header';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../lib/auth', () => ({
  getCurrentCustomerSession: vi.fn(async () => null),
}));

describe('SiteHeader', () => {
  it('renders the rebuilt storefront header controls', async () => {
    const markup = renderToStaticMarkup(await SiteHeader());

    expect(markup).toContain('aria-label="Open shop menu"');
    expect(markup).toContain('aria-label="Search"');
    expect(markup).toContain('aria-label="Log in"');
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/"');
  });

  it('links logged-in customers to the account area', async () => {
    vi.mocked(getCurrentCustomerSession).mockResolvedValueOnce({
      user: { role: 'CUSTOMER', name: 'Sam', email: 'sam@tcghobby.test' },
    } as never);

    const markup = renderToStaticMarkup(await SiteHeader());

    expect(markup).toContain('aria-label="Account"');
    expect(markup).toContain('href="/account"');
  });
});
