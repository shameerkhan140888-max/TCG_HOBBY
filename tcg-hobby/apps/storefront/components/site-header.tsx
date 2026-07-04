import { BrandMark, Button, Container, UserMenu } from '@tcg-hobby/ui';
import { getCurrentCustomerSession } from '../lib/auth';
import { logoutCustomerAction } from '../lib/auth-actions';

const navItems = [
  { label: 'Catalogue', href: '/catalogue' },
  { label: 'Cart', href: '/cart' },
  { label: 'Wishlist', href: '/account/wishlist' },
  { label: 'Orders', href: '/account/orders' },
  { label: 'Account', href: '/account' },
  { label: 'Events', href: '/catalogue?category=events' },
];

export async function SiteHeader() {
  const session = await getCurrentCustomerSession();

  return (
    <header className="sticky top-0 z-20 border-b border-surface-line bg-surface-ink/90 backdrop-blur">
      <Container className="flex min-h-16 flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3">
            <BrandMark className="h-10 w-10 rounded-md border border-surface-line bg-black/60 p-1" />
            <span className="text-base font-bold tracking-wide">TCG Hobby</span>
          </a>
          <div className="flex items-center gap-2 lg:hidden">
            {session ? null : (
              <Button variant="ghost" asChild>
                <a href="/login">Log in</a>
              </Button>
            )}
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-sm text-neutral-300">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className="transition-colors hover:text-accent-soft">
              {item.label}
            </a>
          ))}
        </nav>
        <UserMenu
          authenticated={session?.user.role === 'CUSTOMER'}
          name={session?.user.name}
          email={session?.user.email}
          logoutAction={session?.user.role === 'CUSTOMER' ? logoutCustomerAction : undefined}
          loginHref="/login"
          registerHref="/register"
          accountHref="/account"
        />
      </Container>
    </header>
  );
}
