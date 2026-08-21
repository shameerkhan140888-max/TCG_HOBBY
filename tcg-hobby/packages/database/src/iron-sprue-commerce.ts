import { randomBytes, randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import type {
  CartLineItem,
  CartSummary,
  CheckoutAddress,
  CurrencyCode,
  FulfilmentStatus,
  OrderLineItem,
  PaymentStatus,
  ShippingMethod,
  ShippingMethodCode,
} from '@tcg-hobby/types';
import type { Prisma } from '@prisma/client';
import { getIronSprueAdminPrisma } from './client';
import {
  buildCartReservationExpiry,
  calculateCartSubtotal,
  calculatePromotionalShippingMinor,
  calculateVatEstimateMinor,
  getShippingMethodByCode,
  getShippingMethodsForCountry,
  validateQuantityAgainstAvailability,
} from './commerce';
import { assertStripeEventMatchesStore, getStoreStripeConfig, type CommerceEnvironment } from './store-stripe-config';

export const IRON_SPRUE_STORE_CODE = 'IRON_SPRUE';
const CURRENCY: CurrencyCode = 'GBP';

type DatabaseClient = ReturnType<typeof getIronSprueAdminPrisma>;

function getIronSprueCommercePrisma(): DatabaseClient {
  return getIronSprueAdminPrisma();
}

type IronSprueProductForCart = Prisma.IronSprueAdminProductGetPayload<{
  include: {
    inventory: true;
    mediaAssets: true;
  };
}>;

type IronSprueOrderRecord = Prisma.IronSprueOrderGetPayload<{
  include: {
    items: true;
  };
}>;

type StripeCheckoutSession = {
  id: string;
  payment_status: string;
  payment_intent: string | Stripe.PaymentIntent | null;
  amount_total: number | null;
  currency: string | null;
  url: string | null;
  metadata: Stripe.Metadata | null;
};

type IronSprueResolvedDiscount = {
  id: string;
  code: string;
  discountMinor: number;
};

type StripePaymentIntentSnapshot = {
  id: string;
  amount: number;
  amount_received?: number | null;
  currency: string;
  status: string;
  metadata: Stripe.Metadata | null;
  client_secret?: string | null;
};

export type IronSprueOrderWithItems = {
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
  discountCode: string | null;
  discountMinor: number;
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
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  reservationExpiresAt: Date | null;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderLineItem[];
};

export type IronSprueCheckoutSessionResult = {
  orderNumber: string;
  checkoutUrl: string;
};

export type IronSpruePaymentIntentCheckoutResult = {
  orderNumber: string;
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
  totalMinor: number;
  currency: CurrencyCode;
};

export type IronSprueStripeWebhookProcessingResult = {
  eventId: string;
  eventType: string;
  outcome: 'processed' | 'duplicate' | 'ignored';
  orderId: string | null;
};

function formatDatePart(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function generateIronSprueOrderNumber(date = new Date(), entropy = randomBytes(3).toString('hex').toUpperCase()) {
  return `IS-${formatDatePart(date)}-${entropy}`;
}

function normalizeQuantity(quantity: unknown) {
  const value = Number(quantity);
  if (!Number.isInteger(value) || value < 1) throw new Error('Quantity must be at least 1.');
  return Math.min(value, 99);
}

function safeProductWhere(productIds: string[]) {
  return {
    storeCode: IRON_SPRUE_STORE_CODE,
    id: { in: productIds },
    archivedAt: null,
    grossPriceMinor: { not: null },
  } satisfies Prisma.IronSprueAdminProductWhereInput;
}

function safeProductIdentifierWhere(identifiers: string[]) {
  return {
    storeCode: IRON_SPRUE_STORE_CODE,
    archivedAt: null,
    grossPriceMinor: { not: null },
    OR: [
      { id: { in: identifiers } },
      { sku: { in: identifiers } },
    ],
  } satisfies Prisma.IronSprueAdminProductWhereInput;
}

function resolveProductImage(product: IronSprueProductForCart) {
  const mediaUrl = (asset: IronSprueProductForCart['mediaAssets'][number]) => {
    if (asset.url?.trim()) return asset.url.trim();
    const storageKey = asset.storageKey?.trim().replace(/^\/+/, '');
    return storageKey ? `/media/iron-sprue/${storageKey.split('/').map(encodeURIComponent).join('/')}` : null;
  };

  const preferred = [...product.mediaAssets]
    .map((asset) => ({ asset, url: mediaUrl(asset) }))
    .filter(({ asset, url }) => asset.approvalState === 'APPROVED' && url)
    .sort((a, b) => {
      const roleScore = (role: string) => {
        const normalized = role.toLowerCase().replace(/_/g, '-');
        if (normalized === 'catalogue-primary') return 0;
        if (normalized === 'manufacturer-original') return 1;
        if (normalized === 'workshop-photography') return 2;
        return 3;
      };
      return roleScore(a.asset.role) - roleScore(b.asset.role)
        || Number(b.asset.isPrimary) - Number(a.asset.isPrimary)
        || a.asset.sortOrder - b.asset.sortOrder;
    })[0];
  return {
    url: preferred?.url ?? null,
    altText: preferred?.asset.altText ?? product.customerTitle,
    storageKey: preferred?.asset.storageKey ?? null,
  };
}

function availableStock(product: IronSprueProductForCart) {
  const inventory = product.inventory;
  if (!inventory) return 0;
  return Math.max(inventory.availableStock - inventory.reservedStock, 0);
}

function toCartLine(product: IronSprueProductForCart, quantity: number): CartLineItem {
  const unitPriceMinor = product.grossPriceMinor ?? 0;
  const image = resolveProductImage(product);
  const availableQuantity = availableStock(product);
  return {
    id: product.id,
    productId: product.id,
    productName: product.customerTitle,
    productSlug: product.slug,
    quantity,
    unitPriceMinor,
    totalMinor: unitPriceMinor * quantity,
    inStock: availableQuantity >= quantity,
    availableQuantity,
    freeUkStandardShipping: false,
    imageUrl: image.url,
    imageAlt: image.altText,
    imageStorageKey: image.storageKey,
  };
}

function summarizeCart(items: CartLineItem[]): CartSummary {
  return {
    items,
    subtotalMinor: calculateCartSubtotal(items),
    currency: CURRENCY,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function resolveIronSprueGuestCart(inputItems: Array<{ productId: string; quantity: number }>, db: DatabaseClient = getIronSprueCommercePrisma()) {
  await releaseExpiredIronSprueCheckoutOrderReservations(db);
  const quantities = new Map<string, number>();
  for (const item of inputItems) {
    if (!item?.productId) continue;
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + normalizeQuantity(item.quantity));
  }
  const productIdentifiers = [...quantities.keys()];
  if (!productIdentifiers.length) return { cartId: null, ...summarizeCart([]) };
  const products = await db.ironSprueAdminProduct.findMany({
    where: safeProductIdentifierWhere(productIdentifiers),
    include: { inventory: true, mediaAssets: true },
  });
  const lines = products.map((product) => toCartLine(product, quantities.get(product.id) ?? quantities.get(product.sku) ?? 1));
  return { cartId: null, ...summarizeCart(lines) };
}

export async function getIronSprueCustomerCartDetails(userId: string, db: DatabaseClient = getIronSprueCommercePrisma()) {
  await releaseExpiredIronSprueCheckoutOrderReservations(db);
  const cart = await db.ironSprueCart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: { include: { inventory: true, mediaAssets: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!cart) return { cartId: null, ...summarizeCart([]) };
  const lines = cart.items.map((item) => toCartLine(item.product, item.quantity));
  return { cartId: cart.id, ...summarizeCart(lines) };
}

async function getOrCreateIronSprueCart(userId: string, db: DatabaseClient = getIronSprueCommercePrisma()) {
  return db.ironSprueCart.upsert({
    where: { userId },
    update: {},
    create: { userId, storeCode: IRON_SPRUE_STORE_CODE, currency: CURRENCY },
  });
}

export async function addIronSprueProductToCart(userId: string, productId: string, quantity: number, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const product = await db.ironSprueAdminProduct.findFirst({
    where: safeProductIdentifierWhere([productId]),
    include: { inventory: true, mediaAssets: true },
  });
  if (!product) throw new Error('Product is not available.');
  const nextQuantity = normalizeQuantity(quantity);
  const check = validateQuantityAgainstAvailability(nextQuantity, availableStock(product));
  if (!check.ok) throw new Error(check.message);
  const cart = await getOrCreateIronSprueCart(userId, db);
  const existing = await db.ironSprueCartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    select: { quantity: true },
  });
  const finalQuantity = (existing?.quantity ?? 0) + nextQuantity;
  const finalCheck = validateQuantityAgainstAvailability(finalQuantity, availableStock(product));
  if (!finalCheck.ok) throw new Error(finalCheck.message);
  await db.ironSprueCartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    update: { quantity: { increment: nextQuantity }, unitPriceMinor: product.grossPriceMinor ?? 0 },
    create: { cartId: cart.id, productId: product.id, quantity: nextQuantity, unitPriceMinor: product.grossPriceMinor ?? 0, currency: CURRENCY },
  });
}

