import type { Prisma } from '@prisma/client';
import { getIronSprueAdminPrisma } from './client.js';
import { IRON_SPRUE_STORE_CODE } from './iron-sprue-commerce.js';
import {
  isIronSprueDisplayableImageAsset,
  isIronSprueOperationalMediaRole,
  resolveIronSpruePublicMediaUrl,
} from './iron-sprue-admin.js';
import {
  buildIronSprueCancellationEmail,
  buildIronSprueCustomerRequestEmail,
  buildIronSprueDispatchEmail,
  buildIronSprueOrderConfirmationEmail,
  defaultIronSprueEmailLogoUrl,
  resolveIronSprueEmailImageSrc,
  type CustomerRequestEmailOptions,
  type IronSprueEmailOrder,
  type IronSprueEmailOrderItem,
  type IronSprueEmailAttachment,
  type IronSprueEmailTemplate,
  type IronSprueEmailTemplateConfig,
} from './iron-sprue-email-templates.js';
import { resolveIronSprueStorefrontMediaUrl } from './iron-sprue-media.js';

export const IRON_SPRUE_ORDER_CONFIRMATION_EMAIL_PURPOSE = 'ORDER_CONFIRMATION';
export const IRON_SPRUE_ORDER_CANCELLATION_EMAIL_PURPOSE = 'ORDER_CANCELLATION';
export const IRON_SPRUE_ORDER_REFUND_EMAIL_PURPOSE = 'ORDER_REFUND';
export const IRON_SPRUE_DISPATCH_EMAIL_PURPOSE = 'DISPATCH_NOTIFICATION';
export const IRON_SPRUE_CUSTOMER_REQUEST_EMAIL_PURPOSE_PREFIX = 'CUSTOMER_REQUEST';

const STALE_DELIVERY_CLAIM_MS = 10 * 60 * 1000;
type IronSprueEmailDb = ReturnType<typeof getIronSprueAdminPrisma> | Prisma.TransactionClient;

class IronSprueEmailProviderError extends Error {
  constructor(readonly safeCode: string) {
    super(safeCode);
  }
}

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

function isSendableCustomerEmail(value?: string | null) {
  const email = clean(value)?.toLowerCase();
  return Boolean(email && !email.endsWith('@ironsprue.local'));
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
  const explicitMediaBaseUrl = (
    clean(process.env.IRON_SPRUE_EMAIL_MEDIA_BASE_URL)
    ?? clean(process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL)
  )?.replace(/\/$/, '');
  const assetBaseUrl = explicitAssetBaseUrl
    ?? (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(resolvedSiteUrl) ? 'https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev' : resolvedSiteUrl);
  return {
    apiKey: clean(process.env.IRON_SPRUE_RESEND_API_KEY),
    from: clean(process.env.IRON_SPRUE_EMAIL_FROM),
    replyTo: clean(process.env.IRON_SPRUE_EMAIL_REPLY_TO) ?? supportEmail,
    siteUrl: resolvedSiteUrl,
    assetBaseUrl,
    mediaBaseUrl: explicitMediaBaseUrl ?? 'https://media.ironsprue.co.uk',
    supportEmail,
    logoUrl: clean(process.env.IRON_SPRUE_EMAIL_LOGO_URL) ?? defaultIronSprueEmailLogoUrl(assetBaseUrl),
  };
}

