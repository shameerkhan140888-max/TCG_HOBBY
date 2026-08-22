import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const internalHeaders = {
  'x-iron-sprue-internal-store': 'IRON_SPRUE',
  'x-iron-sprue-internal-key-id': 'test-key',
};

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
    databaseMocks.sendIronSprueOrderConfirmationEmail.mockResolvedValue({ outcome: 'sent', id: 'email-1' });
  });

  it('sends the idempotent confirmation email when payment-status polling reconciles a succeeded order', async () => {
    databaseMocks.reconcileIronSpruePaymentIntentCheckout.mockResolvedValue(order);
    const service = new IronSprueCommerceService({} as never);

    const result = await service.checkoutPaymentStatus(internalHeaders, 'pi_succeeded');

    expect(result.orderNumber).toBe('IS-TEST-1');
    expect(databaseMocks.sendIronSprueOrderConfirmationEmail).toHaveBeenCalledWith('order-1');
  });

  it('does not send a confirmation email for non-succeeded payment states', async () => {
    databaseMocks.reconcileIronSpruePaymentIntentCheckout.mockResolvedValue({
      ...order,
      paymentStatus: 'REQUIRES_PAYMENT',
    });
    const service = new IronSprueCommerceService({} as never);

    await service.checkoutPaymentStatus(internalHeaders, 'pi_pending');

    expect(databaseMocks.sendIronSprueOrderConfirmationEmail).not.toHaveBeenCalled();
  });
});
