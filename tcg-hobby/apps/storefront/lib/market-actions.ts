import 'server-only';

import {
  toggleWatchlistItem,
  updateNotificationCenterPreference,
  updateWatchlistItemPreferences,
} from '@tcg-hobby/database';
import type { NotificationType, WatchlistSubjectType } from '@tcg-hobby/types';
import { redirect } from 'next/navigation';
import { requireCustomerSession } from './auth';

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

function getBoolean(formData: FormData, name: string) {
  return formData.get(name) === 'on' || formData.get(name) === 'true';
}

function getOptionalString(formData: FormData, name: string) {
  const value = getString(formData, name);
  return value || undefined;
}

function getSubjectType(formData: FormData): WatchlistSubjectType {
  const value = getString(formData, 'subjectType');
  if (value === 'RELEASE' || value === 'COLLECTION_ITEM') {
    return value;
  }

  return 'PRODUCT';
}

function getNotificationType(formData: FormData): NotificationType {
  const value = getString(formData, 'notificationType');
  if (value === 'UPCOMING_RELEASE' || value === 'WISHLIST_AVAILABILITY' || value === 'COLLECTION_UPDATES' || value === 'BUYLIST_UPDATES') {
    return value;
  }

  return 'PRICE_MOVEMENT';
}

function getReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/watchlist';
  }

  return value;
}

export async function toggleWatchlistAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/watchlist');
  const subjectType = getSubjectType(formData);
  const subjectKey = getString(formData, 'subjectKey');
  const subjectLabel = getString(formData, 'subjectLabel') || subjectKey;
  await toggleWatchlistItem(session.user.id, {
    subjectType,
    subjectKey,
    subjectLabel,
    productId: getOptionalString(formData, 'productId') ?? null,
    releaseId: getOptionalString(formData, 'releaseId') ?? null,
    collectionItemId: getOptionalString(formData, 'collectionItemId') ?? null,
    notificationType: getNotificationType(formData),
    emailEnabled: getBoolean(formData, 'emailEnabled'),
    pushEnabled: getBoolean(formData, 'pushEnabled'),
    inAppEnabled: getBoolean(formData, 'inAppEnabled'),
    note: getOptionalString(formData, 'note') ?? null,
  });

  redirect(getReturnTo(formData.get('returnTo')));
}

export async function updateWatchlistPreferencesAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/watchlist');
  const subjectType = getSubjectType(formData);
  const subjectKey = getString(formData, 'subjectKey');
  await updateWatchlistItemPreferences(session.user.id, {
    subjectType,
    subjectKey,
    subjectLabel: getString(formData, 'subjectLabel') || subjectKey,
    productId: getOptionalString(formData, 'productId') ?? null,
    releaseId: getOptionalString(formData, 'releaseId') ?? null,
    collectionItemId: getOptionalString(formData, 'collectionItemId') ?? null,
    notificationType: getNotificationType(formData),
    emailEnabled: getBoolean(formData, 'emailEnabled'),
    pushEnabled: getBoolean(formData, 'pushEnabled'),
    inAppEnabled: getBoolean(formData, 'inAppEnabled'),
    note: getOptionalString(formData, 'note') ?? null,
  });

  redirect(getReturnTo(formData.get('returnTo')));
}

export async function updateNotificationCenterAction(formData: FormData) {
  'use server';

  const session = await requireCustomerSession('/account/notifications');
  const notificationType = getNotificationType(formData);
  await updateNotificationCenterPreference(session.user.id, notificationType, {
    subjectType: getSubjectType(formData),
    subjectLabel: getOptionalString(formData, 'subjectLabel') ?? notificationType,
    emailEnabled: getBoolean(formData, 'emailEnabled'),
    pushEnabled: getBoolean(formData, 'pushEnabled'),
    inAppEnabled: getBoolean(formData, 'inAppEnabled'),
  });

  redirect(getReturnTo(formData.get('returnTo')));
}
