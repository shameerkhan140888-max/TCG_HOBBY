export type IronSprueAdminControl = {
  key: string;
  label: string;
  href: string;
  description: string;
  capability: string;
  requiresIronSprueRuntime: boolean;
};

export type IronSpruePlaceholderAsset = {
  label: string;
  href: string;
  usage: string;
  alt: string;
};

export const ironSprueAdminControls: IronSprueAdminControl[] = [
  {
    key: 'products',
    label: 'Products and media',
    href: '/admin/products?game=iron-sprue',
    description: 'Add, edit, publish and image Iron Sprue products with the same product workflow used by TCG Hobby.',
    capability: 'Create products, attach approved images, manage stock flags and publication state.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'hero-carousel',
    label: 'Hero carousel',
    href: '/admin/storefront',
    description: 'Choose carousel products, supporting copy, CTA links and dedicated hero imagery through homepage hero placements.',
    capability: 'Use homepage hero placements as the Iron Sprue hero-carousel source.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'promotional-banner',
    label: 'Promotional banner',
    href: '/admin/storefront',
    description: 'Set the active storefront promotional banner, CTA, schedule and display order.',
    capability: 'Use the existing site-wide banner controls for Iron Sprue launch and trading messages.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'stocked-brands',
    label: 'Stocked brand carousel',
    href: '/admin/catalogue/brands',
    description: 'Maintain the brands available to Iron Sprue product records and carousel merchandising.',
    capability: 'Add approved brands and keep official logo assets attached through the Iron Sprue media workflow.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'categories',
    label: 'Categories and filters',
    href: '/admin/catalogue/categories',
    description: 'Maintain the modelling categories that drive navigation and catalogue filtering.',
    capability: 'Manage Model Kits, 3D Puzzles and Builds, Tools, Adhesives and Finishing, and Workshop Essentials.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'landing-copy',
    label: 'Landing and range copy',
    href: '/admin/storefront',
    description: 'Maintain concise shop landing-page copy without changing product records.',
    capability: 'Use shop landing page controls for category and range storytelling.',
    requiresIronSprueRuntime: true,
  },
];

export const ironSpruePlaceholderAssets: IronSpruePlaceholderAsset[] = [
  {
    label: 'Red car workshop scene',
    href: '/iron-sprue/placeholders/placeholder-red-car-workshop.png',
    usage: 'Generic model-kit placeholder hero or promo artwork.',
    alt: 'Generated red model car scene on a workshop cutting mat',
  },
  {
    label: 'Tool essentials scene',
    href: '/iron-sprue/placeholders/placeholder-tools-workshop.png',
    usage: 'Generic tools, adhesives and finishing placeholder artwork.',
    alt: 'Generated hobby tools arranged on a dark cutting mat',
  },
  {
    label: 'Clock, landmark and puzzle scene',
    href: '/iron-sprue/placeholders/placeholder-clock-landmark-puzzle.png',
    usage: 'Generic 3D puzzle, display build and clock-kit placeholder artwork.',
    alt: 'Generated clock, landmark and puzzle build scene on a workshop bench',
  },
];

export function getIronSprueAdminControl(key: string) {
  return ironSprueAdminControls.find((control) => control.key === key) ?? null;
}