export async function updateIronSprueCartItemQuantity(userId: string, productId: string, quantity: number, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const cart = await getOrCreateIronSprueCart(userId, db);
  const nextQuantity = normalizeQuantity(quantity);
  const existing = await db.ironSprueCartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
    include: { product: { include: { inventory: true, mediaAssets: true } } },
  });
  if (!existing || existing.product.storeCode !== IRON_SPRUE_STORE_CODE) throw new Error('Product is not available.');
  const check = validateQuantityAgainstAvailability(nextQuantity, availableStock(existing.product));
  if (!check.ok) throw new Error(check.message);
  await db.ironSprueCartItem.update({
    where: { cartId_productId: { cartId: cart.id, productId } },
    data: { quantity: nextQuantity },
  });
}

export async function removeIronSprueCartItem(userId: string, productId: string, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const cart = await db.ironSprueCart.findUnique({ where: { userId } });
  if (!cart) return;
  await db.ironSprueCartItem.deleteMany({ where: { cartId: cart.id, productId } });
}

export async function clearIronSprueCart(userId: string, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const cart = await db.ironSprueCart.findUnique({ where: { userId } });
  if (!cart) return;
  await db.ironSprueCartItem.deleteMany({ where: { cartId: cart.id } });
}

export function getIronSprueAvailableShippingMethods(country: string, qualifyingSubtotalMinor = 0) {
  return getShippingMethodsForCountry(country, qualifyingSubtotalMinor);
}

function requireCheckoutAddress(input: CheckoutAddress): CheckoutAddress {
  const required: Array<keyof CheckoutAddress> = ['fullName', 'email', 'line1', 'city', 'postalCode', 'country'];
  if (required.some((key) => typeof input?.[key] !== 'string' || !input[key].trim())) {
    throw new Error('Complete the delivery address before continuing.');
  }
  return { ...input, country: input.country.trim().toUpperCase(), line2: input.line2 ?? null, region: input.region ?? null };
}

function resolveCheckoutUrl(template: string, sessionPlaceholder = '{CHECKOUT_SESSION_ID}') {
  return template.includes(sessionPlaceholder) ? template : `${template}${template.includes('?') ? '&' : '?'}session_id=${sessionPlaceholder}`;
}

function resolveStripeCheckoutImageUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function stripeRequest<T>(secretKey: string, path: string, body?: URLSearchParams, options: { idempotencyKey?: string } = {}): Promise<T> {
  const init: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    },
  };
  if (body) init.body = body;

  return fetch(`https://api.stripe.com/v1/${path}`, init).then(async (response) => {
    const payload = (await response.json()) as {
      error?: {
        message?: unknown;
        code?: unknown;
        type?: unknown;
        param?: unknown;
      };
    };
    if (!response.ok) {
      const message = typeof payload.error?.message === 'string' ? payload.error.message : 'Stripe request failed.';
      const error = new Error(message) as Error & {
        code?: string;
        type?: string;
        param?: string;
        raw?: unknown;
        statusCode?: number;
      };
      if (typeof payload.error?.code === 'string') error.code = payload.error.code;
      if (typeof payload.error?.type === 'string') error.type = payload.error.type;
      if (typeof payload.error?.param === 'string') error.param = payload.error.param;
      error.raw = payload.error ?? payload;
      error.statusCode = response.status;
      throw error;
    }
    return payload as T;
  });
}

async function retrieveIronSprueStripeCheckoutSession(secretKey: string, sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(secretKey, `checkout/sessions/${encodeURIComponent(sessionId)}`);
}

async function createIronSprueStripeCoupon(secretKey: string, params: { code: string; discountMinor: number; orderNumber: string }) {
  const body = new URLSearchParams();
  body.set('duration', 'once');
  body.set('name', `Iron Sprue ${params.code} ${params.orderNumber}`);
  body.set('amount_off', String(params.discountMinor));
  body.set('currency', CURRENCY.toLowerCase());
  body.set('metadata[store]', IRON_SPRUE_STORE_CODE);
  body.set('metadata[code]', params.code);
  body.set('metadata[orderNumber]', params.orderNumber);
  return stripeRequest<{ id: string }>(secretKey, 'coupons', body);
}

export function buildIronSprueStripeMetadata(params: { orderId: string; orderNumber: string; checkoutAttemptId: string }) {
  return {
    store: IRON_SPRUE_STORE_CODE,
    commerceStore: IRON_SPRUE_STORE_CODE,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    checkoutAttemptId: params.checkoutAttemptId,
  };
}

