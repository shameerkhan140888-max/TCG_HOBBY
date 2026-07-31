import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './client';

export const ORDER_CONFIRMATION_EMAIL_PURPOSE = 'ORDER_CONFIRMATION';
const STALE_DELIVERY_CLAIM_MS = 10 * 60 * 1000;

type TransactionalEmailDb = PrismaClient | Prisma.TransactionClient;

export type TransactionalEmailClaim =
  | { outcome: 'claimed'; deliveryId: string; idempotencyKey: string }
  | { outcome: 'sent' | 'in_progress'; deliveryId: string; idempotencyKey: string };

function deliveryKey(orderId: string, purpose: string) {
  return `order:${orderId}:${purpose.toLowerCase()}`;
}

export async function claimOrderConfirmationEmail(
  orderId: string,
  db: TransactionalEmailDb = prisma,
): Promise<TransactionalEmailClaim> {
  const purpose = ORDER_CONFIRMATION_EMAIL_PURPOSE;
  const delivery = await db.transactionalEmailDelivery.upsert({
    where: { orderId_purpose: { orderId, purpose } },
    create: { orderId, purpose },
    update: {},
    select: { id: true, status: true },
  });
  const idempotencyKey = deliveryKey(orderId, purpose);

  if (delivery.status === 'SENT') {
    return { outcome: 'sent', deliveryId: delivery.id, idempotencyKey };
  }

  const staleBefore = new Date(Date.now() - STALE_DELIVERY_CLAIM_MS);
  const claimed = await db.transactionalEmailDelivery.updateMany({
    where: {
      id: delivery.id,
      OR: [
        { status: { in: ['PENDING', 'FAILED'] } },
        { status: 'SENDING', updatedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: 'SENDING',
      attempts: { increment: 1 },
      lastErrorCode: null,
    },
  });

  return claimed.count === 1
    ? { outcome: 'claimed', deliveryId: delivery.id, idempotencyKey }
    : { outcome: 'in_progress', deliveryId: delivery.id, idempotencyKey };
}

export async function markTransactionalEmailSent(
  deliveryId: string,
  providerMessageId: string | null,
  db: TransactionalEmailDb = prisma,
) {
  await db.transactionalEmailDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'SENT',
      providerMessageId,
      lastErrorCode: null,
      sentAt: new Date(),
    },
  });
}

export async function markTransactionalEmailFailed(
  deliveryId: string,
  errorCode: string,
  db: TransactionalEmailDb = prisma,
) {
  await db.transactionalEmailDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'FAILED',
      lastErrorCode: errorCode.slice(0, 100),
    },
  });
}
