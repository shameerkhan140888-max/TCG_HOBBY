import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  CheckoutAddress,
  CurrencyCode,
  FulfilmentStatus,
  OrderLineItem,
  PaymentStatus,
  ShippingMethod,
  ShippingMethodCode,
} from '@tcg-hobby/types';
import { prisma } from './client';
import {
  buildCartReservationExpiry,
  calculateCartSubtotal,
  calculateOrderTotal,
  calculateVatEstimateMinor,
  generateOrderNumber,
  getShippingMethodByCode,
  getShippingMethodsForCountry,
  validateQuantityAgainstAvailability,
} from './commerce';
import type { CartSnapshot } from './cart';

type CheckoutAddressInput = CheckoutAddress;

type OrderItemRecord = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
};

type OrderRecord = {
  id: string;
  orderNumber: string;
  userId: string | null;
  status: string;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  paymentProvider: string | null;
  paymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeCheckoutUrl: string | null;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: string;
  shippingMethodCode: ShippingMethodCode;
  shippingMethodName: string;
  shippingMethodAmountMinor: number;
  shippingFullName: string;
  shippingEmail: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingRegion: string | null;
  shippingPostalCode: string;
  shippingCountry: string;
  reservationExpiresAt: Date | null;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemRecord[];
  shippingAddress: {
    id: string;
    fullName: string;
    email: string;
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postalCode: string;
    country: string;
  } | null;
};

type CreateCheckoutOrderInput = {
  shippingAddress: CheckoutAddressInput;
  shippingMethodCode: ShippingMethodCode;
};

type CheckoutCart = Pick<CartSnapshot, 'cartId' | 'currency' | 'items'>;

type FinalizeCheckoutOrderInput = {
  orderId: string;
  paymentIntentId: string | null;
  stripeCheckoutSessionId: string;
};

type StripeCheckoutSession = {
  id: string;
  payment_status: string;
  payment_intent: string | null;
  url: string | null;
};

type LocalOrderRecord = OrderRecord & {
  itemCount: number;
};

export type OrderShippingAddress = {
  id: string;
  fullName: string;
  email: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string;
  country: string;
};

export type OrderWithItems = {
  id: string;
  orderNumber: string;
  userId: string | null;
  status: string;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  paymentProvider: string | null;
  paymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeCheckoutUrl: string | null;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: CurrencyCode;
  shippingMethodCode: ShippingMethodCode;
  shippingMethodName: string;
  shippingMethodAmountMinor: number;
  shippingFullName: string;
  shippingEmail: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingRegion: string | null;
  shippingPostalCode: string;
  shippingCountry: string;
  reservationExpiresAt: Date | null;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderLineItem[];
  shippingAddress: OrderShippingAddress | null;
};

export type CustomerOrderSummary = OrderWithItems & {
  itemCount: number;
};

const localCheckoutOrders = new Map<string, LocalOrderRecord>();
const localCheckoutOrdersBySessionId = new Map<string, string>();
const localCheckoutOrdersFile = join(tmpdir(), 'tcg-hobby-local-checkout-orders.json');

function mapOrderItemRecord(item: OrderItemRecord): OrderLineItem {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productSlug: item.productSlug,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
    totalMinor: item.totalMinor,
  };
}

function mapOrderRecord(order: OrderRecord): OrderWithItems {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfilmentStatus: order.fulfilmentStatus,
    paymentProvider: order.paymentProvider,
    paymentIntentId: order.paymentIntentId,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    stripeCheckoutUrl: order.stripeCheckoutUrl,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    taxMinor: order.taxMinor,
    totalMinor: order.totalMinor,
    currency: order.currency as CurrencyCode,
    shippingMethodCode: order.shippingMethodCode,
    shippingMethodName: order.shippingMethodName,
    shippingMethodAmountMinor: order.shippingMethodAmountMinor,
    shippingFullName: order.shippingFullName,
    shippingEmail: order.shippingEmail,
    shippingLine1: order.shippingLine1,
    shippingLine2: order.shippingLine2,
    shippingCity: order.shippingCity,
    shippingRegion: order.shippingRegion,
    shippingPostalCode: order.shippingPostalCode,
    shippingCountry: order.shippingCountry,
    reservationExpiresAt: order.reservationExpiresAt,
    paidAt: order.paidAt,
    fulfilledAt: order.fulfilledAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map(mapOrderItemRecord),
    shippingAddress: order.shippingAddress,
  };
}

function isDatabaseUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /Can't reach database server|Database client unavailable|query engine/i.test(message);
}

