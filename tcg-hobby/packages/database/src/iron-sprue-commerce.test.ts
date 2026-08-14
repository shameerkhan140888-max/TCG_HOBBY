import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildIronSprueStripeMetadata,
  cancelIronSprueCheckoutSession,
  cancelIronSprueOrderForMerchant,
  createIronSprueHostedCheckoutSession,
  generateIronSprueOrderNumber,
  processIronSprueStripeWebhookEvent,
  reconcileIronSprueReservedStock,
  releaseIronSprueCheckoutOrderReservation,
  resolveIronSprueGuestCart,
} from './iron-sprue-commerce';

function stripeEvent(type: Stripe.Event.Type, object: Record<string, unknown>, id = 'evt_iron_1') {
  return {
    id,
    object: 'event',
    type,
    livemode: false,
    data: { object },
  } as unknown as Stripe.Event;
}

function setStripeEnv() {
  process.env.COMMERCE_ENVIRONMENT = 'test';
  process.env.IRON_SPRUE_STRIPE_ACCOUNT_ID = 'acct_iron';
  process.env.IRON_SPRUE_STRIPE_TEST_SECRET_KEY = 'sk_test_iron';
  process.env.IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET = 'whsec_iron';
  process.env.IRON_SPRUE_STRIPE_STATEMENT_DESCRIPTOR = 'IRON SPRUE';
  process.env.IRON_SPRUE_STRIPE_PUBLIC_BUSINESS_NAME = 'Iron Sprue';
  process.env.IRON_SPRUE_CHECKOUT_SUCCESS_URL = 'https://iron-sprue.example/checkout/success';
  process.env.IRON_SPRUE_CHECKOUT_CANCEL_URL = 'https://iron-sprue.example/checkout/cancel';
}

