import type { CatalogueCategory, CatalogueProduct, ReleaseSummary } from '@tcg-hobby/types';
import {
  getCatalogueCategories,
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
  secondaryCta?: { label: string; href: string };
  image: {
    src: string;
    alt: string;
  };
};

export type ShopGameCategory = {
  name: string;
  href: string;
  description: string;
  accent: string;
  available: boolean;
};

export type HotProductBadge = 'Popular' | 'Recently restocked' | 'Most wishlisted' | 'New arrival';

export type HomepageHotProduct = {
  product: CatalogueProduct;
  badge: HotProductBadge;
  reason: string;
};

export type HomepageToolLink = {
  title: string;
  description: string;
  href: string;
  requiresLogin: boolean;
};

export type HomepageNewsItem = {
  title: string;
  description: string;
  href: string;
  label: string;
  dateLabel?: string;
};

export type ProductionHomepageData = {
  heroSlides: HomepageHeroSlide[];
  categories: ShopGameCategory[];
  newReleases: CatalogueProduct[];
  releaseHub: {
    featuredRelease: ReleaseSummary | null;
    upcomingReleases: ReleaseSummary[];
  };
  featuredProducts: CatalogueProduct[];
  hotProducts: HomepageHotProduct[];
  tools: HomepageToolLink[];
  news: HomepageNewsItem[];
};

export const homepageHeroSlides: HomepageHeroSlide[] = [
  {
    id: 'new-releases',
    eyebrow: 'New releases',
    headline: 'Trading card releases, sealed products and collector essentials.',
    body: 'Shop new arrivals across leading card games with a clean UK storefront built for collectors and players.',
    primaryCta: { label: 'Shop new releases', href: '/catalogue?sort=newest' },
    secondaryCta: { label: 'Browse the catalogue', href: '/catalogue' },
    image: {
      src: '/launch/tcg-hobby-production-hero.png',
      alt: 'Original trading card collector artwork for TCG Hobby',
    },
  },
  {
    id: 'preorders',
    eyebrow: 'Pre-orders and coming soon',
    headline: 'Plan your next release day without the noise.',
    body: 'Track upcoming launches, pre-order windows and product updates with clear release information.',
    primaryCta: { label: 'Explore pre-orders', href: '/releases' },
    secondaryCta: { label: 'View coming soon', href: '/coming-soon' },
    image: {
      src: '/launch/tcg-hobby-collector-hero.png',
      alt: 'Collector holding an original glowing trading card in a premium hobby store',
    },
  },
  {
    id: 'collector-tools',
    eyebrow: 'Collect, build and play',
    headline: 'Tools for collections, deck ideas and release notifications.',
    body: 'Use wishlists, collection tools and deck-building workflows alongside the products you are shopping for.',
    primaryCta: { label: 'Open collector tools', href: '/collection' },
    secondaryCta: { label: 'Build a deck', href: '/decks' },
    image: {
      src: '/launch/tcg-hobby-production-hero.png',
      alt: 'Dark premium trading card store scene with orange card-light ambience',
    },
  },
];

const categoryDefinitions = [
  {
    name: 'Pokémon',
    href: '/catalogue?q=Pokemon',
    description: 'Sealed products, accessories and collector-ready releases.',
    accent: 'Electric yellow',
    match: ['pokemon', 'pokémon'],
  },
  {
    name: 'Magic: The Gathering',
    href: '/catalogue?q=Magic',
    description: 'Booster products, singles and player essentials.',
    accent: 'Arcane amber',
    match: ['magic'],
  },
  {
    name: 'Disney Lorcana',
    href: '/catalogue?q=Lorcana',
    description: 'New-set releases and accessories when available.',
    accent: 'Storybook orange',
    match: ['lorcana'],
  },
  {
    name: 'Yu-Gi-Oh!',
    href: '/catalogue?q=Yu-Gi-Oh',
    description: 'Core sets, sealed products and deck-building support.',
    accent: 'Duel bronze',
    match: ['yu-gi-oh', 'yugioh'],
  },
  {
    name: 'One Piece Card Game',
    href: '/catalogue?q=One+Piece',
    description: 'Upcoming releases, sealed stock and accessories.',
    accent: 'Treasure orange',
    match: ['one piece'],
  },
  {
    name: 'Accessories',
    href: '/catalogue?category=accessories',
    description: 'Sleeves, binders, deck boxes and protection.',
    accent: 'Collector graphite',
    match: ['accessories'],
  },
] as const;

