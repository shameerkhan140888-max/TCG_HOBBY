import type { IronSprueProduct } from './catalogue';

export type CataloguePipelineStage =
  | 'IMPORT_PENDING'
  | 'IDENTITY_PENDING'
  | 'IDENTITY_CONFIRMED'
  | 'RESEARCH_PENDING'
  | 'RESEARCH_COMPLETE'
  | 'SOURCE_MEDIA_PENDING'
  | 'SOURCE_MEDIA_COMPLETE'
  | 'CONTENT_GENERATION_PENDING'
  | 'CONTENT_GENERATED'
  | 'CATALOGUE_MEDIA_PENDING'
  | 'CATALOGUE_MEDIA_GENERATED'
  | 'MEDIA_VALIDATION_PENDING'
  | 'REVIEW_REQUIRED'
  | 'READY'
  | 'APPROVED'
  | 'PUBLISHED';

export type CataloguePipelineProviderKind =
  | 'source-discovery'
  | 'research'
  | 'content-generation'
  | 'source-media'
  | 'background-removal'
  | 'catalogue-image'
  | 'catalogue-image-processor'
  | 'derivative-processor'
  | 'description-composer'
  | 'creative-image'
  | 'optional-creative-media'
  | 'media-validation'
  | 'brand-asset';

export type CataloguePipelineStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED' | 'REVIEW_REQUIRED';

export type CataloguePipelineErrorCode =
  | 'MISSING_CONFIGURATION'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'LOW_CONFIDENCE'
  | 'SOURCE_UNAVAILABLE'
  | 'UNSAFE_URL'
  | 'MEDIA_VALIDATION_FAILED'
  | 'PROVIDER_UNAVAILABLE';

export type CataloguePipelineError = {
  code: CataloguePipelineErrorCode;
  message: string;
  retryable: boolean;
  detail?: Record<string, unknown>;
};

export type CataloguePipelineUsage = {
  unit: 'request' | 'token' | 'image' | 'byte';
  quantity: number;
  estimatedCostMinor?: number;
  currency?: 'GBP' | 'USD';
};

export type CatalogueProviderCostModel = 'ZERO_MARGINAL_COST' | 'OPTIONAL_PAID' | 'UNKNOWN';

export type CatalogueProviderMetadata = {
  provider: string;
  version: string;
  model?: string;
  durationMs?: number;
  usage?: CataloguePipelineUsage[];
  costModel?: CatalogueProviderCostModel;
};

export type CatalogueProviderResult<T> =
  | { ok: true; value: T; metadata: CatalogueProviderMetadata; warnings?: string[] }
  | { ok: false; error: CataloguePipelineError; metadata: CatalogueProviderMetadata };

export type CatalogueRetryPolicy = {
  maxAttempts: number;
  timeoutMs: number;
  retryableCodes: readonly CataloguePipelineErrorCode[];
};

export type CataloguePipelineContext = {
  batchId: string;
  product: IronSprueProduct;
  attempt: number;
  dryRun: boolean;
  manualOverride?: boolean;
  retryPolicy: CatalogueRetryPolicy;
};

export type SourceProvenance = {
  sourceId: string;
  url: string;
  sourceType: 'official-manufacturer' | 'manufacturer-catalogue' | 'authorised-distributor' | 'authorised-supplier' | 'packaging';
  retrievedAt?: string;
  permissionBasis: string;
  confidence: number;
};

export type ProductIdentityResolution = {
  canonicalBrand: string;
  manufacturer: string;
  manufacturerReference?: string;
  supplierSku?: string;
  canonicalTitle: string;
  productType: string;
  scale?: string;
  gtin?: string;
  confidence: number;
  reviewRequired: boolean;
  provenance: SourceProvenance[];
};

export type ProductResearchFact = {
  id: string;
  label: string;
  value: string | number | boolean | string[];
  confidence: number;
  provenance: SourceProvenance[];
};

export type ProductResearchResult = {
  identity: ProductIdentityResolution;
  facts: ProductResearchFact[];
  officialManufacturerUrl?: string;
  supplierUrl?: string;
  officialMediaUrls: string[];
  officialLogoUrl?: string;
  reviewRequired: boolean;
};

