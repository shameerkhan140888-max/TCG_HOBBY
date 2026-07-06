import Link from 'next/link';
import { BrandMark, Container, UserMenu } from '@tcg-hobby/ui';
import { getCurrentCustomerSession } from '../lib/auth';
import { logoutCustomerAction } from '../lib/auth-actions';
import { ShopMenu } from './shop-menu';

export async function SiteHeader() {
  const session = await getCurrentCustomerSession();
  const authenticated = session?.user.role === 'CUSTOMER';

  function SearchIcon() {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path
          d="M21 21l-4.35-4.35M10.75 17.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b border-surface-line bg-surface-ink/90 backdrop-blur">
      <Container className="flex min-h-16 flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3">
            <BrandMark className="h-10 w-10 rounded-md border border-surface-line bg-black/60 p-1" />
            <span className="text-base font-bold tracking-wide">TCG Hobby</span>
          </a>
          <ShopMenu />
        </div>
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <Link
            href="/catalogue"
            aria-label="Search"
            className="inline-flex h-10 w-10 items-center justify-center text-white transition hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <SearchIcon />
          </Link>
          <UserMenu
            authenticated={authenticated}
            name={session?.user.name}
            email={session?.user.email}
            logoutAction={authenticated ? logoutCustomerAction : undefined}
            loginHref="/login"
            registerHref="/register"
            accountHref="/account"
          />
        </div>
      </Container>
    </header>
  );
}
