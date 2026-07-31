import { describe, expect, it, vi } from 'vitest';
import {
  claimOrderConfirmationEmail,
  markTransactionalEmailFailed,
  markTransactionalEmailSent,
} from './transactional-email';

function createDb(status = 'PENDING', claimCount = 1) {
  return {
    transactionalEmailDelivery: {
      upsert: vi.fn().mockResolvedValue({ id: 'delivery-1', status }),
      updateMany: vi.fn().mockResolvedValue({ count: claimCount }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('transactional email delivery claims', () => {
  it('claims a pending order confirmation with a deterministic provider key', async () => {
    const db = createDb();
    await expect(claimOrderConfirmationEmail('order-1', db as never)).resolves.toEqual({
      outcome: 'claimed',
      deliveryId: 'delivery-1',
      idempotencyKey: 'order:order-1:order_confirmation',
    });
    expect(db.transactionalEmailDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SENDING', attempts: { increment: 1 } }),
    }));
  });

  it('does not claim an order confirmation that is already sent or being processed', async () => {
    const sentDb = createDb('SENT');
    await expect(claimOrderConfirmationEmail('order-1', sentDb as never)).resolves.toMatchObject({ outcome: 'sent' });
    expect(sentDb.transactionalEmailDelivery.updateMany).not.toHaveBeenCalled();

    const busyDb = createDb('SENDING', 0);
    await expect(claimOrderConfirmationEmail('order-1', busyDb as never)).resolves.toMatchObject({ outcome: 'in_progress' });
  });

  it('allows a failed provider attempt to be claimed for a durable retry', async () => {
    const db = createDb('FAILED');
    await expect(claimOrderConfirmationEmail('order-1', db as never)).resolves.toMatchObject({ outcome: 'claimed' });
  });

  it('records provider success and bounded failure codes', async () => {
    const db = createDb();
    await markTransactionalEmailSent('delivery-1', 'resend-1', db as never);
    expect(db.transactionalEmailDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SENT', providerMessageId: 'resend-1' }),
    }));

    await markTransactionalEmailFailed('delivery-1', 'X'.repeat(150), db as never);
    expect(db.transactionalEmailDelivery.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { status: 'FAILED', lastErrorCode: 'X'.repeat(100) },
    }));
  });
});
