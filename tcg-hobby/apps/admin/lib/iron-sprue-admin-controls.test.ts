import { describe, expect, it } from 'vitest';
import { getIronSprueAdminControl, ironSprueAdminControls, ironSpruePlaceholderAssets } from './iron-sprue-admin-controls';

describe('Iron Sprue Admin controls', () => {
  it('maps launch controls to the dedicated Iron Sprue Admin workspace', () => {
    expect(ironSprueAdminControls.map((control) => control.key)).toEqual([
      'products',
      'inventory',
      'media',
      'stocked-brands',
      'categories',
      'homepage',
    ]);

    expect(getIronSprueAdminControl('products')).toMatchObject({
      href: '/admin/iron-sprue/products',
      requiresIronSprueRuntime: true,
    });
    expect(getIronSprueAdminControl('inventory')?.href).toBe('/admin/iron-sprue/inventory');
    expect(getIronSprueAdminControl('media')?.capability).toMatch(/Image 2/i);
    expect(getIronSprueAdminControl('stocked-brands')?.description).toMatch(/carousel/i);
    expect(ironSprueAdminControls.map((control) => control.href).join(' ')).not.toMatch(/\/admin\/products\?game=iron-sprue|\/admin\/storefront|\/admin\/catalogue/);
  });

  it('requires the Iron Sprue Admin runtime for every mutable launch control', () => {
    expect(ironSprueAdminControls).not.toHaveLength(0);
    expect(ironSprueAdminControls.every((control) => control.requiresIronSprueRuntime)).toBe(true);
  });

  it('exposes generated placeholder media separately from manufacturer assets', () => {
    expect(ironSpruePlaceholderAssets.map((asset) => asset.href)).toEqual([
      '/iron-sprue/placeholders/placeholder-red-car-workshop.png',
      '/iron-sprue/placeholders/placeholder-tools-workshop.png',
      '/iron-sprue/placeholders/placeholder-clock-landmark-puzzle.png',
    ]);
    expect(ironSpruePlaceholderAssets.every((asset) => /placeholder/i.test(asset.usage))).toBe(true);
  });
});