function createLocalOrderRecord(
  userId: string | null,
  cart: CheckoutCart,
  input: CreateCheckoutOrderInput,
  shippingMethod: ShippingMethod,
  subtotalMinor: number,
  shippingMinor: number,
  taxMinor: number,
  totalMinor: number,
) {
  const now = new Date();
  const orderId = randomUUID();
  const orderNumber = generateOrderNumber(now, randomBytes(3).toString('hex').toUpperCase());
  const shippingAddressId = `addr-${randomBytes(6).toString('hex')}`;
  const order: LocalOrderRecord = {
    id: orderId,
    orderNumber,
    userId,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'REQUIRES_PAYMENT',
    fulfilmentStatus: 'PENDING',
    paymentProvider: 'stripe',
    paymentIntentId: null,
    stripeCheckoutSessionId: null,
    stripeCheckoutUrl: null,
    subtotalMinor,
    shippingMinor,
    taxMinor,
    totalMinor,
    currency: cart.currency,
    shippingMethodCode: shippingMethod.code,
    shippingMethodName: shippingMethod.name,
    shippingMethodAmountMinor: shippingMethod.amountMinor,
    shippingFullName: input.shippingAddress.fullName,
    shippingEmail: input.shippingAddress.email,
    shippingLine1: input.shippingAddress.line1,
    shippingLine2: input.shippingAddress.line2 || null,
    shippingCity: input.shippingAddress.city,
    shippingRegion: input.shippingAddress.region || null,
    shippingPostalCode: input.shippingAddress.postalCode,
    shippingCountry: input.shippingAddress.country,
    reservationExpiresAt: buildCartReservationExpiry(now),
    paidAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    items: cart.items.map((item) => ({
      id: randomUUID(),
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalMinor: item.totalMinor,
    })),
    shippingAddress: {
      id: shippingAddressId,
      fullName: input.shippingAddress.fullName,
      email: input.shippingAddress.email,
      line1: input.shippingAddress.line1,
      line2: input.shippingAddress.line2 || null,
      city: input.shippingAddress.city,
      region: input.shippingAddress.region || null,
      postalCode: input.shippingAddress.postalCode,
      country: input.shippingAddress.country,
    },
    itemCount: cart.items.reduce((count, item) => count + item.quantity, 0),
  };

  localCheckoutOrders.set(order.id, order);

  return order;
}

function updateLocalOrder(orderId: string, updater: (order: LocalOrderRecord) => LocalOrderRecord | void) {
  const existing = localCheckoutOrders.get(orderId);
  if (!existing) {
    return null;
  }

  const next = updater(existing) ?? existing;
  next.updatedAt = new Date();
  localCheckoutOrders.set(orderId, next);
  return next;
}

async function persistLocalCheckoutOrders() {
  await writeFile(localCheckoutOrdersFile, JSON.stringify(Array.from(localCheckoutOrders.values())), 'utf8');
}

function reviveLocalOrder(order: Omit<LocalOrderRecord, 'createdAt' | 'updatedAt' | 'reservationExpiresAt' | 'paidAt' | 'fulfilledAt' | 'cancelledAt'> & {
  createdAt: string;
  updatedAt: string;
  reservationExpiresAt: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
}) {
  return {
    ...order,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    reservationExpiresAt: order.reservationExpiresAt ? new Date(order.reservationExpiresAt) : null,
    paidAt: order.paidAt ? new Date(order.paidAt) : null,
    fulfilledAt: order.fulfilledAt ? new Date(order.fulfilledAt) : null,
    cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : null,
  } as LocalOrderRecord;
}

async function loadLocalCheckoutOrdersFromDisk() {
  try {
    const raw = await readFile(localCheckoutOrdersFile, 'utf8');
    const parsed = JSON.parse(raw) as Array<ReturnType<typeof reviveLocalOrder>>;
    localCheckoutOrders.clear();
    localCheckoutOrdersBySessionId.clear();

    for (const entry of parsed) {
      const order = reviveLocalOrder(entry as never);
      localCheckoutOrders.set(order.id, order);
      if (order.stripeCheckoutSessionId) {
        localCheckoutOrdersBySessionId.set(order.stripeCheckoutSessionId, order.id);
      }
    }
  } catch {
    return;
  }
}

export async function getLatestLocalCheckoutOrder() {
  if (localCheckoutOrders.size === 0) {
    await loadLocalCheckoutOrdersFromDisk();
  }

  if (localCheckoutOrders.size === 0) {
    return null;
  }

  return Array.from(localCheckoutOrders.values()).at(-1) ?? null;
}

