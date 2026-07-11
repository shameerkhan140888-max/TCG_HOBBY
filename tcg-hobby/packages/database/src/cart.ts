import type { CartLineItem, CartSummary } from '@tcg-hobby/types';
import type { Prisma } from '@prisma/client';
import { prisma } from './client';
import { calculateCartSummary, calculateLineTotal, validateQuantityAgainstAvailability } from './commerce';

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
  const product = await db.product.findUnique({
    where: { id: productId },
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
