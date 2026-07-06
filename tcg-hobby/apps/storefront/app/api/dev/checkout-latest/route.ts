import { NextResponse } from 'next/server';
import { getLatestLocalCheckoutOrder } from '@tcg-hobby/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const order = await getLatestLocalCheckoutOrder();
  if (!order) {
    return NextResponse.json({ order: null });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      userId: order.userId,
    },
  });
}
