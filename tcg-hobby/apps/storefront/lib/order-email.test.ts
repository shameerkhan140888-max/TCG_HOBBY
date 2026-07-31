import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  claim: vi.fn(),
  markFailed: vi.fn(),
  markSent: vi.fn(),
  send: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@tcg-hobby/database', () => ({
  getOrderById: mocks.getOrderById,
  claimOrderConfirmationEmail: mocks.claim,
  markTransactionalEmailFailed: mocks.markFailed,
  markTransactionalEmailSent: mocks.markSent,
}));
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: mocks.send } })),
}));

import { sendPaidOrderConfirmationEmail } from './order-email';

const paidOrder = {
  id: 'order-1',
  orderNumber: 'TCG-1',
  userId: null,
  status: 'PAID',
  paymentStatus: 'SUCCEEDED',
  currency: 'GBP',
  subtotalMinor: 1000,
  shippingMinor: 0,
  totalMinor: 1000,
  shippingMethodName: 'Standard delivery',
  shippingFullName: 'Sam Collector',
  shippingEmail: 'sam@example.test',
  shippingLine1: '1 Test Street',
  shippingLine2: null,
  shippingCity: 'London',
  shippingRegion: null,
  shippingPostalCode: 'E1 5NF',
  shippingCountry: 'GB',
  createdAt: new Date('2026-07-30T10:00:00Z'),
  items: [],
  shippingAddress: null,
};

describe('paid order confirmation delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    mocks.getOrderById.mockResolvedValue(paidOrder);
    mocks.claim.mockResolvedValue({
      outcome: 'claimed',
      deliveryId: 'delivery-1',
      idempotencyKey: 'order:order-1:order_confirmation',
    });
    mocks.send.mockResolvedValue({ data: { id: 'resend-1' }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends a paid order once using the durable shared idempotency key', async () => {
    await expect(sendPaidOrderConfirmationEmail('order-1')).resolves.toEqual({ outcome: 'sent' });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'TCG Hobby <no-reply@tcg-hobby.co.uk>',
      to: 'sam@example.test',
      replyTo: 'support@tcg-hobby.co.uk',
      subject: expect.stringContaining('TCG-1'),
    }), { idempotencyKey: 'order:order-1:order_confirmation' });
    expect(mocks.markSent).toHaveBeenCalledWith('delivery-1', 'resend-1');
  });

  it('does not send unpaid or already-delivered orders', async () => {
    mocks.getOrderById.mockResolvedValueOnce({ ...paidOrder, status: 'PENDING_PAYMENT', paymentStatus: 'REQUIRES_PAYMENT' });
    await expect(sendPaidOrderConfirmationEmail('order-1')).resolves.toEqual({ outcome: 'not_paid' });
    mocks.claim.mockResolvedValueOnce({ outcome: 'sent', deliveryId: 'delivery-1', idempotencyKey: 'key' });
    await expect(sendPaidOrderConfirmationEmail('order-1')).resolves.toEqual({ outcome: 'sent' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('does not send for a cancelled order', async () => {
    mocks.getOrderById.mockResolvedValueOnce({ ...paidOrder, status: 'CANCELLED', paymentStatus: 'CANCELED' });
    await expect(sendPaidOrderConfirmationEmail('order-1')).resolves.toEqual({ outcome: 'not_paid' });
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('records provider failures without throwing into payment finalisation', async () => {
    mocks.send.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(sendPaidOrderConfirmationEmail('order-1')).resolves.toEqual({ outcome: 'failed' });
    expect(mocks.markFailed).toHaveBeenCalledWith('delivery-1', 'PROVIDER_REQUEST_FAILED');
  });

  it('records missing provider configuration without exposing the order recipient', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    await expect(sendPaidOrderConfirmationEmail('order-1')).resolves.toEqual({ outcome: 'provider_unconfigured' });
    expect(mocks.markFailed).toHaveBeenCalledWith('delivery-1', 'PROVIDER_UNCONFIGURED');
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
