import type { Prisma } from '@prisma/client';
import { getIronSprueAdminPrisma } from './client.js';
import { IRON_SPRUE_STORE_CODE } from './iron-sprue-commerce.js';
import {
  buildIronSprueCancellationEmail,
  buildIronSprueCustomerRequestEmail,
  buildIronSprueDispatchEmail,
  buildIronSprueOrderConfirmationEmail,
  defaultIronSprueEmailLogoUrl,
  type CustomerRequestEmailOptions,
  type IronSprueEmailOrder,
  type IronSprueEmailTemplate,
  type IronSprueEmailTemplateConfig,
} from './iron-sprue-email-templates.js';

export const IRON_SPRUE_ORDER_CONFIRMATION_EMAIL_PURPOSE = 'ORDER_CONFIRMATION';
export const IRON_SPRUE_ORDER_CANCELLATION_EMAIL_PURPOSE = 'ORDER_CANCELLATION';
export const IRON_SPRUE_ORDER_REFUND_EMAIL_PURPOSE = 'ORDER_REFUND';
export const IRON_SPRUE_DISPATCH_EMAIL_PURPOSE = 'DISPATCH_NOTIFICATION';
export const IRON_SPRUE_CUSTOMER_REQUEST_EMAIL_PURPOSE_PREFIX = 'CUSTOMER_REQUEST';

const STALE_DELIVERY_CLAIM_MS = 10 * 60 * 1000;

type IronSprueEmailDb = ReturnType<typeof getIronSprueAdminPrisma> | Prisma.TransactionClient;

export type IronSprueTransactionalEmailClaim =
  | { outcome: 'claimed'; deliveryId: string; idempotencyKey: string }
  | { outcome: 'sent' | 'in_progress'; deliveryId: string; idempotencyKey: string };

export type IronSprueTransactionalEmailOutcome =
  | { outcome: 'sent'; deliveryId: string }
  | { outcome: 'in_progress'; deliveryId: string }
  | { outcome: 'not_found' | 'not_payable' | 'not_cancelled' | 'not_dispatched' | 'missing_recipient' | 'provider_unconfigured' | 'failed' };

function deliveryKey(orderId: string, purpose: string) {
  return `iron-sprue-order:${orderId}:${purpose.toLowerCase()}`;
}

function getIronSprueEmailPrisma() {
  return getIronSprueAdminPrisma();
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function siteUrl() {
  return clean(process.env.IRON_SPRUE_SITE_URL)
    ?? clean(process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL)
    ?? 'https://ironsprue.co.uk';
}

function emailConfig(): IronSprueEmailTemplateConfig & { apiKey: string | null; from: string | null; replyTo: string | null } {
  const supportEmail = clean(process.env.IRON_SPRUE_SUPPORT_EMAIL) ?? 'info@ironsprue.co.uk';
  const resolvedSiteUrl = siteUrl().replace(/\/$/, '');
  const explicitAssetBaseUrl = clean(process.env.IRON_SPRUE_EMAIL_ASSET_BASE_URL)?.replace(/\/$/, '');
  const assetBaseUrl = explicitAssetBaseUrl
    ?? (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(resolvedSiteUrl) ? 'https://www.ironsprue.co.uk' : resolvedSiteUrl);
  return {
    apiKey: clean(process.env.IRON_SPRUE_RESEND_API_KEY),
    from: clean(process.env.IRON_SPRUE_EMAIL_FROM),
    replyTo: clean(process.env.IRON_SPRUE_EMAIL_REPLY_TO) ?? supportEmail,
    siteUrl: resolvedSiteUrl,
    assetBaseUrl,
    supportEmail,
    logoUrl: clean(process.env.IRON_SPRUE_EMAIL_LOGO_URL) ?? defaultIronSprueEmailLogoUrl(assetBaseUrl),
  };
}

function mapEmailOrder(order: Awaited<ReturnType<typeof loadOrder>>): IronSprueEmailOrder | null {
  if (!order) return null;
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    dispatchedAt: order.dispatchedAt,
    paymentStatus: order.paymentStatus,
    fulfilmentStatus: order.fulfilmentStatus,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    totalMinor: order.totalMinor,
    currency: order.currency,
    shippingMethodName: order.shippingMethodName,
    shippingFullName: order.shippingFullName,
    shippingEmail: order.shippingEmail,
    shippingLine1: order.shippingLine1,
    shippingLine2: order.shippingLine2,
    shippingCity: order.shippingCity,
    shippingRegion: order.shippingRegion,
    shippingPostalCode: order.shippingPostalCode,
    shippingCountry: order.shippingCountry,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    items: order.items.map((item) => ({
      productName: item.productName,
      productSlug: item.productSlug,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalMinor: item.totalMinor,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
    })),
  };
}

