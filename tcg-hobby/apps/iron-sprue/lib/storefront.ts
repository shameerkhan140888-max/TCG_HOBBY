import {
  brandSlug,
  isModelKitProduct,
  productBuildType,
  productPieceCount,
  productPriceMinor,
  productScale,
  productSize,
  productStructure,
  vehicleManufacturerForProduct,
  type IronSprueBrandRecord,
  type IronSprueProduct,
} from './catalogue';

export const categoryNavigation = [
  { label: 'Model Kits', href: '/shop/model-kits' },
  { label: '3D Puzzles & Builds', href: '/shop/3d-puzzles-and-builds' },
  { label: 'Tools', href: '/shop/tools' },
  { label: 'Adhesives & Finishing', href: '/shop?category=adhesives-finishing' },
  {
    label: 'Paints & Weathering',
    href: '/shop/paints-weathering',
    badge: 'Coming soon',
    badgeImage: '/assets/category-banners/paints-weathering-coming-soon-transparent.png',
  },
] as const;

export const featuredNavigation = [
  { label: 'All products', href: '/shop' },
  { label: 'New arrivals', href: '/shop?sort=newest' },
  { label: 'Bundles', href: '/bundles' },
  { label: 'Brands we stock', href: '/brands' },
] as const;

export const heroSlides = [
  {
    label: 'In stock',
    availabilityLabel: 'In stock',
    title: 'DeLorean detail for the display shelf.',
    script: '1:24 scale, film icon, bench-ready.',
    copy: 'Aoshima Back to the Future kits pair licensed screen presence with a focused build for collectors and display-led modellers.',
    image: '/assets/hero-workshop-car.png',
    sourceProductSlug: 'aoshima-06437-back-to-the-future-part-ii',
    brandName: 'Aoshima',
    brandLogo: '/assets/brands/aoshima.png',
    alt: 'Aoshima Back to the Future DeLorean model kit on an Iron Sprue workshop bench',
    ctaHref: '/products/aoshima-06437-back-to-the-future-part-ii',
    ctaLabel: 'Shop now',
    secondaryHref: '/shop/model-kits',
    meta: ['Model Kits', 'Film & Television Vehicles', 'Aoshima', '1:24 Scale'],
  },
  {
    label: 'Bundle savings',
    availabilityLabel: 'Bundle savings',
    title: 'Bundle savings for display builds.',
    script: 'Three-piece sets, better value.',
    copy: 'Selected Iron Sprue bundles group display builds and bench additions into better-value projects.',
    image: '/assets/hero-campaigns/promo-bundle-savings-hero-v3.png',
    sourceProductSlug: 'cubicfun-landmark-trio',
    brandName: 'Iron Sprue',
    alt: 'Grouped 3D puzzle and display-build boxes arranged as a bundle offer',
    ctaHref: '/products/cubicfun-landmark-trio',
    ctaLabel: 'View bundles',
    secondaryHref: '/bundles',
    meta: ['Bundles', '3D Puzzles & Builds', 'Display Builds', 'Special Offers'],
  },
  {
    label: 'Puzzle object',
    availabilityLabel: 'In stock',
    title: 'A puzzle vase made to stay out.',
    script: 'Piece by piece, then display.',
    copy: 'Pintoo 3D puzzle objects reward slower assembly with decorative finished forms worth keeping on show.',
    image: '/assets/promo-pintoo-vase-workshop.png',
    sourceProductSlug: 'pintoo-s1024-3d-jigsaw-vase-koi-carp-and-lotus',
    brandName: 'Pintoo',
    brandLogo: '/assets/brands/pintoo.png',
    alt: 'Koi carp and lotus vase puzzle object on warm workshop paper',
    ctaHref: '/products/pintoo-s1024-3d-jigsaw-vase-koi-carp-and-lotus',
    ctaLabel: 'Shop now',
    secondaryHref: '/shop?brand=Pintoo',
    meta: ['3D Puzzle Objects', 'Display-First Results', 'Focused Builds', 'Gift Ready'],
  },
] as const;

