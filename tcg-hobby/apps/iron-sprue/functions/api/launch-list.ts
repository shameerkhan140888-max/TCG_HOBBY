import { neon } from '@neondatabase/serverless';
import {
  IRON_SPRUE_STORE_ID,
  buildSignupEmail,
  createOpaqueToken,
  safeSiteUrl,
  sha256Hex,
  validateLaunchListSignup,
} from '../../lib/launch-list';

const MAX_BODY_BYTES = 4096;

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers ?? {}) },
  });
}

async function sendResendEmail(env: Record<string, string | undefined>, input: { to: string; token: string }) {
  const apiKey = env.IRON_SPRUE_RESEND_API_KEY?.trim();
  const from = env.IRON_SPRUE_EMAIL_FROM?.trim();
  const replyTo = env.IRON_SPRUE_SUPPORT_EMAIL?.trim() || 'info@ironsprue.co.uk';
  if (!apiKey || !from) throw new Error('Iron Sprue Resend configuration is missing.');

  const email = buildSignupEmail({ siteUrl: safeSiteUrl(env.IRON_SPRUE_SITE_URL), unsubscribeToken: input.token });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      reply_to: replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !payload.id) throw new Error(payload.message || 'Resend email request failed.');
  return payload.id;
}

export const onRequestOptions = () => json({ ok: true }, { status: 204 });

export const onRequestPost = async (context: { request: Request; env: Record<string, string | undefined> }) => {
  const length = Number(context.request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY_BYTES) return json({ message: 'Request body too large.' }, { status: 413 });

  const validation = validateLaunchListSignup(await context.request.json().catch(() => ({})));
  if (!validation.ok) return json({ ok: validation.bot === true, message: validation.message }, { status: validation.status });

  const databaseUrl = context.env.IRON_SPRUE_DATABASE_URL?.trim();
  if (!databaseUrl) return json({ message: 'Signup is temporarily unavailable.' }, { status: 503 });
  if (databaseUrl === context.env.DATABASE_URL?.trim() || databaseUrl === context.env.TCG_HOBBY_DATABASE_URL?.trim()) {
    return json({ message: 'Signup is temporarily unavailable.' }, { status: 503 });
  }

  const sql = neon(databaseUrl);
  const existing = await sql`
    select id, status
    from iron_sprue_launch_subscribers
    where store_id = ${IRON_SPRUE_STORE_ID} and email_normalized = ${validation.email}
    limit 1
  ` as Array<{ id: string; status: string }>;

  if (existing[0] && existing[0].status !== 'UNSUBSCRIBED') {
    return json({ ok: true, duplicate: true });
  }

  const token = createOpaqueToken();
  const tokenHash = await sha256Hex(token);
  const rows = await sql`
    insert into iron_sprue_launch_subscribers (
      store_id, email_normalized, status, consent_given, consent_wording, consent_version,
      consented_at, source, unsubscribe_token_hash, email_status, created_at, updated_at
    )
    values (
      ${IRON_SPRUE_STORE_ID}, ${validation.email}, 'ACTIVE', true, ${validation.consentWording},
      ${validation.consentVersion}, now(), 'coming-soon-page', ${tokenHash}, 'PENDING', now(), now()
    )
    on conflict (store_id, email_normalized)
    do update set
      status = 'ACTIVE',
      consent_given = true,
      consent_wording = excluded.consent_wording,
      consent_version = excluded.consent_version,
      consented_at = now(),
      unsubscribe_token_hash = excluded.unsubscribe_token_hash,
      email_status = 'PENDING',
      email_error = null,
      unsubscribed_at = null,
      updated_at = now()
    returning id
  ` as Array<{ id: string }>;

  try {
    const resendId = await sendResendEmail(context.env, { to: validation.email, token });
    await sql`
      update iron_sprue_launch_subscribers
      set email_status = 'SENT', resend_message_id = ${resendId}, confirmation_sent_at = now(), updated_at = now()
      where id = ${rows[0]?.id}
    `;
  } catch (error) {
    await sql`
      update iron_sprue_launch_subscribers
      set email_status = 'FAILED', email_error = ${error instanceof Error ? error.message.slice(0, 500) : 'Email failed'}, updated_at = now()
      where id = ${rows[0]?.id}
    `;
    return json({ message: 'Signup is temporarily unavailable.' }, { status: 503 });
  }

  return json({ ok: true, duplicate: false });
};
