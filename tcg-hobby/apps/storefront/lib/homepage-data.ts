import {
  getMerchandisingFeaturedProducts,
  getMerchandisingLatestProducts,
  getMerchandisingStaffPickProducts,
  type MerchandisingRecommendation,
} from '@tcg-hobby/database';

export type HomepageHeroSlide = {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: { label: string; href: string };
  priceLabel?: string;
  badges?: string[];
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

function resolveHomepageHeroSlides(featuredProducts: MerchandisingRecommendation[]): HomepageHeroSlide[] {
  const launchProduct = featuredProducts[0];
  const launchProductImageUrl = launchProduct?.imageUrl;

  if (!launchProduct || !launchProductImageUrl) {
    return homepageHeroSlides;
  }

  return homepageHeroSlides.map((slide) =>
    slide.id === 'new-releases'
      ? {
          ...slide,
          eyebrow: 'NOW AVAILABLE',
          headline: launchProduct.name,
          body: 'Discover curated launch products, collector essentials and new arrivals selected through TCG Hobby merchandising.',
          priceLabel: `£${(launchProduct.price.amountMinor / 100).toFixed(2)}`,
          badges: [
            launchProduct.publicStockState.replaceAll('_', ' '),
            ...(launchProduct.freeUkStandardShipping ? ['FREE UK STANDARD DELIVERY'] : []),
            ...(launchProduct.customerPurchaseLimit ? [`LIMIT ${launchProduct.customerPurchaseLimit} PER HOUSEHOLD`] : []),
          ],
          primaryCta: { label: 'Shop now', href: `/catalogue/${launchProduct.slug}` },
          image: {
            src: launchProductImageUrl,
            alt: launchProduct.imageAlt ?? `${launchProduct.name} product image`,
          },
        }
      : slide,
  );
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
  const [featuredProducts, latestProducts, staffPickProducts] = await Promise.all([
    getMerchandisingFeaturedProducts(8),
    getMerchandisingLatestProducts(8),
    getMerchandisingStaffPickProducts(8),
  ]);

  const selectedFeaturedProducts = selectHomepageFeaturedProducts(featuredProducts, 4);
  const selectedLatestProducts = selectUniqueProducts(latestProducts, selectedFeaturedProducts, 4);
  const selectedStaffPickProducts = selectUniqueProducts(staffPickProducts, [...selectedFeaturedProducts, ...selectedLatestProducts], 4);

  return {
    heroSlides: resolveHomepageHeroSlides(selectedFeaturedProducts),
    featuredProducts: selectedFeaturedProducts,
    latestProducts: selectedLatestProducts,
    staffPickProducts: selectedStaffPickProducts,
  };
}