function databaseMock() {
  const order = {
    id: 'order-1',
    storeCode: 'IRON_SPRUE',
    totalMinor: 5298,
    currency: 'GBP',
    paymentStatus: 'REQUIRES_PAYMENT',
    items: [{
      id: 'item-1',
      productId: 'product-1',
      productName: 'Toyota 2000GT Red',
      productSlug: 'toyota-2000gt-red',
      productSku: 'IS-AOS-05628',
      quantity: 1,
      unitPriceMinor: 4999,
      totalMinor: 4999,
      imageUrl: null,
      imageAlt: null,
      imageStorageKey: null,
    }],
  };
  return {
    ironSprueStripeWebhookEvent: {
      create: vi.fn().mockResolvedValue({
        stripeEventId: 'evt_iron_1',
        processedAt: null,
        orderId: null,
      }),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    ironSprueOrder: {
      findUnique: vi.fn().mockResolvedValue(order),
      update: vi.fn().mockResolvedValue({
        ...order,
        orderNumber: 'IS-20260812-ABC123',
        userId: null,
        status: 'PAID',
        paymentStatus: 'SUCCEEDED',
        fulfilmentStatus: 'PENDING',
        paymentProvider: 'STRIPE',
        paymentIntentId: 'pi_iron_1',
        stripeCheckoutSessionId: 'cs_iron_1',
        stripeCheckoutUrl: 'https://checkout.stripe.com/c/pay/cs_iron_1',
        subtotalMinor: 4999,
        shippingMinor: 299,
        taxMinor: 833,
        totalMinor: 5298,
        currency: 'GBP',
        shippingMethodCode: 'UK_STANDARD',
        shippingMethodName: 'Standard delivery',
        shippingMethodAmountMinor: 299,
        shippingFullName: 'Test Customer',
        shippingEmail: 'test@example.com',
        shippingLine1: '1 Test Street',
        shippingLine2: null,
        shippingCity: 'London',
        shippingRegion: null,
        shippingPostalCode: 'E1 5NF',
        shippingCountry: 'GB',
        reservationExpiresAt: null,
        paidAt: new Date(),
        fulfilledAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    ironSprueAdminInventory: {
      findUnique: vi.fn().mockResolvedValue({ productId: 'product-1', availableStock: 5, reservedStock: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
    ironSprueAdminStockMovement: {
      create: vi.fn().mockResolvedValue({}),
    },
    ironSprueCartItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn(async (callback) => callback(databaseMockTx)),
  } as any;
}

const databaseMockTx: any = {};

describe('Iron Sprue Stripe commerce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStripeEnv();
  });

  it('generates Iron Sprue order numbers and Stripe metadata with store scope', () => {
    expect(generateIronSprueOrderNumber(new Date('2026-08-12T00:00:00Z'), 'ABC123')).toBe('IS-20260812-ABC123');
    expect(buildIronSprueStripeMetadata({
      orderId: 'order-1',
      orderNumber: 'IS-20260812-ABC123',
      checkoutAttemptId: 'attempt-1',
    })).toEqual({
      store: 'IRON_SPRUE',
      commerceStore: 'IRON_SPRUE',
      orderId: 'order-1',
      orderNumber: 'IS-20260812-ABC123',
      checkoutAttemptId: 'attempt-1',
    });
  });

  it('ignores a successful session for the wrong store before finalising inventory', async () => {
    const db = databaseMock();
    await expect(processIronSprueStripeWebhookEvent(stripeEvent('checkout.session.completed', {
      id: 'cs_iron_1',
      payment_status: 'paid',
      payment_intent: 'pi_iron_1',
      amount_total: 5298,
      currency: 'gbp',
      metadata: { store: 'TCG_HOBBY', orderId: 'order-1' },
    }), db)).rejects.toThrow('STRIPE_STORE_METADATA_MISMATCH');

    expect(db.ironSprueAdminInventory.update).not.toHaveBeenCalled();
  });

  it('treats an already processed Iron Sprue event as a duplicate', async () => {
    const db = databaseMock();
    db.ironSprueStripeWebhookEvent.create.mockResolvedValue({
      stripeEventId: 'evt_iron_1',
      processedAt: new Date(),
      orderId: 'order-1',
    });

    const result = await processIronSprueStripeWebhookEvent(stripeEvent('checkout.session.completed', {
      id: 'cs_iron_1',
      payment_status: 'paid',
      payment_intent: 'pi_iron_1',
      amount_total: 5298,
      currency: 'gbp',
      metadata: { store: 'IRON_SPRUE', orderId: 'order-1' },
    }), db);

    expect(result).toMatchObject({ outcome: 'duplicate', orderId: 'order-1' });
    expect(db.ironSprueAdminInventory.update).not.toHaveBeenCalled();
  });

  it('uses approved R2 catalogue-primary media for cart and checkout snapshots', async () => {
    const db = {
      ironSprueOrder: { findMany: vi.fn().mockResolvedValue([]) },
      ironSprueAdminInventory: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'product-1',
          sku: 'IS-AOS-05628',
          customerTitle: 'Toyota 2000GT Red',
          slug: 'aoshima-05628-toyota-2000gt-red',
          grossPriceMinor: 1999,
          inventory: { availableStock: 2, reservedStock: 0 },
          mediaAssets: [
            {
              role: 'manufacturer-original',
              approvalState: 'APPROVED',
              isPrimary: false,
              sortOrder: 0,
              url: '/media/iron-sprue/archive/products/is-aos-05628/original/source.jpg',
              storageKey: 'archive/products/is-aos-05628/original/source.jpg',
              altText: 'Toyota 2000GT Red source image',
            },
            {
              role: 'catalogue-primary',
              approvalState: 'APPROVED',
              isPrimary: true,
              sortOrder: 0,
              url: null,
              storageKey: 'products/is-aos-05628/image-2/approved-image-2.png',
              altText: 'Toyota 2000GT Red catalogue primary',
            },
          ],
        }]),
      },
    } as any;

    const cart = await resolveIronSprueGuestCart([{ productId: 'IS-AOS-05628', quantity: 1 }], db);

    expect(cart.items[0]).toMatchObject({
      imageUrl: '/media/iron-sprue/products/is-aos-05628/image-2/approved-image-2.png',
      imageStorageKey: 'products/is-aos-05628/image-2/approved-image-2.png',
      imageAlt: 'Toyota 2000GT Red catalogue primary',
      inStock: true,
    });
  });

  it('fails before order creation or Stripe session creation when dedicated Iron Sprue Stripe config is absent', async () => {
    delete process.env.IRON_SPRUE_STRIPE_ACCOUNT_ID;
    delete process.env.IRON_SPRUE_STRIPE_TEST_SECRET_KEY;
    delete process.env.IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_tcg';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_tcg';

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const db = {
      ironSprueOrder: { findMany: vi.fn().mockResolvedValue([]) },
      ironSprueAdminInventory: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(),
    } as any;

    await expect(createIronSprueHostedCheckoutSession({
      userId: null,
      cart: {
        items: [{
          id: 'line-1',
          productId: 'product-1',
          productName: 'Toyota 2000GT Red',
          productSlug: 'aoshima-05628-toyota-2000gt-red',
          quantity: 1,
          unitPriceMinor: 1999,
          totalMinor: 1999,
          inStock: true,
          imageUrl: null,
          imageAlt: null,
          imageStorageKey: null,
        }],
        subtotalMinor: 1999,
        totalItems: 1,
        currency: 'GBP',
      },
      shippingAddress: {
        fullName: 'Test Customer',
        email: 'test@example.com',
        line1: '1 Test Street',
        line2: null,
        city: 'London',
        region: null,
        postalCode: 'E1 5NF',
        country: 'GB',
      },
      shippingMethodCode: 'UK_STANDARD',
      db,
    })).rejects.toThrow('IRON_SPRUE_STRIPE_TEST_SECRET_KEY');

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('reconciles stale reserved stock when no active checkout reservation remains', async () => {
    const db = {
      ironSprueAdminInventory: {
        findMany: vi.fn().mockResolvedValue([
          { productId: 'product-1', reservedStock: 1 },
          { productId: 'product-2', reservedStock: 2 },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
      ironSprueOrder: {
        findMany: vi.fn().mockResolvedValue([{
          items: [{ productId: 'product-2', quantity: 2 }],
        }]),
      },
    } as any;

    const reconciled = await reconcileIronSprueReservedStock(db, new Date('2026-08-13T00:00:00Z'));

    expect(reconciled).toBe(1);
    expect(db.ironSprueAdminInventory.update).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      data: { reservedStock: 0 },
    });
    expect(db.ironSprueAdminInventory.update).not.toHaveBeenCalledWith({
      where: { productId: 'product-2' },
      data: expect.anything(),
    });
  });

  it('releases a cancelled checkout reservation by Stripe session id', async () => {
    const tx = {
      ironSprueOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          paymentStatus: 'REQUIRES_PAYMENT',
          cancelledAt: null,
          items: [{ productId: 'product-1', quantity: 1 }],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      ironSprueAdminInventory: {
        findUnique: vi.fn().mockResolvedValue({ productId: 'product-1', reservedStock: 1 }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const db = {
      ironSprueOrder: {
        findFirst: vi.fn().mockResolvedValue({ id: 'order-1' }),
      },
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as any;

    await expect(cancelIronSprueCheckoutSession('cs_iron_1', db)).resolves.toBe('order-1');
    expect(tx.ironSprueAdminInventory.update).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      data: { reservedStock: 0 },
    });
    expect(tx.ironSprueOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: expect.objectContaining({
        status: 'CANCELLED',
        paymentStatus: 'CANCELED',
        reservationExpiresAt: null,
      }),
    });
  });

  it('does not release reservation twice for an already cancelled order', async () => {
    const tx = {
      ironSprueOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          paymentStatus: 'CANCELED',
          cancelledAt: new Date(),
          items: [{ productId: 'product-1', quantity: 1 }],
        }),
        update: vi.fn(),
      },
      ironSprueAdminInventory: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    const db = { $transaction: vi.fn(async (callback) => callback(tx)) } as any;

    await expect(releaseIronSprueCheckoutOrderReservation('order-1', db)).resolves.toBeNull();
    expect(tx.ironSprueAdminInventory.update).not.toHaveBeenCalled();
    expect(tx.ironSprueOrder.update).not.toHaveBeenCalled();
  });

  it('refunds a paid order through Iron Sprue Stripe config and restores stock exactly once', async () => {
    const paidOrder = {
      id: 'order-1',
      storeCode: 'IRON_SPRUE',
      orderNumber: 'IS-20260812-ABC123',
      userId: null,
      status: 'PAID',
      paymentStatus: 'SUCCEEDED',
      fulfilmentStatus: 'PENDING',
      paymentProvider: 'STRIPE',
      paymentIntentId: 'pi_iron_1',
      stripeCheckoutSessionId: 'cs_iron_1',
      stripeCheckoutUrl: 'https://checkout.stripe.com/c/pay/cs_iron_1',
      subtotalMinor: 1999,
      shippingMinor: 299,
      taxMinor: 333,
      totalMinor: 2298,
      currency: 'GBP',
      shippingMethodCode: 'UK_STANDARD',
      shippingMethodName: 'Standard delivery',
      shippingMethodAmountMinor: 299,
      shippingFullName: 'Test Customer',
      shippingEmail: 'test@example.com',
      shippingLine1: '1 Test Street',
      shippingLine2: null,
      shippingCity: 'London',
      shippingRegion: null,
      shippingPostalCode: 'E1 5NF',
      shippingCountry: 'GB',
      reservationExpiresAt: null,
      paidAt: new Date('2026-08-12T12:00:00Z'),
      fulfilledAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-08-12T12:00:00Z'),
      updatedAt: new Date('2026-08-12T12:00:00Z'),
      items: [{
        id: 'item-1',
        productId: 'product-1',
        productName: 'Toyota 2000GT Red',
        productSlug: 'aoshima-05628-toyota-2000gt-red',
        productSku: 'IS-AOS-05628',
        quantity: 1,
        unitPriceMinor: 1999,
        totalMinor: 1999,
        imageUrl: null,
        imageAlt: null,
        imageStorageKey: null,
      }],
    };
    const refundedOrder = {
      ...paidOrder,
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      fulfilmentStatus: 'CANCELLED',
      cancelledAt: new Date('2026-08-12T12:05:00Z'),
    };
    const tx = {
      ironSprueOrder: {
        findUnique: vi.fn().mockResolvedValue(paidOrder),
        update: vi.fn().mockResolvedValue(refundedOrder),
      },
      ironSprueAdminInventory: {
        findUnique: vi.fn().mockResolvedValue({ productId: 'product-1', availableStock: 0, reservedStock: 0 }),
        update: vi.fn().mockResolvedValue({}),
      },
      ironSprueAdminStockMovement: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    const db = {
      ironSprueOrder: {
        findUnique: vi.fn().mockResolvedValue(paidOrder),
      },
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as any;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_iron_1', object: 'refund', status: 'succeeded' }),
    } as Response);

    const result = await cancelIronSprueOrderForMerchant({ orderId: 'order-1', reason: 'Stock discrepancy', environment: 'test' }, db);

    expect(result?.paymentStatus).toBe('REFUNDED');
    expect(fetchSpy).toHaveBeenCalledWith('https://api.stripe.com/v1/refunds', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer sk_test_iron',
        'Idempotency-Key': 'iron-sprue-order-cancel-order-1',
      }),
    }));
    expect(tx.ironSprueAdminInventory.update).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      data: { availableStock: 1, reservedStock: 0 },
    });
    expect(tx.ironSprueOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: expect.objectContaining({
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        fulfilmentStatus: 'CANCELLED',
      }),
      include: { items: true },
    });
    fetchSpy.mockRestore();
  });

  it('cancels and restores stock without refunding when Stripe no longer has the payment intent', async () => {
    const paidOrder = {
      id: 'order-1',
      storeCode: 'IRON_SPRUE',
      orderNumber: 'IS-20260812-ABC123',
      userId: null,
      status: 'PAID',
      paymentStatus: 'SUCCEEDED',
      fulfilmentStatus: 'PENDING',
      paymentProvider: 'STRIPE',
      paymentIntentId: 'pi_missing_iron',
      stripeCheckoutSessionId: 'cs_iron_1',
      stripeCheckoutUrl: 'https://checkout.stripe.com/c/pay/cs_iron_1',
      subtotalMinor: 1999,
      shippingMinor: 299,
      taxMinor: 333,
      totalMinor: 2298,
      currency: 'GBP',
      shippingMethodCode: 'UK_STANDARD',
      shippingMethodName: 'Standard delivery',
      shippingMethodAmountMinor: 299,
      shippingFullName: 'Test Customer',
      shippingEmail: 'test@example.com',
      shippingLine1: '1 Test Street',
      shippingLine2: null,
      shippingCity: 'London',
      shippingRegion: null,
      shippingPostalCode: 'E1 5NF',
      shippingCountry: 'GB',
      reservationExpiresAt: null,
      paidAt: new Date('2026-08-12T12:00:00Z'),
      fulfilledAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-08-12T12:00:00Z'),
      updatedAt: new Date('2026-08-12T12:00:00Z'),
      items: [{
        id: 'item-1',
        productId: 'product-1',
        productName: 'Toyota 2000GT Red',
        productSlug: 'aoshima-05628-toyota-2000gt-red',
        productSku: 'IS-AOS-05628',
        quantity: 1,
        unitPriceMinor: 1999,
        totalMinor: 1999,
        imageUrl: null,
        imageAlt: null,
        imageStorageKey: null,
      }],
    };
    const cancelledOrder = {
      ...paidOrder,
      status: 'CANCELLED',
      paymentStatus: 'CANCELED',
      fulfilmentStatus: 'CANCELLED',
      cancelledAt: new Date('2026-08-12T12:05:00Z'),
    };
    const tx = {
      ironSprueOrder: {
        findUnique: vi.fn().mockResolvedValue(paidOrder),
        update: vi.fn().mockResolvedValue(cancelledOrder),
      },
      ironSprueAdminInventory: {
        findUnique: vi.fn().mockResolvedValue({ productId: 'product-1', availableStock: 0, reservedStock: 0 }),
        update: vi.fn().mockResolvedValue({}),
      },
      ironSprueAdminStockMovement: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    const db = {
      ironSprueOrder: {
        findUnique: vi.fn().mockResolvedValue(paidOrder),
      },
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as any;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          message: "No such payment_intent: 'pi_missing_iron'",
          code: 'resource_missing',
          param: 'payment_intent',
        },
      }),
    } as Response);

    const result = await cancelIronSprueOrderForMerchant({ orderId: 'order-1', reason: 'Manual stock reallocation', environment: 'test' }, db);

    expect(result?.paymentStatus).toBe('CANCELED');
    expect(tx.ironSprueAdminInventory.update).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      data: { availableStock: 1, reservedStock: 0 },
    });
    expect(tx.ironSprueOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: expect.objectContaining({
        status: 'CANCELLED',
        paymentStatus: 'CANCELED',
        fulfilmentStatus: 'CANCELLED',
      }),
      include: { items: true },
    });
    fetchSpy.mockRestore();
  });

  it('does not mark an order refunded or restock inventory when Stripe refund fails', async () => {
    const paidOrder = {
      id: 'order-1',
      storeCode: 'IRON_SPRUE',
      orderNumber: 'IS-20260812-ABC123',
      status: 'PAID',
      paymentStatus: 'SUCCEEDED',
      fulfilmentStatus: 'PENDING',
      paymentIntentId: 'pi_iron_1',
      totalMinor: 2298,
      cancelledAt: null,
      items: [{ productId: 'product-1', quantity: 1 }],
    };
    const db = {
      ironSprueOrder: {
        findUnique: vi.fn().mockResolvedValue(paidOrder),
      },
      $transaction: vi.fn(),
    } as any;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Refund failed.' } }),
    } as Response);

    await expect(cancelIronSprueOrderForMerchant({ orderId: 'order-1', environment: 'test' }, db)).rejects.toThrow('Refund failed.');

    expect(db.$transaction).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
