import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  getDashboard: vi.fn(),
  getImplementationMap: vi.fn(),
  getPermissionMatrix: vi.fn(),
  resolvePermissions: vi.fn(),
}));

vi.mock('../../../lib/auth.server', () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

vi.mock('@tcg-hobby/database', () => ({
  getIronSprueAdminDashboard: mocks.getDashboard,
  getIronSprueAdminImplementationMap: mocks.getImplementationMap,
  getIronSprueAdminPermissionMatrix: mocks.getPermissionMatrix,
  resolveIronSprueAdminPermissions: mocks.resolvePermissions,
}));

import IronSprueAdminPage from './page';

describe('Iron Sprue Admin page', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
  });

  it('renders a dedicated Iron Sprue workspace instead of shared TCG Admin links', async () => {
    mocks.requireAdminSession.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.test', name: 'Admin User', role: 'ADMIN' },
    });
    mocks.resolvePermissions.mockResolvedValue({ role: 'SUPER_ADMIN', permissions: ['products:view', 'products:publish'] });
    mocks.getDashboard.mockResolvedValue({
      storeCode: 'IRON_SPRUE',
      environment: 'development',
      databaseStatus: 'connected',
      workerReadStatus: 'configured',
      warnings: [],
      metrics: [{ label: 'Total products', value: 0, detail: 'Iron Sprue-scoped Admin products.' }],
      workspace: [
        { key: 'products', label: 'Products', href: '/admin/iron-sprue/products', status: 'empty', description: 'Product controls', requiredPermission: 'products:view' },
        { key: 'media', label: 'Media', href: '/admin/iron-sprue/media', status: 'empty', description: 'Media controls', requiredPermission: 'media:approve' },
      ],
    });
    mocks.getImplementationMap.mockReturnValue([
      { capability: 'Products', classification: 'create Iron Sprue-specific equivalent', note: 'No TCG product table reuse.' },
      { capability: 'Buylist/releases/card metadata', classification: 'intentionally exclude', note: 'Trading-card-specific surfaces are not part of Iron Sprue.' },
    ]);
    mocks.getPermissionMatrix.mockReturnValue([{ role: 'SUPER_ADMIN', permissions: ['products:view', 'products:publish'] }]);

    const markup = renderToStaticMarkup(await IronSprueAdminPage());

    expect(markup).toContain('Dedicated Admin workspace');
    expect(markup).toContain('IRON_SPRUE only');
    expect(markup).toContain('href="/admin/iron-sprue/products"');
    expect(markup).toContain('href="/admin/iron-sprue/media"');
    expect(markup).not.toContain('/admin/products?game=iron-sprue');
    expect(markup).not.toContain('/admin/catalogue/brands');
    expect(markup).toContain('Trading-card-specific surfaces are not part of Iron Sprue.');
  });
});
