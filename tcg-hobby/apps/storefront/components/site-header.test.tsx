import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getCurrentCustomerSession } from '../lib/auth';
import { getCurrentCustomerCart } from '../lib/cart';
import { SiteHeader } from './site-header';
import { LaunchHeader } from './launch-header';

const mocks = vi.hoisted(() => ({
  getActiveStorefrontBanner: vi.fn(async () => null),
}));

vi.mock('@tcg-hobby/database', () => ({
  getActiveStorefrontBanner: mocks.getActiveStorefrontBanner,
}));

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

vi.mock('../lib/cart', () => ({
  getCurrentCustomerCart: vi.fn(async () => ({
    cartId: null,
    items: [],
    subtotalMinor: 0,
    currency: 'GBP',
    totalItems: 0,
  })),
}));

describe('SiteHeader', () => {
  it('renders the rebuilt storefront header controls', async () => {
    const markup = renderToStaticMarkup(await SiteHeader());

    expect(markup).toContain('aria-label="Open shop menu"');
    expect(markup).toContain('aria-label="Search products"');
    expect(markup).toContain('aria-label="Log in"');
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('aria-label="Cart"');
    expect(markup).toContain('href="/cart"');
    expect(markup).toContain('href="/"');
    expect(markup).toContain('max-w-[108rem]');
    expect(markup).toContain('2xl:max-w-[112rem]');
    expect(markup).toContain('data-storefront-sticky-header="true"');
    expect(markup).toContain('sticky top-0 z-30');
    expect(markup).not.toContain('data-storefront-promotion="true"');
    expect(markup.indexOf('aria-label="Search products"')).toBeLessThan(markup.indexOf('aria-label="Log in"'));
    expect(markup.indexOf('aria-label="Log in"')).toBeLessThan(markup.indexOf('aria-label="Cart"'));
  });

  it('shows the basket count when cart items exist', async () => {
    vi.mocked(getCurrentCustomerCart).mockResolvedValueOnce({
      cartId: null,
      items: [],
      subtotalMinor: 0,
      currency: 'GBP',
      totalItems: 3,
    } as never);

    const markup = renderToStaticMarkup(await SiteHeader());

    expect(markup).toContain('aria-label="Cart, 3 items"');
    expect(markup).toContain('>3</span>');
  });

  it('links logged-in customers to the account area', async () => {
    vi.mocked(getCurrentCustomerSession).mockResolvedValueOnce({
      user: { role: 'CUSTOMER', name: 'Sam', email: 'sam@tcghobby.test' },
    } as never);

    const markup = renderToStaticMarkup(await SiteHeader());

    expect(markup).toContain('aria-label="Account"');
    expect(markup).toContain('href="/account"');
  });

  it('renders configured promotional banner label, icon, copy and internal CTA', async () => {
    mocks.getActiveStorefrontBanner.mockResolvedValueOnce({
      id: 'banner-1',
      label: 'Delivery',
      icon: 'DELIVERY',
      message: 'Free standard delivery on orders over £50',
      ctaLabel: 'Shop all',
      ctaHref: '/shop',
    } as never);

    const markup = renderToStaticMarkup(await SiteHeader());

    expect(markup).toContain('Delivery');
    expect(markup).toContain('Free standard delivery on orders over £50');
    expect(markup).toContain('href="/shop"');
    expect(markup).toContain('Shop all');
    expect(markup).toContain('data-storefront-promotion="true"');
  });
});

describe('LaunchHeader', () => {
  it('renders only launch controls', () => {
    const markup = renderToStaticMarkup(<LaunchHeader />);

    expect(markup).toContain('Join launch list');
    expect(markup).toContain('href="/#join-launch-list"');
    expect(markup).not.toContain('aria-label="Cart"');
    expect(markup).not.toContain('aria-label="Search products"');
    expect(markup).not.toContain('aria-label="Open shop menu"');
  });
});
