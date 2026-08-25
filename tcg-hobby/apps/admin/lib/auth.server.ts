import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { canAccessAdmin, SESSION_COOKIE_NAME, type SessionUser } from '@tcg-hobby/auth';
import { prisma } from '@tcg-hobby/database';

export type AdminSession = {
  user: SessionUser;
  sessionToken: string;
  expires: Date;
};

export function isAdminDatabaseUnavailable(error: unknown) {
  const details = error as { code?: string; meta?: unknown };
  const message = error instanceof Error ? error.message : String(error);
  return (
    details.code === 'P1001' ||
    details.code === 'EACCES' ||
    message.includes("Can't reach database server") ||
    message.includes('DatabaseNotReachable') ||
    message.includes('P1001') ||
    message.includes('EACCES') ||
    JSON.stringify(details.meta ?? {}).includes('DatabaseNotReachable')
  );
}

export const getCurrentAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });

  if (!session || session.expires.getTime() <= Date.now()) return null;

  const user: SessionUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    role: session.user.role,
  };

  if (!canAccessAdmin(user)) return null;
  return { user, sessionToken: session.sessionToken, expires: session.expires };
});

export async function requireAdminSession(callbackUrl = '/admin', loginPath = '/login'): Promise<AdminSession> {
  const session = await getCurrentAdminSession();
  if (!session) redirect(`${loginPath}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return session;
}

export async function requireAdminRole(callbackUrl = '/admin'): Promise<AdminSession> {
  const session = await requireAdminSession(callbackUrl);
  if (session.user.role !== 'ADMIN') throw new Error('Administrator permission required.');
  return session;
}
