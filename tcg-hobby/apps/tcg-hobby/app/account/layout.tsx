import type { ReactNode } from 'react';
import { AccountShell } from '@tcg-hobby/ui';
import { requireCustomerSession } from '../../lib/auth';
import { logoutCustomerAction } from '../../lib/auth-actions';
import { AccountSidebar } from '../../components/account-sidebar';

export default async function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireCustomerSession('/account');

  return (
    <AccountShell sidebarTitle="Customer account" sidebarSubtitle={session.user.email} sidebar={<AccountSidebar logoutAction={logoutCustomerAction} />}>
      {children}
    </AccountShell>
  );
}
