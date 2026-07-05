import { BrandMark, Container, UserMenu } from '@tcg-hobby/ui';
import { getCurrentCustomerSession } from '../lib/auth';
import { logoutCustomerAction } from '../lib/auth-actions';
import { ShopMenu } from './shop-menu';

export async function SiteHeader() {
  const session = await getCurrentCustomerSession();

  return (
    <header className="sticky top-0 z-20 border-b border-surface-line bg-surface-ink/90 backdrop-blur">
      <Container className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <a href="/" className="flex items-center gap-2">
            <BrandMark className="h-10 w-10 rounded-md border border-surface-line bg-black/60 p-1" />
            <span className="text-base font-bold tracking-wide">TCG Hobby</span>
          </a>
          <ShopMenu />
        </div>
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <UserMenu
            authenticated={session?.user.role === 'CUSTOMER'}
            name={session?.user.name}
            email={session?.user.email}
            logoutAction={session?.user.role === 'CUSTOMER' ? logoutCustomerAction : undefined}
            loginHref="/login"
            registerHref="/register"
            accountHref="/account"
          />
        </div>
      </Container>
    </header>
  );
}