async function loadOrder(orderId: string, db: IronSprueEmailDb) {
  return db.ironSprueOrder.findFirst({
    where: { id: orderId, storeCode: IRON_SPRUE_STORE_CODE },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function claimIronSprueTransactionalEmail(
  orderId: string,
  purpose: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
): Promise<IronSprueTransactionalEmailClaim> {
  const delivery = await db.ironSprueTransactionalEmailDelivery.upsert({
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
  const claimed = await db.ironSprueTransactionalEmailDelivery.updateMany({
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

export async function markIronSprueTransactionalEmailSent(
  deliveryId: string,
  providerMessageId: string | null,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
) {
  await db.ironSprueTransactionalEmailDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'SENT',
      providerMessageId,
      lastErrorCode: null,
      sentAt: new Date(),
    },
  });
}

export async function markIronSprueTransactionalEmailFailed(
  deliveryId: string,
  errorCode: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
) {
  await db.ironSprueTransactionalEmailDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'FAILED',
      lastErrorCode: errorCode.slice(0, 100),
    },
  });
}

async function sendViaResend(
  template: IronSprueEmailTemplate,
  to: string,
  idempotencyKey: string,
  config: ReturnType<typeof emailConfig>,
) {
  if (!config.apiKey || !config.from) {
    return { outcome: 'provider_unconfigured' as const };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: config.from,
      to: [to],
      reply_to: config.replyTo ?? undefined,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }),
  });

  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !payload.id) {
    throw new Error(payload.message || 'PROVIDER_REJECTED');
  }
  return { outcome: 'sent' as const, providerMessageId: payload.id };
}

async function sendIronSprueEmail(
  orderId: string,
  purpose: string,
  build: (order: IronSprueEmailOrder, config: IronSprueEmailTemplateConfig) => IronSprueEmailTemplate,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
): Promise<IronSprueTransactionalEmailOutcome> {
  const orderRecord = await loadOrder(orderId, db);
  const order = mapEmailOrder(orderRecord);
  if (!order) return { outcome: 'not_found' };
  if (!order.shippingEmail) return { outcome: 'missing_recipient' };

  const claim = await claimIronSprueTransactionalEmail(orderId, purpose, db);
  if (claim.outcome !== 'claimed') return { outcome: claim.outcome, deliveryId: claim.deliveryId };

  const config = emailConfig();
  try {
    const template = build(order, config);
    const result = await sendViaResend(template, order.shippingEmail, claim.idempotencyKey, config);
    if (result.outcome === 'provider_unconfigured') {
      await markIronSprueTransactionalEmailFailed(claim.deliveryId, 'PROVIDER_UNCONFIGURED', db);
      console.warn('iron_sprue_transactional_email_skipped', {
        orderId,
        purpose,
        reason: 'provider_unconfigured',
      });
      return { outcome: 'provider_unconfigured' };
    }

    await markIronSprueTransactionalEmailSent(claim.deliveryId, result.providerMessageId, db);
    console.info('iron_sprue_transactional_email_sent', {
      orderId,
      deliveryId: claim.deliveryId,
      purpose,
    });
    return { outcome: 'sent', deliveryId: claim.deliveryId };
  } catch (error) {
    const errorCode = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : 'PROVIDER_REQUEST_FAILED';
    await markIronSprueTransactionalEmailFailed(claim.deliveryId, errorCode, db);
    console.error('iron_sprue_transactional_email_failed', {
      orderId,
      deliveryId: claim.deliveryId,
      purpose,
      errorCode,
    });
    return { outcome: 'failed' };
  }
}

export async function sendIronSprueOrderConfirmationEmail(
  orderId: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
): Promise<IronSprueTransactionalEmailOutcome> {
  const order = await loadOrder(orderId, db);
  if (!order) return { outcome: 'not_found' };
  if (order.paymentStatus !== 'SUCCEEDED' || order.status !== 'PAID') {
    return { outcome: 'not_payable' };
  }
  return sendIronSprueEmail(
    orderId,
    IRON_SPRUE_ORDER_CONFIRMATION_EMAIL_PURPOSE,
    buildIronSprueOrderConfirmationEmail,
    db,
  );
}

export async function sendIronSprueCancellationEmail(
  orderId: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
): Promise<IronSprueTransactionalEmailOutcome> {
  const order = await loadOrder(orderId, db);
  if (!order) return { outcome: 'not_found' };
  if (!order.cancelledAt && order.fulfilmentStatus !== 'CANCELLED' && !['CANCELLED', 'REFUNDED'].includes(order.status)) {
    return { outcome: 'not_cancelled' };
  }
  const refunded = order.paymentStatus === 'REFUNDED' || order.status === 'REFUNDED';
  return sendIronSprueEmail(
    orderId,
    refunded ? IRON_SPRUE_ORDER_REFUND_EMAIL_PURPOSE : IRON_SPRUE_ORDER_CANCELLATION_EMAIL_PURPOSE,
    (emailOrder, config) => buildIronSprueCancellationEmail(emailOrder, config, { refunded }),
    db,
  );
}

export async function sendIronSprueDispatchEmail(
  orderId: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
): Promise<IronSprueTransactionalEmailOutcome> {
  const order = await loadOrder(orderId, db);
  if (!order) return { outcome: 'not_found' };
  if (order.fulfilmentStatus !== 'SHIPPED') return { outcome: 'not_dispatched' };
  return sendIronSprueEmail(
    orderId,
    IRON_SPRUE_DISPATCH_EMAIL_PURPOSE,
    buildIronSprueDispatchEmail,
    db,
  );
}

export async function sendIronSprueCustomerRequestAcknowledgementEmail(
  orderId: string,
  requestId: string,
  options: CustomerRequestEmailOptions,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
): Promise<IronSprueTransactionalEmailOutcome> {
  if (!requestId.trim()) return { outcome: 'not_found' };
  return sendIronSprueEmail(
    orderId,
    `${IRON_SPRUE_CUSTOMER_REQUEST_EMAIL_PURPOSE_PREFIX}_${requestId}`,
    (emailOrder, config) => buildIronSprueCustomerRequestEmail(emailOrder, config, options),
    db,
  );
}