async function createIronSprueStripeCheckoutSession(params: {
  secretKey: string;
  businessName: string;
  orderId: string;
  orderNumber: string;
  checkoutAttemptId: string;
  successUrl: string;
  cancelUrl: string;
  items: CartLineItem[];
  shippingMethod: ShippingMethod;
  shippingMinor: number;
  discount?: IronSprueResolvedDiscount | null;
}) {
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', resolveCheckoutUrl(params.successUrl));
  body.set('cancel_url', resolveCheckoutUrl(params.cancelUrl));
  body.set('client_reference_id', params.orderNumber);
  body.set('payment_method_types[0]', 'card');
  body.set('payment_intent_data[description]', `${params.businessName} order ${params.orderNumber}`);
  const metadata = buildIronSprueStripeMetadata(params);
  for (const [key, value] of Object.entries(metadata)) {
    body.set(`metadata[${key}]`, value);
    body.set(`payment_intent_data[metadata][${key}]`, value);
  }
  params.items.forEach((item, index) => {
    body.set(`line_items[${index}][quantity]`, String(item.quantity));
    body.set(`line_items[${index}][price_data][currency]`, CURRENCY.toLowerCase());
    body.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitPriceMinor));
    body.set(`line_items[${index}][price_data][product_data][name]`, item.productName);
    body.set(`line_items[${index}][price_data][product_data][metadata][productId]`, item.productId);
    body.set(`line_items[${index}][price_data][product_data][metadata][store]`, IRON_SPRUE_STORE_CODE);
    const checkoutImageUrl = resolveStripeCheckoutImageUrl(item.imageUrl);
    if (checkoutImageUrl) body.set(`line_items[${index}][price_data][product_data][images][0]`, checkoutImageUrl);
  });
  if (params.shippingMinor > 0) {
    const index = params.items.length;
    body.set(`line_items[${index}][quantity]`, '1');
    body.set(`line_items[${index}][price_data][currency]`, CURRENCY.toLowerCase());
    body.set(`line_items[${index}][price_data][unit_amount]`, String(params.shippingMinor));
    body.set(`line_items[${index}][price_data][product_data][name]`, params.shippingMethod.name);
  }
  if (params.discount && params.discount.discountMinor > 0) {
    const coupon = await createIronSprueStripeCoupon(params.secretKey, {
      code: params.discount.code,
      discountMinor: params.discount.discountMinor,
      orderNumber: params.orderNumber,
    });
    body.set('discounts[0][coupon]', coupon.id);
  }
  return stripeRequest<StripeCheckoutSession>(params.secretKey, 'checkout/sessions', body);
}

async function createIronSprueStripePaymentIntent(params: {
  secretKey: string;
  businessName: string;
  orderId: string;
  orderNumber: string;
  checkoutAttemptId: string;
  totalMinor: number;
  shippingEmail: string;
}) {
  const body = new URLSearchParams();
  body.set('amount', String(params.totalMinor));
  body.set('currency', CURRENCY.toLowerCase());
  body.set('description', `${params.businessName} order ${params.orderNumber}`);
  body.set('payment_method_types[0]', 'card');
  body.set('receipt_email', params.shippingEmail);
  const metadata = buildIronSprueStripeMetadata(params);
  for (const [key, value] of Object.entries(metadata)) {
    body.set(`metadata[${key}]`, value);
  }
  return stripeRequest<StripePaymentIntentSnapshot>(params.secretKey, 'payment_intents', body, {
    idempotencyKey: `iron-sprue-payment-intent-${params.orderId}`,
  });
}

function mapOrderRecord(order: IronSprueOrderRecord): IronSprueOrderWithItems {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    status: order.status,
    paymentStatus: order.paymentStatus as PaymentStatus,
    fulfilmentStatus: order.fulfilmentStatus as FulfilmentStatus,
    paymentProvider: order.paymentProvider,
    paymentIntentId: order.paymentIntentId,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    stripeCheckoutUrl: order.stripeCheckoutUrl,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    taxMinor: order.taxMinor,
    discountCode: order.discountCode,
    discountMinor: order.discountMinor ?? 0,
    totalMinor: order.totalMinor,
    currency: order.currency as CurrencyCode,
    shippingMethodCode: order.shippingMethodCode as ShippingMethodCode,
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
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    reservationExpiresAt: order.reservationExpiresAt,
    paidAt: order.paidAt,
    fulfilledAt: order.fulfilledAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalMinor: item.totalMinor,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      imageStorageKey: item.imageStorageKey,
    })),
  };
}

function normalizeIronSprueDiscountCode(value: string | null | undefined) {
  return value?.trim().toUpperCase().replace(/\s+/g, '') || null;
}

async function resolveIronSprueDiscount(input: {
  code?: string | null;
  subtotalMinor: number;
  userId: string | null;
  email: string;
  db: DatabaseClient;
}): Promise<IronSprueResolvedDiscount | null> {
  const code = normalizeIronSprueDiscountCode(input.code);
  if (!code) return null;
  const record = await input.db.ironSprueDiscountCode.findUnique({
    where: { storeCode_code: { storeCode: IRON_SPRUE_STORE_CODE, code } },
  });
  if (!record || !record.enabled) throw new Error('Discount code is not valid.');
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) throw new Error('Discount code has expired.');
  if (record.minimumSpendMinor != null && input.subtotalMinor < record.minimumSpendMinor) {
    throw new Error(`Discount code requires a basket subtotal of at least £${(record.minimumSpendMinor / 100).toFixed(2)}.`);
  }
  if (record.oneUsePerCustomer) {
    const email = input.email.trim().toLowerCase();
    const existing = await input.db.ironSprueDiscountRedemption.findFirst({
      where: {
        storeCode: IRON_SPRUE_STORE_CODE,
        discountCodeId: record.id,
        OR: [
          ...(input.userId ? [{ userId: input.userId }] : []),
          { email },
        ],
      },
      select: { id: true },
    });
    if (existing) throw new Error('Discount code has already been used.');
  }
  const rawDiscount = record.discountType === 'PERCENT'
    ? Math.floor((input.subtotalMinor * record.amount) / 100)
    : record.amount;
  const discountMinor = Math.min(Math.max(rawDiscount, 0), input.subtotalMinor);
  if (discountMinor <= 0) throw new Error('Discount code does not apply to this basket.');
  return { id: record.id, code: record.code, discountMinor };
}

type CreateIronSprueCheckoutOrderInput = {
  userId: string | null;
  cart: CartSummary & { cartId?: string | null };
  shippingAddress: CheckoutAddress;
  shippingMethodCode: ShippingMethodCode;
  discountCode?: string | null;
  checkoutAttemptId?: string | null;
  db?: DatabaseClient;
};

