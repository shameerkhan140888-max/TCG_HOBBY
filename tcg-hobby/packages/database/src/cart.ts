import type { CartLineItem, CartSummary, PublicBasketInputItem } from '@tcg-hobby/types';
import type { Prisma } from '@prisma/client';
import { prisma } from './client';
import {
  calculateCartSummary,
  calculateLineTotal,
  hasFreeUkStandardShipping,
  validateQuantityAgainstAvailability,
  validateQuantityAgainstPurchaseLimit,
} from './commerce';
import { getStorefrontPublicProductWhere } from './product-visibility';

const cartRecordInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        include: {
          inventory: true,
        },
      },
    },
  },
} as const satisfies Prisma.CartInclude;

type CartRecord = Prisma.CartGetPayload<{ include: typeof cartRecordInclude }>;
type CartItemRow = CartRecord['items'][number];

const cartProductInclude = {
  inventory: true,
} as const satisfies Prisma.ProductInclude;

export type CartProductRow = Prisma.ProductGetPayload<{ include: typeof cartProductInclude }>;

export type CartSnapshot = CartSummary & {
  cartId: string | null;
};

export async function getAvailableStockByProductIds(productIds: string[], db = prisma): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await db.inventoryItem.findMany({
    where: { productId: { in: Array.from(new Set(productIds)) } },
    select: { productId: true, stockOnHand: true, reservedStock: true },
  });
  return new Map(rows.map((row) => [row.productId, Math.max(row.stockOnHand - row.reservedStock, 0)]));
}

export async function resolveGuestCart(items: PublicBasketInputItem[], db = prisma): Promise<CartSnapshot> {
  const quantities = new Map<string, number>();

  for (const item of items.slice(0, 50)) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error('Basket items must include a valid product and quantity.');
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  if (quantities.size === 0) {
    return { cartId: null, items: [], subtotalMinor: 0, currency: 'GBP', totalItems: 0 };
  }

  const products = await db.product.findMany({
    where: getStorefrontPublicProductWhere({
      id: { in: Array.from(quantities.keys()) },
      releaseStatus: 'RELEASED',
    }),
    include: cartProductInclude,
  });
  const productsById = new Map(products.map((product) => [product.id, product]));
  const resolvedItems: CartLineItem[] = [];

  for (const [productId, quantity] of quantities) {
    const product = productsById.get(productId);
    if (!product?.inventory) {
      throw new Error('A selected product is unavailable.');
    }

    const available = product.inventory.stockOnHand - product.inventory.reservedStock;
    assertAvailableQuantity(quantity, available);
    assertPurchaseLimit(quantity, product.customerPurchaseLimit);
    resolvedItems.push({
      id: `${product.id}-guest`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      quantity,
      unitPriceMinor: product.priceMinor,
      totalMinor: calculateLineTotal(product.priceMinor, quantity),
      inStock: available > 0,
      customerPurchaseLimit: product.customerPurchaseLimit,
      freeUkStandardShipping: product.freeUkStandardShipping || hasFreeUkStandardShipping(product.slug),
    });
  }

  return { cartId: null, ...calculateCartSummary(resolvedItems, 'GBP') };
}

function mapCartItemRow(item: CartItemRow): CartLineItem {
  const inventory = item.product.inventory;
  const available = inventory ? inventory.stockOnHand - inventory.reservedStock : 0;

  return {
    id: item.id,
    productId: item.product.id,
    productName: item.product.name,
    productSlug: item.product.slug,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
    totalMinor: calculateLineTotal(item.unitPriceMinor, item.quantity),
    inStock: available > 0,
    customerPurchaseLimit: item.product.customerPurchaseLimit,
    freeUkStandardShipping: item.product.freeUkStandardShipping || hasFreeUkStandardShipping(item.product.slug),
  };
}

async function ensureCart(userId: string, db = prisma) {
  const cart = await db.cart.findUnique({ where: { userId } });

  if (cart) {
    return cart;
  }

  return db.cart.create({
    data: {
      userId,
    },
  });
}

async function getCartRecord(userId: string, db = prisma): Promise<CartRecord | null> {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: cartRecordInclude,
  });

  return cart;
}

export async function getCartSnapshot(userId: string, db = prisma): Promise<CartSnapshot | null> {
  const cart = await getCartRecord(userId, db);

  if (!cart) {
    return null;
  }

  const items = cart.items.map(mapCartItemRow);

  return {
    cartId: cart.id,
    ...calculateCartSummary(items, cart.currency as CartSummary['currency']),
  };
}

