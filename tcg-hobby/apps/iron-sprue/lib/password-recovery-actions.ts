'use server';

import { randomBytes } from 'node:crypto';
import { hashPassword, normalizeEmail, validateEmail, validatePassword } from '@capital-hobby/auth';
import { Resend } from 'resend';
import { importLocalStorefrontDatabase } from './local-database';
import { hashIronSpruePasswordResetToken } from './password-recovery';

export type IronSpruePasswordRecoveryState = {
  fieldErrors: Record<string, string>;
  formError?: string;
  success?: string;
};

const RESET_WINDOW_MS = 60 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

function ironSprueSiteUrl(): string {
  return (process.env.IRON_SPRUE_SITE_URL ?? process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL ?? 'https://ironsprue.co.uk').replace(/\/$/, '');
}

async function sendIronSpruePasswordResetEmail(email: string, token: string) {
  const apiKey = process.env.IRON_SPRUE_RESEND_API_KEY;
  const from = process.env.IRON_SPRUE_EMAIL_FROM;
  if (!apiKey || !from) throw new Error('Iron Sprue password recovery email is not configured.');
  const resetUrl = `${ironSprueSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const emailOptions = {
    from,
    to: email,
    subject: 'Reset your Iron Sprue password',
    text: `Use this one-time link within one hour to reset your Iron Sprue password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="margin:0;background:#11110f;color:#f7f0e5;font-family:Arial,sans-serif;padding:32px"><div style="max-width:580px;margin:auto;background:#fffaf1;color:#11110f;padding:28px;border-top:6px solid #d79334"><h1 style="margin:0 0 16px">Reset your password</h1><p>Use this one-time link within one hour to reset your Iron Sprue password.</p><p><a href="${resetUrl}" style="display:inline-block;background:#11110f;color:#fffaf1;padding:12px 18px;text-decoration:none;font-weight:bold">Reset password</a></p><p style="color:#5d5a54">If you did not request this, you can ignore this email.</p></div></div>`,
  };
  const replyTo = process.env.IRON_SPRUE_EMAIL_REPLY_TO;
  const result = await new Resend(apiKey).emails.send(replyTo ? { ...emailOptions, replyTo } : emailOptions);
  if (result.error) throw new Error(result.error.message ?? 'Iron Sprue password recovery email was rejected.');
}

export async function requestIronSpruePasswordResetAction(_state: IronSpruePasswordRecoveryState, formData: FormData): Promise<IronSpruePasswordRecoveryState> {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const emailError = validateEmail(email);
  if (emailError) return { fieldErrors: { email: emailError } };
  const generic = { fieldErrors: {}, success: 'If an Iron Sprue account exists for that address, a password reset link has been sent.' };
  const { prisma } = await importLocalStorefrontDatabase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
  if (!user || user.role !== 'CUSTOMER') return generic;
  const recent = await prisma.userSecurityToken.findFirst({
    where: { userId: user.id, type: 'PASSWORD_RESET', createdAt: { gte: new Date(Date.now() - REQUEST_COOLDOWN_MS) } },
  });
  if (recent) return generic;
  const token = randomBytes(32).toString('base64url');
  const record = await prisma.userSecurityToken.create({
    data: { userId: user.id, type: 'PASSWORD_RESET', tokenHash: hashIronSpruePasswordResetToken(token), expiresAt: new Date(Date.now() + RESET_WINDOW_MS) },
  });
  try {
    await sendIronSpruePasswordResetEmail(user.email, token);
  } catch {
    await prisma.userSecurityToken.deleteMany({ where: { id: record.id } });
    console.error('iron_sprue_password_reset_email_failed', { tokenId: record.id });
  }
  return generic;
}

export async function resetIronSpruePasswordAction(_state: IronSpruePasswordRecoveryState, formData: FormData): Promise<IronSpruePasswordRecoveryState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirmation = String(formData.get('confirmPassword') ?? '');
  const fieldErrors: Record<string, string> = {};
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  if (password !== confirmation) fieldErrors.confirmPassword = 'Passwords do not match.';
  if (!token) fieldErrors.token = 'This password reset link is invalid.';
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const tokenHash = hashIronSpruePasswordResetToken(token);
  const { consumePasswordResetToken, prisma } = await importLocalStorefrontDatabase();
  const record = await prisma.userSecurityToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return { fieldErrors: {}, formError: 'This password reset link is invalid or has expired.' };
  }
  const consumed = await consumePasswordResetToken({
    tokenId: record.id,
    userId: record.userId,
    passwordHash: hashPassword(password),
    verifiedAt: new Date(),
  });
  if (!consumed) return { fieldErrors: {}, formError: 'This password reset link is invalid or has expired.' };
  return { fieldErrors: {}, success: 'Password updated. You can now sign in.' };
}