async function createIronSpruePendingCheckoutOrder(input: CreateIronSprueCheckoutOrderInput) {
  const db = input.db ?? getIronSprueCommercePrisma();
  await releaseExpiredIronSprueCheckoutOrderReservations(db);
  const shippingAddress = requireCheckoutAddress(input.shippingAddress);
  const subtotalMinor = input.cart.subtotalMinor;
  const shippingMethod = getShippingMethodByCode(input.shippingMethodCode, shippingAddress.country, subtotalMinor);
  if (!shippingMethod) throw new Error('Selected delivery method is not available for this address.');
  const discount = await resolveIronSprueDiscount({
    code: input.discountCode ?? null,
    subtotalMinor,
    userId: input.userId,
    email: shippingAddress.email,
    db,
  });
  const shippingMinor = calculatePromotionalShippingMinor(shippingMethod, input.cart.items, shippingAddress.country, subtotalMinor);
  const taxMinor = calculateVatEstimateMinor(subtotalMinor);
  const discountMinor = discount?.discountMinor ?? 0;
  const totalMinor = subtotalMinor + shippingMinor - discountMinor;
  const checkoutAttemptId = input.checkoutAttemptId?.trim() || randomUUID();
  const orderNumber = generateIronSprueOrderNumber();
  const skuByProductId = new Map<string, string>();

  const order = await db.$transaction(async (tx) => {
    for (const item of input.cart.items) {
      const product = await tx.ironSprueAdminProduct.findUnique({
        where: { id: item.productId },
        include: { inventory: true },
      });
      if (!product || product.storeCode !== IRON_SPRUE_STORE_CODE || !product.inventory) throw new Error('Product is not available.');
      skuByProductId.set(product.id, product.sku);
      const check = validateQuantityAgainstAvailability(item.quantity, Math.max(product.inventory.availableStock - product.inventory.reservedStock, 0));
      if (!check.ok) throw new Error(check.message);
      await tx.ironSprueAdminInventory.update({
        where: { productId: item.productId },
        data: { reservedStock: { increment: item.quantity } },
      });
    }
    return tx.ironSprueOrder.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        orderNumber,
        userId: input.userId,
        checkoutAttemptId,
        subtotalMinor,
        shippingMinor,
        taxMinor,
        discountCode: discount?.code ?? null,
        discountMinor,
        totalMinor,
        currency: CURRENCY,
        shippingMethodCode: shippingMethod.code,
        shippingMethodName: shippingMethod.name,
        shippingMethodAmountMinor: shippingMinor,
        shippingFullName: shippingAddress.fullName.trim(),
        shippingEmail: shippingAddress.email.trim(),
        shippingLine1: shippingAddress.line1.trim(),
        shippingLine2: shippingAddress.line2?.trim() || null,
        shippingCity: shippingAddress.city.trim(),
        shippingRegion: shippingAddress.region?.trim() || null,
        shippingPostalCode: shippingAddress.postalCode.trim(),
        shippingCountry: shippingAddress.country,
        reservationExpiresAt: buildCartReservationExpiry(),
        items: {
          create: input.cart.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productSlug: item.productSlug,
            productSku: skuByProductId.get(item.productId) ?? item.productId,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            totalMinor: item.totalMinor,
            imageUrl: item.imageUrl ?? null,
            imageAlt: item.imageAlt ?? item.productName,
            imageStorageKey: item.imageStorageKey ?? null,
          })),
        },
      },
      include: { items: true },
    });
  });

  return {
    db,
    order,
    orderNumber,
    checkoutAttemptId,
    shippingMethod,
    shippingMinor,
    discount,
    totalMinor,
    shippingAddress,
  };
}

export async function createIronSprueHostedCheckoutSession(input: CreateIronSprueCheckoutOrderInput & {
  environment?: CommerceEnvironment;
}): Promise<IronSprueCheckoutSessionResult> {
  const config = getStoreStripeConfig({
    store: IRON_SPRUE_STORE_CODE,
    ...(input.environment ? { environment: input.environment } : {}),
  });
  const pending = await createIronSpruePendingCheckoutOrder(input);

  try {
    const session = await createIronSprueStripeCheckoutSession({
      secretKey: config.secretKey,
      businessName: config.publicBusinessName,
      orderId: pending.order.id,
      orderNumber: pending.orderNumber,
      checkoutAttemptId: pending.checkoutAttemptId,
      successUrl: config.successUrl,
      cancelUrl: config.cancelUrl,
      items: input.cart.items,
      shippingMethod: pending.shippingMethod,
      shippingMinor: pending.shippingMinor,
      discount: pending.discount,
    });
    if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
    await pending.db.ironSprueOrder.update({
      where: { id: pending.order.id },
      data: {
        paymentProvider: 'STRIPE',
        stripeCheckoutSessionId: session.id,
        stripeCheckoutUrl: session.url,
      },
    });
    return { orderNumber: pending.orderNumber, checkoutUrl: session.url };
  } catch (error) {
    await releaseIronSprueCheckoutOrderReservation(pending.order.id, pending.db, 'FAILED');
    throw error;
  }
}

export async function createIronSpruePaymentIntentCheckout(input: CreateIronSprueCheckoutOrderInput & {
  environment?: CommerceEnvironment;
}): Promise<IronSpruePaymentIntentCheckoutResult> {
  const config = getStoreStripeConfig({
    store: IRON_SPRUE_STORE_CODE,
    ...(input.environment ? { environment: input.environment } : {}),
  });
  if (!config.publishableKey) throw new Error('IRON_SPRUE_STRIPE_PUBLISHABLE_KEY_REQUIRED');
  const pending = await createIronSpruePendingCheckoutOrder(input);

  try {
    const intent = await createIronSprueStripePaymentIntent({
      secretKey: config.secretKey,
      businessName: config.publicBusinessName,
      orderId: pending.order.id,
      orderNumber: pending.orderNumber,
      checkoutAttemptId: pending.checkoutAttemptId,
      totalMinor: pending.totalMinor,
      shippingEmail: pending.shippingAddress.email,
    });
    if (!intent.client_secret) throw new Error('Stripe did not return a PaymentIntent client secret.');
    await pending.db.ironSprueOrder.update({
      where: { id: pending.order.id },
      data: {
        paymentProvider: 'STRIPE',
        paymentIntentId: intent.id,
      },
    });
    return {
      orderNumber: pending.orderNumber,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      publishableKey: config.publishableKey,
      totalMinor: pending.totalMinor,
      currency: CURRENCY,
    };
  } catch (error) {
    await releaseIronSprueCheckoutOrderReservation(pending.order.id, pending.db, 'FAILED');
    throw error;
  }
}