function assertStripeConfigured() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY to use checkout in test mode.');
  }

  return secretKey;
}

function hasLocalStripeFallback() {
  return !process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== 'production';
}

async function stripeRequest<T>(path: string, body?: URLSearchParams) {
  const secretKey = assertStripeConfigured();
  const init: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (body) {
    init.body = body;
  }

  const response = await fetch(`https://api.stripe.com/v1/${path}`, init);

  const payload = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Stripe request failed.');
  }

  return payload;
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  if (hasLocalStripeFallback()) {
    return {
      id: sessionId,
      payment_status: 'paid',
      payment_intent: `pi_${sessionId}`,
      url: null,
    };
  }

  return stripeRequest<StripeCheckoutSession>(`checkout/sessions/${sessionId}`);
}

export async function createStripeCheckoutSession(params: {
  orderNumber: string;
  customerEmail: string;
  lineItems: Array<{ name: string; description: string; amountMinor: number; quantity: number }>;
  successUrl: string;
  cancelUrl: string;
}) {
  if (hasLocalStripeFallback()) {
    const sessionId = `cs_test_${randomBytes(8).toString('hex').toUpperCase()}`;
    const paymentIntentId = `pi_test_${randomBytes(8).toString('hex').toUpperCase()}`;

    return {
      id: sessionId,
      url: params.successUrl.replace('{CHECKOUT_SESSION_ID}', sessionId),
      payment_intent: paymentIntentId,
    };
  }

  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('customer_email', params.customerEmail);
  body.set('success_url', params.successUrl);
  body.set('cancel_url', params.cancelUrl);
  body.set('payment_method_types[0]', 'card');
  body.set('metadata[orderNumber]', params.orderNumber);

  params.lineItems.forEach((item, index) => {
    body.set(`line_items[${index}][price_data][currency]`, 'gbp');
    body.set(`line_items[${index}][price_data][product_data][name]`, item.name);
    body.set(`line_items[${index}][price_data][product_data][description]`, item.description);
    body.set(`line_items[${index}][price_data][unit_amount]`, String(item.amountMinor));
    body.set(`line_items[${index}][quantity]`, String(item.quantity));
  });

  return stripeRequest<{ id: string; url: string | null; payment_intent: string | null }>('checkout/sessions', body);
}

async function reserveInventoryForOrder(tx: any, orderId: string, items: Array<{ productId: string; quantity: number }>) {
  for (const item of items) {
    const inventory = await tx.inventoryItem.findUnique({
      where: { productId: item.productId },
      select: { id: true, stockOnHand: true, reservedStock: true },
    });

    if (!inventory) {
      throw new Error('Inventory record missing for one of the selected products.');
    }

    const available = inventory.stockOnHand - inventory.reservedStock;
    const validation = validateQuantityAgainstAvailability(item.quantity, available);

    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const updated = await tx.inventoryItem.updateMany({
      where: {
        id: inventory.id,
        stockOnHand: { gte: item.quantity },
        reservedStock: inventory.reservedStock,
      },
      data: {
        reservedStock: {
          increment: item.quantity,
        },
      },
    });

    if (updated.count !== 1) {
      throw new Error('Inventory changed while the order was being prepared. Please try again.');
    }
  }

  return tx.order.findUnique({
    where: { id: orderId },
  });
}

