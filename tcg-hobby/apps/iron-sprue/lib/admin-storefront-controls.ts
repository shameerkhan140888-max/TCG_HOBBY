import { neon } from '@neondatabase/serverless';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import launchProducts from '../data/launch-products.json';
import { brandSlug, deriveBrandsWeStock, type IronSprueBrandRecord, type IronSprueProduct } from './catalogue';
import { brandLogoRegistry, categoryNavigation, featuredProducts, heroSlides, promoPanels } from './storefront';

const STORE_CODE = 'IRON_SPRUE';
const fallbackPromoStripItems = ['Free UK delivery on orders over \u00a375', 'Fast dispatch on stocked lines', 'Safe and secure checkout'];
const launchCatalogue = launchProducts as IronSprueProduct[];
let localIronSprueEnv: Record<string, string> | null = null;

export type AdminHeroRow = {
  id: string;
  headline: string;
  strapline: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  merchandisingBadge: string | null;
  sortOrder: number;
};

type TypographySettingsRow = {
  headingFamily: string | null;
  bodyFamily: string | null;
  headingWeight: string | null;
  bodyWeight: string | null;
  headingScale: string | null;
  bodyScale: string | null;
};

type HomepagePlacementRow = {
  id: string;
  placementKey: string;
  title: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};

type BrandPresentationRow = {
  name: string;
  slug: string;
  logoUrl: string | null;
  logoAltText: string | null;
  sortOrder: number;
  active: boolean;
  featured: boolean;
  productCount: number;
};

type ApprovedMediaRow = {
  sku: string;
  slug: string;
  role: string;
  approvalState: string;
  url: string | null;
  storageKey: string | null;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
  updatedAt: string;
};

type InventoryProjectionRow = {
  sku: string;
  availableStock: number | string | null;
  reservedStock: number | string | null;
  reorderPoint: number | string | null;
};

type CategoryNavigationRow = {
  name: string;
  slug: string;
  sortOrder: number | string | null;
  productCount: number | string | null;
};

export type IronSprueHeroSlide = {
  id?: string;
  label: string;
  availabilityLabel: string;
  title: string;
  script: string;
  copy: string;
  image: string;
  sourceProductSlug: string;
  brandName?: string;
  brandLogo?: string;
  alt: string;
  ctaHref: string;
  ctaLabel: string;
  secondaryHref: string;
  meta: readonly string[];
};

