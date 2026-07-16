import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from './client';
import { assertProductImportLookupData } from './canonical-seed';

export type ProductImportGame = 'POKEMON' | 'MAGIC' | 'ONE_PIECE' | 'LORCANA' | 'YUGIOH' | 'ACCESSORIES';
export type ProductLifecycleState =
  | 'DRAFT'
  | 'AWAITING_IMAGES'
  | 'AWAITING_REVIEW'
  | 'READY_TO_PUBLISH'
  | 'PUBLISHED'
  | 'HIDDEN'
  | 'ARCHIVED'
  | 'DISCONTINUED';
export type ProductImportStatus = ProductLifecycleState;
export type ProductImportImageRole = 'PRIMARY' | 'GALLERY' | 'OPENGRAPH' | 'HERO';
export type ProductImportSourceType = 'OWNER_SUPPLIED' | 'DISTRIBUTOR_MEDIA' | 'MANUFACTURER_MEDIA' | 'OWN_PHOTOGRAPHY';
export type ProductMediaThumbnailUsage = 'NONE' | 'CARD' | 'GALLERY' | 'BOTH';
export type PurchaseLimitScope = 'ORDER' | 'CUSTOMER' | 'PERSON_OR_HOUSEHOLD';
export type ShippingPromotionType = 'NONE' | 'FREE_STANDARD_UK';

export type ProductImportImage = {
  filename: string;
  displayOrder: number;
  alt: string;
  role: ProductImportImageRole;
  heroEligible: boolean;
  homepageEligible: boolean;
  openGraphEligible: boolean;
  thumbnailUsage: ProductMediaThumbnailUsage;
  provenance: ProductImportSourceType;
  licensingNotes?: string;
  internalNotes?: string;
};

export type ProductImportMediaManifest = {
  schemaVersion: 1;
  images: ProductImportImage[];
};

export type ProductImportManifest = {
  schemaVersion: 1;
  importId?: string;
  id?: string;
  name: string;
  slug?: string;
  sku?: string;
  barcode?: string;
  game: ProductImportGame;
  category: string;
  productType?: string;
  priceMinor: number;
  vatRate: number;
  stockQuantity: number;
  status?: ProductImportStatus;
  lifecycleState?: ProductLifecycleState;
  visible?: boolean;
  featured?: boolean;
  homepagePriority?: number | null;
  heroFeatured?: boolean;
  releaseDate?: string;
  preorder: boolean;
  supplierSlug?: string;
  supplierCostMinor?: number;
  purchaseLimit?: {
    quantity: number;
    scope: PurchaseLimitScope;
  };
  shippingPromotion?: {
    type: ShippingPromotionType;
    productOnly: boolean;
  };
  shortDescription: string;
  fullDescription?: string;
  contents?: string[];
  variationNotice?: string;
  seo?: {
    title?: string;
    description?: string;
  };
  source: {
    type: ProductImportSourceType;
    reference?: string;
  };
};

export type NormalisedProductImportInput = ProductImportManifest & {
  slug: string;
  sku: string;
  skuWasProvided: boolean;
  fullDescription: string;
  seo: {
    title: string;
    description: string;
  };
  contents: string[];
  shippingPromotion: {
    type: ShippingPromotionType;
    productOnly: boolean;
  };
  status: ProductLifecycleState;
  lifecycleState: ProductLifecycleState;
  visible: boolean;
  featured: boolean;
  images: ProductImportImage[];
};

export type ProductImportAdapterInput = {
  product: ProductImportManifest;
  media: ProductImportMediaManifest;
};

export type ProductImportAdapter<TSource = unknown> = {
  name: string;
  normalise(source: TSource): Promise<ProductImportAdapterInput> | ProductImportAdapterInput;
};

export type ProductImportValidationResult = {
  folderPath: string;
  valid: boolean;
  warnings: string[];
  errors: string[];
  input?: NormalisedProductImportInput;
};

export type ProductImportStage =
  | 'validate-input'
  | 'normalise-data'
  | 'process-media'
  | 'validate-business-rules'
  | 'upsert-product'
  | 'register-media'
  | 'generate-seo'
  | 'register-gallery'
  | 'storefront-availability'
  | 'audit';

export type ProductImportMediaOutput = {
  sourceFilename: string;
  outputFilename: string;
  outputPath: string;
  publicUrl: string;
  alt: string;
  role: ProductImportImageRole;
  sortOrder: number;
  isPrimary: boolean;
  heroEligible: boolean;
  homepageEligible: boolean;
  openGraphEligible: boolean;
  thumbnailUsage: ProductMediaThumbnailUsage;
  provenance: ProductImportSourceType;
  checksum: string;
};

export type ProductImportPlan = {
  input: NormalisedProductImportInput;
  productMatch: 'importId' | 'id' | 'sku' | 'slug' | 'new';
  productId?: string;
  media: ProductImportMediaOutput[];
  stages: ProductImportStage[];
  warnings: string[];
};

type ProductImportMatch = ProductImportPlan['productMatch'];