function paymentIntentId(value: string | Stripe.PaymentIntent | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function readStripeMetadataValue(metadata: Stripe.Metadata | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function assertIronSprueStripeMetadata(metadata: Stripe.Metadata | null | undefined) {
  const store = readStripeMetadataValue(metadata, 'store') ?? readStripeMetadataValue(metadata, 'commerceStore');
  if (store !== IRON_SPRUE_STORE_CODE) throw new Error('STRIPE_STORE_METADATA_MISMATCH');
}

async function findIronSprueOrderFromStripeMetadata(metadata: Stripe.Metadata | null | undefined, db: DatabaseClient) {
  const orderId = readStripeMetadataValue(metadata, 'orderId');
  if (orderId) {
    const order = await db.ironSprueOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (order) return order;
  }

  const checkoutAttemptId = readStripeMetadataValue(metadata, 'checkoutAttemptId');
  if (checkoutAttemptId) {
    const order = await db.ironSprueOrder.findUnique({ where: { checkoutAttemptId }, include: { items: true } });
    if (order) return order;
  }

  const orderNumber = readStripeMetadataValue(metadata, 'orderNumber');
  if (orderNumber) {
    return db.ironSprueOrder.findFirst({
      where: { storeCode: IRON_SPRUE_STORE_CODE, orderNumber },
      include: { items: true },
    });
  }

  return null;
}

async function findIronSprueOrderForSession(session: Stripe.Checkout.Session, db: DatabaseClient) {
  const bySession = await db.ironSprueOrder.findUnique({
    where: { stripeCheckoutSessionId: session.id },
    include: { items: true },
  });
  if (bySession) return bySession;
  return findIronSprueOrderFromStripeMetadata(session.metadata, db);
}

async function findIronSprueOrderForPaymentIntent(intent: Stripe.PaymentIntent, db: DatabaseClient) {
  const byIntent = await db.ironSprueOrder.findUnique({ where: { paymentIntentId: intent.id }, include: { items: true } });
  if (byIntent) return byIntent;
  return findIronSprueOrderFromStripeMetadata(intent.metadata, db);
}

function objectId(event: Stripe.Event) {
  const object = event.data.object as { id?: unknown };
  return typeof object.id === 'string' ? object.id : null;
}

async function beginIronSprueEventAudit(event: Stripe.Event, db: DatabaseClient) {
  try {
    return await db.ironSprueStripeWebhookEvent.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        stripeEventId: event.id,
        eventType: event.type,
        stripeObjectId: objectId(event),
      },
    });
  } catch (error) {
    if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'P2002') throw error;
    return db.ironSprueStripeWebhookEvent.findUniqueOrThrow({ where: { stripeEventId: event.id } });
  }
}

async function finishIronSprueEventAudit(eventId: string, state: 'PROCESSED' | 'IGNORED', outcome: string, orderId: string | null, db: DatabaseClient) {
  await db.ironSprueStripeWebhookEvent.update({
    where: { stripeEventId: eventId },
    data: { processingState: state, outcome, orderId, errorCode: null, processedAt: new Date() },
  });
}

async function failIronSprueEventAudit(eventId: string, errorCode: string, db: DatabaseClient) {
  await db.ironSprueStripeWebhookEvent.update({
    where: { stripeEventId: eventId },
    data: { processingState: 'FAILED', errorCode },
  });
}

export async function releaseIronSprueCheckoutOrderReservation(orderId: string, db: DatabaseClient = getIronSprueCommercePrisma(), status: 'CANCELED' | 'FAILED' = 'CANCELED') {
  return db.$transaction(async (tx) => {
    const order = await tx.ironSprueOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.paymentStatus === 'SUCCEEDED' || order.cancelledAt) return null;
    for (const item of order.items) {
      const inventory = await tx.ironSprueAdminInventory.findUnique({ where: { productId: item.productId } });
      if (!inventory) continue;
      await tx.ironSprueAdminInventory.update({
        where: { productId: item.productId },
        data: { reservedStock: Math.max(inventory.reservedStock - item.quantity, 0) },
      });
    }
    await tx.ironSprueOrder.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        paymentStatus: status === 'FAILED' ? 'FAILED' : 'CANCELED',
        cancelledAt: new Date(),
        reservationExpiresAt: null,
      },
    });
    return orderId;
  });
}

export async function releaseExpiredIronSprueCheckoutOrderReservations(db: DatabaseClient = getIronSprueCommercePrisma(), now = new Date()) {
  const expiredOrders = await db.ironSprueOrder.findMany({
    where: {
      storeCode: IRON_SPRUE_STORE_CODE,
      paymentStatus: { in: ['REQUIRES_PAYMENT', 'PROCESSING'] },
      cancelledAt: null,
      reservationExpiresAt: { lt: now },
    },
    select: { id: true },
    take: 100,
  });

  for (const order of expiredOrders) {
    await releaseIronSprueCheckoutOrderReservation(order.id, db, 'CANCELED');
  }

  await reconcileIronSprueReservedStock(db, now);

  return expiredOrders.length;
}

export async function cancelIronSprueCheckoutSession(sessionId: string, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) return null;
  const order = await db.ironSprueOrder.findFirst({
    where: {
      storeCode: IRON_SPRUE_STORE_CODE,
      stripeCheckoutSessionId: normalizedSessionId,
    },
    select: { id: true },
  });
  if (!order) return null;
  return releaseIronSprueCheckoutOrderReservation(order.id, db, 'CANCELED');
}

type StripeRefundResponse = {
  id: string;
  amount: number;
  status: string;
  created: number;
  payment_intent: string | null;
};

const merchantCancellationLockedFulfilmentStates = new Set(['SHIPPED', 'DISPATCHED', 'DELIVERED', 'COMPLETED']);

function isOrderAlreadyCancelledOrRefunded(order: IronSprueOrderRecord) {
  return Boolean(order.cancelledAt)
    || order.status === 'CANCELLED'
    || order.status === 'REFUNDED'
    || order.paymentStatus === 'CANCELED'
    || order.paymentStatus === 'REFUNDED'
    || order.fulfilmentStatus === 'CANCELLED';
}

function isMissingStripePaymentResourceError(error: unknown) {
  const parts: string[] = [];
  if (error instanceof Error) parts.push(error.message);
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    for (const key of ['message', 'code', 'type', 'param']) {
      if (typeof record[key] === 'string') parts.push(record[key] as string);
    }
    if (typeof record.raw === 'object' && record.raw !== null) {
      const raw = record.raw as Record<string, unknown>;
      for (const key of ['message', 'code', 'type', 'param']) {
        if (typeof raw[key] === 'string') parts.push(raw[key] as string);
      }
    }
  } else if (typeof error === 'string') {
    parts.push(error);
  }
  const fingerprint = parts.join(' ');
  return /no such payment_intent|no such payment intent|payment intent is missing|payment_intent.*missing|no such checkout\.session|checkout session.*missing|resource_missing/i.test(fingerprint);
}

