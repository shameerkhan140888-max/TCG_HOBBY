import { describe, expect, it, vi } from 'vitest';
import { createPendingCheckoutOrder, finalizePaidCheckoutOrder } from './orders';

function createDbMock() {
  return {
    address: {
      create: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
    inventoryItem: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    orderItem: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(mockDb)),
  } as any;
}

const mockDb = createDbMock();

describe('order repository', () => {
  it('creates a pending order and reserves inventory', async () => {
    mockDb.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      currency: 'GBP',
      items: [
        {
          id: 'cart-item-1',
          quantity: 2,
          unitPriceMinor: 1250,
          product: {
            id: 'prod-1',
            slug: 'alpha-card',
            name: 'Alpha Card',
            priceMinor: 1250,
            currency: 'GBP',
            inventory: {
              stockOnHand: 10,
              reservedStock: 1,
            },
          },
        },
      ],
    });
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
    expect(result.shippingMethod.name).toBe('UK Standard');
    expect(result.totalMinor).toBe(2999);
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

  it('finalizes a paid order by reducing reserved stock', async () => {
    const finalizationDb = createDbMock();
    finalizationDb.order.findUnique.mockResolvedValue({
      id: 'order-1',
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
    finalizationDb.order.update.mockResolvedValue({
      id: 'order-1',
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
});
