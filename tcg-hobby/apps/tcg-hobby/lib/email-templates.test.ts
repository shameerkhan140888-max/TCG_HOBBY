import type { OrderWithItems } from '@tcg-hobby/database/storefront';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOrderConfirmationEmail, buildSignupEmail, getTransactionalEmailLogoUrl } from './email-templates';

function orderFixture(overrides: Record<string, unknown> = {}): OrderWithItems {
  return {
    id: 'order-1',
    orderNumber: 'TCG-20260730-ABC123',
    userId: null,
    status: 'PAID',
    paymentStatus: 'SUCCEEDED',
    fulfilmentStatus: 'PENDING',
    currency: 'GBP',
    subtotalMinor: 4999,
    shippingMinor: 0,
    taxMinor: 833,
    totalMinor: 4999,
    shippingMethodName: 'Standard delivery',
    shippingFullName: 'Sam Collector',
    shippingEmail: 'sam@example.test',
    shippingLine1: '14 Aurora Street',
    shippingLine2: null,
    shippingCity: 'Bristol',
    shippingRegion: null,
    shippingPostalCode: 'BS1 4TR',
    shippingCountry: 'GB',
    createdAt: new Date('2026-07-30T10:00:00Z'),
    items: [{
      id: 'item-1',
      productId: 'product-1',
      productName: 'Mega Greninja ex Premium Collection',
      productSlug: 'mega-greninja',
      quantity: 1,
      unitPriceMinor: 4999,
      totalMinor: 4999,
      imageUrl: '/products/mega-greninja/primary.webp',
      imageAlt: 'Mega Greninja ex Premium Collection box',
    }],
    shippingAddress: null,
    itemCount: 1,
    ...overrides,
  } as unknown as OrderWithItems;
}

function logoMarkup(html: string) {
  const match = html.match(/<img src="([^"]+)" width="168" height="54" alt="TCG Hobby"[^>]*>/);
  expect(match).toBeTruthy();
  return { markup: match?.[0] ?? '', url: match?.[1] ?? '' };
}

describe('transactional email templates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the branded signup email with plain text and unsubscribe details', () => {
    const email = buildSignupEmail({
      email: 'sam@example.test',
      firstName: 'Sam',
      unsubscribeToken: 'safe-token',
      siteUrl: 'https://tcg-hobby.co.uk',
    });
    expect(email.subject).toBe('Welcome to TCG Hobby');
    expect(email.html).toContain('Company number 17336948');
    expect(email.html).toContain('VAT No. 525 2040 33');
    expect(email.html).toContain('unsubscribe?token=safe-token');
    expect(email.text).toContain('Contact: info@tcg-hobby.co.uk');
    expect(email.text).not.toContain('<table');
    expect(email.html).not.toContain('localhost');
  });

  it('renders paid order products, totals, delivery details and absolute images', () => {
    const email = buildOrderConfirmationEmail(orderFixture(), 'https://tcg-hobby.co.uk');
    expect(email.subject).toContain('TCG-20260730-ABC123');
    expect(email.html).toContain('https://tcg-hobby.co.uk/products/mega-greninja/primary.webp');
    expect(email.html).toContain('Mega Greninja ex Premium Collection');
    expect(email.html).toContain('Total paid');
    expect(email.html).toContain('£49.99');
    expect(email.html).toContain('14 Aurora Street');
    expect(email.html).not.toContain('View order details');
    expect(email.text).toContain('Payment status: Paid');
    expect(email.text).toContain('VAT No. 525 2040 33');
  });

  it('shows a safe image fallback and only gives account orders an account link', () => {
    const item = { ...orderFixture().items[0], imageUrl: null, imageAlt: null };
    const email = buildOrderConfirmationEmail(orderFixture({
      userId: 'user-1',
      items: [item],
    }), 'https://tcg-hobby.co.uk');
    expect(email.html).toContain('Product image unavailable');
    expect(email.html).toContain('/account/orders/TCG-20260730-ABC123');
  });

  it('uses one public HTTPS PNG logo in signup and order emails', () => {
    vi.stubEnv('TCG_HOBBY_EMAIL_ASSET_BASE_URL', 'https://media.tcg-hobby.co.uk/email');

    const signup = buildSignupEmail({
      email: 'sam@example.test',
      firstName: 'Sam',
      unsubscribeToken: 'safe-token',
      siteUrl: 'http://localhost:3000',
    });
    const order = buildOrderConfirmationEmail(orderFixture(), 'http://localhost:3000');
    const signupLogo = logoMarkup(signup.html);
    const orderLogo = logoMarkup(order.html);

    expect(signupLogo.url).toBe('https://media.tcg-hobby.co.uk/email/brand/tcg-hobby-horizontal-dark.png');
    expect(orderLogo.url).toBe(signupLogo.url);
    expect(signupLogo.url).not.toContain('localhost');
    expect(signupLogo.url).not.toMatch(/^\/|\.svg(?:$|\?)/);
    expect(signupLogo.markup).toContain('alt="TCG Hobby"');
    expect(signupLogo.markup).toContain('width="168"');
    expect(signupLogo.markup).toContain('height="54"');
    expect(orderLogo.markup).toContain('alt="TCG Hobby"');
  });

  it('falls back to the production PNG logo when local URLs are supplied', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');

    expect(getTransactionalEmailLogoUrl('http://localhost:3000')).toBe(
      'https://www.tcg-hobby.co.uk/brand/tcg-hobby-horizontal-dark.png',
    );
  });

  it('uses the canonical storefront host to avoid logo redirects', () => {
    expect(getTransactionalEmailLogoUrl('https://tcg-hobby.co.uk')).toBe(
      'https://www.tcg-hobby.co.uk/brand/tcg-hobby-horizontal-dark.png',
    );
  });

  it('rejects localhost email asset URLs in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TCG_HOBBY_EMAIL_ASSET_BASE_URL', 'http://localhost:3000');

    expect(() => getTransactionalEmailLogoUrl('https://tcg-hobby.co.uk')).toThrow(
      'TCG_HOBBY_EMAIL_ASSET_BASE_URL must be a public HTTPS URL',
    );
  });

  it('keeps plain-text email versions free of logo markup', () => {
    const signup = buildSignupEmail({
      email: 'sam@example.test',
      firstName: 'Sam',
      unsubscribeToken: 'safe-token',
      siteUrl: 'https://tcg-hobby.co.uk',
    });
    const order = buildOrderConfirmationEmail(orderFixture(), 'https://tcg-hobby.co.uk');

    expect(signup.text).not.toContain('tcg-hobby-horizontal-dark.png');
    expect(signup.text).not.toContain('<img');
    expect(order.text).not.toContain('tcg-hobby-horizontal-dark.png');
    expect(order.text).not.toContain('<img');
  });
});