export async function createPendingCheckoutOrder(
  userId: string | null,
  cart: CheckoutCart,
  input: CreateCheckoutOrderInput,
  db = prisma,
) {
  if (!cart || cart.items.length === 0) {
    throw new Error('Your cart is empty.');
  }

  const shippingMethod = getShippingMethodByCode(input.shippingMethodCode, input.shippingAddress.country);

  if (!shippingMethod) {
    throw new Error('Please choose a valid shipping method for your delivery country.');
  }

  const subtotalMinor = calculateCartSubtotal(cart.items);
  const taxMinor = calculateVatEstimateMinor(subtotalMinor);
  const { totalMinor, shippingMinor } = calculateOrderTotal(subtotalMinor, shippingMethod.amountMinor, taxMinor);
  const reservationExpiresAt = buildCartReservationExpiry();

  try {
    return await db.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          userId,
          fullName: input.shippingAddress.fullName,
          email: input.shippingAddress.email,
          line1: input.shippingAddress.line1,
          line2: input.shippingAddress.line2 || null,
          city: input.shippingAddress.city,
          region: input.shippingAddress.region || null,
          postalCode: input.shippingAddress.postalCode,
          country: input.shippingAddress.country,
        },
      });

      const orderNumber = generateOrderNumber();
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'REQUIRES_PAYMENT',
          fulfilmentStatus: 'PENDING',
          subtotalMinor,
          shippingMinor,
          taxMinor,
          totalMinor,
          currency: cart.currency,
          paymentProvider: 'stripe',
          paymentIntentId: null,
          stripeCheckoutSessionId: null,
          stripeCheckoutUrl: null,
          shippingMethodCode: shippingMethod.code,
          shippingMethodName: shippingMethod.name,
          shippingMethodAmountMinor: shippingMethod.amountMinor,
          shippingFullName: input.shippingAddress.fullName,
          shippingEmail: input.shippingAddress.email,
          shippingLine1: input.shippingAddress.line1,
          shippingLine2: input.shippingAddress.line2 || null,
          shippingCity: input.shippingAddress.city,
          shippingRegion: input.shippingAddress.region || null,
          shippingPostalCode: input.shippingAddress.postalCode,
          shippingCountry: input.shippingAddress.country,
          shippingAddressId: address.id,
          reservationExpiresAt,
        },
      });

      await reserveInventoryForOrder(tx as typeof prisma, order.id, cart.items);

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          totalMinor: item.totalMinor,
        })),
      });

      if (cart.cartId) {
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.cartId,
          },
        });
      }

      return {
        order: order as unknown as OrderRecord,
        shippingMethod,
        subtotalMinor,
        shippingMinor,
        taxMinor,
        totalMinor,
        items: cart.items,
      };
    });
  } catch (error) {
    if (!isDatabaseUnavailableError(error) || process.env.NODE_ENV === 'production') {
      throw error;
    }

    const order = createLocalOrderRecord(userId, cart, input, shippingMethod, subtotalMinor, shippingMinor, taxMinor, totalMinor);
    await persistLocalCheckoutOrders();

    return {
      order: order as unknown as OrderRecord,
      shippingMethod,
      subtotalMinor,
      shippingMinor,
      taxMinor,
      totalMinor,
      items: cart.items,
    };
  }
}

export async function attachStripeSessionToOrder(params: {
  orderId: string;
  stripeCheckoutSessionId: string;
  stripeCheckoutUrl: string | null;
  paymentIntentId: string | null;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;

  try {
    return await db.order.update({
      where: { id: params.orderId },
      data: {
        stripeCheckoutSessionId: params.stripeCheckoutSessionId,
        stripeCheckoutUrl: params.stripeCheckoutUrl,
        paymentIntentId: params.paymentIntentId,
      },
    });
  } catch (error) {
    if (!isDatabaseUnavailableError(error) || process.env.NODE_ENV === 'production') {
      throw error;
    }

    const order = updateLocalOrder(params.orderId, (current) => {
      current.stripeCheckoutSessionId = params.stripeCheckoutSessionId;
      current.stripeCheckoutUrl = params.stripeCheckoutUrl;
      current.paymentIntentId = params.paymentIntentId;
      return current;
    });

    if (!order) {
      throw new Error('The order no longer exists.');
    }

    localCheckoutOrdersBySessionId.set(params.stripeCheckoutSessionId, params.orderId);
    await persistLocalCheckoutOrders();
    return order as unknown as typeof db.order;
  }
}

export async function releaseCheckoutOrderReservation(orderId: string, db = prisma) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order || order.paymentStatus === 'SUCCEEDED') {
      return null;
    }

    await db.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.inventoryItem.updateMany({
          where: {
            productId: item.productId,
            reservedStock: { gte: item.quantity },
          },
          data: {
            reservedStock: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'CANCELED',
          fulfilmentStatus: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
    });

    return order.id;
  } catch (error) {
    if (!isDatabaseUnavailableError(error) || process.env.NODE_ENV === 'production') {
      throw error;
    }

    const order = localCheckoutOrders.get(orderId);
    if (!order || order.paymentStatus === 'SUCCEEDED') {
      return null;
    }

    updateLocalOrder(orderId, (current) => {
      current.status = 'CANCELLED';
      current.paymentStatus = 'CANCELED';
      current.fulfilmentStatus = 'CANCELLED';
      current.cancelledAt = new Date();
      return current;
    });
    await persistLocalCheckoutOrders();

    return orderId;
  }
}

