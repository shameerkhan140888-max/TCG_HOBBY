import { cancelCheckoutOrderAttempt } from '@tcg-hobby/database/storefront';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveInternalReturnTo } from '../../../lib/internal-return';

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId') ?? '';
  const attemptId = request.nextUrl.searchParams.get('attemptId') ?? '';
  const returnTo = resolveInternalReturnTo(request.nextUrl.searchParams.get('returnTo'), '/checkout');

  try {
    await cancelCheckoutOrderAttempt(orderId, attemptId);
  } catch {
    // A failed cleanup must not strand the customer on a technical error page.
  }

  const destination = new URL(returnTo, request.nextUrl.origin);
  destination.searchParams.set('checkoutStatus', 'cancelled');
  return NextResponse.redirect(destination);
}