export async function cancelIronSprueOrderForMerchant(input: {
  orderId: string;
  reason?: string | null;
  actorId?: string | null;
  environment?: CommerceEnvironment;
}, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const orderId = input.orderId.trim();
  if (!orderId) throw new Error('orderId is required.');
  let order = await db.ironSprueOrder.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.storeCode !== IRON_SPRUE_STORE_CODE) throw new Error('Iron Sprue order was not found.');
  if (isOrderAlreadyCancelledOrRefunded(order)) return mapOrderRecord(order);
  if (merchantCancellationLockedFulfilmentStates.has(order.fulfilmentStatus)) {
    throw new Error('This order has progressed beyond automatic cancellation.');
  }

  const cancelAndRestock = async (params: { refunded: boolean; reasonPrefix: string }) => {
    const trimmedReason = input.reason?.trim();
    const updated = await db.$transaction(async (tx) => {
      const current = await tx.ironSprueOrder.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!current) throw new Error('Iron Sprue order was not found.');
      if (isOrderAlreadyCancelledOrRefunded(current)) return current;

      for (const item of current.items) {
        const inventory = await tx.ironSprueAdminInventory.findUnique({ where: { productId: item.productId } });
        if (!inventory) continue;
        const afterQuantity = inventory.availableStock + item.quantity;
        await tx.ironSprueAdminInventory.update({
          where: { productId: item.productId },
          data: {
            availableStock: afterQuantity,
            reservedStock: Math.max(inventory.reservedStock - item.quantity, 0),
          },
        });
        await tx.ironSprueAdminStockMovement.create({
          data: {
            storeCode: IRON_SPRUE_STORE_CODE,
            productId: item.productId,
            movementType: params.refunded ? 'REFUND_RESTOCK' : 'CANCEL_RESTOCK',
            quantity: item.quantity,
            beforeQuantity: inventory.availableStock,
            afterQuantity,
            reason: trimmedReason
              ? `${params.reasonPrefix} ${current.orderNumber}: ${trimmedReason.slice(0, 160)}`
              : `${params.reasonPrefix} ${current.orderNumber}`,
            actorId: input.actorId ?? null,
          },
        });
      }

      return tx.ironSprueOrder.update({
        where: { id: current.id },
        data: {
          status: params.refunded ? 'REFUNDED' : 'CANCELLED',
          paymentStatus: params.refunded ? 'REFUNDED' : 'CANCELED',
          fulfilmentStatus: 'CANCELLED',
          cancelledAt: new Date(),
          reservationExpiresAt: null,
        },
        include: { items: true },
      });
    });
    return mapOrderRecord(updated);
  };

  const orderForStripeRefresh = order;
  if (orderForStripeRefresh.paymentStatus !== 'SUCCEEDED' && orderForStripeRefresh.stripeCheckoutSessionId) {
    const config = getStoreStripeConfig({
      store: IRON_SPRUE_STORE_CODE,
      ...(input.environment ? { environment: input.environment } : {}),
    });

    try {
      const session = await retrieveIronSprueStripeCheckoutSession(config.secretKey, orderForStripeRefresh.stripeCheckoutSessionId);
      if (session.payment_status === 'paid') {
        assertIronSprueStripeMetadata(session.metadata);
        if (session.amount_total !== orderForStripeRefresh.totalMinor || session.currency?.toUpperCase() !== orderForStripeRefresh.currency.toUpperCase()) {
          throw new Error('STRIPE_TOTAL_MISMATCH');
        }

        await finalizePaidIronSprueCheckoutOrder({
          orderId: orderForStripeRefresh.id,
          paymentIntentId: paymentIntentId(session.payment_intent),
          stripeCheckoutSessionId: session.id,
        }, db);
        const refreshed = await db.ironSprueOrder.findUnique({ where: { id: orderForStripeRefresh.id }, include: { items: true } });
        if (refreshed) order = refreshed;
      }
    } catch (error) {
      if (!isMissingStripePaymentResourceError(error)) throw error;
    }
  }

  if (!order) throw new Error('Iron Sprue order was not found.');

  if (order.paymentStatus === 'SUCCEEDED') {
    const config = getStoreStripeConfig({
      store: IRON_SPRUE_STORE_CODE,
      ...(input.environment ? { environment: input.environment } : {}),
    });
    let refundablePaymentIntentId = order.paymentIntentId;
    if (!refundablePaymentIntentId && order.stripeCheckoutSessionId) {
      try {
        const session = await retrieveIronSprueStripeCheckoutSession(config.secretKey, order.stripeCheckoutSessionId);
        refundablePaymentIntentId = paymentIntentId(session.payment_intent);
        if (refundablePaymentIntentId) {
          await db.ironSprueOrder.update({
            where: { id: order.id },
            data: { paymentIntentId: refundablePaymentIntentId },
          });
        }
      } catch (error) {
        if (!isMissingStripePaymentResourceError(error)) throw error;
      }
    }
    if (!refundablePaymentIntentId) {
      return cancelAndRestock({ refunded: false, reasonPrefix: 'Cancelled order without refundable Stripe payment' });
    }
    const refundBody = new URLSearchParams();
    refundBody.set('payment_intent', refundablePaymentIntentId);
    refundBody.set('amount', String(order.totalMinor));
    refundBody.set('reason', 'requested_by_customer');
    refundBody.set('metadata[store]', IRON_SPRUE_STORE_CODE);
    refundBody.set('metadata[orderId]', order.id);
    refundBody.set('metadata[orderNumber]', order.orderNumber);
    const trimmedReason = input.reason?.trim();
    if (trimmedReason) refundBody.set('metadata[cancellationReason]', trimmedReason.slice(0, 450));

    try {
      await stripeRequest<StripeRefundResponse>(config.secretKey, 'refunds', refundBody, {
        idempotencyKey: `iron-sprue-order-cancel-${order.id}`,
    });
    } catch (error) {
      if (!isMissingStripePaymentResourceError(error)) throw error;
      return cancelAndRestock({ refunded: false, reasonPrefix: 'Cancelled order without refundable Stripe payment' });
    }

    return cancelAndRestock({ refunded: true, reasonPrefix: 'Refunded order' });
  }

  await releaseIronSprueCheckoutOrderReservation(order.id, db, order.paymentStatus === 'FAILED' ? 'FAILED' : 'CANCELED');
  const updated = await db.ironSprueOrder.findUnique({ where: { id: order.id }, include: { items: true } });
  return updated ? mapOrderRecord(updated) : null;
}

