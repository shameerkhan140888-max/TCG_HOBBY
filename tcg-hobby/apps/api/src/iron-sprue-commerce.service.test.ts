import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { IronSprueCommerceService } from './iron-sprue-commerce.service.js';

const databaseMocks = vi.hoisted(() => ({
  addIronSprueProductToCart: vi.fn(),
  cancelIronSprueCheckoutSession: vi.fn(),
  cancelIronSpruePaymentIntentCheckout: vi.fn(),
  clearIronSprueCart: vi.fn(),
  createIronSpruePaymentIntentCheckout: vi.fn(),
  createIronSprueHostedCheckoutSession: vi.fn(),
  getIronSprueAvailableShippingMethods: vi.fn(),
  getIronSprueCustomerCartDetails: vi.fn(),
  getIronSprueCustomerOrderByNumber: vi.fn(),
  getIronSprueCustomerOrders: vi.fn(),
  getIronSprueOrderByStripeCheckoutSessionId: vi.fn(),
  getIronSprueOrderByStripePaymentIntentId: vi.fn(),
  reconcileIronSpruePaymentIntentCheckout: vi.fn(),
  removeIronSprueCartItem: vi.fn(),
  resolveIronSprueGuestCart: vi.fn(),
  sendIronSprueOrderConfirmationEmail: vi.fn(),
  updateIronSprueCartItemQuantity: vi.fn(),
}));

vi.mock('@tcg-hobby/database', () => databaseMocks);

function signedInternalHeaders(input: { method: string; pathname: string; query?: string; body?: string }) {
  const timestamp = new Date().toISOString();
  const bodyDigest = createHash('sha256').update(input.body ?? '').digest('hex');
  const values = {
    keyId: 'test-key',
    method: input.method.toUpperCase(),
    pathname: input.pathname,
    query: input.query?.replace(/^\?/, '') ?? '',
    bodyDigest,
    timestamp,
    nonce: 'test-nonce',
    store: 'IRON_SPRUE',
    environment: 'staging',
  };
  const canonical = [
    values.keyId,
    values.method,
    values.pathname,
    values.query,
    values.bodyDigest,
    values.timestamp,
    values.nonce,
    values.store,
    values.environment,
  ].join('\n');
  return {
    'x-iron-sprue-internal-method': values.method,
    'x-iron-sprue-internal-pathname': values.pathname,
    'x-iron-sprue-internal-query': values.query,
    'x-iron-sprue-internal-body-sha256': values.bodyDigest,
    'x-iron-sprue-internal-timestamp': values.timestamp,
    'x-iron-sprue-internal-nonce': values.nonce,
    'x-iron-sprue-internal-store': values.store,
    'x-iron-sprue-internal-environment': values.environment,
    'x-iron-sprue-internal-key-id': values.keyId,
    'x-iron-sprue-internal-signature': createHmac('sha256', 'test-secret').update(canonical).digest('hex'),
  };
}

const order = {
  id: 'order-1',
  orderNumber: 'IS-TEST-1',
  paymentStatus: 'SUCCEEDED',
  fulfilmentStatus: 'PENDING',
  currency: 'GBP',
  subtotalMinor: 1999,
  shippingMinor: 299,
  taxMinor: 383,
  discountMinor: 0,
  discountCode: null,
  totalMinor: 2298,
  createdAt: new Date('2026-08-22T12:00:00.000Z'),
  shippingMethodName: 'Standard delivery',
  shippingFullName: 'Iron Sprue Customer',
  shippingEmail: 'customer@example.com',
  shippingLine1: '1 Workshop Road',
  shippingLine2: null,
  shippingCity: 'Dewsbury',
  shippingRegion: null,
  shippingPostalCode: 'WF13 3EW',
  shippingCountry: 'GB',
  trackingCarrier: null,
  trackingNumber: null,
  trackingUrl: null,
  items: [
    {
      productId: 'product-1',
      productName: 'Toyota 2000GT Red',
      sku: 'IS-AOS-05628',
      quantity: 1,
      unitPriceMinor: 1999,
      totalMinor: 1999,
    },
  ],
};

