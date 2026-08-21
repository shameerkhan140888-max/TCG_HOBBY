import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertIronSpruePrimaryMediaRole,
  assertIronSprueR2Bucket,
  assertNoClientStoreOverride,
  calculateIronSprueOnHandStock,
  createIronSprueCustomerOrderRequest,
  createIronSprueAdminProduct,
  createIronSprueManualOrder,
  evaluateIronSprueProductReadiness,
  getIronSprueAdminDashboard,
  getIronSprueAdminPermissionMatrix,
  listIronSprueAdminProducts,
  receiveIronSprueStock,
  reconcileIronSprueInventoryAvailableStock,
  resolveIronSprueCustomerOrderRequest,
  resolveIronSprueAdminPermissions,
  setIronSprueProductPublicationState,
  updateIronSprueAdminOrderFulfilmentStatus,
  updateIronSprueAdminMediaApproval,
} from './iron-sprue-admin';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

const actor = { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' };

function readyProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    storeCode: 'IRON_SPRUE',
    customerTitle: 'Aoshima Kit',
    sourceTitle: 'Aoshima Kit',
    sku: 'IS-AOSHIMA-1',
    slug: 'aoshima-kit',
    brandId: 'brand-1',
    categoryId: 'category-1',
    supplierId: 'supplier-1',
    grossPriceMinor: 2650,
    vatRate: 20,
    shortDescription: 'Short copy',
    fullDescription: 'Full copy',
    specifications: { scale: '1/32' },
    seoTitle: 'Aoshima Kit',
    metaDescription: 'Aoshima kit for modellers',
    mediaAssets: [
      { role: 'catalogue-primary', approvalState: 'APPROVED', isPrimary: true },
    ],
    contentReviews: [],
    ...overrides,
  } as never;
}

