import { redirect } from 'next/navigation';
import type { PublicOrderDetail } from '@tcg-hobby/types';
import { CheckoutSuccessClient } from '../../../components/checkout-success-client';

export const dynamic = 'force-dynamic';

async function getOrder(sessionId: string): Promise<PublicOrderDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL ?? process.env.PUBLIC_STOREFRONT_URL ?? 'http://localhost:3004';
  const response = await fetch(`${baseUrl}/api/checkout/status/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) redirect('/basket');
  const order = await getOrder(sessionId);

  return <CheckoutSuccessClient initialOrder={order} sessionId={sessionId} />;
}