export type GeneratedProductContent = {
  customerTitle: string;
  shortDescription: string;
  fullDescription: string;
  features: string[];
  specifications: Record<string, string | number | boolean>;
  seoTitle: string;
  metaDescription: string;
  searchKeywords: string[];
  altText: string;
  inputFactIds: string[];
  confidence: number;
  reviewRequired: boolean;
};

export type TemplateProductContent = GeneratedProductContent & {
  compositionMode: 'DETERMINISTIC_TEMPLATE';
};

export type SourceMediaAsset = {
  sourceUrl: string;
  source: SourceProvenance;
  checksum: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  r2Key: string;
};

export type GeneratedMediaAsset = {
  role: 'catalogue-primary' | 'completed-result' | 'workshop' | 'supporting' | 'hero' | 'brand-logo';
  sourceChecksum?: string;
  r2Key: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  transformedFromSource: boolean;
  providerInstructions: string;
  approvalState: 'PENDING' | 'APPROVED' | 'REVIEW_REQUIRED' | 'FAILED';
};

export type LocalCatalogueImagePlan = {
  processor: 'local-deterministic';
  imageRole: 'catalogue-primary';
  sourceR2Key: string;
  outputMasterR2Key: string;
  canvas: { width: number; height: number; background: '#ffffff' | '#fbfaf5' };
  treatment: {
    crop: 'detect-non-background-bounds' | 'manual-review-required';
    background: 'preserve-packaging-on-white' | 'remove-background-where-safe' | 'normalise-white-background';
    marginPercent: number;
    contactShadow: 'none' | 'subtle';
  };
  requiresPaidAi: false;
  reviewRequired: boolean;
  reason: string;
};

export type TechnicalDerivativePlan = {
  sourceMasterR2Key: string;
  derivatives: Array<{
    label: 'desktop' | 'tablet' | 'mobile' | 'thumbnail' | 'webp' | 'avif' | 'fallback';
    width: number;
    format: 'webp' | 'avif' | 'jpg' | 'png';
    r2Key: string;
  }>;
  requiresPaidAi: false;
};

export type MediaValidationResult = {
  status: 'PASS' | 'REVIEW_REQUIRED' | 'FAIL';
  checks: Array<{ key: string; passed: boolean; detail: string }>;
  materiallyDiffersFromSource: boolean;
};

export type BrandAssetResult = {
  brand: string;
  logoUrl: string;
  r2Key: string;
  source: SourceProvenance;
  approvalState: 'PENDING' | 'APPROVED' | 'REVIEW_REQUIRED';
};

export interface CataloguePipelineProvider<TInput, TOutput> {
  kind: CataloguePipelineProviderKind;
  name: string;
  version: string;
  retryPolicy: CatalogueRetryPolicy;
  run(input: TInput, context: CataloguePipelineContext): Promise<CatalogueProviderResult<TOutput>>;
}

export type ProductSourceDiscoveryProvider = CataloguePipelineProvider<
  { product: IronSprueProduct; knownUrls: SourceProvenance[] },
  ProductIdentityResolution
>;
export type ProductResearchProvider = CataloguePipelineProvider<ProductIdentityResolution, ProductResearchResult>;
export type ProductContentGenerationProvider = CataloguePipelineProvider<ProductResearchResult, GeneratedProductContent>;
export type DescriptionComposerProvider = CataloguePipelineProvider<ProductResearchResult, TemplateProductContent>;
export type SourceMediaProvider = CataloguePipelineProvider<ProductResearchResult, SourceMediaAsset[]>;
export type BackgroundRemovalProvider = CataloguePipelineProvider<SourceMediaAsset, GeneratedMediaAsset>;
export type CatalogueImageProvider = CataloguePipelineProvider<
  { product: IronSprueProduct; original: SourceMediaAsset; backgroundRemoved?: GeneratedMediaAsset },
  GeneratedMediaAsset
>;
export type CatalogueImageProcessorProvider = CataloguePipelineProvider<
  { product: IronSprueProduct; original: SourceMediaAsset },
  LocalCatalogueImagePlan
