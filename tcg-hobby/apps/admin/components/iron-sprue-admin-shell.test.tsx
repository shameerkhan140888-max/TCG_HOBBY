import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/iron-sprue-admin/products',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('../lib/auth-actions.server', () => ({
  logoutIronSprueAdminAction: vi.fn(),
}));

import { IronSprueAdminShell } from './iron-sprue-admin-shell';

describe('IronSprueAdminShell', () => {
  it('renders Iron Sprue branding and navigation without TCG Admin catalogue links', () => {
    const markup = renderToStaticMarkup(
      <IronSprueAdminShell user={{ id: 'admin-1', email: 'admin@example.test', name: 'Admin User', role: 'ADMIN' }}>
        <main>Iron Sprue content</main>
      </IronSprueAdminShell>,
    );

    expect(markup).toContain('alt="Iron Sprue"');
    expect(markup).toContain('Admin workspace');
    expect(markup).toContain('href="/iron-sprue-admin/products" aria-current="page"');
    for (const label of ['Dashboard', 'Products', 'Inventory', 'Categories', 'Brands', 'Suppliers', 'Media', 'Storefront', 'Heroes', 'Orders', 'Settings']) {
      expect(markup).toContain(label);
    }
    expect(markup).not.toContain('TCG Hobby');
    expect(markup).not.toContain('href="/admin/products"');
    expect(markup).not.toContain('href="/admin/storefront"');
    expect(markup).toContain('Sign out');
  });
});