export const homepageToolLinks: HomepageToolLink[] = [
  {
    title: 'Collection Manager',
    description: 'Track owned cards and prepare collection imports.',
    href: '/login?callbackUrl=%2Fcollection',
    requiresLogin: true,
  },
  {
    title: 'Deck Builder',
    description: 'Plan lists, track missing cards and build around your favourite games.',
    href: '/login?callbackUrl=%2Fdecks',
    requiresLogin: true,
  },
  {
    title: 'Wishlist',
    description: 'Save products and keep watch for future availability.',
    href: '/login?callbackUrl=%2Faccount%2Fwishlist',
    requiresLogin: true,
  },
  {
    title: 'Release Notifications',
    description: 'Follow upcoming products and release windows.',
    href: '/login?callbackUrl=%2Faccount%2Fnotifications',
    requiresLogin: true,
  },
  {
    title: 'Buylist / Trade-in',
    description: 'Prepare cards for future buylist and trade-in workflows.',
    href: '/buylist',
    requiresLogin: false,
  },
];

export function buildShopGameCategories(categories: CatalogueCategory[], products: CatalogueProduct[]): ShopGameCategory[] {
  return categoryDefinitions.map((definition) => {
    const haystack = [
      ...categories.map((category) => `${category.name} ${category.slug}`),
      ...products.map((product) => `${product.game} ${product.categoryName} ${product.name}`),
    ]
      .join(' ')
      .toLowerCase();

    return {
      name: definition.name,
      href: definition.href,
      description: definition.description,
      accent: definition.accent,
      available: definition.match.some((term) => haystack.includes(term)),
    };
  });
}

export function selectNewReleaseProducts(products: CatalogueProduct[], limit = 8): CatalogueProduct[] {
  return products
    .filter((product) => !product.releaseStatus || product.releaseStatus === 'RELEASED')
    .slice(0, limit);
}

export function selectFeaturedProducts(products: CatalogueProduct[], excludeIds: Set<string>, limit = 8): CatalogueProduct[] {
  return products
    .filter((product) => !excludeIds.has(product.id))
    .slice(0, limit);
}

export function buildHotProducts(products: CatalogueProduct[], limit = 6): HomepageHotProduct[] {
  return products
    .filter((product) => product.inStock)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      const stockA = a.stockOnHand - a.reservedStock;
      const stockB = b.stockOnHand - b.reservedStock;
      if (stockA !== stockB) return stockB - stockA;
      if (a.releaseDate && b.releaseDate) return b.releaseDate.localeCompare(a.releaseDate);
      if (a.releaseDate) return -1;
      if (b.releaseDate) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map((product) => ({
      product,
      badge: product.releaseDate ? 'New arrival' : product.featured ? 'Popular' : 'Recently restocked',
      reason: product.releaseDate
        ? 'Selected from the newest released products.'
        : product.featured
          ? 'Selected from featured catalogue products until analytics are connected.'
          : 'Selected from in-stock catalogue products with deterministic stock-based ordering.',
    }));
}

export function buildNewsItems(releases: ReleaseSummary[]): HomepageNewsItem[] {
  return releases.slice(0, 3).map((release) => ({
    title: release.name,
    description: release.announcementText ?? `${release.game} release details are available in the release calendar.`,
    href: '/releases',
    label: release.brand,
    dateLabel: new Date(release.releaseDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  }));
}

export async function getProductionHomepageData(): Promise<ProductionHomepageData> {
  const [categories, newestProductsResult, featuredProducts, releaseHub] = await Promise.all([
    getCatalogueCategories(),
    getCatalogueProducts({ search: '', category: '', sort: 'newest', page: 1, pageSize: 16 }),
    getFeaturedCatalogueProducts(16),
    getComingSoonHubData(),
  ]);

  const allCandidateProducts = dedupeProducts([...newestProductsResult.products, ...featuredProducts]);
  const newReleases = selectNewReleaseProducts(newestProductsResult.products, 8);
  const featured = selectFeaturedProducts(featuredProducts, new Set(newReleases.map((product) => product.id)), 8);
  const hotProducts = buildHotProducts(allCandidateProducts, 6);

  return {
    heroSlides: homepageHeroSlides,
    categories: buildShopGameCategories(categories, allCandidateProducts),
    newReleases,
    releaseHub: {
      featuredRelease: releaseHub.featuredRelease,
      upcomingReleases: releaseHub.upcomingReleases.slice(0, 3),
    },
    featuredProducts: featured,
    hotProducts,
    tools: homepageToolLinks,
    news: buildNewsItems(releaseHub.recentlyAnnounced.length ? releaseHub.recentlyAnnounced : releaseHub.upcomingReleases),
  };
}

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