>;
export type DerivativeProcessorProvider = CataloguePipelineProvider<
  { product: IronSprueProduct; master: GeneratedMediaAsset | LocalCatalogueImagePlan },
  TechnicalDerivativePlan
>;
export type CreativeImageProvider = CataloguePipelineProvider<
  { product: IronSprueProduct; original: SourceMediaAsset; recipe: 'completed-result' | 'workshop' | 'supporting' | 'hero' },
  GeneratedMediaAsset
>;
export type OptionalCreativeMediaProvider = CataloguePipelineProvider<
  { product: IronSprueProduct; original: SourceMediaAsset; recipe: 'completed-result' | 'workshop' | 'supporting' | 'hero'; approvedException: boolean },
  GeneratedMediaAsset
>;
export type MediaValidationProvider = CataloguePipelineProvider<
  { product: IronSprueProduct; original?: SourceMediaAsset; candidate: GeneratedMediaAsset },
  MediaValidationResult
>;
export type BrandAssetProvider = CataloguePipelineProvider<{ brand: string; knownUrls: SourceProvenance[] }, BrandAssetResult>;

export type CataloguePipelineProviders = {
  sourceDiscovery: ProductSourceDiscoveryProvider;
  research: ProductResearchProvider;
  contentGeneration: ProductContentGenerationProvider;
  sourceMedia: SourceMediaProvider;
  descriptionComposer: DescriptionComposerProvider;
  backgroundRemoval: BackgroundRemovalProvider;
  catalogueImage: CatalogueImageProvider;
  catalogueImageProcessor: CatalogueImageProcessorProvider;
  derivativeProcessor: DerivativeProcessorProvider;
  creativeImage: CreativeImageProvider;
  optionalCreativeMedia: OptionalCreativeMediaProvider;
  mediaValidation: MediaValidationProvider;
  brandAsset: BrandAssetProvider;
};

export type CataloguePipelineSnapshot = {
  productSku: string;
  stage: CataloguePipelineStage;
  status: CataloguePipelineStatus;
  completedStages: CataloguePipelineStage[];
  failedStage?: CataloguePipelineStage;
  error?: CataloguePipelineError;
  identity?: ProductIdentityResolution;
  research?: ProductResearchResult;
  generatedContent?: GeneratedProductContent;
  originals?: SourceMediaAsset[];
  generatedMedia?: GeneratedMediaAsset[];
  validation?: MediaValidationResult;
};

export type CataloguePipelineAuditEvent = {
  batchId: string;
  productSku: string;
  stage: CataloguePipelineStage;
  provider?: string;
  attempt: number;
  status: CataloguePipelineStatus;
  durationMs: number;
  inputReferences: string[];
  outputReferences: string[];
  errorCode?: CataloguePipelineErrorCode;
  retryable: boolean;
  usage?: CataloguePipelineUsage[];
  createdAt: string;
};

export const DEFAULT_CATALOGUE_RETRY_POLICY: CatalogueRetryPolicy = {
  maxAttempts: 2,
  timeoutMs: 30_000,
  retryableCodes: ['TIMEOUT', 'RATE_LIMITED', 'PROVIDER_UNAVAILABLE'],
};

export const CATALOGUE_PIPELINE_ORDER: readonly CataloguePipelineStage[] = [
  'IMPORT_PENDING',
  'IDENTITY_PENDING',
  'IDENTITY_CONFIRMED',
  'RESEARCH_PENDING',
  'RESEARCH_COMPLETE',
  'SOURCE_MEDIA_PENDING',
  'SOURCE_MEDIA_COMPLETE',
  'CONTENT_GENERATION_PENDING',
  'CONTENT_GENERATED',
  'CATALOGUE_MEDIA_PENDING',
  'CATALOGUE_MEDIA_GENERATED',
  'MEDIA_VALIDATION_PENDING',
  'REVIEW_REQUIRED',
  'READY',
  'APPROVED',
  'PUBLISHED',
];

export function nextCataloguePipelineStage(snapshot: CataloguePipelineSnapshot): CataloguePipelineStage {
  if (snapshot.error && !snapshot.error.retryable) return 'REVIEW_REQUIRED';
  const index = CATALOGUE_PIPELINE_ORDER.indexOf(snapshot.stage);
  if (index < 0 || index === CATALOGUE_PIPELINE_ORDER.length - 1) return snapshot.stage;
  return CATALOGUE_PIPELINE_ORDER[index + 1]!;
}