async function loadProductForCart(db = prisma, productId: string) {
  const product = await db.product.findFirst({
    where: getStorefrontPublicProductWhere({
      id: productId,
      releaseStatus: 'RELEASED',
    }),
    include: cartProductInclude,
  });

  if (!product || !product.inventory) {
    return null;
  }

  return product;
}

function assertAvailableQuantity(quantity: number, available: number) {
  const result = validateQuantityAgainstAvailability(quantity, available);

  if (!result.ok) {
    throw new Error(result.message);
  }
}

function assertPurchaseLimit(quantity: number, limit: number | null | undefined) {
  const result = validateQuantityAgainstPurchaseLimit(quantity, limit);

  if (!result.ok) {
    throw new Error(result.message);
  }
}

export async function getCustomerCart(userId: string, db = prisma): Promise<CartSummary> {
  const cart = await getCartRecord(userId, db);

  if (!cart) {
    return {
      items: [],
      subtotalMinor: 0,
      currency: 'GBP',
      totalItems: 0,
    };
  }

  const items = cart.items.map(mapCartItemRow);
  return calculateCartSummary(items, cart.currency as CartSummary['currency']);
}

export async function getCustomerCartDetails(userId: string, db = prisma): Promise<CartSnapshot> {
  const cart = await getCartRecord(userId, db);

  if (!cart) {
    return {
      cartId: null as string | null,
      ...await getCustomerCart(userId, db),
    };
  }

  const items = cart.items.map(mapCartItemRow);
  return {
    cartId: cart.id,
    ...calculateCartSummary(items, cart.currency as CartSummary['currency']),
  };
}

export async function getCartItemQuantity(userId: string, productId: string, db = prisma) {
  const cart = await db.cart.findUnique({
    where: { userId },
    select: {
      items: {
        where: { productId },
        select: { quantity: true },
      },
    },
  });

  return cart?.items[0]?.quantity ?? 0;
}

export async function addProductToCart(userId: string, productId: string, quantity = 1, db = prisma) {
  const product = await loadProductForCart(db, productId);
  if (!product) {
    throw new Error('The selected product is unavailable.');
  }

  const inventory = product.inventory;
  if (!inventory) {
    throw new Error('The selected product is unavailable.');
  }

  const available = inventory.stockOnHand - inventory.reservedStock;
  const cart = await ensureCart(userId, db);
  const existingQuantity = await getCartItemQuantity(userId, productId, db);
  const nextQuantity = existingQuantity + quantity;
  assertAvailableQuantity(nextQuantity, available);
  assertPurchaseLimit(nextQuantity, product.customerPurchaseLimit);

  await db.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
    create: {
      cartId: cart.id,
      productId,
      productName: product.name,
      productSlug: product.slug,
      quantity: nextQuantity,
      unitPriceMinor: product.priceMinor,
    },
    update: {
      quantity: nextQuantity,
      unitPriceMinor: product.priceMinor,
      productName: product.name,
      productSlug: product.slug,
    },
  });

  return getCustomerCartDetails(userId, db);
}

export async function updateCartItemQuantity(userId: string, productId: string, quantity: number, db = prisma) {
  const product = await loadProductForCart(db, productId);
  if (!product) {
    throw new Error('The selected product is unavailable.');
  }

  const inventory = product.inventory;
  if (!inventory) {
    throw new Error('The selected product is unavailable.');
  }

  const available = inventory.stockOnHand - inventory.reservedStock;
  const cart = await ensureCart(userId, db);

  if (quantity <= 0) {
    await db.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });
    return getCustomerCartDetails(userId, db);
  }

  assertAvailableQuantity(quantity, available);
  assertPurchaseLimit(quantity, product.customerPurchaseLimit);

  await db.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
    create: {
      cartId: cart.id,
      productId,
      productName: product.name,
      productSlug: product.slug,
      quantity,
      unitPriceMinor: product.priceMinor,
    },
    update: {
      quantity,
      unitPriceMinor: product.priceMinor,
      productName: product.name,
      productSlug: product.slug,
    },
  });

  return getCustomerCartDetails(userId, db);
}

export async function removeCartItem(userId: string, productId: string, db = prisma) {
  const cart = await ensureCart(userId, db);

  await db.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  return getCustomerCartDetails(userId, db);
}

export async function clearCart(userId: string, db = prisma) {
  const cart = await db.cart.findUnique({ where: { userId } });

  if (!cart) {
    return getCustomerCartDetails(userId, db);
  }

  await db.cartItem.deleteMany({
    where: {
      cartId: cart.id,
    },
  });

  return getCustomerCartDetails(userId, db);
}
