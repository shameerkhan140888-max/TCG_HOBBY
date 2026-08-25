import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildIronSprueCancellationEmail,
  buildIronSprueCustomerRequestEmail,
  buildIronSprueDispatchEmail,
  buildIronSprueOrderConfirmationEmail,
  defaultIronSprueEmailLogoUrl,
  type IronSprueEmailOrderItem,
  type IronSprueEmailOrder,
  type IronSprueEmailTemplateConfig,
} from './iron-sprue-email-templates.js';
import {
  claimIronSprueTransactionalEmail,
  markIronSprueTransactionalEmailFailed,
  markIronSprueTransactionalEmailSent,
  sendIronSprueCancellationEmail,
  sendIronSprueCustomerRequestAcknowledgementEmail,
  sendIronSprueDispatchEmail,
  sendIronSprueOrderConfirmationEmail,
} from './iron-sprue-transactional-email.js';

type TestOrder = IronSprueEmailOrder & {
  id: string;
  storeCode: string;
  status: string;
  cancelledAt: Date | null;
  fulfilledAt: Date | null;
  updatedAt: Date;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  returns: NonNullable<IronSprueEmailOrder['returns']>;
  items: Array<IronSprueEmailOrderItem & {
    id: string;
    orderId: string;
    productId: string;
    createdAt: Date;
  }>;
};

function sampleOrder(overrides: Partial<TestOrder> = {}): TestOrder {
  return {
    id: 'order-1',
    storeCode: 'IRON_SPRUE',
    orderNumber: 'IS-20260814-TEST',
    status: 'PAID',
    paymentStatus: 'SUCCEEDED',
    fulfilmentStatus: 'PENDING',
    subtotalMinor: 1999,
    shippingMinor: 299,
    taxMinor: 383,
    totalMinor: 2298,
    currency: 'GBP',
    shippingMethodName: 'Standard delivery',
    shippingFullName: 'Preview Customer',
    shippingEmail: 'customer@example.test',
    shippingLine1: '4-6 Greatorex Street',
    shippingLine2: null,
    shippingCity: 'London',
    shippingRegion: null,
    shippingPostalCode: 'E1 5NF',
    shippingCountry: 'GB',
    paidAt: new Date('2026-08-14T12:03:00Z'),
    cancelledAt: null,
    fulfilledAt: null,
    dispatchedAt: null,
    trackingCarrier: null,
    trackingNumber: null,
    trackingUrl: null,
    returns: [],
    createdAt: new Date('2026-08-14T12:00:00Z'),
    updatedAt: new Date('2026-08-14T12:00:00Z'),
    stripeCheckoutSessionId: 'cs_test_123',
    stripePaymentIntentId: 'pi_test_123',
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        productId: 'product-1',
        productName: 'Toyota 2000GT Red',
        productSlug: 'aoshima-05628-toyota-2000gt-red',
        productSku: 'IS-AOS-05628',
        quantity: 1,
        unitPriceMinor: 1999,
        totalMinor: 1999,
        imageUrl: 'https://media.example.test/toyota.png',
        imageAlt: 'Toyota 2000GT Red catalogue image',
        createdAt: new Date('2026-08-14T12:00:00Z'),
      },
    ],
    ...overrides,
  };
}

function lastEmailPayload() {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  if (!call) throw new Error('Expected Resend request.');
  return JSON.parse(String(call[1]?.body));
}

