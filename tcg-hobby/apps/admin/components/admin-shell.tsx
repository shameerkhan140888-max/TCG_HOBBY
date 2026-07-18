'use client';

import { usePathname } from 'next/navigation';
import { BrandMark, Button } from '@tcg-hobby/ui';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/releases', label: 'Releases' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/catalogue', label: 'Catalogue Settings' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/buylist', label: 'Buylist' },
  { href: '/admin/marketing/subscribers', label: 'Subscribers' },
  { href: '/admin/marketing/campaigns', label: 'Campaigns' },
  { href: '/admin/suppliers', label: 'Suppliers' },
  { href: '/admin/orders', label: 'Orders' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface-ink text-neutral-50 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-r border-surface-line bg-surface-base px-5 py-6">
        <div className="flex items-center">
          <BrandMark width={160} height={56} className="w-[150px] object-contain" />
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-accent/15 text-accent-soft' : 'text-neutral-300 hover:bg-surface-panel hover:text-neutral-50'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-8 rounded-lg border border-surface-line bg-surface-ink p-4">
          <p className="text-sm font-semibold text-neutral-50">Operations first</p>
          <p className="mt-2 text-sm leading-6 text-neutral-400">Products, inventory, suppliers, and orders now have a single control surface.</p>
          <Button asChild className="mt-4 w-full" variant="outline" size="sm">
            <a href="/admin/products">Open catalogue</a>
          </Button>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