export type IronSprueHomepagePlacement = {
  id: string;
  placementKey: string;
  title: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export type IronSpruePromoPanel = {
  eyebrow: string;
  title: string;
  copy: string;
  href: string;
  cta: string;
  image: string;
  alt: string;
};

export type IronSprueHomepageProductSection = {
  sectionKey: string;
  heading: string;
  eyebrow: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  products: IronSprueProduct[];
};

export type IronSprueTypographySettings = {
  headingFamily: 'IMPACT_CONDENSED' | 'SYSTEM_SANS' | 'SERIF_DISPLAY';
  bodyFamily: 'SYSTEM_SANS' | 'HUMANIST_SANS' | 'SERIF';
  headingWeight: 'BOLD' | 'BLACK';
  bodyWeight: 'REGULAR' | 'MEDIUM';
  headingScale: 'COMPACT' | 'STANDARD' | 'LARGE';
  bodyScale: 'COMPACT' | 'STANDARD' | 'COMFORTABLE';
};

const defaultTypographySettings: IronSprueTypographySettings = {
  headingFamily: 'IMPACT_CONDENSED',
  bodyFamily: 'SYSTEM_SANS',
  headingWeight: 'BLACK',
  bodyWeight: 'REGULAR',
  headingScale: 'STANDARD',
  bodyScale: 'STANDARD',
};

const heroBadgeLabels: Record<string, string | null> = {
  NONE: null,
  IN_STOCK: 'In stock',
  NEW: 'New',
  SALE: 'Sale',
  COMING_SOON: 'Coming soon',
  PRE_ORDER: 'Pre-order',
  FEATURED: 'Featured',
  EXCLUSIVE: 'Exclusive',
};

const typographyFonts = {
  headingFamily: {
    IMPACT_CONDENSED: 'Impact, "Arial Narrow", "Franklin Gothic Condensed", Arial, sans-serif',
    SYSTEM_SANS: 'Arial, Helvetica, sans-serif',
    SERIF_DISPLAY: 'Georgia, "Times New Roman", serif',
  },
  bodyFamily: {
    SYSTEM_SANS: 'Arial, Helvetica, sans-serif',
    HUMANIST_SANS: '"Trebuchet MS", Arial, Helvetica, sans-serif',
    SERIF: 'Georgia, "Times New Roman", serif',
  },
  headingWeight: {
    BOLD: '800',
    BLACK: '900',
  },
  bodyWeight: {
    REGULAR: '400',
    MEDIUM: '600',
  },
  headingScale: {
    COMPACT: '0.94',
    STANDARD: '1',
    LARGE: '1.06',
  },
  bodyScale: {
    COMPACT: '0.96',
    STANDARD: '1',
    COMFORTABLE: '1.04',
  },
} as const;

function optionOrDefault<T extends string>(value: string | null | undefined, options: readonly T[], fallback: T): T {
  const cleaned = value?.trim().toUpperCase().replace(/[\s-]+/g, '_') as T | undefined;
  return cleaned && options.includes(cleaned) ? cleaned : fallback;
}

function normalizeTypographySettings(row: TypographySettingsRow | null | undefined): IronSprueTypographySettings {
  return {
    headingFamily: optionOrDefault(row?.headingFamily, ['IMPACT_CONDENSED', 'SYSTEM_SANS', 'SERIF_DISPLAY'], defaultTypographySettings.headingFamily),
    bodyFamily: optionOrDefault(row?.bodyFamily, ['SYSTEM_SANS', 'HUMANIST_SANS', 'SERIF'], defaultTypographySettings.bodyFamily),
    headingWeight: optionOrDefault(row?.headingWeight, ['BOLD', 'BLACK'], defaultTypographySettings.headingWeight),
    bodyWeight: optionOrDefault(row?.bodyWeight, ['REGULAR', 'MEDIUM'], defaultTypographySettings.bodyWeight),
    headingScale: optionOrDefault(row?.headingScale, ['COMPACT', 'STANDARD', 'LARGE'], defaultTypographySettings.headingScale),
    bodyScale: optionOrDefault(row?.bodyScale, ['COMPACT', 'STANDARD', 'COMFORTABLE'], defaultTypographySettings.bodyScale),
  };
}

export function ironSprueTypographyCustomProperties(settings: IronSprueTypographySettings) {
  return {
    '--iron-sprue-heading-font': typographyFonts.headingFamily[settings.headingFamily],
    '--iron-sprue-body-font': typographyFonts.bodyFamily[settings.bodyFamily],
    '--iron-sprue-heading-weight': typographyFonts.headingWeight[settings.headingWeight],
    '--iron-sprue-body-weight': typographyFonts.bodyWeight[settings.bodyWeight],
    '--iron-sprue-heading-scale-factor': typographyFonts.headingScale[settings.headingScale],
    '--iron-sprue-body-scale-factor': typographyFonts.bodyScale[settings.bodyScale],
  };
}

function heroMerchandisingLabel(value: string | null | undefined) {
  return heroBadgeLabels[value?.trim().toUpperCase() ?? 'NONE'] ?? null;
}

function parseEnvValue(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function readLocalIronSprueEnv() {
  if (localIronSprueEnv) return localIronSprueEnv;

  localIronSprueEnv = {};
  const candidates = [
    join(process.cwd(), 'apps', 'iron-sprue', '.env.local'),
    join(process.cwd(), '.env.local'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;

    for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      const name = match?.[1];
      const value = match?.[2];
      if (name && typeof value === 'string' && !localIronSprueEnv[name]) {
        localIronSprueEnv[name] = parseEnvValue(value);
      }
    }
  }

  return localIronSprueEnv;
}

function ironSprueEnv(name: string) {
  return process.env[name]?.trim() || readLocalIronSprueEnv()[name]?.trim() || '';
}

function storefrontConnectionString() {
  return (
    ironSprueEnv('IRON_SPRUE_WORKER_READ_DATABASE_URL')
    || ironSprueEnv('IRON_SPRUE_DATABASE_URL')
    || ''
  );
}

export function publicIronSprueMediaUrl(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith('r2://')) {
    const key = raw.slice('r2://'.length).replace(/^\/+/, '');
    const publicBase = ironSprueEnv('IRON_SPRUE_R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
    if (publicBase) return `${publicBase}/${key}`;
    return `/media/iron-sprue/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
    return raw;
  }
  return null;
}

export function adminHeroRowsToSlides(rows: AdminHeroRow[]): IronSprueHeroSlide[] {
  const slides: IronSprueHeroSlide[] = [];

  rows.forEach((row, index) => {
    const publicImageUrl = publicIronSprueMediaUrl(row.imageUrl);
    if (!publicImageUrl || !row.ctaHref) return;

    const fallback = heroSlides[index % heroSlides.length] ?? heroSlides[0];
    const { brandName, brandLogo: fallbackBrandLogo, ...fallbackWithoutBrand } = fallback;
    void brandName;
    void fallbackBrandLogo;
    const linkedProductSlug = row.ctaHref?.match(/\/products\/([^/?#]+)/)?.[1];
    const linkedProduct = linkedProductSlug
      ? launchCatalogue.find((product) => product.slug === linkedProductSlug)
      : null;
    if (linkedProductSlug && !linkedProduct) return;

    const brandLogo = linkedProduct?.brand ? brandLogoRegistry[linkedProduct.brand] : undefined;
    const merchandisingLabel = heroMerchandisingLabel(row.merchandisingBadge);
    slides.push({
      ...fallbackWithoutBrand,
      id: row.id,
      availabilityLabel: merchandisingLabel ?? fallbackWithoutBrand.availabilityLabel,
      title: row.headline,
      script: row.strapline || fallback.script,
      copy: '',
      image: publicImageUrl,
      sourceProductSlug: linkedProduct?.slug || fallbackWithoutBrand.sourceProductSlug,
      ...(linkedProduct?.brand ? { brandName: linkedProduct.brand } : {}),
      ...(brandLogo ? { brandLogo } : {}),
      alt: linkedProduct ? `${linkedProduct.name} Iron Sprue hero artwork` : row.headline,
      ctaHref: row.ctaHref,
      ctaLabel: row.ctaLabel || fallbackWithoutBrand.ctaLabel || 'Shop now',
    });
  });

  return slides;
}

function fallbackHeroSlides() {
  return heroSlides.map((slide) => ({ ...slide, ctaLabel: slide.ctaLabel ?? 'Shop now' })) as IronSprueHeroSlide[];
}

async function queryStorefrontRows<T>(query: (sql: any) => Promise<unknown>) {
  const connectionString = storefrontConnectionString();
  if (!connectionString) return [];

  try {
    const sql = neon(connectionString);
    const rows = await query(sql);
    return Array.isArray(rows) ? rows as T[] : [];
  } catch (error) {
    console.warn('Iron Sprue storefront controls fell back to static data.', error);
    return [];
  }
}

async function queryRequiredStorefrontRows<T>(query: (sql: any) => Promise<unknown>) {
  const connectionString = storefrontConnectionString();
  if (!connectionString) return null;

  try {
    const sql = neon(connectionString);
    const rows = await query(sql);
    return Array.isArray(rows) ? rows as T[] : [];
  } catch (error) {
    console.warn('Iron Sprue required storefront data is unavailable.', error);
    return null;
  }
}

export async function getIronSprueHeroSlides(): Promise<IronSprueHeroSlide[]> {
  const rows = await queryStorefrontRows<AdminHeroRow>((sql) => sql`
    select id, headline, strapline, "ctaLabel", "ctaHref", "imageUrl", "merchandisingBadge", "sortOrder"
    from "IronSprueAdminHero"
    where "storeCode" = ${STORE_CODE}
      and active = true
      and ("startsAt" is null or "startsAt" <= now())
      and ("endsAt" is null or "endsAt" >= now())
    order by "sortOrder" asc, "updatedAt" desc
  `);

  const renderableSlides = adminHeroRowsToSlides(rows);
  return renderableSlides.length ? renderableSlides : fallbackHeroSlides();
}

export async function getIronSprueTypographySettings(): Promise<IronSprueTypographySettings> {
  const rows = await queryStorefrontRows<TypographySettingsRow>((sql) => sql`
    select "headingFamily", "bodyFamily", "headingWeight", "bodyWeight", "headingScale", "bodyScale"
    from "IronSprueAdminTypographySetting"
    where "storeCode" = ${STORE_CODE}
    limit 1
  `);

  return normalizeTypographySettings(rows[0]);
}

export async function getIronSprueHomepagePlacements(): Promise<IronSprueHomepagePlacement[]> {
  const rows = await queryStorefrontRows<HomepagePlacementRow>((sql) => sql`
    select id, "placementKey", title, "ctaLabel", "ctaHref", "imageUrl", active, "sortOrder"
    from "IronSprueAdminHomepagePlacement"
    where "storeCode" = ${STORE_CODE}
      and ("startsAt" is null or "startsAt" <= now())
      and ("endsAt" is null or "endsAt" >= now())
    order by active desc, "sortOrder" asc, "updatedAt" desc
  `);

  return rows.map((row) => ({
    ...row,
    imageUrl: publicIronSprueMediaUrl(row.imageUrl) || row.imageUrl,
  }));
}

export type ApprovedIronSprueProductMedia = {
  cataloguePrimary?: string;
  workshopPhotography?: string;
  hero?: string;
  manufacturerOriginals: string[];
};

export function approvedMediaRowsToProductMedia(rows: ApprovedMediaRow[]) {
  const bySku = new Map<string, ApprovedIronSprueProductMedia>();
  const sorted = [...rows].sort((left, right) => {
    const primaryRank = Number(right.isPrimary) - Number(left.isPrimary);
    return primaryRank || left.sortOrder - right.sortOrder || String(right.updatedAt).localeCompare(String(left.updatedAt));
  });

  for (const row of sorted) {
    if (['REJECTED', 'FAILED'].includes(row.approvalState)) continue;
    const publicUrl = publicIronSprueMediaUrl(row.url) || publicIronSprueMediaUrl(row.storageKey ? `r2://${row.storageKey}` : null);
    if (!publicUrl) continue;
    const current = bySku.get(row.sku) ?? { manufacturerOriginals: [] };
    const isApproved = row.approvalState === 'APPROVED';
    if (isApproved && row.role === 'catalogue-primary' && !current.cataloguePrimary) current.cataloguePrimary = publicUrl;
    if (isApproved && row.role === 'workshop-photography' && !current.workshopPhotography) current.workshopPhotography = publicUrl;
    if (isApproved && row.role === 'hero' && !current.hero) current.hero = publicUrl;
    if (row.role === 'manufacturer-original' && !current.manufacturerOriginals.includes(publicUrl)) {
      current.manufacturerOriginals.push(publicUrl);
    }
    bySku.set(row.sku, current);
  }

  return bySku;
}

export async function getApprovedIronSprueMediaBySku() {
  const rows = await queryStorefrontRows<ApprovedMediaRow>((sql) => sql`
    select
      p.sku,
      p.slug,
      m.role,
      m."approvalState",
      m.url,
      m."storageKey",
      m."altText",
      m."isPrimary",
      m."sortOrder",
      m."updatedAt"
    from "IronSprueAdminMediaAsset" m
    join "IronSprueAdminProduct" p on p.id = m."productId"
    where m."storeCode" = ${STORE_CODE}
      and p."storeCode" = ${STORE_CODE}
      and (
        (m."approvalState" = 'APPROVED' and m.role in ('catalogue-primary', 'workshop-photography', 'hero'))
        or (m."approvalState" in ('PENDING', 'REVIEW_REQUIRED', 'APPROVED') and m.role = 'manufacturer-original')
      )
    order by p.sku asc, m.role asc, m."isPrimary" desc, m."sortOrder" asc, m."updatedAt" desc
  `);

  return approvedMediaRowsToProductMedia(rows);
}

export function applyApprovedMediaToProducts(products: IronSprueProduct[], approvedMediaBySku: Map<string, ApprovedIronSprueProductMedia>) {
  return products.map((product) => {
    const media = approvedMediaBySku.get(product.sku);
    const primaryImage = media?.cataloguePrimary ?? product.imageUrl ?? media?.manufacturerOriginals[0] ?? null;
    if (!media || !primaryImage) return product;
    const imageReferences = Array.from(new Set([
      primaryImage,
      ...(media.cataloguePrimary && media.cataloguePrimary !== primaryImage ? [media.cataloguePrimary] : []),
      ...(media.workshopPhotography ? [media.workshopPhotography] : []),
      ...(media.manufacturerOriginals ?? []),
      ...(product.imageReferences ?? []).filter(
        (item) => item !== primaryImage
          && item !== media.cataloguePrimary
          && item !== media.workshopPhotography
          && !(media.manufacturerOriginals ?? []).includes(item),
      ),
    ]));

    return {
      ...product,
      imageUrl: primaryImage,
      imageReferences,
    };
  });
}

function numericValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getIronSprueInventoryBySku() {
  const rows = await queryRequiredStorefrontRows<InventoryProjectionRow>((sql) => sql`
    select
      p.sku,
      coalesce(i."availableStock", 0) as "availableStock",
      coalesce(i."reservedStock", 0) as "reservedStock",
      coalesce(i."reorderPoint", 1) as "reorderPoint"
    from "IronSprueAdminProduct" p
    left join "IronSprueAdminInventory" i
      on i."productId" = p.id
      and i."storeCode" = ${STORE_CODE}
    where p."storeCode" = ${STORE_CODE}
  `);

  if (!rows) return null;
  return new Map(rows.map((row) => [row.sku, row]));
}

export function applyInventoryToProducts(products: IronSprueProduct[], inventoryBySku: Map<string, InventoryProjectionRow> | null) {
  return products.map((product) => {
    const inventory = inventoryBySku?.get(product.sku);
    if (!inventory) {
      return {
        ...product,
        stockQuantity: 0,
        availableQuantity: 0,
      };
    }
    const sellableQuantity = Math.max(0, numericValue(inventory.availableStock) - numericValue(inventory.reservedStock));

    return {
      ...product,
      stockQuantity: sellableQuantity,
      availableQuantity: sellableQuantity,
      reorderLevel: Math.max(0, numericValue(inventory.reorderPoint, product.reorderLevel ?? 1)),
    };
  });
}

export async function getIronSprueStorefrontProducts(products: IronSprueProduct[]) {
  const [approvedMediaBySku, inventoryBySku] = await Promise.all([
    getApprovedIronSprueMediaBySku(),
    getIronSprueInventoryBySku(),
  ]);
  return applyInventoryToProducts(applyApprovedMediaToProducts(products, approvedMediaBySku), inventoryBySku);
}

export function featuredProductSlugsFromPlacements(placements: IronSprueHomepagePlacement[]) {
  return placements
    .filter((placement) => placement.active && placement.placementKey.startsWith('featured-product:') && placement.ctaHref?.startsWith('/products/'))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((placement) => placement.ctaHref?.replace('/products/', '').split(/[?#]/)[0])
    .filter((slug): slug is string => Boolean(slug));
}

export function productsFromFeaturedPlacements(products: IronSprueProduct[], placements: IronSprueHomepagePlacement[], count = 4) {
  const slugs = featuredProductSlugsFromPlacements(placements);
  if (!slugs.length) return featuredProducts(products, count, { includeUnpublishedPreview: true });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return slugs.map((slug) => bySlug.get(slug)).filter((product): product is IronSprueProduct => Boolean(product)).slice(0, count);
}

function productSectionPlacementParts(placementKey: string) {
  const match = placementKey.match(/^product-section:([^:]+):(.+)$/);
  if (!match) return null;
  return {
    sectionKey: match[1]!,
    productSlug: match[2]!,
  };
}

function productSectionEyebrow(sectionKey: string) {
  return sectionKey
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function productSectionsFromPlacements(products: IronSprueProduct[], placements: IronSprueHomepagePlacement[]): IronSprueHomepageProductSection[] {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const sections = new Map<string, {
    heading: string;
    eyebrow: string;
    ctaLabel: string | null;
    ctaHref: string | null;
    rows: Array<{ sortOrder: number; product: IronSprueProduct }>;
  }>();

  for (const placement of placements) {
    if (!placement.active) continue;
    const parts = productSectionPlacementParts(placement.placementKey);
    if (!parts) continue;
    const product = bySlug.get(parts.productSlug);
    if (!product) continue;
    const existing = sections.get(parts.sectionKey) ?? {
      heading: placement.title || productSectionEyebrow(parts.sectionKey),
      eyebrow: productSectionEyebrow(parts.sectionKey),
      ctaLabel: placement.ctaLabel,
      ctaHref: placement.ctaHref,
      rows: [],
    };
    if (!existing.ctaLabel && placement.ctaLabel) existing.ctaLabel = placement.ctaLabel;
    if (!existing.ctaHref && placement.ctaHref) existing.ctaHref = placement.ctaHref;
    existing.rows.push({ sortOrder: placement.sortOrder, product });
    sections.set(parts.sectionKey, existing);
  }

  return [...sections.entries()].map(([sectionKey, section]) => ({
    sectionKey,
    heading: section.heading,
    eyebrow: section.eyebrow,
    ctaLabel: section.ctaLabel,
    ctaHref: section.ctaHref,
    products: section.rows
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((row) => row.product),
  }));
}

export function promoPanelsFromPlacements(placements: IronSprueHomepagePlacement[], count = 3): IronSpruePromoPanel[] {
  const panels = placements
    .filter((placement) => placement.active && /promo-panel|offer-panel|homepage-card/i.test(placement.placementKey))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((placement) => {
      const image = publicIronSprueMediaUrl(placement.imageUrl) ?? null;
      if (!image) return null;
      return {
        eyebrow: placement.placementKey.replace(/[-_:]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        title: placement.title,
        copy: '',
        href: placement.ctaHref || '/shop',
        cta: placement.ctaLabel || 'Shop now',
        image,
        alt: placement.title,
      };
    })
    .filter((panel): panel is IronSpruePromoPanel => Boolean(panel));

  return panels.length ? panels.slice(0, count) : [...promoPanels].slice(0, count);
}

export async function getIronSprueBrandPresentation(products: IronSprueProduct[]): Promise<IronSprueBrandRecord[]> {
  const fallbackBrands = deriveBrandsWeStock(products);
  const fallbackByName = new Map(fallbackBrands.map((brand) => [brand.name, brand]));
  const rows = await queryStorefrontRows<BrandPresentationRow>((sql) => sql`
    select
      b.name,
      b.slug,
      b."logoUrl",
      b."logoAltText",
      b."sortOrder",
      b.active,
      b.featured,
      count(p.id)::int as "productCount"
    from "IronSprueAdminBrand" b
    left join "IronSprueAdminProduct" p on p."brandId" = b.id and p."storeCode" = ${STORE_CODE}
    where b."storeCode" = ${STORE_CODE}
      and b.active = true
      and b.featured = true
    group by b.id
    order by b."sortOrder" asc, b.name asc
  `);

  const mapped = rows
    .map((row) => {
      const fallback = fallbackByName.get(row.name);
      const logoUrl = publicIronSprueMediaUrl(row.logoUrl) || brandLogoRegistry[row.name] || fallback?.logoUrl;
      return {
        name: row.name,
        slug: row.slug || brandSlug(row.name),
        href: `/shop?brand=${encodeURIComponent(row.name)}`,
        productCount: row.productCount,
        displayOrder: row.sortOrder,
        active: row.active,
        approvalStatus: logoUrl ? ('LOGO_APPROVED' as const) : ('TEXT_APPROVED' as const),
        ...(logoUrl ? { logoUrl } : {}),
        altText: row.logoAltText || `${row.name} logo`,
      };
    })
    .filter((brand) => brand.productCount > 0 && brand.logoUrl);

  return mapped.length ? mapped : fallbackBrands
    .map((brand) => {
      const logoUrl = brandLogoRegistry[brand.name];
      return {
        ...brand,
        ...(logoUrl ? { logoUrl } : {}),
        approvalStatus: logoUrl ? ('LOGO_APPROVED' as const) : brand.approvalStatus,
      };
    })
    .filter((brand): brand is IronSprueBrandRecord => Boolean(brand.logoUrl));
}

export async function getIronSpruePromoStripItems() {
  const placements = await getIronSprueHomepagePlacements();
  const promoItems = placements
    .filter((placement) => placement.active && /promo|banner|strip/i.test(placement.placementKey))
    .map((placement) => placement.title.trim())
    .filter(Boolean);

  return promoItems.length ? promoItems.slice(0, 3) : fallbackPromoStripItems;
}

function categoryHref(slug: string) {
  if (slug === 'model-kits') return '/shop/model-kits';
  if (slug === '3d-puzzles-and-builds') return '/shop/3d-puzzles-and-builds';
  return `/shop?category=${encodeURIComponent(slug)}`;
}

export async function getIronSprueCategoryNavigation() {
  const rows = await queryStorefrontRows<CategoryNavigationRow>((sql) => sql`
    select
      c.name,
      c.slug,
      c."sortOrder",
      count(p.id)::int as "productCount"
    from "IronSprueAdminCategory" c
    left join "IronSprueAdminProduct" p
      on p."categoryId" = c.id
      and p."storeCode" = ${STORE_CODE}
      and p."publicationState" = 'PUBLISHED'
      and p."archivedAt" is null
    where c."storeCode" = ${STORE_CODE}
      and c.active = true
    group by c.id, c.name, c.slug, c."sortOrder"
    order by c."sortOrder" asc, c.name asc
  `);

  const adminCategories = rows
    .filter((row) => Number(row.productCount ?? 0) > 0)
    .filter((row) => !['display-accessories', 'display-and-accessories'].includes(row.slug))
    .map((row) => ({ label: row.name, href: categoryHref(row.slug) }));

  if (!adminCategories.length) {
    return categoryNavigation.filter((item) => !/display\s*&?\s*accessories/i.test(item.label));
  }

  return [
    ...adminCategories,
    { label: 'Brands', href: '/brands' },
    { label: 'New Arrivals', href: '/shop?sort=new' },
    { label: 'Coming Soon', href: '/shop?availability=coming-soon' },
    { label: 'Offers', href: '/shop?offers=true' },
  ];
}

export function placementByKey(placements: IronSprueHomepagePlacement[], key: string) {
  return placements.find((placement) => placement.placementKey === key);
}
