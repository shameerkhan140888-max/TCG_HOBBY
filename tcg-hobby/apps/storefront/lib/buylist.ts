'use server';

import { redirect } from 'next/navigation';
import {
  addProductToBuylist,
  getCustomerBuylistDraft,
  getCustomerBuylists,
  removeProductFromBuylist,
  submitBuylistRequest,
  updateBuylistItemQuantity,
} from '@tcg-hobby/database';
import { requireCustomerSession } from './auth';

function resolveReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/buylist/cart';
  }

  return value;
}

export async function getCurrentCustomerBuylistDraft() {
  const session = await requireCustomerSession('/buylist');
  return getCustomerBuylistDraft(session.user.id);
}

export async function getCurrentCustomerBuylists() {
  const session = await requireCustomerSession('/buylist');
  return getCustomerBuylists(session.user.id);
}

export async function addToBuylistAction(formData: FormData) {
  const session = await requireCustomerSession('/buylist');
  const productId = String(formData.get('productId') ?? '');
  const quantity = Number.parseInt(String(formData.get('quantity') ?? '1'), 10);
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(returnTo);
  }

  await addProductToBuylist(session.user.id, productId, Number.isFinite(quantity) ? quantity : 1);
  redirect(returnTo);
}

export async function updateBuylistQuantityAction(formData: FormData) {
  const session = await requireCustomerSession('/buylist/cart');
  const productId = String(formData.get('productId') ?? '');
  const quantity = Number.parseInt(String(formData.get('quantity') ?? '1'), 10);
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(returnTo);
  }

  await updateBuylistItemQuantity(session.user.id, productId, Number.isFinite(quantity) ? quantity : 1);
  redirect(returnTo);
}

export async function removeBuylistItemAction(formData: FormData) {
  const session = await requireCustomerSession('/buylist/cart');
  const productId = String(formData.get('productId') ?? '');
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(returnTo);
  }

  await removeProductFromBuylist(session.user.id, productId);
  redirect(returnTo);
}

export async function submitBuylistAction(formData: FormData) {
  const session = await requireCustomerSession('/buylist/cart');
  const customerNotes = String(formData.get('customerNotes') ?? '').trim();
  await submitBuylistRequest(session.user.id, customerNotes || null);
  redirect('/buylist?submitted=1');
}
