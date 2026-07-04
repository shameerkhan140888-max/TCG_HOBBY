import 'server-only';

import { createAdminRelease, getAdminReleaseById, getAdminReleases, updateAdminRelease } from '@tcg-hobby/database';
import { redirect } from 'next/navigation';

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

function getBoolean(formData: FormData, name: string) {
  return formData.get(name) === 'on' || formData.get(name) === 'true';
}

function getNumber(formData: FormData, name: string) {
  const raw = getString(formData, name);
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function getOptionalString(formData: FormData, name: string) {
  const value = getString(formData, name);
  return value || undefined;
}

function getProductIds(formData: FormData) {
  return formData
    .getAll('productIds')
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function buildReleaseInput(formData: FormData) {
  const slug = getOptionalString(formData, 'slug');
  const expectedDispatchAt = getOptionalString(formData, 'expectedDispatchAt');
  const expectedArrivalAt = getOptionalString(formData, 'expectedArrivalAt');
  const announcementText = getOptionalString(formData, 'announcementText');
  const releaseNotes = getOptionalString(formData, 'releaseNotes');
  const allocationLimit = getNumber(formData, 'allocationLimit');
  const customerPurchaseLimit = getNumber(formData, 'customerPurchaseLimit');
  const supplierAllocation = getNumber(formData, 'supplierAllocation');
  const lowAllocationThreshold = getNumber(formData, 'lowAllocationThreshold');
  const preorderBadgeLabel = getOptionalString(formData, 'preorderBadgeLabel');
  const comingSoonBadgeLabel = getOptionalString(formData, 'comingSoonBadgeLabel');

  const input = {
    name: getString(formData, 'name'),
    brand: getString(formData, 'brand'),
    game: getString(formData, 'game'),
    categoryId: getString(formData, 'categoryId'),
    releaseDate: getString(formData, 'releaseDate'),
    visible: getBoolean(formData, 'visible'),
    featuredOnHomepage: getBoolean(formData, 'featuredOnHomepage'),
    productIds: getProductIds(formData),
    ...(slug ? { slug } : {}),
    ...(expectedDispatchAt ? { expectedDispatchAt } : {}),
    ...(expectedArrivalAt ? { expectedArrivalAt } : {}),
    ...(announcementText ? { announcementText } : {}),
    ...(releaseNotes ? { releaseNotes } : {}),
    ...(allocationLimit != null ? { allocationLimit } : {}),
    ...(customerPurchaseLimit != null ? { customerPurchaseLimit } : {}),
    ...(supplierAllocation != null ? { supplierAllocation } : {}),
    ...(lowAllocationThreshold != null ? { lowAllocationThreshold } : {}),
    ...(preorderBadgeLabel ? { preorderBadgeLabel } : {}),
    ...(comingSoonBadgeLabel ? { comingSoonBadgeLabel } : {}),
  };

  return input;
}

export async function getCurrentAdminReleases(filters: { search?: string; game?: string; brand?: string; category?: string; month?: string; page?: number; pageSize?: number }) {
  return getAdminReleases(filters);
}

export async function getCurrentAdminRelease(id: string) {
  return getAdminReleaseById(id);
}

export async function createReleaseAction(formData: FormData) {
  'use server';

  const release = await createAdminRelease(buildReleaseInput(formData));

  if (release) {
    redirect(`/admin/releases/${release.id}`);
  }

  redirect('/admin/releases');
}

export async function updateReleaseAction(formData: FormData) {
  'use server';

  const id = getString(formData, 'id');
  const release = await updateAdminRelease(id, buildReleaseInput(formData));

  if (release) {
    redirect(`/admin/releases/${release.id}`);
  }

  redirect('/admin/releases');
}
