'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE_NAME,
  createSessionExpiry,
  generateSessionToken,
  hashPassword,
  normalizeEmail,
  validateLoginInput,
  validateProfileInput,
  validateRegisterInput,
  verifyPassword,
  type FieldErrors,
} from '@tcg-hobby/auth';
import { requireIronSprueCustomerSession } from './auth';
import { importLocalStorefrontDatabase } from './local-database';
import { claimVerifiedIronSprueGuestOrders } from './orders';

type AuthFormState = {
  formError?: string;
  fieldErrors: FieldErrors;
};

export type IronSprueAuthState = AuthFormState & { success?: string; values?: Record<string, string> };
export type LoginFormState = IronSprueAuthState & { values: { email: string } };
export type RegisterFormState = IronSprueAuthState & { values: { email: string } };
export type ProfileFormState = IronSprueAuthState & { values: { name: string } };

function safeReturnTo(value: FormDataEntryValue | null, fallback = '/account') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  };
}

async function createCustomerSession(userId: string) {
  const sessionToken = generateSessionToken();
  const expires = createSessionExpiry();
  const { prisma } = await importLocalStorefrontDatabase();
  await prisma.session.create({ data: { sessionToken, userId, expires } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(expires));
}

export async function logoutIronSprueCustomerAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const { prisma } = await importLocalStorefrontDatabase();
    await prisma.session.deleteMany({ where: { sessionToken: token } });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/login');
}

export async function loginIronSprueCustomerAction(_state: IronSprueAuthState, formData: FormData): Promise<IronSprueAuthState> {
  const result = validateLoginInput({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });
  if (!result.ok) return { fieldErrors: result.fieldErrors, values: { email: result.email } };

  const { prisma } = await importLocalStorefrontDatabase();
  const user = await prisma.user.findUnique({ where: { email: result.email } });
  if (!user?.passwordHash || !verifyPassword(result.password, user.passwordHash) || user.role !== 'CUSTOMER') {
    return { formError: 'The email or password you entered is incorrect.', fieldErrors: {}, values: { email: result.email } };
  }

  await createCustomerSession(user.id);
  if (user.emailVerified) await claimVerifiedIronSprueGuestOrders(user.id, user.email);
  redirect(safeReturnTo(formData.get('callbackUrl')));
}

export async function registerIronSprueCustomerAction(_state: IronSprueAuthState, formData: FormData): Promise<IronSprueAuthState> {
  const consent = formData.get('privacyConsent') === 'yes';
  const result = validateRegisterInput({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  });
  const fieldErrors = { ...result.fieldErrors };
  if (!consent) fieldErrors.privacyConsent = 'Confirm you understand how Iron Sprue handles your account information.';
  if (!result.ok || Object.keys(fieldErrors).length) return { fieldErrors, values: { email: result.email } };

  const { prisma } = await importLocalStorefrontDatabase();
  const existing = await prisma.user.findUnique({ where: { email: result.email } });
  if (existing) return { formError: 'An account with that email already exists.', fieldErrors: {}, values: { email: result.email } };

  const user = await prisma.user.create({
    data: {
      email: normalizeEmail(result.email),
      name: null,
      passwordHash: hashPassword(result.password),
      role: 'CUSTOMER',
      emailVerified: new Date(),
      wishlist: { create: {} },
    },
  });
  await claimVerifiedIronSprueGuestOrders(user.id, user.email);
  await createCustomerSession(user.id);
  redirect(safeReturnTo(formData.get('callbackUrl')));
}

export async function updateIronSprueProfileAction(_state: IronSprueAuthState, formData: FormData): Promise<IronSprueAuthState> {
  const session = await requireIronSprueCustomerSession('/account');
  const result = validateProfileInput({ name: String(formData.get('name') ?? '') });
  if (!result.ok) return { fieldErrors: result.fieldErrors, values: { name: result.name } };
  const { prisma } = await importLocalStorefrontDatabase();
  await prisma.user.update({ where: { id: session.user.id }, data: { name: result.name } });
  return { fieldErrors: {}, success: 'Profile saved.', values: { name: result.name } };
}
