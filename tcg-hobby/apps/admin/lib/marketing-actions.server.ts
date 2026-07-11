'use server';

import {
  MarketingSubscriberStatus,
  createMarketingCampaignDraft,
  updateMarketingSubscriberStatus,
  updateMarketingSubscriberTags,
} from '@tcg-hobby/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function parseStatus(value: string) {
  return Object.values(MarketingSubscriberStatus).includes(value as MarketingSubscriberStatus)
    ? (value as MarketingSubscriberStatus)
    : null;
}

export async function updateSubscriberStatusAction(formData: FormData) {
  const id = getString(formData, 'subscriberId');
  const status = parseStatus(getString(formData, 'status'));

  if (id && status) {
    await updateMarketingSubscriberStatus(id, status);
    revalidatePath('/admin/marketing/subscribers');
    revalidatePath(`/admin/marketing/subscribers/${id}`);
  }
}

export async function updateSubscriberTagsAction(formData: FormData) {
  const id = getString(formData, 'subscriberId');
  const tags = getString(formData, 'tags')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (id) {
    await updateMarketingSubscriberTags(id, tags);
    revalidatePath('/admin/marketing/subscribers');
    revalidatePath(`/admin/marketing/subscribers/${id}`);
  }
}

export async function createCampaignDraftAction(formData: FormData) {
  const name = getString(formData, 'name');
  const subject = getString(formData, 'subject');
  const previewText = getString(formData, 'previewText');
  const tag = getString(formData, 'tag');

  await createMarketingCampaignDraft({
    name,
    subject,
    previewText,
    tag,
  });
  revalidatePath('/admin/marketing/campaigns');
  redirect('/admin/marketing/campaigns');
}
