export const IRON_SPRUE_STORE_ID = 'IRON_SPRUE';
export const LAUNCH_LIST_CONSENT_VERSION = 'iron-sprue-launch-list-2026-08-03';
export const LAUNCH_LIST_CONSENT_WORDING =
  'I agree to receive Iron Sprue launch updates, new-stock announcements and occasional product news. I can unsubscribe at any time.';

export type LaunchListSignupInput = {
  email: unknown;
  consent: unknown;
  website?: unknown;
};

export type LaunchListValidationResult =
  | { ok: true; email: string; consentVersion: string; consentWording: string }
  | { ok: false; status: number; message: string; bot?: boolean };

export function normalizeLaunchListEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateLaunchListSignup(input: LaunchListSignupInput): LaunchListValidationResult {
  if (String(input.website ?? '').trim()) {
    return { ok: false, status: 202, message: 'Accepted.', bot: true };
  }

  const email = normalizeLaunchListEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, status: 400, message: 'Enter a valid email address.' };
  }

  if (input.consent !== true && input.consent !== 'true' && input.consent !== 'on') {
    return { ok: false, status: 400, message: 'Consent is required to join the Iron Sprue launch list.' };
  }

  return {
    ok: true,
    email,
    consentVersion: LAUNCH_LIST_CONSENT_VERSION,
    consentWording: LAUNCH_LIST_CONSENT_WORDING,
  };
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createOpaqueToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes.buffer);
}

export async function sha256Hex(value: string) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

export function safeSiteUrl(value: string | undefined) {
  const candidate = value?.trim() || 'https://www.ironsprue.co.uk';
  const url = new URL(candidate);
  if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.username || url.password) {
    throw new Error('IRON_SPRUE_SITE_URL must be a public HTTPS URL.');
  }
  return url.origin;
}

export function buildSignupEmail(input: { siteUrl: string; unsubscribeToken: string }) {
  const unsubscribeUrl = `${input.siteUrl}/unsubscribe/${encodeURIComponent(input.unsubscribeToken)}`;
  return {
    subject: 'You are on the Iron Sprue launch list',
    text: [
      'Thanks for joining the Iron Sprue launch list.',
      '',
      'We will send launch updates, new-stock announcements and occasional product news.',
      '',
      `Unsubscribe: ${unsubscribeUrl}`,
      '',
      'Iron Sprue is a trading division of Capital Hobby Group Ltd.',
    ].join('\n'),
    html: [
      '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#191713">',
      '<h1 style="font-size:24px">You are on the Iron Sprue launch list</h1>',
      '<p>Thanks for joining. We will send launch updates, new-stock announcements and occasional product news.</p>',
      `<p><a href="${unsubscribeUrl}">Unsubscribe from Iron Sprue launch updates</a></p>`,
      '<p style="font-size:13px;color:#686156">Iron Sprue is a trading division of Capital Hobby Group Ltd.</p>',
      '</div>',
    ].join(''),
  };
}
