'use client';

import type { SessionUser } from '@tcg-hobby/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { type ReactNode } from 'react';
import { logoutIronSprueAdminAction } from '../lib/auth-actions.server';

const navItems = [
  { href: '/iron-sprue-admin', label: 'Dashboard' },
  { href: '/iron-sprue-admin/products', label: 'Products' },
  { href: '/iron-sprue-admin/inventory', label: 'Inventory' },
  { href: '/iron-sprue-admin/categories', label: 'Categories' },
  { href: '/iron-sprue-admin/brands', label: 'Brands' },
  { href: '/iron-sprue-admin/suppliers', label: 'Suppliers' },
  { href: '/iron-sprue-admin/media', label: 'Media' },
  { href: '/iron-sprue-admin/homepage', label: 'Storefront' },
  { href: '/iron-sprue-admin/heroes', label: 'Heroes' },
  { href: '/iron-sprue-admin/orders', label: 'Orders' },
  { href: '/iron-sprue-admin/settings', label: 'Settings' },
] as const;

function isActive(pathname: string, href: string) {
  return href === '/iron-sprue-admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function IronSprueAdminShell({ children, user }: { children: ReactNode; user: SessionUser }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#070907] text-neutral-50 lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="border-b border-[#24312b] bg-[#090d0a] px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 lg:block">
          <Link href="/iron-sprue-admin" aria-label="Iron Sprue Admin dashboard" className="inline-flex">
            <img
              src="/iron-sprue/brand/iron-sprue-horizontal.svg"
              alt="Iron Sprue"
              width={188}
              height={54}
              className="h-auto w-[176px] object-contain"
            />
          </Link>
          <p className="hidden text-right text-xs font-semibold uppercase tracking-[0.24em] text-[#d59b3d] sm:block lg:mt-3 lg:text-left">
            Admin workspace
          </p>
        </div>

        <nav aria-label="Iron Sprue Admin navigation" className="mt-5 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d59b3d] ${
                  active
                    ? 'border-[#d59b3d] bg-[#d59b3d]/15 text-[#ffd48a]'
                    : 'border-transparent text-neutral-300 hover:border-[#26372f] hover:bg-[#101812] hover:text-neutral-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-[#24312b] pt-4">
          <p className="truncate text-sm font-semibold">{user.name ?? user.email}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">{user.role}</p>
          <form action={logoutIronSprueAdminAction}>
            <button
              type="submit"
              className="mt-3 w-full rounded-md border border-[#31443a] px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:border-[#d59b3d] hover:text-[#ffd48a] focus:outline-none focus:ring-2 focus:ring-[#d59b3d]"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 bg-surface-ink">{children}</main>
    </div>
  );
}
