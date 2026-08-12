import { neon } from '@neondatabase/serverless';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import launchProducts from '../data/launch-products.json';
import { brandSlug, deriveBrandsWeStock, type IronSprueBrandRecord, type IronSprueProduct } from './catalogue';
import { brandLogoRegistry, featuredProducts, heroSlides, promoPanels } from './storefront';

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
  sortOrder: number;
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
    slides.push({
      ...fallbackWithoutBrand,
      id: row.id,
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

export async function getIronSprueHeroSlides(): Promise<IronSprueHeroSlide[]> {
  const rows = await queryStorefrontRows<AdminHeroRow>((sql) => sql`
    select id, headline, strapline, "ctaLabel", "ctaHref", "imageUrl", "sortOrder"
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

export async function getIronSprueStorefrontProducts(products: IronSprueProduct[]) {
  const approvedMediaBySku = await getApprovedIronSprueMediaBySku();
  return applyApprovedMediaToProducts(products, approvedMediaBySku);
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

export function placementByKey(placements: IronSprueHomepagePlacement[], key: string) {
  return placements.find((placement) => placement.placementKey === key);
}
