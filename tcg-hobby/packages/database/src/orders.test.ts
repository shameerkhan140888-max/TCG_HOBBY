import { describe, expect, it, vi } from 'vitest';
import { MEGA_GRENINJA_PRODUCT_SLUG } from './commerce';
import {
  createPendingCheckoutOrder,
  finalizePaidCheckoutOrder,
  releaseExpiredCheckoutOrderReservations,
} from './orders';

function createDbMock() {
  const db = {
    address: {
      create: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
    },
    inventoryItem: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    orderItem: {
      createMany: vi.fn(),
    },
  } as any;

  db.$transaction = vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(db));

  return db;
}

const cart = {
  cartId: 'cart-1',
  currency: 'GBP' as const,
  items: [
    {
      id: 'cart-item-1',
      quantity: 2,
      unitPriceMinor: 1250,
      productId: 'prod-1',
      productName: 'Alpha Card',
      productSlug: 'alpha-card',
      totalMinor: 2500,
      inStock: true,
    },
  ],
};

describe('order repository', () => {
  it('reuses a pending order when the same checkout attempt is submitted again', async () => {
    const mockDb = createDbMock();
    mockDb.order.findUnique.mockResolvedValue({
      id: 'order-existing',
      orderNumber: 'TCG-20260727-EXIST1',
      userId: null,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'REQUIRES_PAYMENT',
      shippingMethodCode: 'UK_STANDARD',
      shippingCountry: 'GB',
      subtotalMinor: 2500,
      shippingMinor: 299,
      taxMinor: 417,
      totalMinor: 2799,
      items: [{
        id: 'order-item-1',
        productId: 'prod-1',
        productName: 'Alpha Card',
        productSlug: 'alpha-card',
        quantity: 2,
        unitPriceMinor: 1250,
        totalMinor: 2500,
        product: { images: [] },
      }],
    });

    const result = await createPendingCheckoutOrder(null, cart, {
      shippingAddress: {
        fullName: 'Sam Collector',
        email: 'sam@example.com',
        line1: '14 Aurora Street',
        line2: '',
        city: 'Bristol',
        region: '',
        postalCode: 'BS1 4TR',
        country: 'GB',
      },
      shippingMethodCode: 'UK_STANDARD',
      checkoutAttemptId: 'attempt-existing',
    }, mockDb);

    expect(result.order.id).toBe('order-existing');
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('recovers the winning order when simultaneous attempts hit the unique constraint', async () => {
    const mockDb = createDbMock();
    const existing = {
      id: 'order-winning',
      orderNumber: 'TCG-20260727-WINNER',
      userId: null,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'REQUIRES_PAYMENT',
      shippingMethodCode: 'UK_STANDARD',
      shippingCountry: 'GB',
      subtotalMinor: 2500,
      shippingMinor: 299,
      taxMinor: 417,
      totalMinor: 2799,
      items: [{
        id: 'order-item-1',
        productId: 'prod-1',
        productName: 'Alpha Card',
        productSlug: 'alpha-card',
        quantity: 2,
        unitPriceMinor: 1250,
        totalMinor: 2500,
        product: { images: [] },
      }],
    };
    mockDb.order.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    mockDb.$transaction.mockRejectedValue({ code: 'P2002' });

    const result = await createPendingCheckoutOrder(null, cart, {
      shippingAddress: {
        fullName: 'Sam Collector',
        email: 'sam@example.com',
        line1: '14 Aurora Street',
        line2: '',
        city: 'Bristol',
        region: '',
        postalCode: 'BS1 4TR',
        country: 'GB',
      },
      shippingMethodCode: 'UK_STANDARD',
      checkoutAttemptId: 'attempt-race',
    }, mockDb);

    expect(result.order.id).toBe('order-winning');
  });

  it('releases expired pending reservations once without touching completed orders', async () => {
    const mockDb = createDbMock();
    mockDb.order.findMany.mockResolvedValue([{ id: 'order-expired' }]);
    mockDb.order.findUnique.mockResolvedValue({
      id: 'order-expired',
      status: 'PENDING_PAYMENT',
      paymentStatus: 'REQUIRES_PAYMENT',
      items: [{ productId: 'prod-1', quantity: 2 }],
    });
    mockDb.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    mockDb.order.updateMany.mockResolvedValue({ count: 1 });

    await expect(releaseExpiredCheckoutOrderReservations(new Date('2026-07-27T12:00:00Z'), mockDb))
      .resolves.toEqual(['order-expired']);
    expect(mockDb.inventoryItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { reservedStock: { decrement: 2 } },
    }));
    expect(mockDb.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'CANCELLED',
        paymentStatus: 'CANCELED',
      }),
    }));
  });

  it('creates a pending order and reserves inventory', async () => {
    const mockDb = createDbMock();
    mockDb.address.create.mockResolvedValue({ id: 'addr-1' });
    mockDb.order.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'TCG-20260704-ABC123',
    });
    mockDb.order.findUnique.mockResolvedValue({ id: 'order-1' });
    mockDb.inventoryItem.findUnique.mockResolvedValue({
      id: 'inv-1',
      stockOnHand: 10,
      reservedStock: 1,
    });
    mockDb.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    mockDb.orderItem.createMany.mockResolvedValue({ count: 1 });
    mockDb.cartItem.deleteMany.mockResolvedValue({ count: 1 });

    const result = await createPendingCheckoutOrder(
      'user-1',
      cart,
      {
        shippingAddress: {
          fullName: 'Sam Collector',
          email: 'sam@example.com',
          line1: '14 Aurora Street',
          line2: '',
          city: 'Bristol',
          region: '',
          postalCode: 'BS1 4TR',
          country: 'GB',
        },
        shippingMethodCode: 'UK_STANDARD',
      },
      mockDb,
    );

    expect(result.order.orderNumber).toBe('TCG-20260704-ABC123');
    expect(result.shippingMethod.name).toBe('Standard delivery');
    expect(result.taxMinor).toBe(417);
    expect(result.totalMinor).toBe(2799);
    expect(mockDb.inventoryItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          reservedStock: {
            increment: 2,
          },
        },
      }),
    );
    expect(mockDb.orderItem.createMany).toHaveBeenCalled();
  });

  it('creates a guest order without linking a user account', async () => {
    const mockDb = createDbMock();
    mockDb.address.create.mockResolvedValue({ id: 'addr-guest-1' });
    mockDb.order.create.mockResolvedValue({
      id: 'order-guest-1',
      orderNumber: 'TCG-20260704-GUEST01',
      userId: null,
    });
    mockDb.inventoryItem.findUnique.mockResolvedValue({
      id: 'inv-1',
      stockOnHand: 10,
      reservedStock: 0,
    });
    mockDb.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    mockDb.orderItem.createMany.mockResolvedValue({ count: 1 });

    const result = await createPendingCheckoutOrder(
      null,
      {
        cartId: null,
        currency: 'GBP',
        items: cart.items,
      },
      {
        shippingAddress: {
          fullName: 'Guest Collector',
          email: 'guest@example.com',
          line1: '1 Guest Street',
          line2: '',
          city: 'Leeds',
          region: '',
          postalCode: 'LS1 2AB',
          country: 'GB',
        },
        shippingMethodCode: 'UK_STANDARD',
      },
      mockDb,
    );

    expect(result.order.userId).toBeNull();
    expect(mockDb.address.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
        }),
      }),
    );
  });

  it('uses free UK standard shipping for an eligible product-only basket', async () => {
    const mockDb = createDbMock();
    mockDb.address.create.mockResolvedValue({ id: 'addr-1' });
    mockDb.order.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'TCG-20260704-FREEUK',
    });
    mockDb.inventoryItem.findUnique.mockResolvedValue({
      id: 'inv-1',
      stockOnHand: 3,
      reservedStock: 0,
    });
    mockDb.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    mockDb.orderItem.createMany.mockResolvedValue({ count: 1 });

    const result = await createPendingCheckoutOrder(
      null,
      {
        cartId: null,
        currency: 'GBP',
        items: [
          {
            id: 'cart-item-mega',
            quantity: 1,
            unitPriceMinor: 4999,
            productId: 'prod-mega',
            productName: 'Pokemon TCG: Mega Greninja ex Premium Collection',
            productSlug: MEGA_GRENINJA_PRODUCT_SLUG,
            totalMinor: 4999,
            inStock: true,
            customerPurchaseLimit: 1,
            freeUkStandardShipping: true,
          },
        ],
      },
      {
        shippingAddress: {
          fullName: 'Guest Collector',
          email: 'guest@example.com',
          line1: '1 Guest Street',
          line2: '',
          city: 'Leeds',
          region: '',
          postalCode: 'LS1 2AB',
          country: 'GB',
        },
        shippingMethodCode: 'UK_STANDARD',
      },
      mockDb,
    );

    expect(result.shippingMinor).toBe(0);
    expect(result.taxMinor).toBe(833);
    expect(result.totalMinor).toBe(4999);
  });

  it('rejects checkout when a cart item exceeds its purchase limit', async () => {
    const mockDb = createDbMock();

    await expect(
      createPendingCheckoutOrder(
        null,
        {
          cartId: null,
          currency: 'GBP',
          items: [
            {
              id: 'cart-item-mega',
              quantity: 2,
              unitPriceMinor: 4999,
              productId: 'prod-mega',
              productName: 'Pokemon TCG: Mega Greninja ex Premium Collection',
              productSlug: MEGA_GRENINJA_PRODUCT_SLUG,
              totalMinor: 9998,
              inStock: true,
              customerPurchaseLimit: 1,
              freeUkStandardShipping: true,
            },
          ],
        },
        {
          shippingAddress: {
            fullName: 'Guest Collector',
            email: 'guest@example.com',
            line1: '1 Guest Street',
            line2: '',
            city: 'Leeds',
            region: '',
            postalCode: 'LS1 2AB',
            country: 'GB',
          },
          shippingMethodCode: 'UK_STANDARD',
        },
        mockDb,
      ),
    ).rejects.toThrow('Limited to one collection per person or household.');
    expect(mockDb.order.create).not.toHaveBeenCalled();
  });


  it('finalizes a paid order by reducing reserved stock', async () => {
    const finalizationDb = createDbMock();
    finalizationDb.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      paymentStatus: 'REQUIRES_PAYMENT',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Alpha Card',
          productSlug: 'alpha-card',
          quantity: 2,
          unitPriceMinor: 1250,
          totalMinor: 2500,
        },
      ],
      shippingAddress: {
        id: 'addr-1',
        fullName: 'Sam Collector',
        email: 'sam@example.com',
        line1: '14 Aurora Street',
        line2: null,
        city: 'Bristol',
        region: null,
        postalCode: 'BS1 4TR',
        country: 'GB',
      },
    });
    finalizationDb.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    finalizationDb.order.updateMany.mockResolvedValue({ count: 1 });
    finalizationDb.order.update.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      paymentStatus: 'SUCCEEDED',
      fulfilmentStatus: 'PENDING',
      items: [],
      shippingAddress: null,
    });
    finalizationDb.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(finalizationDb));

    const order = await finalizePaidCheckoutOrder(
      {
        orderId: 'order-1',
        paymentIntentId: 'pi_123',
        stripeCheckoutSessionId: 'cs_test_123',
      },
      finalizationDb,
    );

    expect(order.paymentStatus).toBe('SUCCEEDED');
    expect(finalizationDb.inventoryItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          stockOnHand: {
            decrement: 2,
          },
          reservedStock: {
            decrement: 2,
          },
        },
      }),
    );
  });

  it('does not reduce stock again when a paid order is finalized twice', async () => {
    const finalizationDb = createDbMock();
    finalizationDb.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: null,
      paymentStatus: 'SUCCEEDED',
      items: [],
      shippingAddress: null,
    });

    const order = await finalizePaidCheckoutOrder(
      {
        orderId: 'order-1',
        paymentIntentId: 'pi_123',
        stripeCheckoutSessionId: 'cs_test_123',
      },
      finalizationDb,
    );

    expect(order.paymentStatus).toBe('SUCCEEDED');
    expect(finalizationDb.inventoryItem.updateMany).not.toHaveBeenCalled();
    expect(finalizationDb.$transaction).not.toHaveBeenCalled();
  });
});