describe('Iron Sprue dedicated Admin foundation', () => {
  it('maps existing platform admins to the full Iron Sprue Admin role without TCG store input', async () => {
    const matrix = getIronSprueAdminPermissionMatrix();
    expect(matrix.map((item) => item.role)).toContain('SUPER_ADMIN');

    const permissions = await resolveIronSprueAdminPermissions(actor, {} as never);
    expect(permissions.role).toBe('SUPER_ADMIN');
    expect(permissions.permissions).toContain('products:publish');
    expect(permissions.permissions).toContain('roles:manage');
  });

  it('fails closed on browser-supplied or cross-store context', () => {
    expect(() => assertNoClientStoreOverride({ storeCode: 'TCG_HOBBY' })).toThrow(/IRON_SPRUE/);
    expect(() => assertNoClientStoreOverride({ storeCode: 'IRON_SPRUE' })).not.toThrow();
    expect(() => assertNoClientStoreOverride({})).not.toThrow();
  });

  it('rejects non-Iron Sprue media storage and non-Image-2 primary media roles', () => {
    expect(() => assertIronSprueR2Bucket('tcg-hobby-media')).toThrow(/iron-sprue-product-media/);
    expect(() => assertIronSprueR2Bucket('iron-sprue-product-media')).not.toThrow();
    expect(() => assertIronSpruePrimaryMediaRole('manufacturer-original')).toThrow(/Image 2/);
    expect(() => assertIronSpruePrimaryMediaRole('catalogue-primary')).not.toThrow();
  });

  it('requires Image 2, content, SEO and review completion before publication readiness', () => {
    const checks = evaluateIronSprueProductReadiness(readyProduct({
      mediaAssets: [],
      contentReviews: [{ status: 'PENDING' }],
      metaDescription: null,
    }));

    expect(checks.find((check) => check.key === 'media')?.passed).toBe(false);
    expect(checks.find((check) => check.key === 'seo')?.passed).toBe(false);
    expect(checks.find((check) => check.key === 'content-conflicts')?.passed).toBe(false);
    expect(evaluateIronSprueProductReadiness(readyProduct()).every((check) => check.passed)).toBe(true);
  });

  it('blocks READY or PUBLISHED when readiness checks fail', async () => {
    const client = {
      ironSprueAdminProduct: {
        findFirst: vi.fn().mockResolvedValue(readyProduct({ mediaAssets: [] })),
      },
    };

    await expect(setIronSprueProductPublicationState('product-1', 'READY', actor, client as never)).rejects.toThrow(/media/);
    expect(client.ironSprueAdminProduct.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'product-1', storeCode: 'IRON_SPRUE' },
    }));
  });

  it('creates products, inventory and audit records inside one Iron Sprue transaction', async () => {
    const createdProduct = {
      id: 'product-1',
      sku: 'IS-AOSHIMA-1',
      customerTitle: 'Aoshima Kit',
    };
    const tx = {
      ironSprueAdminProduct: { create: vi.fn().mockResolvedValue(createdProduct) },
      ironSprueAdminInventory: { create: vi.fn().mockResolvedValue({}) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = { $transaction: vi.fn((callback) => callback(tx)) };

    await createIronSprueAdminProduct({ sourceTitle: 'Aoshima Kit', sku: 'IS-AOSHIMA-1', grossPriceMinor: 2650 }, actor, client as never);

    expect(tx.ironSprueAdminProduct.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ storeCode: 'IRON_SPRUE', sku: 'IS-AOSHIMA-1' }),
    }));
    expect(tx.ironSprueAdminInventory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ storeCode: 'IRON_SPRUE', productId: 'product-1' }),
    }));
    expect(tx.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ storeCode: 'IRON_SPRUE', action: 'product.create' }),
    }));
  });

  it('records goods received movement and rejects negative stock quantities', async () => {
    await expect(receiveIronSprueStock('product-1', { receivedQuantity: -1 }, actor, {} as never)).rejects.toThrow(/negative/);

    const tx = {
      ironSprueAdminInventory: { update: vi.fn().mockResolvedValue({}) },
      ironSprueAdminStockMovement: { create: vi.fn().mockResolvedValue({}) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      ironSprueAdminInventory: { findFirst: vi.fn().mockResolvedValue({ id: 'inventory-1', availableStock: 2 }) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await receiveIronSprueStock('product-1', { receivedQuantity: 3, damagedQuantity: 1, missingQuantity: 0 }, actor, client as never);

    expect(client.ironSprueAdminInventory.findFirst).toHaveBeenCalledWith({ where: { productId: 'product-1', storeCode: 'IRON_SPRUE' } });
    expect(tx.ironSprueAdminStockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ storeCode: 'IRON_SPRUE', beforeQuantity: 2, afterQuantity: 5 }),
    }));
  });

  it('derives on-hand stock from received stock and non-receipt movements', () => {
    expect(calculateIronSprueOnHandStock({ receivedQuantity: 5 })).toBe(5);
    expect(calculateIronSprueOnHandStock({ receivedQuantity: 5, damagedQuantity: 1, missingQuantity: 1 })).toBe(3);
    expect(calculateIronSprueOnHandStock({ receivedQuantity: 5, movementQuantity: -1 })).toBe(4);
    expect(calculateIronSprueOnHandStock({ receivedQuantity: 0, movementQuantity: -2 })).toBe(0);
  });

  it('reconciles stale available stock without undoing genuine sales movements', async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = {
      ironSprueAdminInventory: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'inventory-stale',
            productId: 'product-stale',
            expectedQuantity: 5,
            receivedQuantity: 5,
            damagedQuantity: 0,
            missingQuantity: 0,
            availableStock: 0,
            reservedStock: 0,
            product: { id: 'product-stale', sku: 'IS-CUB-MC093H', customerTitle: "St Basil's Cathedral" },
          },
          {
            id: 'inventory-sold',
            productId: 'product-sold',
            expectedQuantity: 5,
            receivedQuantity: 5,
            damagedQuantity: 0,
            missingQuantity: 0,
            availableStock: 4,
            reservedStock: 0,
            product: { id: 'product-sold', sku: 'IS-OCC-13000', customerTitle: "Queen Anne's Revenge" },
          },
        ]),
        update,
      },
      ironSprueAdminStockMovement: {
        groupBy: vi.fn().mockResolvedValue([
          { productId: 'product-sold', _sum: { quantity: -1 } },
        ]),
      },
    };

    const result = await reconcileIronSprueInventoryAvailableStock(client as never);

    expect(client.ironSprueAdminStockMovement.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        storeCode: 'IRON_SPRUE',
        movementType: { not: 'GOODS_RECEIVED' },
      },
    }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'inventory-stale' },
      data: { availableStock: 5 },
    });
    expect(result.updated).toBe(1);
    expect(result.corrections[0]).toEqual(expect.objectContaining({
      sku: 'IS-CUB-MC093H',
      previousAvailableStock: 0,
      nextAvailableStock: 5,
    }));
  });

  it('counts dashboard data only through Iron Sprue scoped tables', async () => {
    process.env.IRON_SPRUE_WORKER_READ_DATABASE_URL = 'postgresql://redacted.example/iron';
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'iron-sprue-product-media';
    process.env.IRON_SPRUE_R2_ACCESS_KEY_ID = 'test-access';
    process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY = 'test-secret';

    const count = vi.fn().mockResolvedValue(0);
    const productCount = vi.fn().mockResolvedValue(0);
    const client = {
      ironSprueAdminProduct: { count: productCount },
      ironSprueAdminInventory: { aggregate: vi.fn().mockResolvedValue({ _sum: {} }) },
      ironSprueAdminSpecialOffer: { count },
      ironSprueAdminHero: { count },
      ironSprueAdminContentReview: { count },
      ironSprueAdminImportBatch: { count },
      ironSprueAdminMediaAsset: { count },
    };

    const dashboard = await getIronSprueAdminDashboard(client as never);

    expect(dashboard.storeCode).toBe('IRON_SPRUE');
    expect(dashboard.r2Status).toBe('configured');
    expect(dashboard.workerReadStatus).toBe('configured');
    for (const call of [...productCount.mock.calls, ...count.mock.calls]) {
      expect(JSON.stringify(call[0])).toContain('IRON_SPRUE');
    }
  });

  it('lists products with server-side Iron Sprue filters and no client store selector', async () => {
    const client = {
      ironSprueAdminProduct: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    await listIronSprueAdminProducts({ search: 'Aoshima', pageSize: 10 }, client as never);

    expect(client.ironSprueAdminProduct.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ storeCode: 'IRON_SPRUE' }),
    }));
    expect(client.ironSprueAdminProduct.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ storeCode: 'IRON_SPRUE' }),
      take: 10,
    }));
  });

  it('persists media approval and makes rejected media non-primary', async () => {
    const media = {
      id: 'media-1',
      storeCode: 'IRON_SPRUE',
      productId: 'product-1',
      role: 'catalogue-primary',
      approvalState: 'APPROVED',
      isPrimary: true,
      product: { id: 'product-1' },
    };
    const client = {
      ironSprueAdminMediaAsset: {
        findFirst: vi.fn().mockResolvedValue(media),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn().mockResolvedValue({ ...media, approvalState: 'REJECTED', isPrimary: false }),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await updateIronSprueAdminMediaApproval('media-1', 'REJECTED', actor, client as never);

    expect(client.ironSprueAdminMediaAsset.updateMany).not.toHaveBeenCalled();
    expect(client.ironSprueAdminMediaAsset.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'media-1' },
      data: expect.objectContaining({
        approvalState: 'REJECTED',
        approvedById: null,
        approvedAt: null,
        isPrimary: false,
      }),
    }));
    expect(client.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        action: 'media.approval_state.change',
        after: expect.objectContaining({ approvalState: 'REJECTED', isPrimary: false }),
      }),
    }));
  });

  it('approves a catalogue-primary asset without clearing workshop media', async () => {
    const media = {
      id: 'media-2',
      storeCode: 'IRON_SPRUE',
      productId: 'product-1',
      role: 'catalogue-primary',
      approvalState: 'REVIEW_REQUIRED',
      isPrimary: false,
      product: { id: 'product-1' },
    };
    const client = {
      ironSprueAdminMediaAsset: {
        findFirst: vi.fn().mockResolvedValue(media),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ ...media, approvalState: 'APPROVED', isPrimary: true }),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await updateIronSprueAdminMediaApproval('media-2', 'APPROVED', actor, client as never);

    expect(client.ironSprueAdminMediaAsset.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        productId: 'product-1',
        role: 'catalogue-primary',
        id: { not: 'media-2' },
      }),
      data: { isPrimary: false },
    }));
    expect(client.ironSprueAdminMediaAsset.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        approvalState: 'APPROVED',
        approvedById: actor.id,
        isPrimary: true,
      }),
    }));
  });

  it('blocks fulfilment changes for unpaid or cancelled Iron Sprue orders', async () => {
    const client = {
      ironSprueOrder: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({
            id: 'order-1',
            storeCode: 'IRON_SPRUE',
            paymentStatus: 'REQUIRES_PAYMENT',
            status: 'REQUIRES_PAYMENT',
            fulfilmentStatus: 'PENDING',
            cancelledAt: null,
          })
          .mockResolvedValueOnce({
            id: 'order-2',
            storeCode: 'IRON_SPRUE',
            paymentStatus: 'SUCCEEDED',
            status: 'SUCCEEDED',
            fulfilmentStatus: 'CANCELLED',
            cancelledAt: new Date(),
          }),
      },
      $transaction: vi.fn(),
    };

    await expect(updateIronSprueAdminOrderFulfilmentStatus('order-1', 'SHIPPED', actor, client as never)).rejects.toThrow(/paid/);
    await expect(updateIronSprueAdminOrderFulfilmentStatus('order-2', 'SHIPPED', actor, client as never)).rejects.toThrow(/paid/);
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it('creates manual orders by snapshotting products and decrementing sellable stock', async () => {
    const product = {
      id: 'product-1',
      storeCode: 'IRON_SPRUE',
      sku: 'IS-AOS-05629',
      customerTitle: 'Toyota 2000GT Silver',
      slug: 'toyota-2000gt-silver',
      grossPriceMinor: 1999,
      inventory: { id: 'inventory-1', storeCode: 'IRON_SPRUE', productId: 'product-1', availableStock: 2 },
      mediaAssets: [
        { approvalState: 'APPROVED', isPrimary: true, role: 'catalogue-primary', sortOrder: 0, url: '/media/car.webp', storageKey: null, altText: 'Toyota 2000GT Silver' },
      ],
    };
    const createdOrder = {
      id: 'order-1',
      orderNumber: 'IS-20260821-ABC123',
      items: [],
    };
    const tx = {
      ironSprueAdminInventory: {
        findUnique: vi.fn().mockResolvedValue(product.inventory),
        update: vi.fn().mockResolvedValue({}),
      },
      ironSprueAdminStockMovement: { create: vi.fn().mockResolvedValue({}) },
      ironSprueOrder: { create: vi.fn().mockResolvedValue(createdOrder) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      ironSprueAdminProduct: { findMany: vi.fn().mockResolvedValue([product]) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await createIronSprueManualOrder({
      sourceChannel: 'phone',
      paymentMethodLabel: 'Card machine',
      externalReference: 'TILL-42',
      shippingFullName: 'Iron Customer',
      shippingEmail: 'customer@example.test',
      shippingLine1: '1 Model Street',
      shippingCity: 'Dewsbury',
      shippingPostalCode: 'WF13 3EW',
      lines: [{ productId: 'product-1', quantity: 1 }],
    }, actor, client as never);

    expect(tx.ironSprueAdminInventory.update).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      data: { availableStock: 1 },
    });
    expect(tx.ironSprueAdminStockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        movementType: 'MANUAL_ORDER_SALE',
        quantity: -1,
        beforeQuantity: 2,
        afterQuantity: 1,
      }),
    }));
    expect(tx.ironSprueOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        paymentProvider: 'MANUAL',
        sourceChannel: 'PHONE',
        paymentMethodLabel: 'Card machine',
        externalReference: 'TILL-42',
        subtotalMinor: 1999,
        totalMinor: 1999,
        items: {
          create: [expect.objectContaining({
            productSku: 'IS-AOS-05629',
            quantity: 1,
            imageUrl: '/media/car.webp',
          })],
        },
      }),
      include: { items: true },
    }));
  });

  it('rejects manual orders when sellable stock is insufficient', async () => {
    const product = {
      id: 'product-1',
      storeCode: 'IRON_SPRUE',
      sku: 'IS-AOS-05629',
      customerTitle: 'Toyota 2000GT Silver',
      slug: 'toyota-2000gt-silver',
      grossPriceMinor: 1999,
      inventory: { id: 'inventory-1', storeCode: 'IRON_SPRUE', productId: 'product-1', availableStock: 0 },
      mediaAssets: [],
    };
    const tx = {
      ironSprueAdminInventory: { findUnique: vi.fn().mockResolvedValue(product.inventory), update: vi.fn() },
      ironSprueAdminStockMovement: { create: vi.fn() },
      ironSprueOrder: { create: vi.fn() },
      ironSprueAdminAuditLog: { create: vi.fn() },
    };
    const client = {
      ironSprueAdminProduct: { findMany: vi.fn().mockResolvedValue([product]) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await expect(createIronSprueManualOrder({
      shippingFullName: 'Iron Customer',
      shippingEmail: 'customer@example.test',
      shippingLine1: '1 Model Street',
      shippingCity: 'Dewsbury',
      shippingPostalCode: 'WF13 3EW',
      lines: [{ productId: 'product-1', quantity: 1 }],
    }, actor, client as never)).rejects.toThrow(/Insufficient sellable stock/);

    expect(tx.ironSprueOrder.create).not.toHaveBeenCalled();
  });

  it('records customer cancellation and return requests without mutating commerce state', async () => {
    const order = {
      id: 'order-1',
      storeCode: 'IRON_SPRUE',
      orderNumber: 'IS-20260821-ABC123',
      userId: 'user-1',
      status: 'PAID',
      paymentStatus: 'SUCCEEDED',
      fulfilmentStatus: 'PENDING',
      cancelledAt: null,
    };
    const request = { id: 'request-1', orderId: 'order-1', requestType: 'CANCELLATION', status: 'OPEN' };
    const tx = {
      ironSprueOrderCustomerRequest: { create: vi.fn().mockResolvedValue(request) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      ironSprueOrder: { findFirst: vi.fn().mockResolvedValue(order) },
      ironSprueOrderCustomerRequest: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await createIronSprueCustomerOrderRequest({
      userId: 'user-1',
      orderNumber: order.orderNumber,
      requestType: 'CANCELLATION',
      reason: 'Please cancel before dispatch',
    }, client as never);

    expect(tx.ironSprueOrderCustomerRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        orderId: 'order-1',
        userId: 'user-1',
        requestType: 'CANCELLATION',
      }),
    });
    expect(tx.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'order.customer_request.cancellation' }),
    }));
  });

  it('blocks customer return requests before dispatch', async () => {
    const client = {
      ironSprueOrder: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'order-1',
          orderNumber: 'IS-1',
          userId: 'user-1',
          status: 'PAID',
          paymentStatus: 'SUCCEEDED',
          fulfilmentStatus: 'PENDING',
          cancelledAt: null,
        }),
      },
    };

    await expect(createIronSprueCustomerOrderRequest({
      userId: 'user-1',
      orderNumber: 'IS-1',
      requestType: 'RETURN',
      reason: 'Need to return',
    }, client as never)).rejects.toThrow(/dispatched/);
  });

  it('resolves customer order requests with an audit trail', async () => {
    const request = {
      id: 'request-1',
      storeCode: 'IRON_SPRUE',
      orderId: 'order-1',
      requestType: 'RETURN',
      status: 'OPEN',
      order: { orderNumber: 'IS-20260821-ABC123' },
    };
    const updated = { ...request, status: 'RESOLVED', adminNotes: 'Return handled in admin.' };
    const tx = {
      ironSprueOrderCustomerRequest: {
        findFirst: vi.fn().mockResolvedValue(request),
        update: vi.fn().mockResolvedValue(updated),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = { $transaction: vi.fn((callback) => callback(tx)) };

    await resolveIronSprueCustomerOrderRequest({
      requestId: 'request-1',
      status: 'RESOLVED',
      adminNotes: 'Return handled in admin.',
    }, actor, client as never);

    expect(tx.ironSprueOrderCustomerRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'request-1' },
      data: expect.objectContaining({
        status: 'RESOLVED',
        adminNotes: 'Return handled in admin.',
        resolvedAt: expect.any(Date),
      }),
    }));
    expect(tx.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'order.customer_request.resolved',
        entityType: 'order-request',
        entityId: 'request-1',
      }),
    }));
  });
});
