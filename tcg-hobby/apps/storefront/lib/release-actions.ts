import 'server-only';

import {
  getCustomerNotificationSubscriptions,
  setNotificationSubscriptionPreference,
  toggleNotificationSubscription,
} from '@tcg-hobby/database';
import type { NotificationPreference } from '@tcg-hobby/types';
import { redirect } from 'next/navigation';
import { requireCustomerSession } from './auth';

function resolveReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/account/notifications';
  }

  return value;
}

function resolvePreference(value: FormDataEntryValue | null): NotificationPreference {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  return normalized === 'PREORDER' || normalized === 'RELEASE' ? normalized : 'ALL';
}

export async function getCurrentCustomerNotifications() {
  const session = await requireCustomerSession('/login?callbackUrl=%2Faccount%2Fnotifications');
  return getCustomerNotificationSubscriptions(session.user.id);
}

export async function toggleNotificationAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/login?callbackUrl=%2Faccount%2Fnotifications');
  const productId = String(formData.get('productId') ?? '');
  const preference = resolvePreference(formData.get('preference'));
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(returnTo);
  }

  await toggleNotificationSubscription(session.user.id, productId, preference);
  redirect(returnTo);
}

export async function updateNotificationPreferenceAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/login?callbackUrl=%2Faccount%2Fnotifications');
  const productId = String(formData.get('productId') ?? '');
  const preference = resolvePreference(formData.get('preference'));
  const returnTo = resolveReturnTo(formData.get('returnTo'));

  if (!productId) {
    redirect(returnTo);
  }

  await setNotificationSubscriptionPreference(session.user.id, productId, preference);
  redirect(returnTo);
}
