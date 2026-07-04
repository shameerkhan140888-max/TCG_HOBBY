'use server';

import { redirect } from 'next/navigation';
import { updateAdminBuylist } from '@tcg-hobby/database';
import type { BuylistStatus } from '@tcg-hobby/types';

function asString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function asDate(value: FormDataEntryValue | null) {
  const text = asString(value);
  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asMinor(value: FormDataEntryValue | null) {
  const text = asString(value);
  if (!text) {
    return undefined;
  }

  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asStatus(value: FormDataEntryValue | null): BuylistStatus | undefined {
  const status = asString(value);
  if (
    status === 'SUBMITTED' ||
    status === 'RECEIVED' ||
    status === 'UNDER_REVIEW' ||
    status === 'APPROVED' ||
    status === 'REJECTED' ||
    status === 'PAID'
  ) {
    return status;
  }

  return undefined;
}

export async function updateAdminBuylistAction(formData: FormData) {
  const buylistId = asString(formData.get('buylistId'));
  const redirectTo = asString(formData.get('redirectTo')) || '/admin/buylist';

  if (!buylistId) {
    redirect(redirectTo);
  }

  const input: Record<string, unknown> = {};

  const status = asStatus(formData.get('status'));
  if (status) {
    input.status = status;
  }

  const staffNotes = asString(formData.get('staffNotes'));
  if (staffNotes) {
    input.staffNotes = staffNotes;
  }

  const offeredPayoutMinor = asMinor(formData.get('offeredPayoutMinor'));
  if (offeredPayoutMinor !== undefined) {
    input.offeredPayoutMinor = offeredPayoutMinor;
  }

  const paymentReference = asString(formData.get('paymentReference'));
  if (paymentReference) {
    input.paymentReference = paymentReference;
  }

  const paidAt = asDate(formData.get('paidAt'));
  if (paidAt) {
    input.paidAt = paidAt;
  }

  await updateAdminBuylist(
    buylistId,
    input as any,
  );

  redirect(redirectTo);
}
