'use server';

import { prisma } from '@tcg-hobby/database';
import {
  hashPassword,
  normalizeEmail,
  validateLoginInput,
  validateProfileInput,
  validateRegisterInput,
  verifyPassword,
  type FieldErrors,
} from '@tcg-hobby/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionExpiry, generateSessionToken, SESSION_COOKIE_NAME } from '@tcg-hobby/auth';
import { requireCustomerSession } from './auth';

type AuthFormState = {
  formError?: string;
  fieldErrors: FieldErrors;
};

export type LoginFormState = AuthFormState & {
  values: {
    email: string;
  };
};

export type RegisterFormState = AuthFormState & {
  values: {
    email: string;
  };
};

export type ProfileFormState = AuthFormState & {
  success?: string;
  values: {
    name: string;
  };
};

function getReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/account';
  }

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

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(expires));
}

async function destroyCustomerSession(sessionToken: string) {
  await prisma.session.deleteMany({ where: { sessionToken } });
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function logoutCustomerAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await destroyCustomerSession(token);
  }

  redirect('/login');
}

export async function loginCustomerAction(_state: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const result = validateLoginInput({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });

  if (!result.ok) {
    return {
      fieldErrors: result.fieldErrors,
      values: {
        email: result.email,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: result.email },
  });

  if (!user?.passwordHash || !verifyPassword(result.password, user.passwordHash)) {
    return {
      formError: 'The email or password you entered is incorrect.',
      fieldErrors: {},
      values: {
        email: result.email,
      },
    };
  }

  if (user.role !== 'CUSTOMER') {
    return {
      formError: 'Please use a customer account to access the storefront.',
      fieldErrors: {},
      values: {
        email: result.email,
      },
    };
  }

  await createCustomerSession(user.id);
  redirect(getReturnTo(formData.get('callbackUrl')));
}

export async function registerCustomerAction(_state: RegisterFormState, formData: FormData): Promise<RegisterFormState> {
  const result = validateRegisterInput({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  });

  if (!result.ok) {
    return {
      fieldErrors: result.fieldErrors,
      values: {
        email: result.email,
      },
    };
  }

  const existing = await prisma.user.findUnique({ where: { email: result.email } });
  if (existing) {
    return {
      formError: 'An account with that email already exists.',
      fieldErrors: {},
      values: {
        email: result.email,
      },
    };
  }

  const user = await prisma.user.create({
    data: {
      email: normalizeEmail(result.email),
      name: null,
      passwordHash: hashPassword(result.password),
      role: 'CUSTOMER',
      wishlist: {
        create: {},
      },
    },
  });

  await createCustomerSession(user.id);
  redirect(getReturnTo(formData.get('callbackUrl')));
}

export async function updateProfileAction(_state: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = await requireCustomerSession('/account/profile');
  const result = validateProfileInput({
    name: String(formData.get('name') ?? ''),
  });

  if (!result.ok) {
    return {
      fieldErrors: result.fieldErrors,
      values: {
        name: result.name,
      },
    };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: result.name,
    },
  });

  return {
    fieldErrors: {},
    success: 'Profile saved.',
    values: {
      name: result.name,
    },
  };
}
