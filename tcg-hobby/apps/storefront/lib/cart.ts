import 'server-only';

import {
  addProductToCart,
  clearCart,
  getCustomerCartDetails,
  removeCartItem,
  updateCartItemQuantity,
} from '@tcg-hobby/database';
import { redirect } from 'next/navigation';
import { requireCustomerSession } from './auth';

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

export async function getCurrentCustomerCart() {
  const session = await requireCustomerSession('/login?callbackUrl=%2Fcart');
  return getCustomerCartDetails(session.user.id);
}

export async function addToCartAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/login?callbackUrl=%2Fcart');
  const productId = String(formData.get('productId') ?? '');
  const quantity = resolveQuantity(formData.get('quantity'));
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(`${returnTo}?cartError=missing-product`);
  }

  try {
    await addProductToCart(session.user.id, productId, quantity);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to add item to cart.';
    redirect(`${returnTo}?cartError=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}

export async function updateCartQuantityAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/login?callbackUrl=%2Fcart');
  const productId = String(formData.get('productId') ?? '');
  const quantity = Number.parseInt(String(formData.get('quantity') ?? '1'), 10);
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(`${returnTo}?cartError=missing-product`);
  }

  try {
    await updateCartItemQuantity(session.user.id, productId, Number.isFinite(quantity) ? quantity : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update cart item.';
    redirect(`${returnTo}?cartError=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}

export async function removeCartItemAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/login?callbackUrl=%2Fcart');
  const productId = String(formData.get('productId') ?? '');
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(`${returnTo}?cartError=missing-product`);
  }

  await removeCartItem(session.user.id, productId);
  redirect(returnTo);
}

export async function clearCartAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/login?callbackUrl=%2Fcart');
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  await clearCart(session.user.id);
  redirect(returnTo);
}