export async function refundIronSprueOrderForMerchant(input: {
  orderId: string;
  amountMinor: number;
  reason?: string | null;
  actorId?: string | null;
  idempotencyKey?: string | null;
  environment?: CommerceEnvironment;
}, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const orderId = input.orderId.trim();
  const amountMinor = Math.max(0, Math.trunc(input.amountMinor));
  if (!orderId) throw new Error('orderId is required.');
  if (amountMinor <= 0) throw new Error('Refund amount must be greater than zero.');
  const order = await db.ironSprueOrder.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.storeCode !== IRON_SPRUE_STORE_CODE) throw new Error('Iron Sprue order was not found.');
  if (order.paymentStatus !== 'SUCCEEDED' && order.paymentStatus !== 'REFUNDED') {
    throw new Error('Only paid Iron Sprue orders can be refunded.');
  }
  const alreadyRefunded = order.refundedMinor ?? 0;
  const refundableMinor = Math.max(order.totalMinor - alreadyRefunded, 0);
  if (amountMinor > refundableMinor) throw new Error('Refund amount exceeds the remaining refundable total.');

  const config = getStoreStripeConfig({
    store: IRON_SPRUE_STORE_CODE,
    ...(input.environment ? { environment: input.environment } : {}),
  });
  let refundablePaymentIntentId = order.paymentIntentId;
  if (!refundablePaymentIntentId && order.stripeCheckoutSessionId) {
    try {
      const session = await retrieveIronSprueStripeCheckoutSession(config.secretKey, order.stripeCheckoutSessionId);
      refundablePaymentIntentId = paymentIntentId(session.payment_intent);
      if (refundablePaymentIntentId) {
        await db.ironSprueOrder.update({
          where: { id: order.id },
          data: { paymentIntentId: refundablePaymentIntentId },
        });
      }
    } catch (error) {
      if (!isMissingStripePaymentResourceError(error)) throw error;
    }
  }
  if (!refundablePaymentIntentId) throw new Error('No refundable Stripe payment was found for this order.');

  const refundBody = new URLSearchParams();
  refundBody.set('payment_intent', refundablePaymentIntentId);
  refundBody.set('amount', String(amountMinor));
  refundBody.set('reason', 'requested_by_customer');
  refundBody.set('metadata[store]', IRON_SPRUE_STORE_CODE);
  refundBody.set('metadata[orderId]', order.id);
  refundBody.set('metadata[orderNumber]', order.orderNumber);
  const trimmedReason = input.reason?.trim();
  if (trimmedReason) refundBody.set('metadata[refundReason]', trimmedReason.slice(0, 450));

  const refund = await stripeRequest<StripeRefundResponse>(config.secretKey, 'refunds', refundBody, {
    idempotencyKey: input.idempotencyKey?.trim() || `iron-sprue-order-refund-${order.id}-${alreadyRefunded}-${amountMinor}`,
  });

  const nextRefundedMinor = alreadyRefunded + amountMinor;
  const updated = await db.ironSprueOrder.update({
    where: { id: order.id },
    data: {
      refundedMinor: nextRefundedMinor,
      refundedAt: new Date(),
      paymentStatus: nextRefundedMinor >= order.totalMinor ? 'REFUNDED' : order.paymentStatus,
      status: nextRefundedMinor >= order.totalMinor ? 'REFUNDED' : order.status,
    },
    include: { items: true },
  });

  return { order: mapOrderRecord(updated), refund };
}

