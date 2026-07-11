import {
  recordMarketingConfirmationAttempt,
  recordMarketingConfirmationFailure,
  recordMarketingConfirmationSent,
} from '@tcg-hobby/database';
import { Resend } from 'resend';

type ResendSendResult = {
  error?: {
    message?: string;
  } | null;
};

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildConfirmationEmail(input: ConfirmationEmailInput) {
  const siteUrl = getSiteUrl();
  const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}`;
  const homeUrl = `${siteUrl}/`;
  const escapedEmail = escapeHtml(input.email);
  const greeting = input.firstName ? `Hi ${input.firstName},` : 'Hi there,';
  const escapedGreeting = escapeHtml(greeting);
  const bodyLines = [
    greeting,
    '',
    'Thank you for signing up to TCG Hobby.',
    '',
    "You're now on our launch list, and we'll be in touch as soon as we have something exciting to share.",
    '',
    "We're working hard behind the scenes to create a trusted destination for Pok\u00e9mon, Magic: The Gathering and other trading card game products.",
    '',
    'Our aim is simple: fair pricing, genuine products and a great experience for collectors and players.',
    '',
    "Once official distributor relationships are established, we promise to stock products at RRP wherever possible. Until then, we'll always work to keep our prices as close to RRP as we reasonably can.",
    '',
    'Keep an eye on your inbox for launch news, upcoming releases and early TCG Hobby updates.',
    '',
    'Thank you for being here from the beginning.',
    '',
    'The TCG Hobby Team',
    'tcg-hobby.co.uk',
    '',
    'This is an automated email from TCG Hobby. Replies are sent to our team at info@tcg-hobby.co.uk.',
    '',
    'You are receiving this email because you signed up through the TCG Hobby website.',
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
  ];
  const htmlParagraphs = bodyLines
    .filter((line) => line.trim())
    .map((line) => `<p style="color:#d4d4d4;font-size:15px;line-height:1.65;margin:0 0 14px">${escapeHtml(line)}</p>`)
    .join('');

  return {
    subject: 'Welcome to TCG Hobby \u2013 you\u2019re on the list',
    text: bodyLines.join('\n'),
    html: `
      <div style="background:#08080a;color:#f5f5f5;font-family:Arial,sans-serif;padding:32px">
        <div style="max-width:560px;margin:0 auto;border:1px solid rgba(255,122,26,0.24);border-radius:12px;background:#101014;padding:28px">
          <p style="color:#ff7a1a;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 16px">TCG Hobby</p>
          <h1 style="font-size:26px;line-height:1.2;margin:0 0 12px">${escapedGreeting}</h1>
          <p style="color:#a3a3a3;font-size:13px;line-height:1.5;margin:0 0 20px">Confirmation for ${escapedEmail}</p>
          ${htmlParagraphs}
          <p style="margin:22px 0 24px"><a href="${homeUrl}" style="display:inline-block;background:#ff7a1a;color:#101014;border-radius:8px;padding:12px 18px;font-weight:700;text-decoration:none">Visit tcg-hobby.co.uk</a></p>
          <p style="color:#a3a3a3;font-size:13px;line-height:1.5;margin:0"><a href="${unsubscribeUrl}" style="color:#ffb36b">Unsubscribe</a></p>
        </div>
      </div>
    `,
  };
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
    const resend = new Resend(apiKey);
    const message = buildConfirmationEmail(input);
    const result = await resend.emails.send({
      from: getSignupEmailFrom(),
      to: input.email,
      replyTo: getSignupEmailReplyTo(),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (result.error) {
      throw new Error(result.error.message ?? 'Resend rejected the confirmation email.');
    }

    await recordMarketingConfirmationSent(input.subscriberId);
    return { skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Confirmation email failed.';
    await recordMarketingConfirmationFailure(input.subscriberId, message);
    throw error;
  }
}