function createDb(order = sampleOrder(), deliveryStatus = 'PENDING', claimCount = 1) {
  return {
    ironSprueOrder: {
      findFirst: vi.fn().mockResolvedValue(order),
    },
    ironSprueTransactionalEmailDelivery: {
      upsert: vi.fn().mockResolvedValue({ id: 'delivery-1', status: deliveryStatus }),
      updateMany: vi.fn().mockResolvedValue({ count: claimCount }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('Iron Sprue transactional email delivery claims', () => {
  it('claims a pending email with a deterministic Iron Sprue provider key', async () => {
    const db = createDb();
    await expect(claimIronSprueTransactionalEmail('order-1', 'ORDER_CONFIRMATION', db as never)).resolves.toEqual({
      outcome: 'claimed',
      deliveryId: 'delivery-1',
      idempotencyKey: 'iron-sprue-order:order-1:order_confirmation',
    });
    expect(db.ironSprueTransactionalEmailDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SENDING', attempts: { increment: 1 } }),
    }));
  });

  it('does not claim email that is already sent or actively processing', async () => {
    const sentDb = createDb(sampleOrder(), 'SENT');
    await expect(claimIronSprueTransactionalEmail('order-1', 'ORDER_CONFIRMATION', sentDb as never))
      .resolves.toMatchObject({ outcome: 'sent' });
    expect(sentDb.ironSprueTransactionalEmailDelivery.updateMany).not.toHaveBeenCalled();

    const busyDb = createDb(sampleOrder(), 'SENDING', 0);
    await expect(claimIronSprueTransactionalEmail('order-1', 'ORDER_CONFIRMATION', busyDb as never))
      .resolves.toMatchObject({ outcome: 'in_progress' });
  });

  it('records provider success and bounded failure codes', async () => {
    const db = createDb();
    await markIronSprueTransactionalEmailSent('delivery-1', 'resend-1', db as never);
    expect(db.ironSprueTransactionalEmailDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SENT', providerMessageId: 'resend-1' }),
    }));

    await markIronSprueTransactionalEmailFailed('delivery-1', 'X'.repeat(150), db as never);
    expect(db.ironSprueTransactionalEmailDelivery.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { status: 'FAILED', lastErrorCode: 'X'.repeat(100) },
    }));
  });
});