type ExistingProductMatch = {
  productMatch: Exclude<ProductImportMatch, 'new'>;
  productId: string;
} | {
  productMatch: 'new';
  productId: undefined;
};

export type ProductImportResult = ProductImportPlan & {
  changed: boolean;
  productId: string;
  productSlug: string;
  status: ProductImportStatus;
  changes: string[];
  auditId?: string;
};

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const ALLOWED_CATEGORIES = new Set(['sealed-product', 'single-card', 'accessories', 'event-entry']);
const PUBLIC_STOREFRONT_PRODUCTS_ROOT = path.join(process.cwd(), 'apps', 'storefront', 'public', 'products');
const PRODUCT_MERCHANDISING_CONTENT_PATH = path.join(process.cwd(), 'apps', 'storefront', 'content', 'product-merchandising.generated.json');
const PRODUCT_LIFECYCLE_STATES = [
  'DRAFT',
  'AWAITING_IMAGES',
  'AWAITING_REVIEW',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'HIDDEN',
  'ARCHIVED',
  'DISCONTINUED',
] as const;
const LEGACY_STATUS_TO_LIFECYCLE: Record<string, ProductLifecycleState> = {
  ACTIVE: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
  DRAFT: 'DRAFT',
};
const PIPELINE_STAGES: ProductImportStage[] = [
  'validate-input',
  'normalise-data',
  'process-media',
  'validate-business-rules',
  'upsert-product',
  'register-media',
  'generate-seo',
  'register-gallery',
  'storefront-availability',
  'audit',
];

export const gameFolderByImportGame: Record<ProductImportGame, string> = {
  POKEMON: 'pokemon',
  MAGIC: 'magic',
  ONE_PIECE: 'one-piece',
  LORCANA: 'lorcana',
  YUGIOH: 'yugioh',
  ACCESSORIES: 'accessories',
};

export function isPublishedLifecycleState(lifecycleState: ProductLifecycleState): boolean {
  return lifecycleState === 'PUBLISHED';
}

export function normalizeLifecycleState(status: string | undefined): ProductLifecycleState {
  if (!status) {
    return 'DRAFT';
  }

  if ((PRODUCT_LIFECYCLE_STATES as readonly string[]).includes(status)) {
    return status as ProductLifecycleState;
  }

  return LEGACY_STATUS_TO_LIFECYCLE[status] ?? 'DRAFT';
}

export function slugifyProductName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function derivePublicStockState(stockQuantity: number): 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK' {
  if (stockQuantity <= 0) {
    return 'OUT_OF_STOCK';
  }

  if (stockQuantity <= 3) {
    return 'LOW_STOCK';
  }

  return 'IN_STOCK';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readInteger(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : undefined;
}

function deriveSku(slug: string): string {
  return `IMPORT-${slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 48)}`;
}

export function validateProductMediaManifest(
  rawManifest: unknown,
  folderPath: string,
  fallbackSource: ProductImportSourceType = 'OWNER_SUPPLIED',
): { valid: boolean; errors: string[]; warnings: string[]; images: ProductImportImage[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(rawManifest)) {
    return { valid: false, errors: ['media.json must contain a JSON object.'], warnings, images: [] };
  }

  if (rawManifest.schemaVersion !== 1) {
    errors.push('media.json schemaVersion must be 1.');
  }

  const images = validateImageManifest(rawManifest.images, path.join(folderPath, 'images'), errors, fallbackSource);
  return { valid: errors.length === 0, errors, warnings, images };
}

