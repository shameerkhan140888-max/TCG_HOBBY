'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionExpiry, generateSessionToken, SESSION_COOKIE_NAME, validateLoginInput, verifyPassword } from '@tcg-hobby/auth';
import { prisma } from '@tcg-hobby/database';
import { requireAdminSession } from './auth.server';

export type AdminLoginState = {
  formError?: string;
  fieldErrors: Partial<Record<string, string>>;
  values: { email: string };
};

function safeReturnTo(value: FormDataEntryValue | null): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/admin';
}

function cookieOptions(expires: Date) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', expires };
}

export async function loginAdminAction(_state: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const result = validateLoginInput({ email: String(formData.get('email') ?? ''), password: String(formData.get('password') ?? '') });
  if (!result.ok) return { fieldErrors: result.fieldErrors, values: { email: result.email } };

  const user = await prisma.user.findUnique({ where: { email: result.email } });
  if (!user?.passwordHash || !user.emailVerified || (user.role !== 'ADMIN' && user.role !== 'STAFF') || !verifyPassword(result.password, user.passwordHash)) {
    return { formError: 'The email or password you entered is incorrect.', fieldErrors: {}, values: { email: result.email } };
  }

  const sessionToken = generateSessionToken();
  const expires = createSessionExpiry();
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });
  (await cookies()).set(SESSION_COOKIE_NAME, sessionToken, cookieOptions(expires));
  redirect(safeReturnTo(formData.get('callbackUrl')));
}

export async function logoutAdminAction(): Promise<never> {
  const session = await requireAdminSession();
  await prisma.session.deleteMany({ where: { sessionToken: session.sessionToken } });
  (await cookies()).delete(SESSION_COOKIE_NAME);
  redirect('/login');
}
