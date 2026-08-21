'use server';

import { createIronSprueCustomerOrderRequest } from '@tcg-hobby/database';
import { redirect } from 'next/navigation';
import { requireIronSprueCustomerSession } from './auth';

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

export async function submitIronSprueOrderRequestAction(formData: FormData) {
  const orderNumber = value(formData, 'orderNumber');
  const requestType = value(formData, 'requestType');
  const reason = value(formData, 'reason');
  const customerMessage = value(formData, 'customerMessage');
  const session = await requireIronSprueCustomerSession(orderNumber ? `/account/orders/${encodeURIComponent(orderNumber)}` : '/account/orders');
  try {
    if (requestType !== 'CANCELLATION' && requestType !== 'RETURN') throw new Error('Unsupported request type.');
    await createIronSprueCustomerOrderRequest({
      userId: session.user.id,
      orderNumber,
      requestType,
      reason,
      customerMessage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request could not be submitted.';
    redirect(`/account/orders/${encodeURIComponent(orderNumber)}?requestError=${encodeURIComponent(message)}`);
  }
  redirect(`/account/orders/${encodeURIComponent(orderNumber)}?requestSaved=1`);
}