export function sourceProvenanceFromProduct(product: IronSprueProduct): SourceProvenance[] {
  const links = product.sourceMediaLinks ?? [];
  return links
    .filter((link) => link.url.startsWith('https://'))
    .map((link, index) => ({
      sourceId: `${product.sku}:source:${index + 1}`,
      url: link.url,
      sourceType: link.sourceType.includes('manufacturer') ? 'official-manufacturer' : 'authorised-distributor',
      permissionBasis: link.permissionBasis,
      confidence: 70,
    }));
}

export function createInitialCataloguePipelineSnapshot(product: IronSprueProduct): CataloguePipelineSnapshot {
  const hasIdentity = Boolean(product.brand && product.sku && product.name);
  const identity = hasIdentity
    ? {
        canonicalBrand: product.brand,
        manufacturer: product.brand,
        ...(product.manufacturerReference ? { manufacturerReference: product.manufacturerReference } : {}),
        ...(product.supplierSku ? { supplierSku: product.supplierSku } : {}),
        canonicalTitle: product.name,
        productType: product.productType,
        ...(product.scale ? { scale: product.scale } : {}),
        confidence: product.validationWarnings?.length ? 65 : 85,
        reviewRequired: Boolean(product.validationWarnings?.length),
        provenance: sourceProvenanceFromProduct(product),
      }
    : undefined;
  return {
    productSku: product.sku,
    stage: hasIdentity ? 'IDENTITY_CONFIRMED' : 'IDENTITY_PENDING',
    status: 'PENDING',
    completedStages: hasIdentity ? ['IMPORT_PENDING', 'IDENTITY_PENDING', 'IDENTITY_CONFIRMED'] : ['IMPORT_PENDING'],
    ...(identity ? { identity } : {}),
  };
}

export type MediaAssetClassification =
  | 'VALID_ORIGINAL'
  | 'VALID_TECHNICAL_DERIVATIVE'
  | 'TRUE_CATALOGUE_PRIMARY'
  | 'VALID_COMPLETED_REFERENCE'
  | 'VALID_WORKSHOP_OR_LIFESTYLE'
  | 'OPTIONAL_HERO'
  | 'PLACEHOLDER'
  | 'REUSED_HERO_PLACEHOLDER'
  | 'MISCLASSIFIED'
  | 'ORPHANED'
  | 'DUPLICATE';

export type MediaAssetForClassification = {
  role: string;
  storageKey?: string | null;
  approvalState?: string | null;
  isPrimary?: boolean | null;
  lastError?: string | null;
};

export function classifyIronSprueMediaAsset(asset: MediaAssetForClassification): MediaAssetClassification {
  const key = asset.storageKey ?? '';
  if (asset.role === 'workshop-photography' && /hero|campaign|placeholder/i.test(key)) return 'REUSED_HERO_PLACEHOLDER';
  if (key.endsWith('.json') || /placeholder|source-required/i.test(key) || /placeholder|required/i.test(asset.lastError ?? '')) return 'PLACEHOLDER';
  if (asset.role === 'manufacturer-original' && key.startsWith('archive/products/')) return 'VALID_ORIGINAL';
  if (asset.role === 'catalogue-derivative') return 'VALID_TECHNICAL_DERIVATIVE';
  if (asset.role === 'catalogue-primary' && /image-2|catalogue-white|generated/i.test(key)) {
    return asset.approvalState === 'APPROVED' && asset.isPrimary ? 'TRUE_CATALOGUE_PRIMARY' : 'VALID_TECHNICAL_DERIVATIVE';
  }
  if (asset.role === 'completed-result' && !key.endsWith('.json')) return 'VALID_COMPLETED_REFERENCE';
  if (asset.role === 'workshop-photography' && !key.endsWith('.json')) return 'VALID_WORKSHOP_OR_LIFESTYLE';
  if (asset.role === 'hero-artwork' && !key.endsWith('.json')) return 'OPTIONAL_HERO';
  return 'MISCLASSIFIED';
}