export async function finalizePaidCheckoutOrder(input: FinalizeCheckoutOrderInput, db = prisma): Promise<OrderWithItems> {
  try {
    const order = (await db.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: true,
        shippingAddress: true,
      },
    })) as OrderRecord | null;

    if (!order) {
      throw new Error('The order no longer exists.');
    }

    if (order.paymentStatus === 'SUCCEEDED') {
      return mapOrderRecord(order);
    }

    return await db.$transaction(async (tx) => {
      for (const item of order.items) {
        const updated = await tx.inventoryItem.updateMany({
          where: {
            productId: item.productId,
            stockOnHand: { gte: item.quantity },
            reservedStock: { gte: item.quantity },
          },
          data: {
            stockOnHand: {
              decrement: item.quantity,
            },
            reservedStock: {
              decrement: item.quantity,
            },
          },
        });

        if (updated.count !== 1) {
          throw new Error('Unable to complete payment because stock changed.');
        }
      }

      const updatedOrder = (await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentStatus: 'SUCCEEDED',
          fulfilmentStatus: 'PENDING',
          paidAt: new Date(),
          paymentIntentId: input.paymentIntentId,
          stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        },
        include: {
          items: true,
          shippingAddress: true,
        },
      })) as OrderRecord;

      return mapOrderRecord(updatedOrder);
    });
  } catch (error) {
    if (!isDatabaseUnavailableError(error) || process.env.NODE_ENV === 'production') {
      throw error;
    }

    const localOrder = localCheckoutOrders.get(input.orderId);
    if (!localOrder) {
      throw new Error('The order no longer exists.');
    }

    const nextOrder = updateLocalOrder(input.orderId, (current) => {
      current.status = 'PAID';
      current.paymentStatus = 'SUCCEEDED';
      current.fulfilmentStatus = 'PENDING';
      current.paidAt = new Date();
      current.paymentIntentId = input.paymentIntentId;
      current.stripeCheckoutSessionId = input.stripeCheckoutSessionId;
      return current;
    });

    if (!nextOrder) {
      throw new Error('The order no longer exists.');
    }

    localCheckoutOrdersBySessionId.set(input.stripeCheckoutSessionId, input.orderId);
    await persistLocalCheckoutOrders();

    return mapOrderRecord(nextOrder);
  }
}

export async function getCustomerOrders(userId: string, db = prisma): Promise<CustomerOrderSummary[]> {
  try {
    const orders = (await db.order.findMany({
      where: {
        userId,
        status: {
          not: 'DRAFT',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
        shippingAddress: true,
      },
    })) as unknown as OrderRecord[];

    return orders.map((order) => ({
      ...mapOrderRecord(order),
      itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    }));
  } catch (error) {
    if (!isDatabaseUnavailableError(error) || process.env.NODE_ENV === 'production') {
      throw error;
    }

    await loadLocalCheckoutOrdersFromDisk();
    return Array.from(localCheckoutOrders.values())
      .filter((order) => order.userId === userId && order.status !== 'DRAFT')
      .map((order) => ({
        ...mapOrderRecord(order),
        itemCount: order.itemCount,
      }));
  }
}

export async function getCustomerOrderByNumber(userId: string, orderNumber: string, db = prisma): Promise<OrderWithItems | null> {
  try {
    const order = (await db.order.findFirst({
      where: {
        userId,
        orderNumber,
      },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
        shippingAddress: true,
      },
    })) as unknown as OrderRecord | null;

    if (!order) {
      return null;
    }

    return mapOrderRecord(order);
  } catch (error) {
    if (!isDatabaseUnavailableError(error) || process.env.NODE_ENV === 'production') {
      throw error;
    }

    await loadLocalCheckoutOrdersFromDisk();
    const order = Array.from(localCheckoutOrders.values()).find((entry) => entry.userId === userId && entry.orderNumber === orderNumber);
    return order ? mapOrderRecord(order) : null;
  }
}

export async function getOrderByStripeCheckoutSessionId(stripeCheckoutSessionId: string, db = prisma): Promise<OrderWithItems | null> {
  try {
    const order = (await db.order.findUnique({
      where: {
        stripeCheckoutSessionId,
      },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
        shippingAddress: true,
      },
    })) as unknown as OrderRecord | null;

    if (!order) {
      return null;
    }

    return mapOrderRecord(order);
  } catch (error) {
    if (!isDatabaseUnavailableError(error) || process.env.NODE_ENV === 'production') {
      throw error;
    }

    await loadLocalCheckoutOrdersFromDisk();
    const orderId = localCheckoutOrdersBySessionId.get(stripeCheckoutSessionId);
    const order = orderId ? localCheckoutOrders.get(orderId) : null;
    return order ? mapOrderRecord(order) : null;
  }
}

export async function getAvailableShippingMethods(country: string): Promise<ShippingMethod[]> {
  return getShippingMethodsForCountry(country);
}