export const promoPanels = [
  {
    eyebrow: 'Bundle savings',
    title: 'Save on sets',
    copy: 'Group display builds into better-value sets for bigger bench projects.',
    href: '/bundles',
    cta: 'View bundles',
    image: '/assets/promo-bundle-savings.webp',
    alt: 'Grouped 3D puzzle and display-build boxes arranged as a bundle offer',
  },
  {
    eyebrow: 'CubicFun display builds',
    title: 'From £16.99',
    copy: 'Landmark 3D builds with shelf-ready scale, detail and presence.',
    href: '/shop/cubicfun',
    cta: 'Shop now',
    image: '/assets/promo-cubicfun-display-builds-v2.webp',
    alt: 'Architectural display-build model assembled on a warm workshop bench',
  },
  {
    eyebrow: 'Pintoo puzzle objects',
    title: 'Built to display',
    copy: 'Decorative puzzle objects made to finish, display and keep on show.',
    href: '/shop/pintoo',
    cta: 'Explore',
    image: '/assets/promo-pintoo-display-object-v2.webp',
    alt: 'Decorative puzzle object displayed on a warm workshop bench',
  },
] as const;

export const categoryTiles = [
  { title: 'Plastic Model Kits', href: '/shop/model-kits', description: 'Cars, character kits and display builds selected for clean assembly.', tone: 'large' },
  { title: '3D Puzzles & Builds', href: '/shop/3d-puzzles-and-builds', description: 'Architectural models, puzzle objects and giftable weekend projects.', tone: 'warm' },
  { title: 'Tools', href: '/shop/tools', description: 'Cutting, sanding, measuring and useful bench support.', tone: 'steel' },
  { title: 'Adhesives & Finishing', href: '/shop?category=adhesives-finishing', description: 'Glues, applicators, surface prep and finish helpers.', tone: 'brass' },
  { title: 'Workshop Essentials', href: '/shop?category=workshop-essentials', description: 'Reliable add-ons for cleaner first-pass builds.', tone: 'graphite' },
  { title: 'Brands', href: '/brands', description: 'Browse stocked makers and authorised product ranges as they go live.', tone: 'light' },
] as const;

export const brandLogoRegistry: Record<string, string> = {
  Aoshima: '/assets/brands/aoshima.png',
  CubicFun: '/assets/brands/cubicfun.png',
  'Deluxe Materials': '/assets/brands/deluxe-materials.png',
  'Expo Tools': '/assets/brands/expo-tools.png',
  'OcCre Creations': '/assets/brands/occre-creations.png',
  Pintoo: '/assets/brands/pintoo.png',
  Tasma: '/assets/brands/tasma-products.png',
};

export function withOfficialBrandLogos(brands: IronSprueBrandRecord[]) {
  return brands
    .map((brand) => ({
      ...brand,
      logoUrl: brandLogoRegistry[brand.name],
      approvalStatus: brandLogoRegistry[brand.name] ? ('LOGO_APPROVED' as const) : brand.approvalStatus,
    }))
    .filter((brand) => Boolean(brand.logoUrl));
}

const productImageRegistry: Record<string, string> = {
  'aoshima-06347-lamborghini-aventador-red': '/assets/products/aoshima-lamborghini-adventador-green.jpg',
  'aoshima-06357-skyline-gtr-red-pearl': '/assets/products/aoshima-skyline-gtr-red-pearl.jpg',
  'aoshima-06459-toyota-gr86-spark-red': '/assets/products/aoshima-toyota-gr86-spark-red.jpg',
  'cubicfun-mc101h-burj-al-arab': '/assets/products/cubicfun-burj-al-arab.jpg',
  'pintoo-s1024-3d-jigsaw-vase-koi-carp-and-lotus': '/assets/products/pintoo-koi-carp-lotus-vase.jpg',
};

export function productImage(product: IronSprueProduct) {
  return product.imageUrl || productImageRegistry[product.slug] || null;
}

export function productGalleryImages(product: IronSprueProduct) {
  const liveImages = [
    productImage(product),
    ...(product.imageReferences ?? []),
  ].filter((image): image is string => Boolean(image?.trim()));

  const images = liveImages.length ? liveImages : [productImageRegistry[product.slug]].filter((image): image is string => Boolean(image?.trim()));

  return Array.from(new Set(images));
}

export function conciseProductLead(product: IronSprueProduct) {
  return `${product.name} from ${product.brand}.`;
}

