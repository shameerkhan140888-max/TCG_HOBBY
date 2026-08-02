import type { OrderWithItems } from '@tcg-hobby/database/storefront';
import { buildOrderConfirmationEmail, buildSignupEmail } from '../../../../lib/email-templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function previewOrder(scenario: string): OrderWithItems {
  const missingImage = scenario === 'missing-image';
  const multiple = scenario === 'multiple';
  const longName = scenario === 'long-name';
  const baseItem = {
    id: 'preview-item-1',
    productId: 'preview-product-1',
    productName: longName
      ? 'Pokemon TCG: A Deliberately Long Premium Collection Product Name for Responsive Email Review'
      : 'Pokemon TCG: Preview Booster Bundle',
    productSlug: 'preview-booster-bundle',
    quantity: 1,
    unitPriceMinor: 499,
    totalMinor: 499,
    imageUrl: missingImage ? null : '/products/pokemon/mega-greninja-ex-premium-collection/primary.webp',
    imageAlt: missingImage ? null : 'Preview product packaging',
  };
  const items = multiple
    ? [
        baseItem,
        {
          ...baseItem,
          id: 'preview-item-2',
          productId: 'preview-product-2',
          productName: 'Collector Card Sleeves',
          productSlug: 'collector-card-sleeves',
          quantity: 2,
          unitPriceMinor: 399,
          totalMinor: 798,
          imageUrl: null,
          imageAlt: null,
        },
      ]
    : [baseItem];
  const subtotalMinor = items.reduce((total, item) => total + item.totalMinor, 0);

  return {
    id: 'preview-order',
    orderNumber: 'TCG-PREVIEW-1001',
    userId: scenario === 'guest' ? null : 'preview-user',
    status: 'PAID',
    paymentStatus: 'SUCCEEDED',
    fulfilmentStatus: 'PENDING',
    paymentProvider: 'stripe',
    paymentIntentId: 'pi_preview',
    stripeCheckoutSessionId: 'cs_preview',
    stripeCheckoutUrl: null,
    subtotalMinor,
    shippingMinor: 299,
    taxMinor: 0,
    totalMinor: subtotalMinor + 299,
    currency: 'GBP',
    shippingMethodCode: 'UK_STANDARD',
    shippingMethodName: 'Standard delivery',
    shippingMethodAmountMinor: 299,
    shippingFullName: 'Preview Collector',
    shippingEmail: 'preview@example.test',
    shippingLine1: '1 Preview Street',
    shippingLine2: null,
    shippingCity: 'London',
    shippingRegion: null,
    shippingPostalCode: 'E1 1AA',
    shippingCountry: 'United Kingdom',
    reservationExpiresAt: null,
    paidAt: new Date('2026-07-30T10:00:00.000Z'),
    fulfilledAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-07-30T09:55:00.000Z'),
    updatedAt: new Date('2026-07-30T10:00:00.000Z'),
    items,
    shippingAddress: {
      id: 'preview-address',
      fullName: 'Preview Collector',
      email: 'preview@example.test',
      line1: '1 Preview Street',
      line2: null,
      city: 'London',
      region: null,
      postalCode: 'E1 1AA',
      country: 'United Kingdom',
    },
  };
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(request.url);
  const template = url.searchParams.get('template') ?? 'order';
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const message = template === 'signup'
    ? buildSignupEmail({
        email: 'preview@example.test',
        firstName: 'Preview',
        unsubscribeToken: 'preview-token',
        siteUrl,
      })
    : buildOrderConfirmationEmail(previewOrder(url.searchParams.get('scenario') ?? 'default'), siteUrl);

  return new Response(message.html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
