import { describe, expect, it, vi } from 'vitest';
import {
  adminHeroRowsToSlides,
  applyApprovedMediaToProducts,
  applyInventoryToProducts,
  approvedMediaRowsToProductMedia,
  getIronSprueHeroSlides,
  getIronSprueCategoryNavigation,
  getIronSpruePromoStripItems,
  ironSprueTypographyCustomProperties,
  productSectionsFromPlacements,
  promoPanelsFromPlacements,
  productsFromFeaturedPlacements,
  publicIronSprueMediaUrl,
} from './admin-storefront-controls';

describe('Iron Sprue Admin storefront controls', () => {
  it('resolves R2 hero keys through the configured public media base', () => {
    vi.stubEnv('IRON_SPRUE_R2_PUBLIC_BASE_URL', 'https://media.ironsprue.example/');

    expect(publicIronSprueMediaUrl('r2://marketing/heroes/example.png')).toBe(
      'https://media.ironsprue.example/marketing/heroes/example.png',
    );

    vi.unstubAllEnvs();
  });

  it('keeps hero rendering resilient when no database URL is configured', async () => {
    vi.stubEnv('IRON_SPRUE_DATABASE_URL', '');
    vi.stubEnv('IRON_SPRUE_WORKER_READ_DATABASE_URL', '');

    const slides = await getIronSprueHeroSlides();

    expect(slides.length).toBeGreaterThan(0);
    expect(slides[0]).toMatchObject({
      ctaLabel: expect.any(String),
      ctaHref: expect.stringContaining('/products/'),
    });

    vi.unstubAllEnvs();
  });

  it('uses the local storefront media route for R2 hero keys when no public media base is configured', () => {
    vi.stubEnv('IRON_SPRUE_R2_PUBLIC_BASE_URL', '');

    const slides = adminHeroRowsToSlides([
      {
        id: 'hero_1',
        headline: 'Discover London at night with CubicFun',
        strapline: 'Build London. Light Up the Night.',
        ctaLabel: 'Shop Now',
        ctaHref: '/products/cubicfun-om3606-magic-box-london-at-night',
        imageUrl: 'r2://marketing/heroes/london-at-night.png',
        merchandisingBadge: 'NONE',
        sortOrder: 0,
      },
    ]);

    expect(slides).toHaveLength(1);
    expect(slides[0]!.image).toBe('/media/iron-sprue/marketing/heroes/london-at-night.png');

    vi.unstubAllEnvs();
  });

  it('turns Admin local hero records into linked storefront slides with editable overlay copy', () => {
    const slides = adminHeroRowsToSlides([
      {
        id: 'hero_aoshima',
        headline: 'Toyota curves for the display shelf.',
        strapline: 'Classic lines, clean build.',
        ctaLabel: 'View product',
        ctaHref: '/products/aoshima-05628-toyota-2000gt-red',
        imageUrl: '/assets/hero-campaigns/is-aos-05628-toyota-2000gt-red-hero.png',
        merchandisingBadge: 'SALE',
        sortOrder: 0,
      },
    ]);

    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({
      title: 'Toyota curves for the display shelf.',
      script: 'Classic lines, clean build.',
      ctaHref: '/products/aoshima-05628-toyota-2000gt-red',
      ctaLabel: 'View product',
      image: '/assets/hero-campaigns/is-aos-05628-toyota-2000gt-red-hero.png',
      availabilityLabel: 'Sale',
      sourceProductSlug: 'aoshima-05628-toyota-2000gt-red',
      brandName: 'Aoshima',
    });
  });

  it('does not leak a fallback brand logo onto an unrelated Admin hero', () => {
    const slides = adminHeroRowsToSlides([
      {
        id: 'hero_custom',
        headline: 'Workbench feature',
        strapline: 'Clean copy.',
        ctaLabel: 'Shop now',
        ctaHref: '/shop',
        imageUrl: '/assets/hero-campaigns/custom-workshop.png',
        merchandisingBadge: 'NONE',
        sortOrder: 0,
      },
    ]);

    expect(slides).toHaveLength(1);
    expect(slides[0]!.brandName).toBeUndefined();
    expect(slides[0]!.brandLogo).toBeUndefined();
  });

  it('does not render Admin product heroes with dead product targets', () => {
    const slides = adminHeroRowsToSlides([
      {
        id: 'hero_dead',
        headline: 'Dead product target',
        strapline: 'Should not render.',
        ctaLabel: 'Shop now',
        ctaHref: '/products/not-a-real-iron-sprue-product',
        imageUrl: '/assets/hero-campaigns/not-real.png',
        merchandisingBadge: 'NEW',
        sortOrder: 0,
      },
    ]);

    expect(slides).toEqual([]);
  });

  it('maps persisted typography settings to constrained storefront CSS variables', () => {
    expect(ironSprueTypographyCustomProperties({
      headingFamily: 'IMPACT_CONDENSED',
      bodyFamily: 'SYSTEM_SANS',
      headingWeight: 'BLACK',
      bodyWeight: 'REGULAR',
      headingScale: 'STANDARD',
      bodyScale: 'STANDARD',
    })).toMatchObject({
      '--iron-sprue-heading-font': expect.stringContaining('Impact'),
      '--iron-sprue-body-font': 'Arial, Helvetica, sans-serif',
      '--iron-sprue-heading-weight': '900',
      '--iron-sprue-body-weight': '400',
      '--iron-sprue-heading-scale-factor': '1',
      '--iron-sprue-body-scale-factor': '1',
    });
  });

  it('projects storefront availability from available stock minus reserved stock', () => {
    const products = [
      {
        sku: 'IS-AOS-05628',
        slug: 'aoshima-05628-toyota-2000gt-red',
        name: 'Toyota 2000GT Red',
        brand: 'Aoshima',
        category: 'Model Kits',
        productType: 'Model kit',
        storeCode: 'IRON_SPRUE',
        priceMinor: 1999,
        retailPriceMinor: 1999,
        stockQuantity: 1,
        availableQuantity: 1,
        reorderLevel: 1,
        published: true,
        shortDescription: 'Toyota model kit.',
      },
    ] as any[];
    const inventory = new Map([
      [
        'IS-AOS-05628',
        {
          sku: 'IS-AOS-05628',
          availableStock: 1,
          reservedStock: 1,
          reorderPoint: 1,
        },
      ],
    ]);

    const [product] = applyInventoryToProducts(products, inventory);

    expect(product!.stockQuantity).toBe(0);
    expect(product!.availableQuantity).toBe(0);
  });

  it('applies approved catalogue-primary media before static product imagery', () => {
    vi.stubEnv('IRON_SPRUE_R2_PUBLIC_BASE_URL', '');

    const products = [
      {
        sku: 'IS-AOS-05628',
        slug: 'aoshima-05628-toyota-2000gt-red',
        name: 'Toyota 2000GT Red',
        brand: 'Aoshima',
        category: 'Model Kits',
        productType: 'Model kit',
        storeCode: 'IRON_SPRUE',
        priceMinor: 1000,
        retailPriceMinor: 1000,
        stockQuantity: 1,
        availableQuantity: 1,
        reorderLevel: 1,
        published: true,
        imageReferences: ['/old-source.jpg'],
      },
    ] as any[];
    const approved = new Map([
      ['IS-AOS-05628', {
        cataloguePrimary: '/approved-image-2.png',
        workshopPhotography: '/approved-workshop.png',
        manufacturerOriginals: ['/approved-original.jpg'],
      }],
    ]);

    const [product] = applyApprovedMediaToProducts(products, approved);

    expect(product!.imageUrl).toBe('/approved-image-2.png');
    expect(product!.imageReferences).toEqual([
      '/approved-image-2.png',
      '/approved-workshop.png',
      '/approved-original.jpg',
      '/old-source.jpg',
    ]);

    vi.unstubAllEnvs();
  });

  it('turns approved R2 catalogue-primary media into storefront image URLs', () => {
    vi.stubEnv('IRON_SPRUE_R2_PUBLIC_BASE_URL', '');

    const approved = approvedMediaRowsToProductMedia([
      {
        sku: 'IS-AOS-05628',
        slug: 'aoshima-05628-toyota-2000gt-red',
        role: 'catalogue-primary',
        approvalState: 'APPROVED',
        url: 'r2://products/is-aos-05628/image-2/approved-image-2.png',
        storageKey: 'products/is-aos-05628/image-2/approved-image-2.png',
        altText: 'Toyota 2000GT Red catalogue primary',
        isPrimary: true,
        sortOrder: 0,
        updatedAt: '2026-08-11T00:00:00.000Z',
      },
    ]);

    expect(approved.get('IS-AOS-05628')?.cataloguePrimary).toBe(
      '/media/iron-sprue/products/is-aos-05628/image-2/approved-image-2.png',
    );

    vi.unstubAllEnvs();
  });

  it('adds approved manufacturer originals to product galleries without replacing Image 2', () => {
    vi.stubEnv('IRON_SPRUE_R2_PUBLIC_BASE_URL', '');

    const approved = approvedMediaRowsToProductMedia([
      {
        sku: 'IS-AOS-05628',
        slug: 'aoshima-05628-toyota-2000gt-red',
        role: 'catalogue-primary',
        approvalState: 'APPROVED',
        url: null,
        storageKey: 'products/is-aos-05628/image-2/approved-image-2.png',
        altText: 'Toyota 2000GT Red catalogue primary',
        isPrimary: true,
        sortOrder: 0,
        updatedAt: '2026-08-11T00:00:00.000Z',
      },
      {
        sku: 'IS-AOS-05628',
        slug: 'aoshima-05628-toyota-2000gt-red',
        role: 'manufacturer-original',
        approvalState: 'APPROVED',
        url: null,
        storageKey: 'archive/products/is-aos-05628/original/source.jpg',
        altText: 'Toyota 2000GT Red original source image',
        isPrimary: false,
        sortOrder: 2,
        updatedAt: '2026-08-11T00:00:00.000Z',
      },
    ]);

    expect(approved.get('IS-AOS-05628')).toEqual(expect.objectContaining({
      cataloguePrimary: '/media/iron-sprue/products/is-aos-05628/image-2/approved-image-2.png',
      manufacturerOriginals: ['/media/iron-sprue/archive/products/is-aos-05628/original/source.jpg'],
    }));

    vi.unstubAllEnvs();
  });

  it('keeps pending originals visible as source references but excludes rejected originals', () => {
    vi.stubEnv('IRON_SPRUE_R2_PUBLIC_BASE_URL', '');

    const approved = approvedMediaRowsToProductMedia([
      {
        sku: 'IS-AOS-05628',
        slug: 'aoshima-05628-toyota-2000gt-red',
        role: 'manufacturer-original',
        approvalState: 'REVIEW_REQUIRED',
        url: null,
        storageKey: 'archive/products/is-aos-05628/original/source.jpg',
        altText: 'Toyota 2000GT Red original source image',
        isPrimary: false,
        sortOrder: 2,
        updatedAt: '2026-08-11T00:00:00.000Z',
      },
      {
        sku: 'IS-AOS-05628',
        slug: 'aoshima-05628-toyota-2000gt-red',
        role: 'manufacturer-original',
        approvalState: 'REJECTED',
        url: null,
        storageKey: 'archive/products/is-aos-05628/original/wrong-source.jpg',
        altText: 'Wrong original source image',
        isPrimary: false,
        sortOrder: 3,
        updatedAt: '2026-08-11T00:00:00.000Z',
      },
    ]);

    expect(approved.get('IS-AOS-05628')?.manufacturerOriginals).toEqual([
      '/media/iron-sprue/archive/products/is-aos-05628/original/source.jpg',
    ]);

    vi.unstubAllEnvs();
  });

  it('uses a non-rejected original as the gallery image until Image 2 is approved', () => {
    const products = [
      {
        sku: 'IS-AOS-05629',
        slug: 'aoshima-05629-toyota-2000gt-silver',
        name: 'Toyota 2000GT Silver',
        brand: 'Aoshima',
        category: 'Model Kits',
        productType: 'Model kit',
        storeCode: 'IRON_SPRUE',
        priceMinor: 1000,
        retailPriceMinor: 1000,
        stockQuantity: 1,
        availableQuantity: 1,
        reorderLevel: 1,
        published: true,
      },
    ] as any[];
    const approved = new Map([
      ['IS-AOS-05629', {
        manufacturerOriginals: ['/media/iron-sprue/archive/products/is-aos-05629/original/source.jpg'],
      }],
    ]);

    const [product] = applyApprovedMediaToProducts(products, approved);

    expect(product!.imageUrl).toBe('/media/iron-sprue/archive/products/is-aos-05629/original/source.jpg');
    expect(product!.imageReferences).toEqual(['/media/iron-sprue/archive/products/is-aos-05629/original/source.jpg']);
  });

  it('uses saved featured product placements for the homepage section', () => {
    const products = [
      { slug: 'first-product', sku: 'FIRST', storeCode: 'IRON_SPRUE', published: true },
      { slug: 'second-product', sku: 'SECOND', storeCode: 'IRON_SPRUE', published: true },
    ] as any[];

    const featured = productsFromFeaturedPlacements(products, [
      { id: 'p2', placementKey: 'featured-product:second-product', title: 'Second', ctaLabel: null, ctaHref: '/products/second-product', imageUrl: null, active: true, sortOrder: 0 },
      { id: 'p1', placementKey: 'featured-product:first-product', title: 'First', ctaLabel: null, ctaHref: '/products/first-product', imageUrl: null, active: true, sortOrder: 1 },
      { id: 'inactive', placementKey: 'featured-product:inactive-product', title: 'Inactive', ctaLabel: null, ctaHref: '/products/inactive-product', imageUrl: null, active: false, sortOrder: -1 },
    ]);

    expect(featured.map((product) => product.slug)).toEqual(['second-product', 'first-product']);
  });

  it('groups active Admin product-section placements into editable homepage sections', () => {
    const products = [
      { slug: 'toyota-red', sku: 'RED', storeCode: 'IRON_SPRUE', published: true },
      { slug: 'toyota-white', sku: 'WHITE', storeCode: 'IRON_SPRUE', published: true },
      { slug: 'glue', sku: 'GLUE', storeCode: 'IRON_SPRUE', published: true },
    ] as any[];

    const sections = productSectionsFromPlacements(products, [
      { id: 'second', placementKey: 'product-section:bench-picks:toyota-white', title: 'Bench picks', ctaLabel: 'See picks', ctaHref: '/shop?section=bench-picks', imageUrl: null, active: true, sortOrder: 2 },
      { id: 'first', placementKey: 'product-section:bench-picks:toyota-red', title: 'Bench picks', ctaLabel: null, ctaHref: null, imageUrl: null, active: true, sortOrder: 1 },
      { id: 'hidden', placementKey: 'product-section:bench-picks:glue', title: 'Bench picks', ctaLabel: null, ctaHref: null, imageUrl: null, active: false, sortOrder: 0 },
      { id: 'promo', placementKey: 'promo-panel:tools', title: 'Promo', ctaLabel: null, ctaHref: null, imageUrl: null, active: true, sortOrder: 0 },
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      sectionKey: 'bench-picks',
      heading: 'Bench picks',
      ctaLabel: 'See picks',
      ctaHref: '/shop?section=bench-picks',
    });
    expect(sections[0]?.products.map((product) => product.slug)).toEqual(['toyota-red', 'toyota-white']);
  });

  it('uses active Admin promo panel placements before static homepage cards', () => {
    const panels = promoPanelsFromPlacements([
      { id: 'inactive', placementKey: 'promo-panel:inactive', title: 'Hidden card', ctaLabel: 'Hidden', ctaHref: '/hidden', imageUrl: '/hidden.png', active: false, sortOrder: 0 },
      { id: 'active', placementKey: 'promo-panel:tools', title: 'Tool bundle', ctaLabel: 'View bundle', ctaHref: '/shop?category=tools', imageUrl: '/tools.png', active: true, sortOrder: 1 },
    ]);

    expect(panels).toHaveLength(1);
    expect(panels[0]).toMatchObject({
      title: 'Tool bundle',
      cta: 'View bundle',
      href: '/shop?category=tools',
      image: '/tools.png',
    });
  });

  it('falls back to static promo copy when Admin promo records are inactive', async () => {
    vi.stubEnv('IRON_SPRUE_DATABASE_URL', '');
    vi.stubEnv('IRON_SPRUE_WORKER_READ_DATABASE_URL', '');

    const items = await getIronSpruePromoStripItems();

    expect(items).toEqual([
      { label: 'Free UK delivery on orders over £75', icon: 'DELIVERY' },
      { label: 'Fast dispatch on stocked lines', icon: 'PARCEL' },
      { label: 'Safe and secure checkout', icon: 'SECURITY' },
    ]);

    vi.unstubAllEnvs();
  });

  it('falls back to approved static category navigation without retired categories', async () => {
    vi.stubEnv('IRON_SPRUE_DATABASE_URL', '');
    vi.stubEnv('IRON_SPRUE_WORKER_READ_DATABASE_URL', '');

    const navigation = await getIronSprueCategoryNavigation();

    expect(navigation.map((item) => item.label)).toContain('Model Kits');
    expect(navigation.map((item) => item.label)).not.toContain('Display & Accessories');

    vi.unstubAllEnvs();
  });
});
