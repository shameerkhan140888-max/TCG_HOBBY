import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SiteHeaderShell } from './site-header-shell';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('SiteHeaderShell', () => {
  it('renders the rebuilt storefront header controls', () => {
    const markup = renderToStaticMarkup(<SiteHeaderShell authenticated={false} />);

    expect(markup).toContain('aria-label="Open shop menu"');
    expect(markup).toContain('aria-label="Search"');
    expect(markup).toContain('aria-label="Log in"');
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/"');
  });

  it('links logged-in customers to the account area', () => {
    const markup = renderToStaticMarkup(<SiteHeaderShell authenticated={true} />);

    expect(markup).toContain('aria-label="Account"');
    expect(markup).toContain('href="/account"');
  });
});