describe('Iron Sprue transactional email sending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubEnv('IRON_SPRUE_RESEND_API_KEY', 'resend_iron_sprue_test');
    vi.stubEnv('IRON_SPRUE_EMAIL_FROM', 'Iron Sprue <orders@example.test>');
    vi.stubEnv('IRON_SPRUE_EMAIL_REPLY_TO', 'support@example.test');
    vi.stubEnv('IRON_SPRUE_SUPPORT_EMAIL', 'support@example.test');
    vi.stubEnv('IRON_SPRUE_SITE_URL', 'https://ironsprue.example.test');
    vi.stubEnv('RESEND_API_KEY', 'tcg_resend_should_not_be_used');
    vi.stubEnv('ORDER_EMAIL_FROM', 'TCG Hobby <orders@tcg.example.test>');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'resend-1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends a paid Iron Sprue order confirmation once with Iron Sprue branding', async () => {
    const db = createDb();
    await expect(sendIronSprueOrderConfirmationEmail('order-1', db as never))
      .resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });

    expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer resend_iron_sprue_test',
        'Idempotency-Key': 'iron-sprue-order:order-1:order_confirmation',
      }),
    }));
    const body = lastEmailPayload();
    expect(body.from).toBe('Iron Sprue <orders@example.test>');
    expect(body.html).toContain('Iron Sprue');
    expect(body.html).toContain('VAT No. 525 2040 33');
    expect(body.html).toContain('VAT included');
    expect(body.html).toContain('https://ironsprue.example.test/brand/iron-sprue-horizontal-email.png');
    expect(body.html).toContain('https://media.example.test/toyota.png');
    expect(body.html).toContain('Shop more kits');
    expect(body.html).toContain('https://ironsprue.example.test/shop');
    expect(body.html).not.toContain('View order');
    expect(body.html).not.toContain('TCG Hobby');
    expect(db.ironSprueTransactionalEmailDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SENT' }),
    }));
  });

  it('does not send confirmations for unpaid orders or already-sent deliveries', async () => {
    const unpaidDb = createDb(sampleOrder({ status: 'PENDING_PAYMENT', paymentStatus: 'REQUIRES_PAYMENT' }));
    await expect(sendIronSprueOrderConfirmationEmail('order-1', unpaidDb as never))
      .resolves.toEqual({ outcome: 'not_payable' });
    expect(fetch).not.toHaveBeenCalled();

    const sentDb = createDb(sampleOrder(), 'SENT');
    await expect(sendIronSprueOrderConfirmationEmail('order-1', sentDb as never))
      .resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails closed when Iron Sprue provider config is missing even if TCG email config exists', async () => {
    vi.stubEnv('IRON_SPRUE_RESEND_API_KEY', '');
    vi.stubEnv('IRON_SPRUE_EMAIL_FROM', '');
    const db = createDb();

    await expect(sendIronSprueOrderConfirmationEmail('order-1', db as never))
      .resolves.toEqual({ outcome: 'provider_unconfigured' });
    expect(fetch).not.toHaveBeenCalled();
    expect(db.ironSprueTransactionalEmailDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FAILED', lastErrorCode: 'PROVIDER_UNCONFIGURED' }),
    }));
  });

  it('sends paid refund and no-payment cancellation emails with truthful wording', async () => {
    const refundedDb = createDb(sampleOrder({
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      fulfilmentStatus: 'CANCELLED',
      cancelledAt: new Date('2026-08-14T13:00:00Z'),
    }));
    await expect(sendIronSprueCancellationEmail('order-1', refundedDb as never))
      .resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });
    let body = lastEmailPayload();
    expect(body.subject).toContain('cancelled and refunded');
    expect(body.html).toContain('Refund amount');
    expect(body.html).toContain('Cancelled');
    expect(body.html).not.toContain('Pending');

    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: 'resend-2' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    const noPaymentDb = createDb(sampleOrder({
      status: 'CANCELLED',
      paymentStatus: 'CANCELED',
      fulfilmentStatus: 'CANCELLED',
      cancelledAt: new Date('2026-08-14T13:00:00Z'),
    }));
    await expect(sendIronSprueCancellationEmail('order-1', noPaymentDb as never))
      .resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });
    body = lastEmailPayload();
    expect(body.subject).toContain('Order cancelled');
    expect(body.html).toContain('No payment was taken');
    expect(body.html).toContain('https://ironsprue.example.test/brand/iron-sprue-horizontal-email.png');
    expect(body.html).not.toContain('Refund amount');
    expect(body.html).not.toContain('TCG Hobby');
  });

  it('renders cancelled fulfilment status for a refunded order that was not dispatched', async () => {
    const staleFulfilmentDb = createDb(sampleOrder({
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      fulfilmentStatus: 'PENDING',
      cancelledAt: new Date('2026-08-14T13:00:00Z'),
    }));

    await expect(sendIronSprueCancellationEmail('order-1', staleFulfilmentDb as never))
      .resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });

    const body = lastEmailPayload();
    expect(body.subject).toContain('cancelled and refunded');
    expect(body.html).toContain('Fulfilment status');
    expect(body.html).toContain('Cancelled');
    expect(body.html).not.toContain('Pending');
  });

  it('renders returned fulfilment status when a dispatched refunded order has sellable stock replenished', async () => {
    const returnedDb = createDb(sampleOrder({
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      fulfilmentStatus: 'SHIPPED',
      dispatchedAt: new Date('2026-08-15T10:00:00Z'),
      trackingCarrier: 'Royal Mail',
      trackingNumber: 'ISPREVIEW123GB',
      cancelledAt: new Date('2026-08-17T13:00:00Z'),
      returns: [
        {
          restock: true,
          lines: [{ quantity: 1, restock: true }],
        },
      ],
    }));

    await expect(sendIronSprueCancellationEmail('order-1', returnedDb as never))
      .resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });

    const body = lastEmailPayload();
    expect(body.subject).toContain('cancelled and refunded');
    expect(body.html).toContain('Fulfilment status');
    expect(body.html).toContain('Returned');
    expect(body.html).not.toContain('Pending');
  });

  it('renders refunded fulfilment status when a dispatched refunded order is not restocked', async () => {
    const refundedDb = createDb(sampleOrder({
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      fulfilmentStatus: 'SHIPPED',
      dispatchedAt: new Date('2026-08-15T10:00:00Z'),
      trackingCarrier: 'Royal Mail',
      trackingNumber: 'ISPREVIEW123GB',
      cancelledAt: new Date('2026-08-17T13:00:00Z'),
      returns: [
        {
          restock: false,
          lines: [{ quantity: 1, restock: false }],
        },
      ],
    }));

    await expect(sendIronSprueCancellationEmail('order-1', refundedDb as never))
      .resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });

    const body = lastEmailPayload();
    expect(body.subject).toContain('cancelled and refunded');
    expect(body.html).toContain('Fulfilment status');
    expect(body.html).toContain('Refunded');
    expect(body.html).not.toContain('Pending');
  });

  it('sends dispatch email with carrier and tracking CTA', async () => {
    const dispatchedDb = createDb(sampleOrder({
      fulfilmentStatus: 'SHIPPED',
      dispatchedAt: new Date('2026-08-15T10:00:00Z'),
      trackingCarrier: 'Royal Mail',
      trackingNumber: 'ISPREVIEW123GB',
      trackingUrl: 'https://www.royalmail.com/track-your-item',
    }));

    await expect(sendIronSprueDispatchEmail('order-1', dispatchedDb as never))
      .resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });
    const body = lastEmailPayload();
    expect(body.html).toContain('Royal Mail');
    expect(body.html).toContain('ISPREVIEW123GB');
    expect(body.html).toContain('Track your order');
    expect(body.html).toContain('https://ironsprue.example.test/brand/iron-sprue-horizontal-email.png');
    expect(body.html).not.toContain('TCG Hobby');
  });

  it('sends customer return and cancellation request acknowledgements once per request', async () => {
    const db = createDb();

    await expect(sendIronSprueCustomerRequestAcknowledgementEmail('order-1', 'request-1', {
      requestType: 'RETURN',
      reason: 'Damaged in transit',
    }, db as never)).resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });

    expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({
        'Idempotency-Key': 'iron-sprue-order:order-1:customer_request_request-1',
      }),
    }));
    const body = lastEmailPayload();
    expect(body.subject).toContain('Return request received');
    expect(body.html).toContain('Damaged in transit');
    expect(body.html).toContain('Please do not send any item back');
    expect(body.html).not.toContain('TCG Hobby');

    vi.clearAllMocks();
    const sentDb = createDb(sampleOrder(), 'SENT');
    await expect(sendIronSprueCustomerRequestAcknowledgementEmail('order-1', 'request-1', {
      requestType: 'CANCELLATION',
      reason: 'Changed my mind',
    }, sentDb as never)).resolves.toEqual({ outcome: 'sent', deliveryId: 'delivery-1' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('records provider failures without throwing into commerce flows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'RATE_LIMITED' }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    })));
    const db = createDb();

    await expect(sendIronSprueOrderConfirmationEmail('order-1', db as never))
      .resolves.toEqual({ outcome: 'failed' });
    expect(db.ironSprueTransactionalEmailDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FAILED', lastErrorCode: 'RATE_LIMITED' }),
    }));
  });
});