function validateImageManifest(rawImages: unknown, imageFolder: string, errors: string[], fallbackSource: ProductImportSourceType): ProductImportImage[] {
  if (!Array.isArray(rawImages) || rawImages.length === 0) {
    errors.push('media.json images must contain at least one image.');
    return [];
  }

  const images: ProductImportImage[] = [];
  const numericPrefixes = new Set<string>();
  const displayOrders = new Set<number>();

  for (const [index, rawImage] of rawImages.entries()) {
    if (!isRecord(rawImage)) {
      errors.push(`images[${index}] must be an object.`);
      continue;
    }

    const filename = readString(rawImage, 'filename');
    const alt = readString(rawImage, 'alt');
    const role = parseEnum(readString(rawImage, 'role'), ['PRIMARY', 'GALLERY', 'OPENGRAPH', 'HERO'] as const);
    const displayOrder = readInteger(rawImage, 'displayOrder') ?? index + 1;
    const heroEligible = readBoolean(rawImage, 'heroEligible') ?? role === 'HERO';
    const homepageEligible = readBoolean(rawImage, 'homepageEligible') ?? (role === 'PRIMARY' || role === 'HERO');
    const openGraphEligible = readBoolean(rawImage, 'openGraphEligible') ?? (role === 'PRIMARY' || role === 'OPENGRAPH');
    const thumbnailUsage = parseEnum(readString(rawImage, 'thumbnailUsage'), ['NONE', 'CARD', 'GALLERY', 'BOTH'] as const) ?? 'GALLERY';
    const provenance = parseEnum(readString(rawImage, 'provenance'), ['OWNER_SUPPLIED', 'DISTRIBUTOR_MEDIA', 'MANUFACTURER_MEDIA', 'OWN_PHOTOGRAPHY'] as const) ?? fallbackSource;
    const licensingNotes = readString(rawImage, 'licensingNotes');
    const internalNotes = readString(rawImage, 'internalNotes');

    if (!filename) {
      errors.push(`images[${index}].filename is required.`);
      continue;
    }

    if (path.basename(filename) !== filename) {
      errors.push(`images[${index}].filename must be a filename, not a path.`);
    }

    if (!SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase())) {
      errors.push(`${filename} uses an unsupported image type.`);
    }

    const numericPrefix = filename.match(/^(\d{2})-/)?.[1];
    if (!numericPrefix) {
      errors.push(`${filename} must start with a two-digit numeric order prefix, for example 01-primary.webp.`);
    } else if (numericPrefixes.has(numericPrefix)) {
      errors.push(`Duplicate image order prefix ${numericPrefix}.`);
    } else {
      numericPrefixes.add(numericPrefix);
    }

    if (!alt) {
      errors.push(`${filename} requires meaningful alt text.`);
    }

    if (!role) {
      errors.push(`${filename} has an invalid image role.`);
    }

    if (!Number.isInteger(displayOrder) || displayOrder < 1) {
      errors.push(`${filename} displayOrder must be a positive integer.`);
    } else if (displayOrders.has(displayOrder)) {
      errors.push(`Duplicate media displayOrder ${displayOrder}.`);
    } else {
      displayOrders.add(displayOrder);
    }

    if (!existsSync(path.join(imageFolder, filename))) {
      errors.push(`${filename} is listed in product.json but does not exist in images/.`);
    }

    if (filename.startsWith('01-primary.') && role !== 'PRIMARY') {
      errors.push('01-primary must use role PRIMARY.');
    }

    if (role && alt) {
      images.push({
        filename,
        displayOrder,
        alt,
        role,
        heroEligible,
        homepageEligible,
        openGraphEligible,
        thumbnailUsage,
        provenance,
        ...(licensingNotes ? { licensingNotes } : {}),
        ...(internalNotes ? { internalNotes } : {}),
      });
    }
  }

  const primaryImages = images.filter((image) => image.role === 'PRIMARY');
  if (primaryImages.length !== 1) {
    errors.push('Exactly one PRIMARY image is required.');
  }

  if (!primaryImages.some((image) => image.filename.startsWith('01-primary.'))) {
    errors.push('The primary image must use the 01-primary filename.');
  }

  return images.sort((a, b) => a.displayOrder - b.displayOrder || a.filename.localeCompare(b.filename, undefined, { numeric: true }));
}