export type SourceUrlValidationResult = { ok: true; url: URL } | { ok: false; error: CataloguePipelineError };

export function validateCatalogueSourceUrl(rawUrl: string): SourceUrlValidationResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: { code: 'UNSAFE_URL', message: 'Source URL is not a valid absolute URL.', retryable: false } };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, error: { code: 'UNSAFE_URL', message: 'Source URL must use HTTPS.', retryable: false } };
  }
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') {
    return { ok: false, error: { code: 'UNSAFE_URL', message: 'Localhost source URLs are not allowed.', retryable: false } };
  }
  if (/^(10|127|169\.254|192\.168)\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
    return { ok: false, error: { code: 'UNSAFE_URL', message: 'Private or link-local source URLs are not allowed.', retryable: false } };
  }
  return { ok: true, url };
}

export function assertGeneratedContentUsesOnlyFacts(content: GeneratedProductContent, facts: ProductResearchFact[]) {
  const factIds = new Set(facts.map((fact) => fact.id));
  const missing = content.inputFactIds.filter((id) => !factIds.has(id));
  if (missing.length > 0) {
    throw new Error(`Generated content referenced unknown fact IDs: ${missing.join(', ')}`);
  }
}

export function canApproveCataloguePrimary(validation: MediaValidationResult, manualOverride = false) {
  if (validation.status === 'PASS') return true;
  return validation.status === 'REVIEW_REQUIRED' && manualOverride;
}

export function composeDeterministicProductContent(research: ProductResearchResult): TemplateProductContent {
  const identity = research.identity;
  const factIds = research.facts.map((fact) => fact.id);
  const category = identity.productType.toLowerCase();
  const isTool = /tool|knife|brush|file|clamp|tweezer/.test(category);
  const isAdhesive = /adhesive|glue|cement|consumable/.test(category);
  const isPuzzle = /puzzle|display|wooden|landmark/.test(category);
  const useCase = isAdhesive
    ? 'for supported modelling and finishing applications'
    : isTool
      ? 'for precise bench work'
      : isPuzzle
        ? 'for a display-ready build'
        : 'for a focused model-building project';

  return {
    compositionMode: 'DETERMINISTIC_TEMPLATE',
    customerTitle: identity.canonicalTitle,
    shortDescription: `${identity.canonicalBrand} ${identity.productType} ${useCase}.`,
    fullDescription: `${identity.canonicalTitle} is part of the Iron Sprue launch range. This page uses verified supplier or manufacturer facts only and remains ready for Admin review before publication.`,
    features: [`${identity.canonicalBrand} launch item`, identity.productType, ...(identity.scale ? [`Scale: ${identity.scale}`] : [])],
    specifications: Object.fromEntries(research.facts.map((fact) => [fact.label, String(fact.value)])),
    seoTitle: `${identity.canonicalTitle} | Iron Sprue`,
    metaDescription: `${identity.canonicalTitle} from ${identity.canonicalBrand}, prepared for the Iron Sprue catalogue from verified product data.`,
    searchKeywords: [identity.canonicalBrand, identity.productType, identity.manufacturerReference ?? '', identity.supplierSku ?? ''].filter(Boolean),
    altText: `${identity.canonicalTitle} product image`,
    inputFactIds: factIds,
    confidence: research.facts.length ? Math.min(...research.facts.map((fact) => fact.confidence)) : identity.confidence,
    reviewRequired: research.reviewRequired,
  };
}

export function createLocalCatalogueImagePlan(product: IronSprueProduct, original: SourceMediaAsset): LocalCatalogueImagePlan {
  const isRetailPackaging = /adhesive|glue|tool|paint|consumable/i.test(product.productType);
  const outputSku = product.sku.toLowerCase();
  return {
    processor: 'local-deterministic',
    imageRole: 'catalogue-primary',
    sourceR2Key: original.r2Key,
    outputMasterR2Key: `processed/products/${outputSku}/image-2/catalogue-primary-master.webp`,
    canvas: { width: 1600, height: 1600, background: '#ffffff' },
    treatment: {
      crop: original.width >= 500 && original.height >= 500 ? 'detect-non-background-bounds' : 'manual-review-required',
      background: isRetailPackaging ? 'preserve-packaging-on-white' : 'remove-background-where-safe',
      marginPercent: 8,
      contactShadow: 'subtle',
    },
    requiresPaidAi: false,
    reviewRequired: original.width < 500 || original.height < 500,
    reason: 'Routine Image 2 is produced with local deterministic crop/canvas/background treatment. Paid AI is not required.',
  };
}

