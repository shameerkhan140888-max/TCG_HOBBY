import {
  getMerchandisingFeaturedProducts,
  getMerchandisingLatestProducts,
  getMerchandisingStaffPickProducts,
  getActiveHomepageHeroPlacements,
  type MerchandisingRecommendation,
} from '@tcg-hobby/database/storefront';

export type HomepageHeroSlide = {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: { label: string; href: string };
  priceLabel?: string;
  badges?: string[];
  displayMode?: 'FULL_BLEED' | 'CONTAINED';
  focalPoint?: 'LEFT' | 'CENTER' | 'RIGHT';
  overlayStrength?: 'LIGHT' | 'BALANCED' | 'STRONG';
  image: {
    src: string;
    alt: string;
  };
};

export type ProductionHomepageData = {
  heroSlides: HomepageHeroSlide[];
  featuredProducts: MerchandisingRecommendation[];
  latestProducts: MerchandisingRecommendation[];
  staffPickProducts: MerchandisingRecommendation[];
};

export const homepageHeroSlides: HomepageHeroSlide[] = [
  {
    id: 'new-releases',
    eyebrow: 'New releases',
    headline: 'Fresh sealed products for collectors and players.',
    body: 'Explore new trading card releases, sealed products and essentials from a UK hobby store built around clarity and care.',
    primaryCta: { label: 'Shop new releases', href: '/shop?sort=newest' },
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
    primaryCta: { label: 'Shop accessories', href: '/shop/accessories' },
    image: {
      src: '/launch/tcg-hobby-production-hero.png',
      alt: 'Premium hobby store shelves with trading card accessories and warm orange lighting',
    },
  },
  {
    id: 'future-buylist',
    eyebrow: 'Future buylist',
    headline: 'More ways to grow your hobby are coming.',
    body: 'Newsletter subscribers will be first to hear when trade-in and buylist tools become available.',
    primaryCta: { label: 'Join the launch list', href: '#newsletter' },
    image: {
      src: '/launch/tcg-hobby-collector-hero.png',
      alt: 'Original trading card collector artwork with glowing card in a premium retail environment',
    },
  },
];

export function dedupeProducts<T extends { id: string }>(products: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const product of products) {
    if (seen.has(product.id)) {
      continue;
    }

    seen.add(product.id);
    result.push(product);
  }

  return result;
}

function resolveHomepageHeroSlides(placements: Awaited<ReturnType<typeof getActiveHomepageHeroPlacements>>): HomepageHeroSlide[] {
  if (!placements.length) {
    return homepageHeroSlides;
  }

  const slides = placements.flatMap((placement) => {
    if (!placement.imageUrl) return [];
    const availableStock = placement.product.stockOnHand - placement.product.reservedStock;
    return [{
      id: placement.id,
      eyebrow: 'NOW AVAILABLE',
      headline: placement.headline,
      body: placement.supportingText,
      priceLabel: `£${(placement.product.priceMinor / 100).toFixed(2)}`,
      badges: [
        availableStock <= 3 ? 'LOW STOCK' : 'IN STOCK',
        ...(placement.product.freeUkStandardShipping ? ['FREE UK STANDARD DELIVERY'] : []),
        ...(placement.product.customerPurchaseLimit ? [`LIMIT ${placement.product.customerPurchaseLimit} PER HOUSEHOLD`] : []),
      ],
      primaryCta: { label: placement.ctaLabel, href: placement.ctaHref },
      displayMode: placement.displayMode,
      focalPoint: placement.focalPoint,
      overlayStrength: placement.overlayStrength,
      image: { src: placement.imageUrl, alt: placement.imageAlt },
    }];
  });
  return slides.length ? slides : homepageHeroSlides;
}

export function selectHomepageFeaturedProducts(
  featuredProducts: MerchandisingRecommendation[],
  limit = 4,
): MerchandisingRecommendation[] {
  return dedupeProducts(featuredProducts).slice(0, limit);
}

export function selectUniqueProducts(
  products: MerchandisingRecommendation[],
  excludedProducts: MerchandisingRecommendation[],
  limit = 4,
): MerchandisingRecommendation[] {
  const excludedIds = new Set(excludedProducts.map((product) => product.id));
  return dedupeProducts(products)
    .filter((product) => !excludedIds.has(product.id))
    .slice(0, limit);
}

export async function getProductionHomepageData(): Promise<ProductionHomepageData> {
  const [featuredProducts, latestProducts, staffPickProducts, heroPlacements] = await Promise.all([
    getMerchandisingFeaturedProducts(8).catch(() => []),
    getMerchandisingLatestProducts(8).catch(() => []),
    getMerchandisingStaffPickProducts(8).catch(() => []),
    getActiveHomepageHeroPlacements().catch(() => []),
  ]);

  const selectedFeaturedProducts = selectHomepageFeaturedProducts(featuredProducts, 4);
  const selectedLatestProducts = selectUniqueProducts(latestProducts, selectedFeaturedProducts, 4);
  const selectedStaffPickProducts = selectUniqueProducts(staffPickProducts, [...selectedFeaturedProducts, ...selectedLatestProducts], 4);

  return {
    heroSlides: resolveHomepageHeroSlides(heroPlacements),
    featuredProducts: selectedFeaturedProducts,
    latestProducts: selectedLatestProducts,
    staffPickProducts: selectedStaffPickProducts,
  };
}