function inlineImageContentType(url: string) {
  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function inlineImageFilename(item: IronSprueEmailOrderItem, sourceUrl: string) {
  const fallback = `${item.productSku || item.productSlug || 'iron-sprue-product'}.jpg`;
  try {
    const pathname = new URL(sourceUrl).pathname;
    const fileName = pathname.split('/').pop()?.trim();
    return fileName || fallback;
  } catch {
    return fallback;
  }
}

function inlineImageCid(orderNumber: string, item: IronSprueEmailOrderItem, index: number) {
  const key = `${orderNumber}-${item.productSku || item.productSlug || index + 1}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `iron-sprue-product-${key || index + 1}`;
}

function inlineProductImagesEnabled() {
  return clean(process.env.IRON_SPRUE_EMAIL_INLINE_PRODUCT_IMAGES)?.toLowerCase() === 'enabled';
}

async function withInlineProductImages(order: IronSprueEmailOrder, config: IronSprueEmailTemplateConfig): Promise<IronSprueEmailOrder> {
  if (!inlineProductImagesEnabled()) return order;

  const items = order.items.map((item, index) => {
    const sourceUrl = resolveIronSprueEmailImageSrc({ ...item, inlineImageCid: null }, config);
    if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return item;
    const cid = inlineImageCid(order.orderNumber, item, index);
    return {
      ...item,
      inlineImageCid: cid,
      inlineImageSourceUrl: sourceUrl,
      inlineImageFilename: inlineImageFilename(item, sourceUrl),
      inlineImageContentType: inlineImageContentType(sourceUrl),
    };
  });

  return {
    ...order,
    items,
  };
}

type EmailOrderItem = NonNullable<Awaited<ReturnType<typeof loadOrder>>>['items'][number];

function currentApprovedEmailImage(item: EmailOrderItem) {
  const storefrontBaseUrl = siteUrl();
  const preferred = [...(item.product?.mediaAssets ?? [])]
    .filter((asset) => asset.approvalState === 'APPROVED' && isIronSprueOperationalMediaRole(asset.role) && isIronSprueDisplayableImageAsset(asset))
    .map((asset) => ({
      asset,
      url: resolveIronSprueStorefrontMediaUrl(resolveIronSpruePublicMediaUrl(asset), storefrontBaseUrl),
    }))
    .filter((candidate): candidate is { asset: typeof candidate.asset; url: string } => Boolean(candidate.url))
    .sort((left, right) => {
      const roleRank = (role: string) => {
        const normalized = role.toLowerCase().replace(/_/g, '-');
        if (normalized === 'catalogue-primary') return 0;
        if (normalized === 'manufacturer-original') return 1;
        if (normalized === 'workshop-photography') return 2;
        return 3;
      };
      return roleRank(left.asset.role) - roleRank(right.asset.role)
        || Number(right.asset.isPrimary) - Number(left.asset.isPrimary)
        || left.asset.sortOrder - right.asset.sortOrder
        || left.asset.id.localeCompare(right.asset.id);
    })[0];

  return preferred
    ? {
      imageUrl: preferred.url,
      imageAlt: preferred.asset.altText?.trim() || item.imageAlt || item.productName,
    }
    : {
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
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
    taxMinor: order.taxMinor,
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
    returns: order.returns.map((returnRecord) => ({
      restock: returnRecord.restock,
      lines: returnRecord.lines.map((line) => ({
        quantity: line.quantity,
        restock: line.restock,
      })),
    })),
    items: order.items.map((item) => {
      const image = currentApprovedEmailImage(item);
      return {
        productName: item.productName,
        productSlug: item.productSlug,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        totalMinor: item.totalMinor,
        imageUrl: image.imageUrl,
        imageAlt: image.imageAlt,
      };
    }),
  };
}

async function loadOrder(orderId: string, db: IronSprueEmailDb) {
  return db.ironSprueOrder.findFirst({
    where: { id: orderId, storeCode: IRON_SPRUE_STORE_CODE },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            include: {
              mediaAssets: {
                where: { approvalState: 'APPROVED' },
                orderBy: [
                  { isPrimary: 'desc' },
                  { sortOrder: 'asc' },
                  { id: 'asc' },
                ],
              },
            },
          },
        },
      },
      returns: {
        include: { lines: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function claimIronSprueTransactionalEmail(
  orderId: string,
  purpose: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
  options: { allowResend?: boolean } = {},
): Promise<IronSprueTransactionalEmailClaim> {
  const delivery = await db.ironSprueTransactionalEmailDelivery.upsert({
    where: { orderId_purpose: { orderId, purpose } },
    create: { orderId, purpose },
    update: {},
    select: { id: true, status: true },
  });
  const idempotencyKey = options.allowResend
    ? `${deliveryKey(orderId, purpose)}:resend:${delivery.id}:${Date.now()}`
    : deliveryKey(orderId, purpose);

  if (delivery.status === 'SENT' && !options.allowResend) {
    return { outcome: 'sent', deliveryId: delivery.id, idempotencyKey };
  }

  const staleBefore = new Date(Date.now() - STALE_DELIVERY_CLAIM_MS);
  const reusableStatuses = options.allowResend ? ['PENDING', 'FAILED', 'SENT'] : ['PENDING', 'FAILED'];
  const claimed = await db.ironSprueTransactionalEmailDelivery.updateMany({
    where: {
      id: delivery.id,
      OR: [
        { status: { in: reusableStatuses } },
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
      attachments: template.attachments?.length ? template.attachments : undefined,
    }),
  });

  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !payload.id) {
    const message = clean(payload.message);
    throw new IronSprueEmailProviderError(message ? `PROVIDER_REJECTED: ${message}` : 'PROVIDER_REJECTED');
  }
  return { outcome: 'sent' as const, providerMessageId: payload.id };
}

async function sendIronSprueEmail(
  orderId: string,
  purpose: string,
  build: (order: IronSprueEmailOrder, config: IronSprueEmailTemplateConfig) => IronSprueEmailTemplate,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
  options: { allowResend?: boolean } = {},
): Promise<IronSprueTransactionalEmailOutcome> {
  const orderRecord = await loadOrder(orderId, db);
  const order = mapEmailOrder(orderRecord);
  if (!order) return { outcome: 'not_found' };
  const recipient = clean(order.shippingEmail);
  if (!recipient || !isSendableCustomerEmail(recipient)) return { outcome: 'missing_recipient' };

  const claim = await claimIronSprueTransactionalEmail(orderId, purpose, db, options);
  if (claim.outcome !== 'claimed') return { outcome: claim.outcome, deliveryId: claim.deliveryId };

  const config = emailConfig();
  try {
    if (!config.apiKey || !config.from) {
      await markIronSprueTransactionalEmailFailed(claim.deliveryId, 'PROVIDER_UNCONFIGURED', db);
      console.warn('iron_sprue_transactional_email_skipped', {
        orderId,
        purpose,
        reason: 'provider_unconfigured',
      });
      return { outcome: 'provider_unconfigured' };
    }
    const template = build(await withInlineProductImages(order, config), config);
    const result = await sendViaResend(template, recipient, claim.idempotencyKey, config).catch(async (error) => {
      if (!template.attachments?.length) throw error;
      console.warn('iron_sprue_transactional_email_inline_images_retrying_without_attachments', {
        orderId,
        deliveryId: claim.deliveryId,
        purpose,
      });
      const fallbackTemplate = build(order, config);
      return sendViaResend(fallbackTemplate, recipient, `${claim.idempotencyKey}:remote-images`, config)
        .catch(() => {
          throw error;
        });
    });
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
    const errorCode = error instanceof IronSprueEmailProviderError
      ? error.safeCode
      : error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
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

export async function resendIronSprueOrderConfirmationEmail(
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
    { allowResend: true },
  );
}

export async function sendIronSprueCancellationEmail(
  orderId: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
  options: { allowResend?: boolean } = {},
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
    options,
  );
}

export async function resendIronSprueCancellationEmail(
  orderId: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
): Promise<IronSprueTransactionalEmailOutcome> {
  return sendIronSprueCancellationEmail(orderId, db, { allowResend: true });
}

export async function sendIronSprueDispatchEmail(
  orderId: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
  options: { allowResend?: boolean } = {},
): Promise<IronSprueTransactionalEmailOutcome> {
  const order = await loadOrder(orderId, db);
  if (!order) return { outcome: 'not_found' };
  if (order.fulfilmentStatus !== 'SHIPPED') return { outcome: 'not_dispatched' };
  return sendIronSprueEmail(
    orderId,
    IRON_SPRUE_DISPATCH_EMAIL_PURPOSE,
    buildIronSprueDispatchEmail,
    db,
    options,
  );
}

export async function resendIronSprueDispatchEmail(
  orderId: string,
  db: IronSprueEmailDb = getIronSprueEmailPrisma(),
): Promise<IronSprueTransactionalEmailOutcome> {
  return sendIronSprueDispatchEmail(orderId, db, { allowResend: true });
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
