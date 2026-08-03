import { neon } from '@neondatabase/serverless';
import { IRON_SPRUE_STORE_ID, sha256Hex } from '../../lib/launch-list';

function html(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    ...init,
    headers: { 'content-type': 'text/html; charset=utf-8', ...(init.headers ?? {}) },
  });
}

function signupUnavailable() {
  return html('<h1>Iron Sprue launch list</h1><p>Unsubscribe is temporarily unavailable.</p>', { status: 503 });
}

export const onRequestGet = async (context: {
  env: Record<string, string | undefined>;
  params: { token?: string | string[] };
}) => {
  const rawToken = Array.isArray(context.params.token) ? context.params.token.join('/') : context.params.token;
  const token = rawToken?.trim();
  if (!token || token.length < 32) {
    return html('<h1>Iron Sprue launch list</h1><p>This unsubscribe link is not valid.</p>', { status: 400 });
  }

  const databaseUrl = context.env.IRON_SPRUE_DATABASE_URL?.trim();
  if (!databaseUrl) return signupUnavailable();
  if (databaseUrl === context.env.DATABASE_URL?.trim() || databaseUrl === context.env.TCG_HOBBY_DATABASE_URL?.trim()) {
    return signupUnavailable();
  }

  const tokenHash = await sha256Hex(token);
  const sql = neon(databaseUrl);
  const rows = await sql`
    update iron_sprue_launch_subscribers
    set status = 'UNSUBSCRIBED',
        email_status = 'SUPPRESSED',
        unsubscribed_at = coalesce(unsubscribed_at, now()),
        updated_at = now()
    where store_id = ${IRON_SPRUE_STORE_ID}
      and unsubscribe_token_hash = ${tokenHash}
    returning id
  ` as Array<{ id: string }>;

  if (!rows[0]) {
    return html('<h1>Iron Sprue launch list</h1><p>This unsubscribe link was not found.</p>', { status: 404 });
  }

  return html('<h1>You have been unsubscribed</h1><p>You will no longer receive Iron Sprue launch-list emails.</p>');
};
