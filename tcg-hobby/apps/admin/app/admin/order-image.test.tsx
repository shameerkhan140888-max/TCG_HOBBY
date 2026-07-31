import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOrder: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not-found');
  },
}));
vi.mock('@tcg-hobby/database', () => ({
  getAdminOrderByNumber: mocks.getOrder,
}));

import AdminOrderDetailPage from './orders/[orderNumber]/page';

describe('Admin order product image', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
  });

  it('renders a contained order thumbnail and the approved missing-image fallback', async () => {
    mocks.getOrder.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'TCG-ORDER-1',
      paymentStatus: 'SUCCEEDED',
      fulfilmentStatus: 'PENDING',
      totalMinor: 798,
      subtotalMinor: 499,
      shippingMinor: 299,
      taxMinor: 83,
      customerName: 'Test Collector',
      customerEmail: 'collector@example.test',
      shippingAddress: null,
      items: [
        {
          id: 'item-1',
          productName: 'Pitch Black Booster Pack',
          productSlug: 'pitch-black-booster-pack',
          quantity: 1,
          unitPriceMinor: 499,
          totalMinor: 499,
          imageUrl: 'https://media.example.test/pitch-black-card.webp',
          imageAlt: 'Pitch Black Booster Pack packaging',
        },
        {
          id: 'item-2',
          productName: 'Card Sleeves',
          productSlug: 'card-sleeves',
          quantity: 1,
          unitPriceMinor: 299,
          totalMinor: 299,
          imageUrl: null,
          imageAlt: null,
        },
      ],
    });

    const markup = renderToStaticMarkup(await AdminOrderDetailPage({
      params: Promise.resolve({ orderNumber: 'TCG-ORDER-1' }),
    }));
    expect(markup).toContain('https://media.example.test/pitch-black-card.webp');
    expect(markup).toContain('alt="Pitch Black Booster Pack packaging"');
    expect(markup).toContain('object-contain');
    expect(markup).toContain('Product image unavailable');
  });
});
