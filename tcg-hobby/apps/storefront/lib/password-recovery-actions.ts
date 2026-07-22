'use server';

import { randomBytes } from 'node:crypto';
import { hashPassword, normalizeEmail, validateEmail, validatePassword } from '@tcg-hobby/auth';
import { consumePasswordResetToken, prisma } from '@tcg-hobby/database';
import { Resend } from 'resend';
import { hashPasswordResetToken } from './password-recovery';

export type PasswordRecoveryState = { fieldErrors: Record<string, string>; formError?: string; success?: string };
const RESET_WINDOW_MS = 60 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

function siteUrl(): string { return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tcg-hobby.co.uk').replace(/\/$/, ''); }

async function sendPasswordResetEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Password recovery email is not configured.');
  const resetUrl = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const result = await new Resend(apiKey).emails.send({
    from: process.env.AUTH_EMAIL_FROM ?? 'TCG Hobby <no-reply@tcg-hobby.co.uk>',
    to: email,
    replyTo: process.env.AUTH_EMAIL_REPLY_TO ?? 'support@tcg-hobby.co.uk',
    subject: 'Reset your TCG Hobby password',
    text: `Use this one-time link within one hour to reset your TCG Hobby password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="background:#08080a;color:#f5f5f5;font-family:Arial,sans-serif;padding:32px"><div style="max-width:560px;margin:auto;background:#101014;padding:28px"><h1>Reset your password</h1><p>Use this one-time link within one hour.</p><p><a href="${resetUrl}" style="color:#ff7a1a">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div></div>`,
  });
  if (result.error) throw new Error(result.error.message ?? 'Password recovery email was rejected.');
}

export async function requestPasswordResetAction(_state: PasswordRecoveryState, formData: FormData): Promise<PasswordRecoveryState> {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const emailError = validateEmail(email);
  if (emailError) return { fieldErrors: { email: emailError } };
  const generic = { fieldErrors: {}, success: 'If an account exists for that address, a password reset link has been sent.' };
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return generic;
  const recent = await prisma.userSecurityToken.findFirst({ where: { userId: user.id, type: 'PASSWORD_RESET', createdAt: { gte: new Date(Date.now() - REQUEST_COOLDOWN_MS) } } });
  if (recent) return generic;
  const token = randomBytes(32).toString('base64url');
  const record = await prisma.userSecurityToken.create({ data: { userId: user.id, type: 'PASSWORD_RESET', tokenHash: hashPasswordResetToken(token), expiresAt: new Date(Date.now() + RESET_WINDOW_MS) } });
  try { await sendPasswordResetEmail(user.email, token); }
  catch { await prisma.userSecurityToken.deleteMany({ where: { id: record.id } }); console.error('password_reset_email_failed', { tokenId: record.id }); }
  return generic;
}

export async function resetPasswordAction(_state: PasswordRecoveryState, formData: FormData): Promise<PasswordRecoveryState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirmation = String(formData.get('confirmPassword') ?? '');
  const fieldErrors: Record<string, string> = {};
  const passwordError = validatePassword(password); if (passwordError) fieldErrors.password = passwordError;
  if (password !== confirmation) fieldErrors.confirmPassword = 'Passwords do not match.';
  if (!token) fieldErrors.token = 'This password reset link is invalid.';
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const tokenHash = hashPasswordResetToken(token);
  const record = await prisma.userSecurityToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, expiresAt: true, usedAt: true } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return { fieldErrors: {}, formError: 'This password reset link is invalid or has expired.' };
  const now = new Date();
  try {
    const consumed = await consumePasswordResetToken({
      tokenId: record.id,
      userId: record.userId,
      passwordHash: hashPassword(password),
      verifiedAt: now,
    });
    if (!consumed) return { fieldErrors: {}, formError: 'This password reset link is invalid or has expired.' };
  } catch {
    return { fieldErrors: {}, formError: 'This password reset link is invalid or has expired.' };
  }
  return { fieldErrors: {}, success: 'Password updated. You can now sign in.' };
}