export function createTechnicalDerivativePlan(product: IronSprueProduct, masterR2Key: string): TechnicalDerivativePlan {
  const base = `processed/products/${product.sku.toLowerCase()}/image-2`;
  return {
    sourceMasterR2Key: masterR2Key,
    requiresPaidAi: false,
    derivatives: [
      { label: 'desktop', width: 1280, format: 'webp', r2Key: `${base}/desktop.webp` },
      { label: 'tablet', width: 960, format: 'webp', r2Key: `${base}/tablet.webp` },
      { label: 'mobile', width: 640, format: 'webp', r2Key: `${base}/mobile.webp` },
      { label: 'thumbnail', width: 320, format: 'webp', r2Key: `${base}/thumbnail.webp` },
      { label: 'webp', width: 1600, format: 'webp', r2Key: `${base}/catalogue-primary.webp` },
      { label: 'avif', width: 1600, format: 'avif', r2Key: `${base}/catalogue-primary.avif` },
      { label: 'fallback', width: 1600, format: 'jpg', r2Key: `${base}/catalogue-primary.jpg` },
    ],
  };
}

function providerUnavailable<TOutput>(kind: CataloguePipelineProviderKind, name: string): CatalogueProviderResult<TOutput> {
  return {
    ok: false,
    error: {
      code: 'MISSING_CONFIGURATION',
      message: `${name} is not configured. Use a production provider or explicit manual override.`,
      retryable: false,
    },
    metadata: { provider: name, version: 'mock-0', costModel: 'UNKNOWN' },
  };
}

export function createUnavailableProvider<TInput, TOutput>(
  kind: CataloguePipelineProviderKind,
  name: string,
): CataloguePipelineProvider<TInput, TOutput> {
  return {
    kind,
    name,
    version: 'mock-0',
    retryPolicy: DEFAULT_CATALOGUE_RETRY_POLICY,
    async run() {
      return providerUnavailable<TOutput>(kind, name);
    },
  };
}