function heroProductSearchText(product: IronSprueProduct) {
  return [
    product.name,
    product.customerTitle,
    product.sourceTitle,
    product.brand,
    product.category,
    product.productType,
    product.scale,
    product.shortDescription,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function heroScriptForProduct(product: IronSprueProduct) {
  const source = heroProductSearchText(product);
  if (source.includes('back to the future') || source.includes('delorean')) return '1:24 scale, film icon, bench-ready.';
  if (source.includes('skyline') || source.includes('gtr')) return 'Pearl red street legend, tuned for the shelf.';
  if (source.includes('magic box') && source.includes('london')) return 'Layered London light, built into a display scene.';
  if (source.includes('magic box') && source.includes('underwater')) return 'A miniature world with depth, colour and glow.';
  if (source.includes('magic box')) return 'Layered scene-building with a display-ready finish.';
  if (source.includes('lamborghini') || source.includes('countach') || source.includes('aventador')) return 'Supercar stance, sharp lines, display impact.';
  if (source.includes('toyota 2000gt')) return 'Classic curves, compact scale, collector poise.';
  if (source.includes('jimny')) return 'Compact off-road character for the bench.';
  if (source.includes('burj') || source.includes('tower') || source.includes('khalifa')) return 'Vertical architecture with skyline presence.';
  if (source.includes('brandenburg') || source.includes('gate')) return 'Landmark detail, balanced for display.';
  if (source.includes('santa maria') || source.includes('ship') || source.includes('navigation') || source.includes('schooner')) return 'Maritime display builds with rigged detail.';
  if (source.includes('globe') || source.includes('blue marble')) return 'A puzzle object with planetary presence.';
  if (source.includes('vase') || source.includes('koi') || source.includes('lotus')) return 'Piece by piece, then made to stay out.';
  if (source.includes('clock')) return 'Functional puzzle decor with a finished face.';
  if (source.includes('lantern')) return 'Puzzle-built light, made for atmosphere.';
  if (source.includes('cubicfun') || source.includes('architecture') || source.includes('landmark')) return 'Architectural detail for shelf-ready builds.';
  if (source.includes('pintoo') || source.includes('puzzle')) return 'Puzzle form, decorative finish, display ready.';
  if (source.includes('aoshima') || source.includes('model kit')) return 'Precision kit detail for focused builders.';
  return 'Build-focused detail selected for the display shelf.';
}

export function heroBodyCopyForProduct(product: IronSprueProduct) {
  const source = heroProductSearchText(product);
  if (source.includes('back to the future') || source.includes('delorean')) {
    return 'Aoshima Back to the Future kits pair licensed screen presence with a focused build for collectors and display-led modellers.';
  }
  if (source.includes('skyline') || source.includes('gtr')) {
    return 'The Skyline GTR Red Pearl brings Japanese performance styling into a crisp Aoshima kit with strong stance and display presence.';
  }
  if (source.includes('magic box') && source.includes('london')) {
    return 'CubicFun London at Night turns familiar city landmarks into a layered illuminated scene for a compact display build.';
  }
  if (source.includes('magic box') && source.includes('underwater')) {
    return 'CubicFun Underwater World builds into a colourful dimensional scene with decorative depth beyond a standard puzzle.';
  }
  if (source.includes('magic box')) {
    return 'CubicFun Magic Box kits combine layered artwork and model construction into compact scenes made for display.';
  }
  if (source.includes('lamborghini') || source.includes('countach') || source.includes('aventador')) {
    return 'Aoshima supercar kits focus on crisp body lines, low stance and clean bench work for collectors of modern performance cars.';
  }
  if (source.includes('toyota 2000gt')) {
    return 'Aoshima classic car kits bring elegant Japanese motoring history into a compact, display-led modelling project.';
  }
  if (source.includes('jimny')) {
    return 'The Jimny kit keeps the compact off-road shape and character that makes the real vehicle instantly recognisable.';
  }
  if (source.includes('burj') || source.includes('tower') || source.includes('khalifa')) {
    return 'CubicFun landmark builds turn recognisable architecture into vertical display pieces with strong shelf presence.';
  }
  if (source.includes('brandenburg') || source.includes('gate')) {
    return 'CubicFun architecture kits balance approachable assembly with recognisable landmark detail for display-led projects.';
  }
  if (source.includes('santa maria') || source.includes('ship') || source.includes('navigation') || source.includes('schooner')) {
    return 'CubicFun ship builds bring sails, hull forms and historical character into compact maritime display projects.';
  }
  if (source.includes('globe') || source.includes('blue marble')) {
    return 'Pintoo globe puzzles reward careful assembly with a decorative object designed to remain on show after the final piece.';
  }
  if (source.includes('vase') || source.includes('koi') || source.includes('lotus')) {
    return 'Pintoo vase puzzles turn patterned pieces into decorative finished forms that work as display objects, not just completed puzzles.';
  }
  if (source.includes('clock')) {
    return 'Pintoo clock puzzles combine satisfying assembly with a finished decorative piece for a shelf or desk.';
  }
  if (source.includes('lantern')) {
    return 'Pintoo lantern builds add gentle display atmosphere after assembly, pairing puzzle work with decorative use.';
  }
  if (source.includes('cubicfun') || source.includes('architecture') || source.includes('landmark')) {
    return 'CubicFun builds focus on recognisable structures and display-friendly finished models for relaxed bench sessions.';
  }
  if (source.includes('pintoo') || source.includes('puzzle')) {
    return 'Pintoo puzzle objects are selected for slower assembly and decorative finished forms that deserve shelf space.';
  }
  if (source.includes('aoshima') || source.includes('model kit')) {
    return 'Aoshima kits bring subject accuracy and display appeal together for focused model builders.';
  }
  return product.shortDescription || `${product.name} from ${product.brand} is selected for builders who want a finished piece worth displaying.`;
}

function normalisePublicCopy(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const publicCopyStopWords = new Set([
  'about',
  'after',
  'again',
  'alongside',
  'available',
  'because',
  'before',
  'bring',
  'build',
  'builders',
  'clean',
  'collection',
  'colour',
  'completed',
  'display',
  'enjoy',
  'finished',
  'from',
  'looking',
  'model',
  'once',
  'presence',
  'product',
  'selected',
  'strong',
  'subject',
  'suits',
  'their',
  'with',
]);

function significantPublicWords(value: string) {
  return normalisePublicCopy(value)
    .split(' ')
    .filter((word) => word.length > 3 && !publicCopyStopWords.has(word));
}

function publicCopySimilarity(a: string, b: string) {
  const aWords = new Set(significantPublicWords(a));
  const bWords = new Set(significantPublicWords(b));
  const smallest = Math.min(aWords.size, bWords.size);
  if (!smallest) return 0;
  let shared = 0;
  aWords.forEach((word) => {
    if (bWords.has(word)) shared += 1;
  });
  return shared / smallest;
}

function stripInternalProductCopy(value: string) {
  const prohibitedSentencePatterns = [
    /\b(?:todo|tbc|needs review|media pending|admin source|source reference|verified by|import row|launch import|scraped|scrape artefact|archive\/products)\b/i,
    /\b(?:display-kit positioning|display-build positioning|puzzle-object positioning|product positioning|range positioning|unverified kit-part claims|product page relying on|current\s+[A-Za-z0-9&' -]+\s+(?:display-kit|display-build|puzzle-object|product|range)\s+positioning)\b/i,
    /\b(?:launch catalogue|launch range|source data|supplier data|review flag|review metadata|public copy|admin-only|catalogue-primary|image\s*2)\b/i,
    /\b(?:factual source material|source material|source information|available source|verified source|omitted uncertain specifications|source confidence|available product facts|keeps the current)\b/i,
    /\b(?:final box-specific details|manufacturer specifications required|requires human review)\b/i,
    /\b(?:use\s+manufacturer\s+and\s+authorised\s+distributor\s+information|authorised\s+distributor\s+information\s+as\s+factual|factual\s+use\s+only)\b/i,
    /\b(?:manufacturer|supplier|brand|pintoo|aoshima|cubicfun|tasma)?\s*reference\s+[A-Z0-9-]{3,}\b/i,
    /\b(?:choose this\s+[^.?!]+\s+version if that finish best suits your collection|this listing is the\s+[^.?!]+\s+variant)\b/i,
    /\b(?:chosen for customers who want|customers who want|good pick for customers|ideal for\s+[^.?!]+\s+or anyone drawn to)\b/i,
  ];

  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .map((sentence) => sentence
        .replace(/\bThe canonical scale is\s+([^.\n]+)\./gi, 'Scale: $1.')
        .replace(/\bThe canonical size is\s+([^.\n]+)\./gi, 'Size: $1.'))
      .filter((sentence) => sentence && !prohibitedSentencePatterns.some((pattern) => pattern.test(sentence)))
      .join(' '))
    .filter(Boolean)
    .join('\n\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function customerProductDescription(product: IronSprueProduct): string {
  const source = stripInternalProductCopy(product.description || product.shortDescription || conciseProductLead(product));
  const size = productSize(product);
  const shortDescription = normalisePublicCopy(product.shortDescription || '');
  const seen = new Set<string>();
  const paragraphs = source
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((paragraph) => {
      const normalised = normalisePublicCopy(paragraph);
      if (!normalised) return false;
      if (seen.has(normalised)) return false;
      seen.add(normalised);
      if (shortDescription && normalised === shortDescription) return true;
      return true;
    });

  if (!paragraphs.length) return conciseProductLead(product);
  const withFinishedSize = (description: string) => {
    if (!size) return description;
    const normalisedDescription = normalisePublicCopy(description);
    const normalisedSize = normalisePublicCopy(size);
    if (!normalisedSize || normalisedDescription.includes(normalisedSize)) return description;
    return `${description}\n\nFinished size: ${size}.`;
  };
  if (paragraphs.length === 1) return withFinishedSize(paragraphs[0] ?? conciseProductLead(product));

  const [first, ...rest] = paragraphs;
  if (!first) return conciseProductLead(product);
  const firstNormalised = normalisePublicCopy(first);
  const filteredRest = rest.filter((paragraph) => {
    const normalised = normalisePublicCopy(paragraph);
    return !firstNormalised.includes(normalised) && !normalised.includes(firstNormalised) && publicCopySimilarity(first, paragraph) < 0.58;
  });
  return withFinishedSize([first, ...filteredRest].join('\n\n'));
}

export function productCardFacts(product: IronSprueProduct) {
  const facts = [
    productScale(product),
    productPieceCount(product) ? `${productPieceCount(product)} pieces` : '',
    productSize(product),
  ].filter((value): value is string => Boolean(String(value ?? '').trim()));

  return Array.from(new Set(facts)).slice(0, 1);
}

export function productCardMobileFact(product: IronSprueProduct) {
  const category = product.category?.trim();
  const fact = productCardFacts(product)[0];
  return { category: category || '', fact: fact || '' };
}

export function productSellableQuantity(product: IronSprueProduct) {
  return Math.max(0, product.availableQuantity ?? product.stockQuantity ?? 0);
}

export function productCommerceId(product: IronSprueProduct) {
  return product.id ?? product.sku;
}

export function productAvailability(product: IronSprueProduct) {
  const availableQuantity = productSellableQuantity(product);
  if (availableQuantity <= 0) return 'Out of stock';
  if (availableQuantity <= Math.max(1, product.reorderLevel ?? 1)) return 'Low stock';
  return 'In stock';
}

export function productAvailabilityClass(product: IronSprueProduct) {
  const availableQuantity = productSellableQuantity(product);
  if (availableQuantity <= 0) return 'out-of-stock';
  if (availableQuantity <= Math.max(1, product.reorderLevel ?? 1)) return 'low-stock';
  return 'in-stock';
}

export function featuredProducts(products: IronSprueProduct[], count = 8, options: { includeUnpublishedPreview?: boolean } = {}) {
  const isVisible = (product: IronSprueProduct) =>
    product.storeCode === 'IRON_SPRUE' && (options.includeUnpublishedPreview || product.published !== false);
  const withImages = products.filter((product) => isVisible(product) && productImage(product));
  const rest = products.filter((product) => isVisible(product) && !productImage(product));
  return [...withImages, ...rest].slice(0, count);
}

const workshopAddonCategories = new Set([
  'adhesives-finishing',
  'epoxy-adhesives',
  'knives-blades',
  'magnification',
  'masking-finishing',
  'measuring-tools',
  'pin-vices-drills',
  'sanding-files',
  'tool-sets',
  'tweezers-pliers',
]);

export function isProductAddonCandidate(product: IronSprueProduct) {
  return workshopAddonCategories.has(slugForCategory(product.category));
}

const addonRelevanceProfiles: Record<string, string[]> = {
  'model-kits': [
    'adhesives-finishing',
    'knives-blades',
    'sanding-files',
    'tweezers-pliers',
    'masking-finishing',
    'pin-vices-drills',
    'measuring-tools',
  ],
  'vases': ['knives-blades', 'tweezers-pliers'],
  'clocks': ['knives-blades', 'tweezers-pliers'],
  'flowerpots': ['knives-blades', 'tweezers-pliers'],
  'lanterns': ['knives-blades', 'tweezers-pliers'],
  'screens': ['knives-blades', 'tweezers-pliers'],
  'architecture': ['knives-blades', 'tweezers-pliers'],
  'ships': ['knives-blades', 'tweezers-pliers'],
};

function productAddonProfile(product: IronSprueProduct) {
  const category = slugForCategory(product.category);
  if (isModelKitProduct(product)) return addonRelevanceProfiles['model-kits'] ?? [];
  return addonRelevanceProfiles[category] ?? [];
}

function addonScore(product: IronSprueProduct, preferredCategories: string[]) {
  const category = slugForCategory(product.category);
  const categoryIndex = preferredCategories.indexOf(category);
  if (categoryIndex === -1) return Number.NEGATIVE_INFINITY;
  const name = product.name.toLowerCase();
  let score = (preferredCategories.length - categoryIndex) * 100;
  if (/hobby knife|reverse tweezer|micro tips|roket rapid|speedbond|flexible file|sander|masking magic|pin vice|mini drill|calliper/i.test(name)) score += 20;
  if (/sold individually|blades \(5\)|glue buster/i.test(name)) score -= 15;
  score += Math.min(20, productSellableQuantity(product));
  return score;
}

export function productDetailAddons(products: IronSprueProduct[], currentSku: string, count?: number) {
  const currentProduct = products.find((product) => product.sku === currentSku);
  if (!currentProduct) return [];
  const preferredCategories = productAddonProfile(currentProduct);
  if (!preferredCategories.length) return [];
  const limit = count ?? (isModelKitProduct(currentProduct) ? 5 : 2);
  const candidates = products
    .filter((product) => product.sku !== currentSku)
    .filter((product) => productSellableQuantity(product) > 0)
    .filter(isProductAddonCandidate)
    .map((product) => ({ product, score: addonScore(product, preferredCategories) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((left, right) => right.score - left.score || productPriceMinor(left.product) - productPriceMinor(right.product));

  const selected: typeof candidates = [];
  for (const category of preferredCategories) {
    const match = candidates.find((item) => slugForCategory(item.product.category) === category && !selected.includes(item));
    if (match) selected.push(match);
    if (selected.length >= limit) break;
  }
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  return selected.map((item) => item.product);
}

export function categoryOptions(products: IronSprueProduct[]) {
  return Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort();
}

export function brandOptions(products: IronSprueProduct[]) {
  return Array.from(new Set(products.map((product) => product.brand).filter(Boolean))).sort();
}

export function formatPrice(product: IronSprueProduct) {
  return `£${(productPriceMinor(product) / 100).toFixed(2)}`;
}

export function slugForCategory(category: string) {
  return brandSlug(category);
}

export function hrefForCategoryLabel(label: string) {
  const normalised = label.toLowerCase();
  if (normalised.includes('model') || normalised.includes('japanese')) return '/shop/model-kits';
  if (normalised.includes('puzzle') || normalised.includes('architecture') || normalised.includes('display build') || normalised.includes('giftable')) return '/shop/3d-puzzles-and-builds';
  if (normalised.includes('tool')) return '/shop/tools';
  if (normalised.includes('adhesive') || normalised.includes('finishing')) return '/shop?category=adhesives-finishing';
  if (normalised.includes('paint') || normalised.includes('weathering')) return '/shop/paints-weathering';
  if (normalised.includes('brand')) return '/brands';
  if (normalised.includes('new')) return '/shop?sort=newest';
  return `/shop?category=${encodeURIComponent(slugForCategory(label))}`;
}
