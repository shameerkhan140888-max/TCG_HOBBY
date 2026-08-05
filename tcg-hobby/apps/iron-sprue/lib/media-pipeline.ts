import { assertIronSprueMediaKey, type IronSprueMediaConfig } from './store-runtime-config';

export type IronSprueMediaAssetKind =
  | 'manufacturer-original'
  | 'catalogue-white'
  | 'completed-render'
  | 'workshop-photography'
  | 'supporting-workshop'
  | 'hero-artwork';

export type IronSprueMediaFormat = 'jpg' | 'png' | 'webp' | 'avif';

export type IronSprueMediaProductInput = {
  sku: string;
  slug: string;
  brand: string;
  name: string;
};

export type IronSprueMediaAssetSpec = {
  kind: IronSprueMediaAssetKind;
  label: string;
  required: boolean;
  adminEditable: boolean;
  preferredFormats: readonly IronSprueMediaFormat[];
  description: string;
};

export type IronSprueMediaPlanItem = IronSprueMediaAssetSpec & {
  keyPrefix: string;
  publicUrlPrefix?: string;
  responsiveWidths: readonly number[];
};

export const IRON_SPRUE_PRODUCT_MEDIA_BUCKET = 'iron-sprue-product-media';
export const IRON_SPRUE_MEDIA_DOMAIN = 'media.ironsprue.co.uk';
export const IRON_SPRUE_RESPONSIVE_IMAGE_WIDTHS = [320, 640, 960, 1280, 1600, 2048] as const;

export const IRON_SPRUE_MEDIA_PREFIXES = {
  incomingProduct: (sku: string) => `incoming/products/${slugifyMediaPart(sku)}/`,
  archiveOriginal: (sku: string) => `archive/products/${slugifyMediaPart(sku)}/original/`,
  processedCatalogue: (sku: string) => `processed/products/${slugifyMediaPart(sku)}/catalogue/`,
  processedCompleted: (sku: string) => `processed/products/${slugifyMediaPart(sku)}/completed/`,
  processedWorkshop: (sku: string) => `processed/products/${slugifyMediaPart(sku)}/workshop/`,
  processedLifestyle: (sku: string) => `processed/products/${slugifyMediaPart(sku)}/lifestyle/`,
  publishedProduct: (sku: string) => `published/products/${slugifyMediaPart(sku)}/`,
  marketingHeroes: 'marketing/heroes/',
  brandLogos: 'brands/logos/',
  categories: 'categories/',
} as const;

export const IRON_SPRUE_WORKSHOP_IDENTITY = {
  playmat:
    'Dark Iron Sprue cutting playmat with millimetre ruler borders, precision grid, cog and technical linework, orange accents, Build/Paint/Perfect icons and @iron.sprue/web marks where appropriate.',
  foamexDisplay:
    'Dark industrial Iron Sprue foamex display backdrop with the official logo, model kits/tools/paints/accessories range line, Build/Paint/Perfect/Collect icon blocks, cog linework and warm orange detail.',
  scene:
    'Premium modelling workbench with warm directional light, cutting mat texture, depth, shelves, tools and subtle assembly-guide details. Product subjects remain accurate and recognisable.',
} as const;

export const IRON_SPRUE_PRODUCT_MEDIA_STAGES: readonly IronSprueMediaAssetSpec[] = [
  {
    kind: 'manufacturer-original',
    label: 'Manufacturer original',
    required: true,
    adminEditable: true,
    preferredFormats: ['webp', 'jpg', 'png'],
    description: 'Authorised source image retained for audit and reference. Do not present raw packaging as hero art.',
  },
  {
    kind: 'catalogue-white',
    label: 'Catalogue white background',
    required: true,
    adminEditable: true,
    preferredFormats: ['webp', 'avif', 'jpg'],
    description: 'Clean product-only commerce image on white, with packaging borders and catalogue clutter removed.',
  },
  {
    kind: 'completed-render',
    label: 'Completed product render',
    required: true,
    adminEditable: true,
    preferredFormats: ['webp', 'avif', 'jpg'],
    description: 'Faithful finished-kit/product visual without changing the model, scale, contents, shape or colours.',
  },
  {
    kind: 'workshop-photography',
    label: 'Workshop photography',
    required: true,
    adminEditable: true,
    preferredFormats: ['webp', 'avif', 'jpg'],
    description: `Product staged on the Iron Sprue workshop identity: ${IRON_SPRUE_WORKSHOP_IDENTITY.playmat}`,
  },
  {
    kind: 'supporting-workshop',
    label: 'Supporting workshop image',
    required: false,
    adminEditable: true,
    preferredFormats: ['webp', 'avif', 'jpg'],
    description: `Additional range or detail image using the approved playmat/foamex identity: ${IRON_SPRUE_WORKSHOP_IDENTITY.foamexDisplay}`,
  },
  {
    kind: 'hero-artwork',
    label: 'Hero artwork',
    required: true,
    adminEditable: true,
    preferredFormats: ['webp', 'avif'],
    description:
      'Bespoke Iron Sprue promotional composition with copy, badges, prices and CTAs rendered in HTML/CSS, not baked into the image.',
  },
];

function slugifyMediaPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildIronSprueMediaKey(product: IronSprueMediaProductInput, kind: IronSprueMediaAssetKind, fileName = 'image.webp') {
  const sku = slugifyMediaPart(product.sku);
  const slug = slugifyMediaPart(product.slug || product.name);
  const safeFileName = slugifyMediaPart(fileName.replace(/\.[^.]+$/, ''));
  const extension = fileName.split('.').pop()?.toLowerCase() || 'webp';
  return assertIronSprueMediaKey(`products/${sku}-${slug}/${kind}/${safeFileName}.${extension}`);
}

export function buildIronSpruePublicMediaUrl(config: Pick<IronSprueMediaConfig, 'publicBaseUrl'>, key: string) {
  if (!config.publicBaseUrl) {
    throw new Error('IRON_SPRUE_R2_PUBLIC_BASE_URL is required to build public Iron Sprue media URLs.');
  }
  return `${config.publicBaseUrl.replace(/\/$/, '')}/${assertIronSprueMediaKey(key)}`;
}

export function createIronSprueMediaPlan(
  product: IronSprueMediaProductInput,
  config: Pick<IronSprueMediaConfig, 'bucketName' | 'publicBaseUrl'>,
): IronSprueMediaPlanItem[] {
  if (config.bucketName !== IRON_SPRUE_PRODUCT_MEDIA_BUCKET) {
    throw new Error(`Iron Sprue product media must use ${IRON_SPRUE_PRODUCT_MEDIA_BUCKET}.`);
  }

  return IRON_SPRUE_PRODUCT_MEDIA_STAGES.map((stage) => {
    const keyPrefix = buildIronSprueMediaKey(product, stage.kind, 'image.webp').replace(/\/image\.webp$/, '/');
    return {
      ...stage,
      keyPrefix,
      responsiveWidths: IRON_SPRUE_RESPONSIVE_IMAGE_WIDTHS,
      ...(config.publicBaseUrl ? { publicUrlPrefix: buildIronSpruePublicMediaUrl(config, keyPrefix) } : {}),
    };
  });
}
