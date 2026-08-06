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
    label: 'Products',
    href: '/admin/iron-sprue/products',
    description: 'Create, edit, review and publish Iron Sprue product drafts without touching TCG Hobby products.',
    capability: 'Manage Iron Sprue titles, SKUs, prices, VAT, categories, brand attribution and publication readiness.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'inventory',
    label: 'Inventory',
    href: '/admin/iron-sprue/inventory',
    description: 'Track Iron Sprue expected, received, damaged, missing and available quantities.',
    capability: 'Adjust Iron Sprue inventory and preserve movement history.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'media',
    label: 'Media',
    href: '/admin/iron-sprue/media',
    description: 'Approve Image 2, gallery, hero and workshop media in the Iron Sprue R2 bucket.',
    capability: 'Enforce catalogue-primary Image 2 before a product can become storefront-ready.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'stocked-brands',
    label: 'Stocked brand carousel',
    href: '/admin/iron-sprue/brands',
    description: 'Maintain official Iron Sprue stocked-brand records and carousel ordering.',
    capability: 'Attach approved brand logos and keep placeholder or unofficial logos unpublished.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'categories',
    label: 'Categories and filters',
    href: '/admin/iron-sprue/categories',
    description: 'Maintain the modelling categories that drive navigation and catalogue filtering.',
    capability: 'Manage Model Kits, 3D Puzzles and Builds, Tools, Adhesives and Finishing, and Workshop Essentials.',
    requiresIronSprueRuntime: true,
  },
  {
    key: 'homepage',
    label: 'Homepage and heroes',
    href: '/admin/iron-sprue/homepage',
    description: 'Manage Iron Sprue homepage placements, hero slides, banners and special-offer slots.',
    capability: 'Keep storefront marketing editable without reusing TCG Hobby storefront records.',
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