describe('Iron Sprue email templates', () => {
  const config: IronSprueEmailTemplateConfig = {
    siteUrl: 'https://ironsprue.example.test',
    supportEmail: 'support@example.test',
  };

  it('renders dispatch without a tracking URL when only carrier and number are available', () => {
    const template = buildIronSprueDispatchEmail({
      ...sampleOrder(),
      fulfilmentStatus: 'SHIPPED',
      trackingCarrier: 'Evri',
      trackingNumber: 'TRACK123',
      trackingUrl: null,
    }, config);
    expect(template.html).toContain('Evri');
    expect(template.html).toContain('TRACK123');
    expect(template.html).not.toContain('Track your order');
  });

  it('resolves persisted relative product images against the Iron Sprue site URL', () => {
    const item: TestOrder['items'][number] = {
      ...sampleOrder().items[0]!,
      imageUrl: '/media/iron-sprue/toyota-red.webp',
    };
    const template = buildIronSprueOrderConfirmationEmail(sampleOrder({
      items: [item],
    }), config);
    expect(template.html).toContain('https://media.ironsprue.co.uk/toyota-red.webp');
  });

  it('uses the deployed Worker host for staging email logos, links and routed product images', () => {
    const item: TestOrder['items'][number] = {
      ...sampleOrder().items[0]!,
      imageUrl: 'https://staging.ironsprue.co.uk/media/iron-sprue/products/is-aos-05628/image-2/toyota-red.webp',
    };
    const template = buildIronSprueOrderConfirmationEmail(sampleOrder({
      items: [item],
    }), {
      siteUrl: 'https://staging.ironsprue.co.uk',
      assetBaseUrl: 'https://staging.ironsprue.co.uk',
      logoUrl: 'https://staging.ironsprue.co.uk/brand/iron-sprue-horizontal-email.png',
      supportEmail: 'support@example.test',
    });

    expect(template.html).toContain('https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev/brand/iron-sprue-horizontal-email.png');
    expect(template.html).toContain('https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev/products/aoshima-05628-toyota-2000gt-red');
    expect(template.html).toContain('https://media.ironsprue.co.uk/products/is-aos-05628/image-2/toyota-red.webp');
    expect(template.html).toContain('https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev/shop');
    expect(template.html).not.toContain('https://staging.ironsprue.co.uk');
  });

  it('keeps persisted public media-host product images on the public media domain', () => {
    const item: TestOrder['items'][number] = {
      ...sampleOrder().items[0]!,
      imageUrl: 'https://media.ironsprue.co.uk/products/is-aos-05628/image-2/toyota-red.webp',
    };
    const template = buildIronSprueOrderConfirmationEmail(sampleOrder({
      items: [item],
    }), config);
    expect(template.html).toContain('https://media.ironsprue.co.uk/products/is-aos-05628/image-2/toyota-red.webp');
    expect(template.html).not.toContain('https://ironsprue.example.test/media/iron-sprue/products/is-aos-05628/image-2/toyota-red.webp');
  });

  it('resolves persisted relative product images against the email media base when provided', () => {
    const item: TestOrder['items'][number] = {
      ...sampleOrder().items[0]!,
      imageUrl: '/media/iron-sprue/toyota-red.webp',
    };
    const template = buildIronSprueOrderConfirmationEmail(sampleOrder({
      items: [item],
    }), {
      ...config,
      siteUrl: 'http://localhost:3004',
      assetBaseUrl: 'https://www.ironsprue.co.uk',
      mediaBaseUrl: 'https://media.ironsprue.example.test',
      logoUrl: null,
    });
    expect(template.html).toContain('https://media.ironsprue.example.test/toyota-red.webp');
    expect(template.html).not.toContain('http://localhost:3004/media/iron-sprue/toyota-red.webp');
  });

  it('uses the www host for apex-domain default email logo assets', () => {
    const template = buildIronSprueOrderConfirmationEmail(sampleOrder(), {
      siteUrl: 'https://ironsprue.co.uk',
      assetBaseUrl: 'https://ironsprue.co.uk',
      logoUrl: defaultIronSprueEmailLogoUrl('https://ironsprue.co.uk'),
      supportEmail: 'support@example.test',
    });

    expect(template.html).toContain('https://www.ironsprue.co.uk/brand/iron-sprue-horizontal-email.png');
    expect(template.html).not.toContain('https://ironsprue.co.uk/brand/iron-sprue-horizontal-email.png');
  });

  it('uses the approved Iron Sprue horizontal logo as the default email brand asset', () => {
    const template = buildIronSprueOrderConfirmationEmail(sampleOrder(), {
      siteUrl: 'https://www.ironsprue.co.uk/',
      supportEmail: 'info@ironsprue.co.uk',
      logoUrl: defaultIronSprueEmailLogoUrl('https://www.ironsprue.co.uk/'),
    });
    expect(template.html).toContain('https://www.ironsprue.co.uk/brand/iron-sprue-horizontal-email.png');
    expect(template.html).toContain('alt="Iron Sprue"');
    expect(template.html).not.toContain('IRON <span');
  });

  it('keeps cancellation language free of internal lifecycle terminology', () => {
    const template = buildIronSprueCancellationEmail(sampleOrder({
      status: 'CANCELLED',
      paymentStatus: 'CANCELED',
      fulfilmentStatus: 'CANCELLED',
      cancelledAt: new Date('2026-08-14T13:00:00Z'),
    }), config, { refunded: false });
    expect(template.text).toContain('No payment was taken');
    expect(template.text).not.toMatch(/reservation|webhook|payment intent|database/i);
  });

  it('keeps customer request acknowledgement language retail-friendly', () => {
    const template = buildIronSprueCustomerRequestEmail(sampleOrder(), config, {
      requestType: 'RETURN',
      reason: 'No longer needed',
    });
    expect(template.subject).toContain('Return request received');
    expect(template.text).toContain('No longer needed');
    expect(template.text).not.toMatch(/reservation|webhook|payment intent|database|stripe/i);
  });
});
