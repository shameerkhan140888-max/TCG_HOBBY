import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { BrandMark } from './brand-mark';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from './lib/cn';

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? 'currentColor' : 'none'}>
      <path
        d="M20.8 4.6c-2-1.9-5.2-1.8-7.1.2L12 6.5l-1.7-1.7c-1.9-2-5.1-2.1-7.1-.2-2.1 2-2.2 5.3-.2 7.4l8.2 8.1a1.1 1.1 0 0 0 1.6 0L21 12c2-2.1 1.9-5.4-.2-7.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type AuthCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  footer?: ReactNode;
};

export function AuthCard({ title, description, footer, className, children, ...props }: AuthCardProps) {
  return (
    <Card className={cn('w-full max-w-md shadow-glow', className)} {...props}>
      <CardHeader className="border-b-0 pb-0">
        <CardTitle className="text-center text-2xl font-bold">{title}</CardTitle>
        <p className="mt-2 text-center text-sm leading-6 text-neutral-400">{description}</p>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {children}
        {footer ? <div className="pt-2 text-sm text-neutral-400">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export type FormFieldProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  htmlFor: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
};

export function FormField({ label, htmlFor, hint, error, required, className, children, ...props }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <label className="text-sm font-medium text-neutral-300" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs leading-5 text-neutral-500">{hint}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

export function ErrorMessage({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  if (!children) {
    return null;
  }

  return (
    <p className={cn('text-sm leading-6 text-red-300', className)} {...props}>
      {children}
    </p>
  );
}

export type WishlistButtonProps = {
  productId: string;
  wishlisted: boolean;
  authenticated: boolean;
  action?: (formData: FormData) => void | Promise<void>;
  loginHref: string;
  returnTo?: string;
};

export function WishlistButton({ productId, wishlisted, authenticated, action, loginHref, returnTo }: WishlistButtonProps) {
  const label = wishlisted ? 'Remove from wishlist' : 'Add to wishlist';

  if (!authenticated || !action) {
    return (
      <Button asChild size="icon" variant="outline" title={label}>
        <a href={loginHref} aria-label={label}>
          <HeartIcon filled={wishlisted} />
        </a>
      </Button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="productId" value={productId} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <Button size="icon" variant={wishlisted ? 'secondary' : 'outline'} type="submit" aria-pressed={wishlisted} aria-label={label} title={label}>
        <HeartIcon filled={wishlisted} />
      </Button>
    </form>
  );
}

export type UserMenuProps = {
  authenticated: boolean;
  name?: string | null | undefined;
  email?: string | null | undefined;
  logoutAction?: (() => void | Promise<void>) | undefined;
  loginHref: string;
  registerHref: string;
  accountHref: string;
};

export function UserMenu({ authenticated, name, email, logoutAction, loginHref, registerHref, accountHref }: UserMenuProps) {
  if (!authenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <a href={loginHref}>Log in</a>
        </Button>
        <Button asChild>
          <a href={registerHref}>Register</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold text-neutral-50">{name ?? 'Account'}</p>
        <p className="text-xs text-neutral-500">{email}</p>
      </div>
      <Button variant="outline" asChild>
        <a href={accountHref}>Account</a>
      </Button>
      {logoutAction ? (
        <form action={logoutAction}>
          <Button variant="ghost" type="submit">
            Log out
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export type AccountNavItem = {
  href: string;
  label: string;
};

export type AccountNavProps = {
  items: AccountNavItem[];
  activeHref: string;
  logoutAction?: () => void | Promise<void>;
};

export function AccountNav({ items, activeHref, logoutAction }: AccountNavProps) {
  return (
    <div className="flex h-full flex-col justify-between">
      <nav className="space-y-1">
        {items.map((item) => {
          const active = activeHref === item.href || activeHref.startsWith(`${item.href}/`);
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-accent/15 text-accent-soft' : 'text-neutral-300 hover:bg-surface-panel hover:text-neutral-50',
              )}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
      {logoutAction ? (
        <form action={logoutAction} className="mt-6">
          <Button variant="outline" className="w-full" type="submit">
            Log out
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export type AccountShellProps = HTMLAttributes<HTMLDivElement> & {
  sidebarTitle: string;
  sidebarSubtitle?: string;
  sidebar: ReactNode;
};

export function AccountShell({ sidebarTitle, sidebarSubtitle, sidebar, className, children, ...props }: AccountShellProps) {
  return (
    <div className={cn('grid min-h-screen bg-surface-ink text-neutral-50 lg:grid-cols-[280px_1fr]', className)} {...props}>
      <aside className="border-r border-surface-line bg-surface-base p-5">
        <div className="mb-8">
          <BrandMark width={160} height={56} className="w-[150px] object-contain" />
          <p className="mt-4 text-lg font-bold">{sidebarTitle}</p>
          {sidebarSubtitle ? <p className="text-sm text-neutral-500">{sidebarSubtitle}</p> : null}
        </div>
        {sidebar}
      </aside>
      <main className="min-w-0 bg-surface-ink">{children}</main>
    </div>
  );
}
