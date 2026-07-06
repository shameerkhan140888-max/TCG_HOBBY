import { NextResponse } from 'next/server';
import { clearGuestCart } from '../../../../lib/cart';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearGuestCart();
  return NextResponse.json({ cleared: true });
}
