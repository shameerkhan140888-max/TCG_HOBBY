import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { CartLineItem } from '@tcg-hobby/types';
import {
  addProductToCart as addMemberCartItem,
  clearCart as clearMemberCart,
  getCatalogueProductById,
  getCustomerCartDetails,
  hasFreeUkStandardShipping,
  prisma,
  removeCartItem as removeMemberCartItem,
  updateCartItemQuantity as updateMemberCartItemQuantity,
  validateQuantityAgainstAvailability,
  validateQuantityAgainstPurchaseLimit,
} from '@tcg-hobby/database';
import { getCurrentCustomerSession } from './auth';

const GUEST_CART_COOKIE = 'tcg-hobby-basket';

type GuestCartEntry = {
  productId: string;
  quantity: number;
};

type CartProductRow = {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  currency: string;
  inventory: {
    stockOnHand: number;
    reservedStock: number;
  } | null;
  customerPurchaseLimit: number | null;
  freeUkStandardShipping: boolean;
};

type CartSnapshot = Awaited<ReturnType<typeof getCustomerCartDetails>>;

function resolveReturnTo(value: FormDataEntryValue | null, fallback = '/cart') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value;
}

function resolveQuantity(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(typeof value === 'string' ? value : '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getGuestCartCookieValue(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore.get(GUEST_CART_COOKIE)?.value ?? '[]';
}

function parseGuestCartEntries(value: string): GuestCartEntry[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        const candidate = entry as Partial<GuestCartEntry>;
        const productId = typeof candidate.productId === 'string' ? candidate.productId : '';
        const quantity = Number.parseInt(String(candidate.quantity ?? '0'), 10);

        if (!productId || !Number.isInteger(quantity) || quantity < 1) {
          return null;
        }

        return { productId, quantity };
      })
      .filter((entry): entry is GuestCartEntry => entry !== null);
  } catch {
    return [];
  }
}

async function getGuestCartEntries() {
  const cookieStore = await cookies();
  return parseGuestCartEntries(getGuestCartCookieValue(cookieStore));
}