export function validateProductImportManifest(
  rawManifest: unknown,
  folderPath: string,
  mediaImages: ProductImportImage[] = [],
): ProductImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(rawManifest)) {
    return { folderPath, valid: false, errors: ['product.json must contain a JSON object.'], warnings };
  }

  const schemaVersion = rawManifest.schemaVersion;
  if (schemaVersion !== 1) {
    errors.push('schemaVersion must be 1.');
  }

  const name = readString(rawManifest, 'name');
  const derivedSlug = name ? slugifyProductName(name) : '';
  const slug = readString(rawManifest, 'slug') ?? derivedSlug;
  const suppliedSku = readString(rawManifest, 'sku');
  const sku = suppliedSku ?? deriveSku(slug);
  const game = parseEnum(readString(rawManifest, 'game'), ['POKEMON', 'MAGIC', 'ONE_PIECE', 'LORCANA', 'YUGIOH', 'ACCESSORIES'] as const);
  const category = readString(rawManifest, 'category');
  const priceMinor = readInteger(rawManifest, 'priceMinor');
  const vatRate = readInteger(rawManifest, 'vatRate');
  const stockQuantity = readInteger(rawManifest, 'stockQuantity');
  const rawLifecycle = readString(rawManifest, 'lifecycleState') ?? readString(rawManifest, 'status');
  const lifecycleState = normalizeLifecycleState(rawLifecycle);
  const featured = readBoolean(rawManifest, 'featured') ?? false;
  const visible = readBoolean(rawManifest, 'visible') ?? isPublishedLifecycleState(lifecycleState);
  const preorder = readBoolean(rawManifest, 'preorder');
  const shortDescription = readString(rawManifest, 'shortDescription');
  const fullDescription = readString(rawManifest, 'fullDescription') ?? shortDescription;

  if (!name) errors.push('name is required.');
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push('slug must use lowercase letters, numbers and hyphens.');
  if (!game) errors.push('game is not supported.');
  if (!category || !ALLOWED_CATEGORIES.has(category)) errors.push(`category must be one of: ${Array.from(ALLOWED_CATEGORIES).join(', ')}.`);
  if (priceMinor === undefined || priceMinor < 0) errors.push('priceMinor must be a non-negative integer minor-unit amount.');
  if (vatRate === undefined || vatRate < 0) errors.push('vatRate must be a non-negative integer.');
  if (stockQuantity === undefined || stockQuantity < 0) errors.push('stockQuantity must be a non-negative integer.');
  if (preorder === undefined) errors.push('preorder must be true or false.');
  if (!shortDescription) errors.push('shortDescription is required.');
  if (rawLifecycle && lifecycleState === 'DRAFT' && !['DRAFT', 'ACTIVE'].includes(rawLifecycle)) {
    errors.push(`lifecycleState/status must be one of: ${PRODUCT_LIFECYCLE_STATES.join(', ')}.`);
  }

  const purchaseLimitRaw = rawManifest.purchaseLimit;
  let purchaseLimit: ProductImportManifest['purchaseLimit'];
  if (purchaseLimitRaw !== undefined) {
    if (!isRecord(purchaseLimitRaw)) {
      errors.push('purchaseLimit must be an object.');
    } else {
      const quantity = readInteger(purchaseLimitRaw, 'quantity');
      const scope = parseEnum(readString(purchaseLimitRaw, 'scope'), ['ORDER', 'CUSTOMER', 'PERSON_OR_HOUSEHOLD'] as const);
      if (!quantity || quantity < 1) errors.push('purchaseLimit.quantity must be at least 1.');
      if (!scope) errors.push('purchaseLimit.scope is invalid.');
      if (quantity && scope) purchaseLimit = { quantity, scope };
    }
  }

  const shippingPromotionRaw = rawManifest.shippingPromotion;
  let shippingPromotion: ProductImportManifest['shippingPromotion'] = { type: 'NONE', productOnly: true };
  if (shippingPromotionRaw !== undefined) {
    if (!isRecord(shippingPromotionRaw)) {
      errors.push('shippingPromotion must be an object.');
    } else {
      const type = parseEnum(readString(shippingPromotionRaw, 'type'), ['NONE', 'FREE_STANDARD_UK'] as const);
      const productOnly = readBoolean(shippingPromotionRaw, 'productOnly');
      if (!type) errors.push('shippingPromotion.type is invalid.');
      if (productOnly === undefined) errors.push('shippingPromotion.productOnly must be true or false.');
      if (type === 'FREE_STANDARD_UK' && productOnly !== true) errors.push('FREE_STANDARD_UK shipping promotions must be productOnly.');
      if (type && productOnly !== undefined) shippingPromotion = { type, productOnly };
    }
  }

  const sourceRaw = rawManifest.source;
  let source: ProductImportManifest['source'] | undefined;
  if (!isRecord(sourceRaw)) {
    errors.push('source is required.');
  } else {
    const type = parseEnum(readString(sourceRaw, 'type'), ['OWNER_SUPPLIED', 'DISTRIBUTOR_MEDIA', 'MANUFACTURER_MEDIA', 'OWN_PHOTOGRAPHY'] as const);
    const reference = readString(sourceRaw, 'reference');
    if (!type) {
      errors.push('source.type is invalid.');
    } else {
      source = reference ? { type, reference } : { type };
    }
  }

  const contents = Array.isArray(rawManifest.contents)
    ? rawManifest.contents.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
  const seoRaw = isRecord(rawManifest.seo) ? rawManifest.seo : {};
  const seoTitle = readString(seoRaw, 'title') ?? `${name ?? 'Product'} | TCG Hobby`;
  const seoDescription = readString(seoRaw, 'description') ?? shortDescription ?? '';
  const homepagePriority = rawManifest.homepagePriority === null ? null : readInteger(rawManifest, 'homepagePriority') ?? null;
  const heroFeatured = readBoolean(rawManifest, 'heroFeatured') ?? false;
  const releaseDate = readString(rawManifest, 'releaseDate');
  const supplierSlug = readString(rawManifest, 'supplierSlug');
  const supplierCostMinor = readInteger(rawManifest, 'supplierCostMinor');
  const productType = readString(rawManifest, 'productType');
  const variationNotice = readString(rawManifest, 'variationNotice');
  const id = readString(rawManifest, 'id');
  const importId = readString(rawManifest, 'importId');
  const barcode = readString(rawManifest, 'barcode');

  if (!suppliedSku) {
    warnings.push(`SKU omitted. Import will use internal SKU ${sku}.`);
  }

  if (lifecycleState === 'PUBLISHED') {
    if (!supplierSlug) errors.push('PUBLISHED products require supplierSlug so catalogue rows can render safely.');
    if (!fullDescription) errors.push('PUBLISHED products require fullDescription.');
    if (shippingPromotion?.type === 'FREE_STANDARD_UK' && shippingPromotion.productOnly !== true) {
      errors.push('PUBLISHED free-shipping imports must be product-specific.');
    }
  }

  if (mediaImages.length === 0) {
    errors.push('media.json must define at least one product image.');
  }

  errors.push(...validateProductBusinessRules({
    featured,
    homepagePriority,
    heroFeatured,
    lifecycleState,
    visible,
    images: mediaImages,
  }));

  if (errors.length > 0 || !name || !game || !category || priceMinor === undefined || vatRate === undefined || stockQuantity === undefined || preorder === undefined || !shortDescription || !fullDescription || !source) {
    return { folderPath, valid: false, errors, warnings };
  }

  const input: NormalisedProductImportInput = {
    schemaVersion: 1,
    name,
    slug,
    sku,
    skuWasProvided: Boolean(suppliedSku),
    game,
    category,
    priceMinor,
    vatRate,
    stockQuantity,
    status: lifecycleState,
    lifecycleState,
    visible,
    featured,
    homepagePriority,
    heroFeatured,
    preorder,
    shippingPromotion,
    shortDescription,
    fullDescription,
    contents,
    seo: { title: seoTitle, description: seoDescription },
    images: mediaImages,
    source,
    ...(importId ? { importId } : {}),
    ...(id ? { id } : {}),
    ...(barcode ? { barcode } : {}),
    ...(productType ? { productType } : {}),
    ...(releaseDate ? { releaseDate } : {}),
    ...(supplierSlug ? { supplierSlug } : {}),
    ...(supplierCostMinor !== undefined ? { supplierCostMinor } : {}),
    ...(purchaseLimit ? { purchaseLimit } : {}),
    ...(variationNotice ? { variationNotice } : {}),
  };

  return {
    folderPath,
    valid: true,
    errors,
    warnings,
    input,
  };
}

