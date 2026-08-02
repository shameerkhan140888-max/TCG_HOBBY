import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not-found');
  },
}));
vi.mock('../components/site-header', () => ({
  SiteHeader: () => <header>Storefront Header</header>,
}));
vi.mock('../components/payment-status-refresher', () => ({
  PaymentStatusRefresher: () => null,
}));
vi.mock('../lib/orders', () => ({
  getCurrentCustomerOrder: vi.fn(async () => mocks.order),
  getOrderForStripeReturn: vi.fn(async () => mocks.order),
}));

import AccountOrderDetailPage from './account/orders/[orderNumber]/page';
import CheckoutSuccessPage from './checkout/success/page';

function orderFixture(imageUrl: string | null) {
  return {
    id: 'order-1',
    orderNumber: 'TCG-ORDER-1',
    userId: 'user-1',
    status: 'PAID',
    paymentStatus: 'SUCCEEDED',
    fulfilmentStatus: 'PENDING',
    stripeCheckoutSessionId: 'cs_test_1',
    currency: 'GBP',
    subtotalMinor: 499,
    shippingMinor: 299,
    taxMinor: 83,
    totalMinor: 798,
    items: [{
      id: 'item-1',
      productId: 'product-1',
      productName: 'Pitch Black Booster Pack',
      productSlug: 'pitch-black-booster-pack',
      quantity: 1,
      unitPriceMinor: 499,
      totalMinor: 499,
      imageUrl,
      imageAlt: imageUrl ? 'Pitch Black Booster Pack packaging' : null,
    }],
    shippingAddress: {
      id: 'address-1',
      fullName: 'Test Collector',
      email: 'collector@example.test',
      line1: '1 Test Street',
      line2: null,
      city: 'London',
      region: null,
      postalCode: 'E1 5NF',
      country: 'GB',
    },
  };
}

describe('order product images', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
    mocks.order = orderFixture('https://media.example.test/pitch-black-card.webp');
  });

  it('renders the resolved order snapshot on the success and account detail pages', async () => {
    const success = renderToStaticMarkup(await CheckoutSuccessPage({
      searchParams: Promise.resolve({ session_id: 'cs_test_1' }),
    }));
    const account = renderToStaticMarkup(await AccountOrderDetailPage({
      params: Promise.resolve({ orderNumber: 'TCG-ORDER-1' }),
    }));

    for (const markup of [success, account]) {
      expect(markup).toContain('https://media.example.test/pitch-black-card.webp');
      expect(markup).toContain('alt="Pitch Black Booster Pack packaging"');
      expect(markup).toContain('object-contain');
    }
  });

  it('renders the approved placeholder when an order has no resolvable image', async () => {
    mocks.order = orderFixture(null);
    const markup = renderToStaticMarkup(await AccountOrderDetailPage({
      params: Promise.resolve({ orderNumber: 'TCG-ORDER-1' }),
    }));
    expect(markup).toContain('Product image unavailable');
    expect(markup).not.toContain('src=""');
  });
});
