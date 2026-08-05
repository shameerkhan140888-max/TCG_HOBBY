import { brandSlug, productPriceMinor, type IronSprueBrandRecord, type IronSprueProduct } from './catalogue';

export const categoryNavigation = [
  { label: 'Model Kits', href: '/shop?category=model-kits' },
  { label: '3D Puzzles & Builds', href: '/shop?category=3d-puzzles' },
  { label: 'Tools', href: '/shop?category=tools' },
  { label: 'Adhesives & Finishing', href: '/shop?category=adhesives-finishing' },
  { label: 'Brands', href: '/brands' },
  { label: 'New Arrivals', href: '/shop?sort=new' },
  { label: 'Coming Soon', href: '/shop?availability=coming-soon' },
  { label: 'Offers', href: '/shop?offers=true' },
] as const;

export const heroSlides = [
  {
    label: 'In stock',
    availabilityLabel: 'Now available',
    title: 'Built for the bench.',
    script: 'Kits. Tools. Finishing.',
    copy: 'Everything a modeller needs, from display-ready builds to the essentials that make the finish sharper.',
    image: '/assets/hero-aoshima-lamborghini-workshop.png',
    sourceProductSlug: 'aoshima-06348-lamborghini-adventador-green',
    brandName: 'Aoshima',
    brandLogo: '/assets/brands/aoshima.webp',
    alt: 'Green Lamborghini Aventador model on an Iron Sprue workshop cutting mat',
    ctaHref: '/products/aoshima-06348-lamborghini-adventador-green',
    secondaryHref: '/brands',
    meta: ['Model Kits', '3D Puzzles & Builds', 'Tools', 'Adhesives & Finishing', 'Paints & Weathering', 'Accessories'],
  },
  {
    label: 'Display build',
    availabilityLabel: 'Coming soon',
    title: 'Make the shelf the finish line.',
    script: 'Build to display.',
    copy: 'Architectural builds and puzzle objects with enough presence to earn their place after assembly.',
    image: '/assets/promo-cubicfun-landmark-workshop.png',
    sourceProductSlug: 'cubicfun-mc101h-burj-al-arab',
    brandName: 'CubicFun',
    brandLogo: '/assets/brands/cubicfun.webp',
    alt: 'Blue and white architectural display model on warm workshop assembly paper',
    ctaHref: '/products/cubicfun-mc101h-burj-al-arab',
    secondaryHref: '/shop?category=3d-puzzles',
    meta: ['Display Builds', 'Architectural Kits', 'Giftable Projects', 'Clean Assembly'],
  },
  {
    label: 'Puzzle object',
    availabilityLabel: 'Launch list',
    title: 'Small parts. Calm hours.',
    script: 'Built for focus.',
    copy: 'Pintoo puzzle projects and modelling staples for slower builds, tidy benches and better finishes.',
    image: '/assets/promo-pintoo-vase-workshop.png',
    sourceProductSlug: 'pintoo-s1024-3d-jigsaw-vase-koi-carp-lotus',
    brandName: 'Pintoo',
    brandLogo: '/assets/brands/pintoo.webp',
    alt: 'Koi carp and lotus vase puzzle object on warm workshop paper',
    ctaHref: '/products/pintoo-s1024-3d-jigsaw-vase-koi-carp-lotus',
    secondaryHref: '/shop?brand=Pintoo',
    meta: ['3D Puzzle Objects', 'Display-First Results', 'Focused Builds', 'Gift Ready'],
  },
] as const;

export const promoPanels = [
  {
    eyebrow: 'Tool essentials bundle',
    title: 'Save 15%',
    copy: 'Cut, trim, sand and finish with a compact starter bench set.',
    href: '/shop?category=tools',
    cta: 'View bundle',
    image: '/assets/promo-tools.png',
    alt: 'Hobby tools arranged on a dark cutting mat',
  },
  {
    eyebrow: 'CubicFun display builds',
    title: 'From £16.99',
    copy: 'Landmarks and shelf-ready 3D builds with real presence.',
    href: '/products/cubicfun-mc101h-burj-al-arab',
    cta: 'Shop now',
    image: '/assets/promo-cubicfun-landmark-workshop.png',
    alt: 'Architectural display model on workshop paper',
  },
  {
    eyebrow: 'Pintoo puzzle objects',
    title: 'Built to display',
    copy: 'Puzzle builds with decorative finished forms.',
    href: '/products/pintoo-s1024-3d-jigsaw-vase-koi-carp-lotus',
    cta: 'Explore',
    image: '/assets/promo-pintoo-vase-workshop.png',
    alt: 'Decorative koi and lotus vase puzzle object on a workbench',
  },
] as const;

export const categoryTiles = [
  { title: 'Plastic Model Kits', href: '/shop?category=model-kits', description: 'Cars, character kits and display builds selected for clean assembly.', tone: 'large' },
  { title: '3D Puzzles & Builds', href: '/shop?category=3d-puzzles', description: 'Architectural models, puzzle objects and giftable weekend projects.', tone: 'warm' },
  { title: 'Tools', href: '/shop?category=tools', description: 'Cutting, sanding, measuring and useful bench support.', tone: 'steel' },
  { title: 'Adhesives & Finishing', href: '/shop?category=adhesives-finishing', description: 'Glues, applicators, surface prep and finish helpers.', tone: 'brass' },
  { title: 'Workshop Essentials', href: '/shop?category=workshop-essentials', description: 'Reliable add-ons for cleaner first-pass builds.', tone: 'graphite' },
  { title: 'Brands', href: '/brands', description: 'Browse stocked makers and authorised product ranges as they go live.', tone: 'light' },
] as const;

export const brandLogoRegistry: Record<string, string> = {
  Aoshima: '/assets/brands/aoshima.webp',
  CubicFun: '/assets/brands/cubicfun.webp',
  'Deluxe Materials': '/assets/brands/deluxe-materials.svg',
  'Expo Tools': '/assets/brands/expo-tools.svg',
  'OcCre Creations': '/assets/brands/occre-creations.svg',
  Pintoo: '/assets/brands/pintoo.webp',
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
  'aoshima-06348-lamborghini-adventador-green': '/assets/products/aoshima-lamborghini-adventador-green.jpg',
  'aoshima-06357-skyline-gtr-red-pearl': '/assets/products/aoshima-skyline-gtr-red-pearl.jpg',
  'aoshima-06459-toyota-gr86-spark-red': '/assets/products/aoshima-toyota-gr86-spark-red.jpg',
  'cubicfun-mc101h-burj-al-arab': '/assets/products/cubicfun-burj-al-arab.jpg',
  'pintoo-s1024-3d-jigsaw-vase-koi-carp-lotus': '/assets/products/pintoo-koi-carp-lotus-vase.jpg',
};

export function productImage(product: IronSprueProduct) {
  return product.imageUrl || productImageRegistry[product.slug] || null;
}

export function productAvailability(product: IronSprueProduct) {
  if (product.stockQuantity <= 0) return 'Out of stock';
  if (product.stockQuantity <= Math.max(1, product.reorderLevel ?? 1)) return 'Low stock';
  return 'In stock';
}

export function featuredProducts(products: IronSprueProduct[], count = 8) {
  const withImages = products.filter((product) => product.storeCode === 'IRON_SPRUE' && product.published !== false && productImage(product));
  const rest = products.filter((product) => product.storeCode === 'IRON_SPRUE' && product.published !== false && !productImage(product));
  return [...withImages, ...rest].slice(0, count);
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