export async function reconcileIronSprueReservedStock(db: DatabaseClient = getIronSprueCommercePrisma(), now = new Date()) {
  const [reservedRows, activeOrders] = await Promise.all([
    db.ironSprueAdminInventory.findMany({
      where: {
        storeCode: IRON_SPRUE_STORE_CODE,
        reservedStock: { gt: 0 },
      },
      select: {
        productId: true,
        reservedStock: true,
      },
    }),
    db.ironSprueOrder.findMany({
      where: {
        storeCode: IRON_SPRUE_STORE_CODE,
        paymentStatus: { in: ['REQUIRES_PAYMENT', 'PROCESSING'] },
        cancelledAt: null,
        reservationExpiresAt: { gt: now },
      },
      select: {
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    }),
  ]);

  const expectedReservedByProductId = new Map<string, number>();
  for (const order of activeOrders) {
    for (const item of order.items) {
      expectedReservedByProductId.set(
        item.productId,
        (expectedReservedByProductId.get(item.productId) ?? 0) + item.quantity,
      );
    }
  }

  let reconciled = 0;
  for (const row of reservedRows) {
    const expectedReserved = expectedReservedByProductId.get(row.productId) ?? 0;
    if (row.reservedStock === expectedReserved) continue;
    await db.ironSprueAdminInventory.update({
      where: { productId: row.productId },
      data: { reservedStock: expectedReserved },
    });
    reconciled += 1;
  }

  return reconciled;
}

export async function finalizePaidIronSprueCheckoutOrder(input: { orderId: string; paymentIntentId: string | null; stripeCheckoutSessionId: string | null }, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const order = await db.$transaction(async (tx) => {
    const current = await tx.ironSprueOrder.findUnique({ where: { id: input.orderId }, include: { items: true } });
    if (!current) throw new Error('IRON_SPRUE_ORDER_NOT_FOUND');
    if (current.paymentStatus === 'SUCCEEDED') {
      if ((input.paymentIntentId && !current.paymentIntentId) || (input.stripeCheckoutSessionId && !current.stripeCheckoutSessionId)) {
        return tx.ironSprueOrder.update({
          where: { id: input.orderId },
          data: {
            ...(input.paymentIntentId && !current.paymentIntentId ? { paymentIntentId: input.paymentIntentId } : {}),
            ...(input.stripeCheckoutSessionId && !current.stripeCheckoutSessionId ? { stripeCheckoutSessionId: input.stripeCheckoutSessionId } : {}),
          },
          include: { items: true },
        });
      }
      return current;
    }
    for (const item of current.items) {
      const inventory = await tx.ironSprueAdminInventory.findUnique({ where: { productId: item.productId } });
      if (!inventory) throw new Error('IRON_SPRUE_INVENTORY_NOT_FOUND');
      await tx.ironSprueAdminInventory.update({
        where: { productId: item.productId },
        data: {
          availableStock: Math.max(inventory.availableStock - item.quantity, 0),
          reservedStock: Math.max(inventory.reservedStock - item.quantity, 0),
        },
      });
      await tx.ironSprueAdminStockMovement.create({
        data: {
          storeCode: IRON_SPRUE_STORE_CODE,
          productId: item.productId,
          movementType: 'SALE',
          quantity: -item.quantity,
          beforeQuantity: inventory.availableStock,
          afterQuantity: Math.max(inventory.availableStock - item.quantity, 0),
          reason: `Stripe paid order ${current.orderNumber}`,
        },
      });
    }
    if (current.userId) {
      await tx.ironSprueCartItem.deleteMany({ where: { cart: { userId: current.userId } } });
    }
    if (current.discountCode && current.discountMinor > 0) {
      const discountCode = await tx.ironSprueDiscountCode.findUnique({
        where: { storeCode_code: { storeCode: IRON_SPRUE_STORE_CODE, code: current.discountCode } },
        select: { id: true },
      });
      if (discountCode) {
        await tx.ironSprueDiscountRedemption.upsert({
          where: { discountCodeId_orderId: { discountCodeId: discountCode.id, orderId: current.id } },
          create: {
            storeCode: IRON_SPRUE_STORE_CODE,
            discountCodeId: discountCode.id,
            orderId: current.id,
            userId: current.userId,
            email: current.shippingEmail.toLowerCase(),
            amountMinor: current.discountMinor,
          },
          update: {
            userId: current.userId,
            email: current.shippingEmail.toLowerCase(),
            amountMinor: current.discountMinor,
          },
        });
      }
    }
    return tx.ironSprueOrder.update({
      where: { id: input.orderId },
      data: {
        status: 'PAID',
        paymentStatus: 'SUCCEEDED',
        paymentProvider: 'STRIPE',
        paymentIntentId: input.paymentIntentId,
        ...(input.stripeCheckoutSessionId ? { stripeCheckoutSessionId: input.stripeCheckoutSessionId } : {}),
        paidAt: new Date(),
        reservationExpiresAt: null,
      },
      include: { items: true },
    });
  });
  return mapOrderRecord(order);
}

async function processIronSprueCompletedSession(session: Stripe.Checkout.Session, event: Stripe.Event, db: DatabaseClient) {
  const order = await findIronSprueOrderForSession(session, db);
  if (!order) return { outcome: 'unknown_checkout_session', orderId: null };
  const config = getStoreStripeConfig({ store: IRON_SPRUE_STORE_CODE, environment: event.livemode ? 'live' : 'test' });
  assertStripeEventMatchesStore({
    expected: config,
    orderStore: order.storeCode,
    eventAccountId: event.account ?? null,
    eventLivemode: event.livemode,
  });
  assertIronSprueStripeMetadata(session.metadata);
  if (session.payment_status !== 'paid') return { outcome: 'payment_not_paid', orderId: order.id };
  if (session.amount_total !== order.totalMinor || session.currency?.toUpperCase() !== order.currency.toUpperCase()) {
    throw new Error('STRIPE_TOTAL_MISMATCH');
  }
  await finalizePaidIronSprueCheckoutOrder({
    orderId: order.id,
    paymentIntentId: paymentIntentId(session.payment_intent),
    stripeCheckoutSessionId: session.id,
  }, db);
  return { outcome: 'payment_finalized', orderId: order.id };
}

async function processIronSprueExpiredSession(session: Stripe.Checkout.Session, db: DatabaseClient) {
  const order = await findIronSprueOrderForSession(session, db);
  if (!order) return { outcome: 'unknown_checkout_session', orderId: null };
  await releaseIronSprueCheckoutOrderReservation(order.id, db, 'CANCELED');
  return { outcome: 'reservation_released', orderId: order.id };
}

async function processIronSprueFailedSession(session: Stripe.Checkout.Session, db: DatabaseClient) {
  const order = await findIronSprueOrderForSession(session, db);
  if (!order) return { outcome: 'unknown_checkout_session', orderId: null };
  await releaseIronSprueCheckoutOrderReservation(order.id, db, 'FAILED');
  return { outcome: 'payment_failed', orderId: order.id };
}

async function processIronSprueFailedPayment(intent: Stripe.PaymentIntent, db: DatabaseClient) {
  const order = await findIronSprueOrderForPaymentIntent(intent, db);
  if (!order) return { outcome: 'unknown_payment_intent', orderId: null };
  await releaseIronSprueCheckoutOrderReservation(order.id, db, 'FAILED');
  return { outcome: 'payment_failed', orderId: order.id };
}

async function processIronSprueSucceededPayment(intent: StripePaymentIntentSnapshot, event: Stripe.Event, db: DatabaseClient) {
  const order = await findIronSprueOrderForPaymentIntent(intent as Stripe.PaymentIntent, db);
  if (!order) return { outcome: 'unknown_payment_intent', orderId: null };
  const config = getStoreStripeConfig({ store: IRON_SPRUE_STORE_CODE, environment: event.livemode ? 'live' : 'test' });
  assertStripeEventMatchesStore({
    expected: config,
    orderStore: order.storeCode,
    eventAccountId: event.account ?? null,
    eventLivemode: event.livemode,
  });
  assertIronSprueStripeMetadata(intent.metadata);
  if (intent.status !== 'succeeded') return { outcome: 'payment_not_succeeded', orderId: order.id };
  const paidMinor = typeof intent.amount_received === 'number' && intent.amount_received > 0
    ? intent.amount_received
    : intent.amount;
  if (paidMinor !== order.totalMinor || intent.currency?.toUpperCase() !== order.currency.toUpperCase()) {
    throw new Error('STRIPE_TOTAL_MISMATCH');
  }
  await finalizePaidIronSprueCheckoutOrder({
    orderId: order.id,
    paymentIntentId: intent.id,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
  }, db);
  return { outcome: 'payment_finalized', orderId: order.id };
}

export async function processIronSprueStripeWebhookEvent(event: Stripe.Event, db: DatabaseClient = getIronSprueCommercePrisma()): Promise<IronSprueStripeWebhookProcessingResult> {
  const audit = await beginIronSprueEventAudit(event, db);
  if (audit.processedAt) return { eventId: event.id, eventType: event.type, outcome: 'duplicate', orderId: audit.orderId };
  try {
    let result: { outcome: string; orderId: string | null } | null = null;
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      result = await processIronSprueCompletedSession(event.data.object as Stripe.Checkout.Session, event, db);
    } else if (event.type === 'checkout.session.expired') {
      result = await processIronSprueExpiredSession(event.data.object as Stripe.Checkout.Session, db);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      result = await processIronSprueFailedSession(event.data.object as Stripe.Checkout.Session, db);
    } else if (event.type === 'payment_intent.succeeded') {
      result = await processIronSprueSucceededPayment(event.data.object as StripePaymentIntentSnapshot, event, db);
    } else if (event.type === 'payment_intent.payment_failed') {
      result = await processIronSprueFailedPayment(event.data.object as Stripe.PaymentIntent, db);
    }
    if (!result) {
      await finishIronSprueEventAudit(event.id, 'IGNORED', 'unsupported_event', null, db);
      return { eventId: event.id, eventType: event.type, outcome: 'ignored', orderId: null };
    }
    const ignored = result.orderId === null || result.outcome === 'payment_not_paid' || result.outcome === 'payment_not_succeeded';
    await finishIronSprueEventAudit(event.id, ignored ? 'IGNORED' : 'PROCESSED', result.outcome, result.orderId, db);
    return { eventId: event.id, eventType: event.type, outcome: ignored ? 'ignored' : 'processed', orderId: result.orderId };
  } catch (error) {
    const errorCode = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'IRON_SPRUE_WEBHOOK_PROCESSING_FAILED';
    await failIronSprueEventAudit(event.id, errorCode, db);
    throw error;
  }
}

export async function getIronSprueOrderByStripeCheckoutSessionId(sessionId: string, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const order = await db.ironSprueOrder.findUnique({ where: { stripeCheckoutSessionId: sessionId }, include: { items: true } });
  return order ? mapOrderRecord(order) : null;
}

export async function getIronSprueOrderByStripePaymentIntentId(paymentIntentId: string, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const order = await db.ironSprueOrder.findUnique({ where: { paymentIntentId }, include: { items: true } });
  return order ? mapOrderRecord(order) : null;
}

export async function getIronSprueCustomerOrders(userId: string, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const orders = await db.ironSprueOrder.findMany({
    where: { storeCode: IRON_SPRUE_STORE_CODE, userId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(mapOrderRecord);
}

export async function getIronSprueCustomerOrderByNumber(userId: string, orderNumber: string, db: DatabaseClient = getIronSprueCommercePrisma()) {
  const order = await db.ironSprueOrder.findFirst({
    where: { storeCode: IRON_SPRUE_STORE_CODE, userId, orderNumber },
    include: { items: true },
  });
  return order ? mapOrderRecord(order) : null;
}