async function setGuestCartEntries(entries: GuestCartEntry[]) {
  const cookieStore = await cookies();
  if (!entries.length) {
    cookieStore.delete(GUEST_CART_COOKIE);
    return;
  }

  cookieStore.set(GUEST_CART_COOKIE, JSON.stringify(entries), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function loadGuestCartSnapshot(db = prisma): Promise<CartSnapshot> {
  const entries = await getGuestCartEntries();
  if (!entries.length) {
    return {
      cartId: null,
      items: [],
      subtotalMinor: 0,
      currency: 'GBP',
      totalItems: 0,
    };
  }

  const products = await Promise.all(
    entries.map(async (entry) => {
      const product = await getCatalogueProductById(entry.productId);
      if (!product) {
        return null;
      }

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        priceMinor: product.price.amountMinor,
        currency: product.price.currency,
        inventory: {
          stockOnHand: product.stockOnHand,
          reservedStock: product.reservedStock,
        },
        customerPurchaseLimit: product.customerPurchaseLimit ?? null,
        freeUkStandardShipping: product.freeUkStandardShipping ?? hasFreeUkStandardShipping(product.slug),
      } as CartProductRow;
    }),
  );

  const productsById = new Map(
    products
      .filter((product): product is CartProductRow => product !== null)
      .map((product) => [product.id, product] as const),
  );
  const items: CartLineItem[] = entries.flatMap((entry) => {
    const product = productsById.get(entry.productId);
    if (!product) {
      return [];
    }

    const available = product.inventory ? product.inventory.stockOnHand - product.inventory.reservedStock : 0;
    return [
      {
        id: `${entry.productId}-guest`,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        quantity: entry.quantity,
        unitPriceMinor: product.priceMinor,
        totalMinor: product.priceMinor * entry.quantity,
        inStock: available > 0,
        customerPurchaseLimit: product.customerPurchaseLimit,
        freeUkStandardShipping: product.freeUkStandardShipping,
      },
    ];
  });

  return {
    cartId: null,
    items,
    subtotalMinor: items.reduce((subtotal, item) => subtotal + item.totalMinor, 0),
    currency: 'GBP',
    totalItems: items.reduce((count, item) => count + item.quantity, 0),
  };
}

async function loadProductForCart(productId: string, db = prisma) {
  const product = await getCatalogueProductById(productId);

  if (!product) {
    return null;
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceMinor: product.price.amountMinor,
    currency: product.price.currency,
    inventory: {
      stockOnHand: product.stockOnHand,
      reservedStock: product.reservedStock,
    },
    customerPurchaseLimit: product.customerPurchaseLimit ?? null,
    freeUkStandardShipping: product.freeUkStandardShipping ?? hasFreeUkStandardShipping(product.slug),
  } as CartProductRow;
}

async function addGuestCartItem(productId: string, quantity: number, db = prisma) {
  const product = await loadProductForCart(productId, db);
  if (!product) {
    throw new Error('The selected product is unavailable.');
  }

  const inventory = product.inventory;
  if (!inventory) {
    throw new Error('The selected product is unavailable.');
  }

  const available = inventory.stockOnHand - inventory.reservedStock;
  const validation = validateQuantityAgainstAvailability(quantity, available);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const entries = await getGuestCartEntries();
  const existing = entries.find((item) => item.productId === productId);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  const nextValidation = validateQuantityAgainstAvailability(nextQuantity, available);
  if (!nextValidation.ok) {
    throw new Error(nextValidation.message);
  }
  const limitValidation = validateQuantityAgainstPurchaseLimit(nextQuantity, product.customerPurchaseLimit);
  if (!limitValidation.ok) {
    throw new Error(limitValidation.message);
  }

  if (existing) {
    existing.quantity = nextQuantity;
  } else {
    entries.push({ productId, quantity: nextQuantity });
  }

  await setGuestCartEntries(entries);
  return loadGuestCartSnapshot(db);
}

async function updateGuestCartItem(productId: string, quantity: number, db = prisma) {
  const product = await loadProductForCart(productId, db);
  if (!product) {
    throw new Error('The selected product is unavailable.');
  }

  const inventory = product.inventory;
  if (!inventory) {
    throw new Error('The selected product is unavailable.');
  }

  const available = inventory.stockOnHand - inventory.reservedStock;
  const entries = await getGuestCartEntries();
  const index = entries.findIndex((item) => item.productId === productId);

  if (quantity <= 0) {
    if (index >= 0) {
      entries.splice(index, 1);
      await setGuestCartEntries(entries);
    }
    return loadGuestCartSnapshot(db);
  }

  const validation = validateQuantityAgainstAvailability(quantity, available);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  const limitValidation = validateQuantityAgainstPurchaseLimit(quantity, product.customerPurchaseLimit);
  if (!limitValidation.ok) {
    throw new Error(limitValidation.message);
  }

  if (index >= 0) {
    entries[index] = { productId, quantity };
  } else {
    entries.push({ productId, quantity });
  }

  await setGuestCartEntries(entries);
  return loadGuestCartSnapshot(db);
}

async function removeGuestCartItem(productId: string, db = prisma) {
  const entries = await getGuestCartEntries();
  const nextEntries = entries.filter((item) => item.productId !== productId);
  await setGuestCartEntries(nextEntries);
  return loadGuestCartSnapshot(db);
}

export async function clearGuestCart() {
  await setGuestCartEntries([]);
}

export async function getCurrentCustomerCart(): Promise<CartSnapshot> {
  const session = await getCurrentCustomerSession();

  if (session?.user.role === 'CUSTOMER') {
    return getCustomerCartDetails(session.user.id);
  }

  return loadGuestCartSnapshot();
}

export async function addToCartAction(formData: FormData) {
  'use server';

  const session = await getCurrentCustomerSession();
  const productId = String(formData.get('productId') ?? '');
  const quantity = resolveQuantity(formData.get('quantity'));
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(`${returnTo}?cartError=missing-product`);
  }

  try {
    if (session?.user.role === 'CUSTOMER') {
      await addMemberCartItem(session.user.id, productId, quantity);
    } else {
      await addGuestCartItem(productId, quantity);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to add item to basket.';
    redirect(`${returnTo}?cartError=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}

export async function updateCartQuantityAction(formData: FormData) {
  'use server';

  const session = await getCurrentCustomerSession();
  const productId = String(formData.get('productId') ?? '');
  const quantity = Number.parseInt(String(formData.get('quantity') ?? '1'), 10);
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(`${returnTo}?cartError=missing-product`);
  }

  try {
    if (session?.user.role === 'CUSTOMER') {
      await updateMemberCartItemQuantity(session.user.id, productId, Number.isFinite(quantity) ? quantity : 1);
    } else {
      await updateGuestCartItem(productId, Number.isFinite(quantity) ? quantity : 1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update basket item.';
    redirect(`${returnTo}?cartError=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}

export async function removeCartItemAction(formData: FormData) {
  'use server';

  const session = await getCurrentCustomerSession();
  const productId = String(formData.get('productId') ?? '');
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(`${returnTo}?cartError=missing-product`);
  }

  if (session?.user.role === 'CUSTOMER') {
    await removeMemberCartItem(session.user.id, productId);
  } else {
    await removeGuestCartItem(productId);
  }

  redirect(returnTo);
}

export async function clearCartAction(formData: FormData) {
  'use server';

  const session = await getCurrentCustomerSession();
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (session?.user.role === 'CUSTOMER') {
    await clearMemberCart(session.user.id);
  } else {
    await clearGuestCart();
  }

  redirect(returnTo);
}