describe('IronSprueCommerceService payment status reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IRON_SPRUE_INTERNAL_API_KEY_ID = 'test-key';
    process.env.IRON_SPRUE_INTERNAL_API_SECRET = 'test-secret';
    process.env.IRON_SPRUE_ENVIRONMENT = 'staging';
    databaseMocks.sendIronSprueOrderConfirmationEmail.mockResolvedValue({ outcome: 'sent', id: 'email-1' });
  });

  it('sends the idempotent confirmation email when payment-status polling reconciles a succeeded order', async () => {
    databaseMocks.reconcileIronSpruePaymentIntentCheckout.mockResolvedValue(order);
    const service = new IronSprueCommerceService({} as never);

    const result = await service.checkoutPaymentStatus(
      signedInternalHeaders({ method: 'GET', pathname: '/api/checkout/payment-status/pi_succeeded' }),
      'pi_succeeded',
    );

    expect(result.orderNumber).toBe('IS-TEST-1');
    expect(databaseMocks.sendIronSprueOrderConfirmationEmail).toHaveBeenCalledWith('order-1');
  });

  it('rewrites Iron Sprue media-host URLs in basket payloads to the storefront media route', () => {
    const service = new IronSprueCommerceService({} as never);

    const result = service.toPublicBasket({
      items: [{
        id: 'line-1',
        productId: 'product-1',
        productName: 'Pagani Zonda F',
        productSlug: 'aoshima-05603-pagani-zonda-f',
        quantity: 1,
        unitPriceMinor: 4999,
        totalMinor: 4999,
        inStock: true,
        availableQuantity: 1,
        freeUkStandardShipping: false,
        imageUrl: 'https://media.ironsprue.co.uk/products/is-aos-05603/image-2/pagani.png',
        imageAlt: 'Pagani Zonda F catalogue primary',
      }],
      subtotalMinor: 4999,
      currency: 'GBP',
      totalItems: 1,
    });

    expect(result.items[0]?.imageUrl).toBe('/media/iron-sprue/products/is-aos-05603/image-2/pagani.png');
    expect(result.items[0]?.image?.url).toBe('/media/iron-sprue/products/is-aos-05603/image-2/pagani.png');
  });

  it('keeps already-routed Iron Sprue media URLs same-origin in basket payloads', () => {
    const service = new IronSprueCommerceService({} as never);

    const result = service.toPublicBasket({
      items: [{
        id: 'line-1',
        productId: 'product-1',
        productName: 'Pagani Zonda F',
        productSlug: 'aoshima-05603-pagani-zonda-f',
        quantity: 1,
        unitPriceMinor: 4999,
        totalMinor: 4999,
        inStock: true,
        availableQuantity: 1,
        freeUkStandardShipping: false,
        imageUrl: 'https://staging.ironsprue.co.uk/media/iron-sprue/products/is-aos-05603/image-2/pagani.png',
        imageAlt: 'Pagani Zonda F catalogue primary',
      }],
      subtotalMinor: 4999,
      currency: 'GBP',
      totalItems: 1,
    });

    expect(result.items[0]?.imageUrl).toBe('/media/iron-sprue/products/is-aos-05603/image-2/pagani.png');
    expect(result.items[0]?.image?.url).toBe('/media/iron-sprue/products/is-aos-05603/image-2/pagani.png');
  });

  it('does not send a confirmation email for non-succeeded payment states', async () => {
    databaseMocks.reconcileIronSpruePaymentIntentCheckout.mockResolvedValue({
      ...order,
      paymentStatus: 'REQUIRES_PAYMENT',
    });
    const service = new IronSprueCommerceService({} as never);

    await service.checkoutPaymentStatus(
      signedInternalHeaders({ method: 'GET', pathname: '/api/checkout/payment-status/pi_pending' }),
      'pi_pending',
    );

    expect(databaseMocks.sendIronSprueOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  it('rejects tampered internal proxy signatures before touching checkout data', async () => {
    const service = new IronSprueCommerceService({} as never);
    const headers = signedInternalHeaders({ method: 'GET', pathname: '/api/checkout/payment-status/pi_succeeded' });

    await expect(service.checkoutPaymentStatus({ ...headers, 'x-iron-sprue-internal-pathname': '/api/checkout/payment-status/pi_other' }, 'pi_succeeded'))
      .rejects.toThrow('Iron Sprue commerce proxy authentication failed.');

    expect(databaseMocks.reconcileIronSpruePaymentIntentCheckout).not.toHaveBeenCalled();
  });
});
