import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, type SessionUser } from '@tcg-hobby/auth';
import { prisma } from '@tcg-hobby/database/storefront';

export type IronSprueCustomerSession = {
  user: SessionUser & { emailVerified: Date | null };
  sessionToken: string;
  expires: Date;
};

export const getCurrentIronSprueCustomerSession = cache(async (): Promise<IronSprueCustomerSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!session || session.expires.getTime() <= Date.now() || session.user.role !== 'CUSTOMER') return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      role: session.user.role,
      emailVerified: session.user.emailVerified,
    },
    sessionToken: session.sessionToken,
    expires: session.expires,
  };
});

export async function requireIronSprueCustomerSession(callbackUrl = '/account') {
  const session = await getCurrentIronSprueCustomerSession();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return session;
}