export function createMockCataloguePipelineProviders(): CataloguePipelineProviders {
  return {
    sourceDiscovery: {
      kind: 'source-discovery',
      name: 'mock-source-discovery',
      version: '1.0',
      retryPolicy: DEFAULT_CATALOGUE_RETRY_POLICY,
      async run(input, context) {
        const product = context.product;
        const provenance = input.knownUrls.length ? input.knownUrls : sourceProvenanceFromProduct(product);
        return {
          ok: true,
          value: {
            canonicalBrand: product.brand,
            manufacturer: product.brand,
            ...(product.manufacturerReference ? { manufacturerReference: product.manufacturerReference } : {}),
            ...(product.supplierSku ? { supplierSku: product.supplierSku } : {}),
            canonicalTitle: product.name,
            productType: product.productType,
            ...(product.scale ? { scale: product.scale } : {}),
            confidence: provenance.length ? 85 : 55,
            reviewRequired: provenance.length === 0 || Boolean(product.validationWarnings?.length),
            provenance,
          },
          metadata: {
            provider: 'mock-source-discovery',
            version: '1.0',
            durationMs: 1,
            usage: [{ unit: 'request', quantity: 1, estimatedCostMinor: 0, currency: 'GBP' }],
            costModel: 'ZERO_MARGINAL_COST',
          },
        };
      },
    },
    research: {
      kind: 'research',
      name: 'mock-research',
      version: '1.0',
      retryPolicy: DEFAULT_CATALOGUE_RETRY_POLICY,
      async run(identity) {
        const source = identity.provenance[0];
        const facts: ProductResearchFact[] = [
          { id: 'brand', label: 'Brand', value: identity.canonicalBrand, confidence: identity.confidence, provenance: identity.provenance },
          { id: 'title', label: 'Title', value: identity.canonicalTitle, confidence: identity.confidence, provenance: identity.provenance },
          { id: 'productType', label: 'Product type', value: identity.productType, confidence: identity.confidence, provenance: identity.provenance },
        ];
        return {
          ok: true,
          value: {
            identity,
            facts,
            ...(source ? { supplierUrl: source.url } : {}),
            officialMediaUrls: source ? [source.url] : [],
            reviewRequired: identity.reviewRequired,
          },
          metadata: {
            provider: 'mock-research',
            version: '1.0',
            durationMs: 1,
            usage: [{ unit: 'request', quantity: 1, estimatedCostMinor: 0, currency: 'GBP' }],
            costModel: 'ZERO_MARGINAL_COST',
          },
        };
      },
    },
    contentGeneration: {
      kind: 'content-generation',
      name: 'mock-content-generation',
      version: '1.0',
      retryPolicy: DEFAULT_CATALOGUE_RETRY_POLICY,
      async run(research) {
        const content = composeDeterministicProductContent(research);
        return {
          ok: true,
          value: content,
          metadata: {
            provider: 'mock-content-generation',
            version: '1.0',
            durationMs: 1,
            usage: [{ unit: 'request', quantity: 1, estimatedCostMinor: 0, currency: 'GBP' }],
            costModel: 'ZERO_MARGINAL_COST',
          },
        };
      },
    },
    descriptionComposer: {
      kind: 'description-composer',
      name: 'deterministic-description-composer',
      version: '1.0',
      retryPolicy: DEFAULT_CATALOGUE_RETRY_POLICY,
      async run(research) {
        return {
          ok: true,
          value: composeDeterministicProductContent(research),
          metadata: {
            provider: 'deterministic-description-composer',
            version: '1.0',
            durationMs: 1,
            usage: [{ unit: 'request', quantity: 1, estimatedCostMinor: 0, currency: 'GBP' }],
            costModel: 'ZERO_MARGINAL_COST',
          },
        };
      },
    },
    sourceMedia: createUnavailableProvider('source-media', 'source-media-provider'),
    backgroundRemoval: createUnavailableProvider('background-removal', 'background-removal-provider'),
    catalogueImage: createUnavailableProvider('catalogue-image', 'catalogue-image-provider'),
    catalogueImageProcessor: {
      kind: 'catalogue-image-processor',
      name: 'local-catalogue-image-processor',
      version: '1.0',
      retryPolicy: DEFAULT_CATALOGUE_RETRY_POLICY,
      async run(input) {
        return {
          ok: true,
          value: createLocalCatalogueImagePlan(input.product, input.original),
          metadata: {
            provider: 'local-catalogue-image-processor',
            version: '1.0',
            durationMs: 1,
            usage: [{ unit: 'image', quantity: 1, estimatedCostMinor: 0, currency: 'GBP' }],
            costModel: 'ZERO_MARGINAL_COST',
          },
        };
      },
    },
    derivativeProcessor: {
      kind: 'derivative-processor',
      name: 'local-derivative-processor',
      version: '1.0',
      retryPolicy: DEFAULT_CATALOGUE_RETRY_POLICY,
      async run(input) {
        const masterKey = 'r2Key' in input.master ? input.master.r2Key : input.master.outputMasterR2Key;
        return {
          ok: true,
          value: createTechnicalDerivativePlan(input.product, masterKey),
          metadata: {
            provider: 'local-derivative-processor',
            version: '1.0',
            durationMs: 1,
            usage: [{ unit: 'image', quantity: 7, estimatedCostMinor: 0, currency: 'GBP' }],
            costModel: 'ZERO_MARGINAL_COST',
          },
        };
      },
    },
    creativeImage: createUnavailableProvider('creative-image', 'creative-image-provider'),
    optionalCreativeMedia: createUnavailableProvider('optional-creative-media', 'optional-creative-media-provider'),
    mediaValidation: createUnavailableProvider('media-validation', 'media-validation-provider'),
    brandAsset: createUnavailableProvider('brand-asset', 'brand-asset-provider'),
  };
}
