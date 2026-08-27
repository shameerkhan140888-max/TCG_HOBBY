import 'server-only';

import {
  claimOrderConfirmationEmail,
  getOrderById,
  markTransactionalEmailFailed,
  markTransactionalEmailSent,
} from '@capital-hobby/database/storefront';
import { Resend } from 'resend';
import { buildOrderConfirmationEmail } from './email-templates';

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tcg-hobby.co.uk').replace(/\/$/, '');
}

function getOrderEmailFrom() {
  return process.env.ORDER_EMAIL_FROM ?? 'TCG Hobby <no-reply@tcg-hobby.co.uk>';
}

function getOrderEmailReplyTo() {
  return process.env.ORDER_EMAIL_REPLY_TO ?? 'support@tcg-hobby.co.uk';
}

export async function sendPaidOrderConfirmationEmail(orderId: string) {
  const order = await getOrderById(orderId);
  if (!order || order.paymentStatus !== 'SUCCEEDED' || order.status !== 'PAID') {
    return { outcome: 'not_paid' as const };
  }

  const claim = await claimOrderConfirmationEmail(order.id);
  if (claim.outcome !== 'claimed') {
    return { outcome: claim.outcome };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await markTransactionalEmailFailed(claim.deliveryId, 'PROVIDER_UNCONFIGURED');
    console.warn('order_confirmation_email_skipped', {
      orderId: order.id,
      reason: 'provider_unconfigured',
    });
    return { outcome: 'provider_unconfigured' as const };
  }

  try {
    const message = buildOrderConfirmationEmail(order, getSiteUrl());
    const result = await new Resend(apiKey).emails.send({
      from: getOrderEmailFrom(),
      to: order.shippingEmail,
      replyTo: getOrderEmailReplyTo(),
      subject: message.subject,
      html: message.html,
      text: message.text,
    }, {
      idempotencyKey: claim.idempotencyKey,
    });

    if (result.error) {
      throw new Error('PROVIDER_REJECTED');
    }

    await markTransactionalEmailSent(claim.deliveryId, result.data?.id ?? null);
    console.info('order_confirmation_email_sent', {
      orderId: order.id,
      deliveryId: claim.deliveryId,
    });
    return { outcome: 'sent' as const };
  } catch (error) {
    const errorCode = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : 'PROVIDER_REQUEST_FAILED';
    await markTransactionalEmailFailed(claim.deliveryId, errorCode);
    console.error('order_confirmation_email_failed', {
      orderId: order.id,
      deliveryId: claim.deliveryId,
      errorCode,
    });
    return { outcome: 'failed' as const };
  }
}
