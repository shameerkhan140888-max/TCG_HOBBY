import 'server-only';

import { getWishlistProductIds, toggleWishlistItem } from '@tcg-hobby/database';
import { redirect } from 'next/navigation';
import { getCurrentCustomerSession, requireCustomerSession } from './auth';

function resolveReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/account/wishlist';
  }

  return value;
}

export async function getCurrentCustomerWishlistProductIds() {
  const session = await requireCustomerSession('/login?callbackUrl=%2Faccount%2Fwishlist');
  return getWishlistProductIds(session.user.id);
}

export async function getOptionalCustomerWishlistProductIds() {
  const session = await getCurrentCustomerSession();

  if (!session || session.user.role !== 'CUSTOMER') {
    return [];
  }

  return getWishlistProductIds(session.user.id);
}

export async function toggleWishlistAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/login?callbackUrl=%2Faccount%2Fwishlist');
  const productId = String(formData.get('productId') ?? '');
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(returnTo);
  }

  await toggleWishlistItem(session.user.id, productId);
  redirect(returnTo);
}
