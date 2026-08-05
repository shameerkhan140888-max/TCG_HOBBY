import { describe, expect, it } from 'vitest';
import { getIronSprueAdminControl, ironSprueAdminControls, ironSpruePlaceholderAssets } from './iron-sprue-admin-controls';

describe('Iron Sprue Admin controls', () => {
  it('maps the launch storefront controls to existing Admin capabilities', () => {
    expect(ironSprueAdminControls.map((control) => control.key)).toEqual([
      'products',
      'hero-carousel',
      'promotional-banner',
      'stocked-brands',
      'categories',
      'landing-copy',
    ]);

    expect(getIronSprueAdminControl('products')).toMatchObject({
      href: '/admin/products?game=iron-sprue',
      requiresIronSprueRuntime: true,
    });
    expect(getIronSprueAdminControl('hero-carousel')?.capability).toMatch(/homepage hero placements/i);
    expect(getIronSprueAdminControl('promotional-banner')?.capability).toMatch(/banner controls/i);
    expect(getIronSprueAdminControl('stocked-brands')?.description).toMatch(/carousel/i);
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
