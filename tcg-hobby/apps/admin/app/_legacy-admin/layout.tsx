import type { ReactNode } from 'react';
import { AdminShell } from '../../components/admin-shell';
import { requireAdminSession } from '../../lib/auth.server';

export default async function AdminRouteLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireAdminSession('/admin');
  return <AdminShell user={session.user}>{children}</AdminShell>;
}