export function validateProductBusinessRules(input: {
  featured: boolean;
  homepagePriority: number | null;
  heroFeatured: boolean;
  lifecycleState: ProductLifecycleState;
  visible: boolean;
  images: ProductImportImage[];
}): string[] {
  const errors: string[] = [];

  if (input.homepagePriority !== null && !input.featured) {
    errors.push('homepagePriority can only be set when featured is true.');
  }

  if (input.heroFeatured && !input.images.some((image) => image.heroEligible || image.role === 'HERO')) {
    errors.push('heroFeatured products require at least one hero-eligible media item.');
  }

  if (input.visible && !isPublishedLifecycleState(input.lifecycleState)) {
    errors.push('visible can only be true when lifecycleState is PUBLISHED.');
  }

  return errors;
}

export async function validateProductImportFolder(folderPath: string): Promise<ProductImportValidationResult> {
  const manifestPath = path.join(folderPath, 'product.json');
  const mediaManifestPath = path.join(folderPath, 'media.json');

  if (!existsSync(manifestPath)) {
    return { folderPath, valid: false, errors: ['product.json was not found.'], warnings: [] };
  }

  const rawManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
  const fallbackSource =
    isRecord(rawManifest) && isRecord(rawManifest.source)
      ? parseEnum(readString(rawManifest.source, 'type'), ['OWNER_SUPPLIED', 'DISTRIBUTOR_MEDIA', 'MANUFACTURER_MEDIA', 'OWN_PHOTOGRAPHY'] as const) ?? 'OWNER_SUPPLIED'
      : 'OWNER_SUPPLIED';
  const mediaValidation = existsSync(mediaManifestPath)
    ? validateProductMediaManifest(JSON.parse(await readFile(mediaManifestPath, 'utf8')) as unknown, folderPath, fallbackSource)
    : { valid: false, errors: ['media.json was not found.'], warnings: [], images: [] };
  const result = validateProductImportManifest(rawManifest, folderPath, mediaValidation.images);
  result.errors.push(...mediaValidation.errors);
  result.warnings.push(...mediaValidation.warnings);
  result.valid = result.errors.length === 0;

  if (existsSync(path.join(folderPath, 'images'))) {
    const files = await readdir(path.join(folderPath, 'images'));
    const unsupported = files.filter((file) => !SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
    if (unsupported.length > 0) {
      result.errors.push(`Unsupported files in images/: ${unsupported.join(', ')}.`);
      result.valid = false;
    }
  }

  return result;
}

async function checksumFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

function outputFilenameForImage(image: ProductImportImage, sortOrder: number): string {
  const extension = path.extname(image.filename).toLowerCase();

  if (image.role === 'PRIMARY') return `primary${extension}`;
  if (image.role === 'HERO') return `hero${extension}`;
  if (image.role === 'OPENGRAPH') return `opengraph${extension}`;

  return `gallery-${String(sortOrder).padStart(2, '0')}${extension}`;
}

function formatDatabaseLookupError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

async function findExistingProductForImport(
  input: NormalisedProductImportInput,
  db: PrismaClient | Prisma.TransactionClient,
): Promise<ExistingProductMatch> {
  const lookupStages: Array<{
    productMatch: Exclude<ProductImportMatch, 'new'>;
    value: string | undefined;
    where: (value: string) => Prisma.ProductWhereUniqueInput;
  }> = [
    { productMatch: 'importId', value: input.importId, where: (value) => ({ importId: value }) },
    { productMatch: 'id', value: input.id, where: (value) => ({ id: value }) },
    { productMatch: 'sku', value: input.skuWasProvided ? input.sku : undefined, where: (value) => ({ sku: value }) },
    { productMatch: 'slug', value: input.slug, where: (value) => ({ slug: value }) },
  ];

  for (const stage of lookupStages) {
    if (!stage.value) {
      continue;
    }

    const product = await db.product.findUnique({
      where: stage.where(stage.value),
      select: { id: true },
    });

    if (product) {
      return { productMatch: stage.productMatch, productId: product.id };
    }
  }

  return { productMatch: 'new', productId: undefined };
}

export async function createProductImportPlan(folderPath: string, db: PrismaClient | Prisma.TransactionClient = prisma): Promise<ProductImportPlan> {
  const validation = await validateProductImportFolder(folderPath);
  if (!validation.valid || !validation.input) {
    throw new Error(`Product import validation failed:\n${validation.errors.join('\n')}`);
  }

  const { input } = validation;
  let existingProduct: ExistingProductMatch;
  try {
    existingProduct = await findExistingProductForImport(input, db);
    await assertProductImportLookupData(db, input);
  } catch (error) {
    throw new Error(`Product import database lookup failed. Dry-run/import stopped before planning changes.\n${formatDatabaseLookupError(error)}`);
  }
  const outputRoot = path.join(PUBLIC_STOREFRONT_PRODUCTS_ROOT, gameFolderByImportGame[input.game], input.slug);
  const media: ProductImportMediaOutput[] = [];

  for (const [index, image] of input.images.entries()) {
    const sourcePath = path.join(folderPath, 'images', image.filename);
    const sortOrder = image.displayOrder || index + 1;
    const outputFilename = outputFilenameForImage(image, sortOrder);
    const outputPath = path.join(outputRoot, outputFilename);
    media.push({
      sourceFilename: image.filename,
      outputFilename,
      outputPath,
      publicUrl: `/products/${gameFolderByImportGame[input.game]}/${input.slug}/${outputFilename}`,
      alt: image.alt,
      role: image.role,
      sortOrder,
      isPrimary: image.role === 'PRIMARY',
      heroEligible: image.heroEligible,
      homepageEligible: image.homepageEligible,
      openGraphEligible: image.openGraphEligible,
      thumbnailUsage: image.thumbnailUsage,
      provenance: image.provenance,
      checksum: await checksumFile(sourcePath),
    });

    if (image.role === 'PRIMARY') {
      media.push({
        sourceFilename: image.filename,
        outputFilename: `primary-card${path.extname(image.filename).toLowerCase()}`,
        outputPath: path.join(outputRoot, `primary-card${path.extname(image.filename).toLowerCase()}`),
        publicUrl: `/products/${gameFolderByImportGame[input.game]}/${input.slug}/primary-card${path.extname(image.filename).toLowerCase()}`,
        alt: image.alt,
        role: 'GALLERY',
        sortOrder: 999,
        isPrimary: false,
        heroEligible: false,
        homepageEligible: true,
        openGraphEligible: false,
        thumbnailUsage: 'CARD',
        provenance: image.provenance,
        checksum: await checksumFile(sourcePath),
      });
    }
  }

  return {
    input,
    productMatch: existingProduct.productMatch,
    media,
    stages: PIPELINE_STAGES,
    warnings: validation.warnings,
    ...(existingProduct.productId ? { productId: existingProduct.productId } : {}),
  };
}

async function copyImportMedia(folderPath: string, plan: ProductImportPlan): Promise<void> {
  const outputRoot = path.dirname(plan.media[0]?.outputPath ?? '');
  await mkdir(outputRoot, { recursive: true });

  for (const media of plan.media) {
    const sourcePath = path.join(folderPath, 'images', media.sourceFilename);
    await copyFile(sourcePath, media.outputPath);
  }

  await writeFile(
    path.join(outputRoot, 'media-manifest.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: 'Assets were copied without cropping. Replace with authorised optimised media when required.',
        files: plan.media.map((media) => ({
          sourceFilename: media.sourceFilename,
          outputFilename: media.outputFilename,
          checksum: media.checksum,
          role: media.role,
          sortOrder: media.sortOrder,
          alt: media.alt,
          isPrimary: media.isPrimary,
          heroEligible: media.heroEligible,
          homepageEligible: media.homepageEligible,
          openGraphEligible: media.openGraphEligible,
          thumbnailUsage: media.thumbnailUsage,
          provenance: media.provenance,
        })),
      },
      null,
      2,
    ),
  );
}

