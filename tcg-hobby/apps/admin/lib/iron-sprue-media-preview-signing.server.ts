import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

const PREVIEW_TTL_SECONDS = 60 * 60;

function previewSecret() {
  const secret =
    process.env.IRON_SPRUE_ADMIN_MEDIA_PREVIEW_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('IRON_SPRUE_ADMIN_MEDIA_PREVIEW_SECRET, AUTH_SECRET or IRON_SPRUE_R2_SECRET_ACCESS_KEY is required for Iron Sprue admin media previews.');
  }
  return 'iron-sprue-local-media-preview-secret';
}

function signatureFor(key: string, expiresAt: number) {
  return createHmac('sha256', previewSecret()).update(`${key}.${expiresAt}`).digest('hex');
}

export function ironSprueAdminSignedPreviewUrl(key: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + PREVIEW_TTL_SECONDS;
  const signature = signatureFor(key, expiresAt);
  const params = new URLSearchParams({ key, exp: String(expiresAt), sig: signature });
  return `/iron-sprue-admin/media/preview?${params.toString()}`;
}

export function verifyIronSprueAdminMediaPreviewSignature(key: string, expiresAtValue: string | null, signatureValue: string | null) {
  if (!expiresAtValue || !signatureValue) return false;

  const expiresAt = Number.parseInt(expiresAtValue, 10);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(signatureFor(key, expiresAt), 'hex');
  const actual = Buffer.from(signatureValue, 'hex');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
