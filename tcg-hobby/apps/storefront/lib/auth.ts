import 'server-only';

import { getWishlistItems, prisma } from '@tcg-hobby/database';
import {
  SESSION_COOKIE_NAME,
  createSessionExpiry,
  generateSessionToken,
  type SessionUser,
} from '@tcg-hobby/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export type CustomerSession = {
  user: SessionUser;
  sessionToken: string;
  expires: Date;
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

export const getCurrentCustomerSession = cache(async (): Promise<CustomerSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: true,
    },
  });

  if (!session || session.expires.getTime() <= Date.now()) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      role: session.user.role,
    },
    sessionToken: session.sessionToken,
    expires: session.expires,
  };
});

export async function requireCustomerSession(callbackUrl = '/account') {
  const session = await getCurrentCustomerSession();

  if (!session || session.user.role !== 'CUSTOMER') {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}

export async function getCustomerProfile() {
  const session = await requireCustomerSession('/account');
  const [user, wishlistItems] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        addresses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    getWishlistItems(session.user.id),
  ]);

  return {
    session,
    user,
    wishlistItems: {
      items: wishlistItems,
    },
  };
}