type MerchandisingContentsFile = Record<
  string,
  {
    contents: string[];
    variationNotice?: string;
    source?: ProductImportManifest['source'];
  }
>;

async function updateProductMerchandisingContent(input: NormalisedProductImportInput): Promise<void> {
  await mkdir(path.dirname(PRODUCT_MERCHANDISING_CONTENT_PATH), { recursive: true });
  const current: MerchandisingContentsFile = existsSync(PRODUCT_MERCHANDISING_CONTENT_PATH)
    ? (JSON.parse(await readFile(PRODUCT_MERCHANDISING_CONTENT_PATH, 'utf8')) as MerchandisingContentsFile)
    : {};

  current[input.slug] = {
    contents: input.contents,
    ...(input.variationNotice ? { variationNotice: input.variationNotice } : {}),
    source: input.source,
  };

  await writeFile(PRODUCT_MERCHANDISING_CONTENT_PATH, `${JSON.stringify(current, null, 2)}\n`);
}

function toProductData(input: NormalisedProductImportInput, categoryId: string, warnings: string[]): Prisma.ProductUncheckedCreateInput {
  const releaseStatus = input.lifecycleState === 'ARCHIVED' ? 'ARCHIVED' : input.preorder ? 'PREORDER' : 'RELEASED';

  return {
    importId: input.importId ?? null,
    ...(input.id ? { id: input.id } : {}),
    sku: input.sku,
    slug: input.slug,
    name: input.name,
    game: input.game === 'POKEMON' ? 'Pokémon TCG' : input.game.replace(/_/g, ' '),
    setName: input.productType ?? null,
    description: input.shortDescription,
    longDescription: input.fullDescription,
    condition: 'SEALED',
    priceMinor: input.priceMinor,
    vatRate: input.vatRate,
    currency: 'GBP',
    featured: input.featured,
    homepagePriority: input.homepagePriority ?? null,
    heroFeatured: input.heroFeatured ?? false,
    freeUkStandardShipping: input.shippingPromotion.type === 'FREE_STANDARD_UK',
    shippingPromotionProductOnly: input.shippingPromotion.productOnly,
    lifecycleState: input.lifecycleState,
    published: input.visible && isPublishedLifecycleState(input.lifecycleState),
    archivedAt: input.lifecycleState === 'ARCHIVED' ? new Date() : null,
    searchText: [input.name, input.shortDescription, input.fullDescription, input.contents.join(' ')].join(' ').toLowerCase(),
    imageLabel: input.images.find((image) => image.role === 'PRIMARY')?.alt ?? input.name,
    releaseStatus,
    releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
    customerPurchaseLimit: input.purchaseLimit?.quantity ?? null,
    availabilityMessage: [
      input.shippingPromotion.type === 'FREE_STANDARD_UK' ? 'Free UK Standard Delivery.' : '',
      input.purchaseLimit ? `Limited to ${input.purchaseLimit.quantity} per ${input.purchaseLimit.scope.toLowerCase().replace(/_/g, ' ')}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
    categoryId,
    importSourceType: input.source.type,
    importSourceReference: input.source.reference ?? null,
    importedAt: new Date(),
    lastImportedAt: new Date(),
    importValidationWarnings: warnings.length > 0 ? warnings.join('\n') : null,
  };
}

function pickAuditSnapshot(product: {
  sku: string;
  slug: string;
  name: string;
  priceMinor: number;
  vatRate: number;
  featured: boolean;
  homepagePriority: number | null;
  heroFeatured: boolean;
  freeUkStandardShipping: boolean;
  shippingPromotionProductOnly: boolean;
  lifecycleState: string;
  published: boolean;
  customerPurchaseLimit: number | null;
  categoryId: string;
  importId: string | null;
}): Record<string, string | number | boolean | null> {
  return {
    importId: product.importId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    priceMinor: product.priceMinor,
    vatRate: product.vatRate,
    featured: product.featured,
    homepagePriority: product.homepagePriority,
    heroFeatured: product.heroFeatured,
    freeUkStandardShipping: product.freeUkStandardShipping,
    shippingPromotionProductOnly: product.shippingPromotionProductOnly,
    lifecycleState: product.lifecycleState,
    published: product.published,
    customerPurchaseLimit: product.customerPurchaseLimit,
    categoryId: product.categoryId,
  };
}

function changedFieldsBetween(
  previous: Record<string, string | number | boolean | null> | null,
  next: Record<string, string | number | boolean | null>,
): string[] {
  if (!previous) {
    return Object.keys(next).sort();
  }

  return Object.keys(next)
    .filter((key) => previous[key] !== next[key])
    .sort();
}

export async function importProductFromFolder(
  folderPath: string,
  options: { dryRun?: boolean } = {},
  db: PrismaClient = prisma,
): Promise<ProductImportResult> {
  const plan = await createProductImportPlan(folderPath, db);

  if (options.dryRun) {
    return {
      ...plan,
      changed: false,
      productId: plan.productId ?? '(new product)',
      productSlug: plan.input.slug,
      status: plan.input.status,
      changes: [
        plan.productMatch === 'new' ? 'Would create product.' : `Would update product matched by ${plan.productMatch}.`,
        `Would copy ${plan.media.length} media file(s).`,
      ],
    };
  }

  const result = await db.$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { slug: plan.input.category } });
    if (!category) {
      throw new Error(`Category ${plan.input.category} does not exist.`);
    }

    const supplier = plan.input.supplierSlug ? await tx.supplier.findUnique({ where: { slug: plan.input.supplierSlug } }) : null;
    if (plan.input.lifecycleState === 'PUBLISHED' && !supplier) {
      throw new Error(`PUBLISHED product requires an existing supplierSlug (${plan.input.supplierSlug ?? 'missing'}).`);
    }

    const data = toProductData(plan.input, category.id, plan.warnings);
    const previousProduct = plan.productId
      ? await tx.product.findUnique({
          where: { id: plan.productId },
          select: {
            importId: true,
            sku: true,
            slug: true,
            name: true,
            priceMinor: true,
            vatRate: true,
            featured: true,
            homepagePriority: true,
            heroFeatured: true,
            freeUkStandardShipping: true,
            shippingPromotionProductOnly: true,
            lifecycleState: true,
            published: true,
            customerPurchaseLimit: true,
            categoryId: true,
          },
        })
      : null;
    const previousSnapshot = previousProduct ? pickAuditSnapshot(previousProduct) : null;
    const product = plan.productId
      ? await tx.product.update({ where: { id: plan.productId }, data })
      : await tx.product.create({ data });

    await tx.inventoryItem.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        stockOnHand: plan.input.stockQuantity,
        reservedStock: 0,
        reorderPoint: 0,
        locationCode: 'MAIN',
      },
      update: {
        stockOnHand: plan.input.stockQuantity,
      },
    });

    if (supplier) {
      const existingSupplierProduct = await tx.supplierProduct.findFirst({
        where: { productId: product.id, supplierId: supplier.id },
      });

      if (existingSupplierProduct) {
        await tx.supplierProduct.update({
          where: { id: existingSupplierProduct.id },
          data: {
            supplierSku: plan.input.sku,
            costMinor: plan.input.supplierCostMinor ?? existingSupplierProduct.costMinor,
            currency: 'GBP',
          },
        });
      } else {
        await tx.supplierProduct.create({
          data: {
            productId: product.id,
            supplierId: supplier.id,
            supplierSku: plan.input.sku,
            costMinor: plan.input.supplierCostMinor ?? 0,
            currency: 'GBP',
            leadTimeDays: 5,
          },
        });
      }
    }

    await tx.productImage.updateMany({ where: { productId: product.id }, data: { isPrimary: false } });

    for (const media of plan.media.filter((item) => item.outputFilename !== 'primary-card.webp' && !item.outputFilename.startsWith('primary-card.'))) {
      const existingImage = await tx.productImage.findFirst({
        where: { productId: product.id, url: media.publicUrl },
      });

      if (existingImage) {
        await tx.productImage.update({
          where: { id: existingImage.id },
          data: {
            altText: media.alt,
            imageType: media.role.toLowerCase(),
            sortOrder: media.sortOrder,
            isPrimary: media.isPrimary,
          },
        });
      } else {
        await tx.productImage.create({
          data: {
            productId: product.id,
            url: media.publicUrl,
            altText: media.alt,
            imageType: media.role.toLowerCase(),
            sortOrder: media.sortOrder,
            isPrimary: media.isPrimary,
          },
        });
      }
    }

    const nextSnapshot = pickAuditSnapshot(product);
    const changedFields = changedFieldsBetween(previousSnapshot, nextSnapshot);
    const audit = await tx.productImportAudit.create({
      data: {
        productId: product.id,
        importId: plan.input.importId ?? product.importId,
        sourceType: plan.input.source.type,
        sourceReference: plan.input.source.reference ?? null,
        lifecycleState: plan.input.lifecycleState,
        changedFields,
        previousValues: previousSnapshot ?? Prisma.JsonNull,
        nextValues: nextSnapshot,
        warnings: plan.warnings.length > 0 ? plan.warnings.join('\n') : null,
        performedBy: process.env.USERNAME ?? process.env.USER ?? 'product-import-cli',
      },
    });

    return { product, audit };
  });

  await copyImportMedia(folderPath, plan);
  await updateProductMerchandisingContent(plan.input);

  return {
    ...plan,
    changed: true,
    productId: result.product.id,
    productSlug: result.product.slug,
    status: plan.input.status,
    auditId: result.audit.id,
    changes: [
      plan.productMatch === 'new' ? 'Created product.' : `Updated product matched by ${plan.productMatch}.`,
      `Copied ${plan.media.length} media file(s).`,
      `Public stock state: ${derivePublicStockState(plan.input.stockQuantity)}.`,
    ],
  };
}

export async function discoverProductImportFolders(rootPath: string): Promise<string[]> {
  if (!existsSync(rootPath)) {
    return [];
  }

  const folders: string[] = [];
  const gameEntries = await readdir(rootPath);

  for (const gameEntry of gameEntries) {
    const gamePath = path.join(rootPath, gameEntry);
    if (!(await stat(gamePath)).isDirectory() || gameEntry === 'examples') {
      continue;
    }

    for (const productEntry of await readdir(gamePath)) {
      const productPath = path.join(gamePath, productEntry);
      if ((await stat(productPath)).isDirectory() && existsSync(path.join(productPath, 'product.json'))) {
        folders.push(productPath);
      }
    }
  }

  return folders.sort();
}
