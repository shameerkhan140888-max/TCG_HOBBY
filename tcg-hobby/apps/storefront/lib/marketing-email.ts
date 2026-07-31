import {
  recordMarketingConfirmationAttempt,
  recordMarketingConfirmationFailure,
  recordMarketingConfirmationSent,
} from '@tcg-hobby/database';
import { Resend } from 'resend';
import { buildSignupEmail } from './email-templates';

type ConfirmationEmailInput = {
  subscriberId: string;
  email: string;
  firstName: string | null;
  unsubscribeToken: string;
};

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tcg-hobby.co.uk').replace(/\/$/, '');
}

function getSignupEmailFrom() {
  return process.env.SIGNUP_EMAIL_FROM ?? 'TCG Hobby <no-reply@tcg-hobby.co.uk>';
}

function getSignupEmailReplyTo() {
  return process.env.SIGNUP_EMAIL_REPLY_TO ?? 'info@tcg-hobby.co.uk';
}

export async function sendSubscriberConfirmationEmail(input: ConfirmationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is required to send subscriber confirmation email.');
    }
    return { skipped: true };
  }

  await recordMarketingConfirmationAttempt(input.subscriberId);

  try {
    const message = buildSignupEmail({ ...input, siteUrl: getSiteUrl() });
    const result = await new Resend(apiKey).emails.send({
      from: getSignupEmailFrom(),
      to: input.email,
      replyTo: getSignupEmailReplyTo(),
      subject: message.subject,
      html: message.html,
      text: message.text,
    }, {
      idempotencyKey: `subscriber:${input.subscriberId}:welcome`,
    });

    if (result.error) {
      throw new Error(result.error.message ?? 'Resend rejected the confirmation email.');
    }

    await recordMarketingConfirmationSent(input.subscriberId);
    return { skipped: false };
  } catch (error) {
    await recordMarketingConfirmationFailure(
      input.subscriberId,
      error instanceof Error ? error.message : 'Confirmation email failed.',
    );
    throw error;
  }
}
