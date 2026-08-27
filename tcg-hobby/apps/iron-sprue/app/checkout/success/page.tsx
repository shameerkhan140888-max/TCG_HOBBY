import { redirect } from 'next/navigation';
import type { PublicOrderDetail } from '@capital-hobby/types';
import { CheckoutSuccessClient } from '../../../components/checkout-success-client';

export const dynamic = 'force-dynamic';

async function getOrder(reference: string, referenceType: 'session' | 'payment-intent'): Promise<PublicOrderDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL ?? process.env.PUBLIC_STOREFRONT_URL ?? 'http://localhost:3004';
  const path = referenceType === 'payment-intent'
    ? `/api/checkout/payment-status/${encodeURIComponent(reference)}`
    : `/api/checkout/status/${encodeURIComponent(reference)}`;
  const response = await fetch(`${baseUrl}${path}`, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string; payment_intent?: string }> }) {
  const { session_id: sessionId, payment_intent: paymentIntentId } = await searchParams;
  const checkoutReference = paymentIntentId ?? sessionId;
  if (!checkoutReference) redirect('/basket');
  const referenceType = paymentIntentId ? 'payment-intent' : 'session';
  const order = await getOrder(checkoutReference, referenceType);

  return <CheckoutSuccessClient initialOrder={order} checkoutReference={checkoutReference} referenceType={referenceType} />;
}
