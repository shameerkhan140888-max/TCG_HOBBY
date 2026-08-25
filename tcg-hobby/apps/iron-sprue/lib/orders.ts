import 'server-only';

import { requireIronSprueCustomerSession } from './auth';
import { importLocalCommerceDatabase, importLocalStorefrontDatabase } from './local-database';

type IronSprueOrderStatusFields = {
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  cancelledAt: Date | string | null;
};

export type IronSprueCustomerOrderSummary = IronSprueOrderStatusFields & {
  id: string;
  orderNumber: string;
  createdAt: Date | string;
  totalMinor: number;
  currency: string;
};

export type IronSprueCustomerOrderDetail = IronSprueCustomerOrderSummary & {
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  discountMinor: number;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: Array<{
    id: string;
    imageUrl: string | null;
    imageAlt: string | null;
    productName: string;
    productSku: string;
    quantity: number;
    totalMinor: number;
  }>;
  customerRequests: Array<{
    id: string;
    requestType: string;
    status: string;
    createdAt: Date | string;
    reason: string;
  }>;
  invoice: {
    invoiceNumber: string;
    invoiceDate: Date | string;
    sellerLegalName: string;
    sellerCompanyNumber: string;
    sellerVatNumber: string;
    sellerRegisteredOffice: string;
    orderNetTotalMinor: number;
    vatTotalMinor: number;
    grossTotalMinor: number;
  } | null;
};

export function customerOrderStatus(order: IronSprueOrderStatusFields) {
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
  const [{ prisma }, { IRON_SPRUE_STORE_CODE }] = await Promise.all([
    importLocalStorefrontDatabase(),
    importLocalCommerceDatabase(),
  ]);
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
  const { getIronSprueCustomerOrders } = await importLocalCommerceDatabase();
  return getIronSprueCustomerOrders(session.user.id) as Promise<IronSprueCustomerOrderSummary[]>;
}

export async function getCurrentIronSprueOrder(orderNumber: string) {
  const session = await requireIronSprueCustomerSession(`/account/orders/${encodeURIComponent(orderNumber)}`);
  const { getIronSprueCustomerOrderByNumber } = await importLocalCommerceDatabase();
  return getIronSprueCustomerOrderByNumber(session.user.id, orderNumber) as Promise<IronSprueCustomerOrderDetail | null>;
}
