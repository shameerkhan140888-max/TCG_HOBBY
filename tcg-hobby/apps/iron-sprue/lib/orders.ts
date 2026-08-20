import 'server-only';

import { prisma } from '@tcg-hobby/database/storefront';
import {
  getIronSprueCustomerOrderByNumber,
  getIronSprueCustomerOrders,
  IRON_SPRUE_STORE_CODE,
  type IronSprueOrderWithItems,
} from '@tcg-hobby/database';
import { requireIronSprueCustomerSession } from './auth';

export function customerOrderStatus(order: Pick<IronSprueOrderWithItems, 'status' | 'paymentStatus' | 'fulfilmentStatus' | 'cancelledAt'>) {
  const fulfilmentStatus = String(order.fulfilmentStatus);
  if (order.paymentStatus === 'REFUNDED' || order.status === 'REFUNDED') return 'Refunded';
  if (order.cancelledAt || order.status === 'CANCELLED' || order.paymentStatus === 'CANCELED') return 'Cancelled';
  if (order.status === 'COMPLETED' || fulfilmentStatus === 'COMPLETED') return 'Completed';
  if (fulfilmentStatus === 'DELIVERED') return 'Delivered';
  if (fulfilmentStatus === 'SHIPPED') return 'Dispatched';
  if (fulfilmentStatus === 'PACKED' || fulfilmentStatus === 'PICKING') return 'Preparing';
  if (order.paymentStatus === 'SUCCEEDED' || order.status === 'PAID') return 'Confirmed';
  if (order.paymentStatus === 'FAILED') return 'Payment failed';
  return 'Awaiting payment';
}

export async function claimVerifiedIronSprueGuestOrders(userId: string, email: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true, email: true } });
  if (!user?.emailVerified || user.email.toLowerCase() !== email.trim().toLowerCase()) return 0;
  const result = await prisma.ironSprueOrder.updateMany({
    where: {
      storeCode: IRON_SPRUE_STORE_CODE,
      userId: null,
      shippingEmail: email.trim().toLowerCase(),
    },
    data: { userId },
  });
  return result.count;
}

export async function getCurrentIronSprueOrders() {
  const session = await requireIronSprueCustomerSession('/account/orders');
  return getIronSprueCustomerOrders(session.user.id);
}

export async function getCurrentIronSprueOrder(orderNumber: string) {
  const session = await requireIronSprueCustomerSession(`/account/orders/${encodeURIComponent(orderNumber)}`);
  return getIronSprueCustomerOrderByNumber(session.user.id, orderNumber);
}
