import type { CatalogueProduct, ReleaseSummary } from '@tcg-hobby/types';
import {
  getCatalogueProducts,
  getComingSoonHubData,
  getFeaturedCatalogueProducts,
} from '@tcg-hobby/database';

export type HomepageHeroSlide = {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: { label: string; href: string };
  image: {
    src: string;
    alt: string;
  };
};

export type ProductionHomepageData = {
  heroSlides: HomepageHeroSlide[];
  releaseHub: {
    featuredRelease: ReleaseSummary | null;
    upcomingReleases: ReleaseSummary[];
  };
  featuredProducts: CatalogueProduct[];
  newReleaseProducts: CatalogueProduct[];
};

export const homepageHeroSlides: HomepageHeroSlide[] = [
  {
    id: 'new-releases',
    eyebrow: 'New releases',
    headline: 'Fresh sealed products for collectors and players.',
    body: 'Explore new trading card releases, sealed products and essentials from a UK hobby store built around clarity and care.',
    primaryCta: { label: 'Shop new releases', href: '/catalogue?sort=newest' },
    image: {
      src: '/launch/tcg-hobby-production-hero.png',
      alt: 'Original trading card collector artwork for TCG Hobby',
    },
  },
  {
    id: 'preorders',
    eyebrow: 'Pre-orders',
    headline: 'Plan ahead for upcoming drops.',
    body: 'Follow upcoming releases and pre-order windows with clear product information and no artificial urgency.',
    primaryCta: { label: 'Explore pre-orders', href: '/releases' },
    image: {
      src: '/launch/tcg-hobby-collector-hero.png',
      alt: 'Collector holding an original glowing trading card in a premium hobby store',
    },
  },
  {
    id: 'accessories',
    eyebrow: 'Accessories',
    headline: 'Protect, store and enjoy your collection.',
    body: 'Sleeves, binders, storage and player essentials curated for everyday collecting and organised play.',
    primaryCta: { label: 'Shop accessories', href: '/catalogue?category=accessories' },
    image: {
      src: '/launch/tcg-hobby-production-hero.png',
      alt: 'Premium hobby store shelves with trading card accessories and warm orange lighting',
    },
  },
  {
    id: 'future-buylist',
    eyebrow: 'Future buylist',
    headline: 'More ways to grow your hobby are coming.',
    body: 'Founding members will be first to hear when trade-in and buylist tools become available.',
    primaryCta: { label: 'Join as a founding member', href: '#newsletter' },
    image: {
      src: '/launch/tcg-hobby-collector-hero.png',
      alt: 'Original trading card collector artwork with glowing card in a premium retail environment',
    },
  },
];

export function dedupeProducts(products: CatalogueProduct[]): CatalogueProduct[] {
  const seen = new Set<string>();
  const result: CatalogueProduct[] = [];

  for (const product of products) {
    if (seen.has(product.id)) {
      continue;
    }

    seen.add(product.id);
    result.push(product);
  }

  return result;
}

export function selectHomepageFeaturedProducts(
  featuredProducts: CatalogueProduct[],
  newestProducts: CatalogueProduct[],
  limit = 4,
): CatalogueProduct[] {
  const releasedFeatured = featuredProducts.filter((product) => !product.releaseStatus || product.releaseStatus === 'RELEASED');
  const releasedNew = newestProducts.filter((product) => !product.releaseStatus || product.releaseStatus === 'RELEASED');
  const upcoming = [...featuredProducts, ...newestProducts].find(
    (product) => product.releaseStatus && product.releaseStatus !== 'RELEASED',
  );

  return dedupeProducts([
    ...releasedFeatured,
    ...releasedNew,
    ...(upcoming ? [upcoming] : []),
  ]).slice(0, limit);
}

export function selectHomepageNewReleaseProducts(
  newestProducts: CatalogueProduct[],
  featuredProducts: CatalogueProduct[],
  limit = 4,
): CatalogueProduct[] {
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  return dedupeProducts(newestProducts)
    .filter((product) => !featuredIds.has(product.id))
    .slice(0, limit);
}

export async function getProductionHomepageData(): Promise<ProductionHomepageData> {
  const [newestProductsResult, featuredProducts, releaseHub] = await Promise.all([
    getCatalogueProducts({ search: '', category: '', sort: 'newest', page: 1, pageSize: 12 }),
    getFeaturedCatalogueProducts(12),
    getComingSoonHubData(),
  ]);

  const newestProducts = newestProductsResult.products;
  const selectedFeaturedProducts = selectHomepageFeaturedProducts(featuredProducts, newestProducts, 4);

  return {
    heroSlides: homepageHeroSlides,
    releaseHub: {
      featuredRelease: releaseHub.featuredRelease,
      upcomingReleases: releaseHub.upcomingReleases.slice(0, 3),
    },
    featuredProducts: selectedFeaturedProducts,
    newReleaseProducts: selectHomepageNewReleaseProducts(newestProducts, selectedFeaturedProducts, 4),
  };
}
