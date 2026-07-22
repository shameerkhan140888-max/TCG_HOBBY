import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './client';

export const PRODUCT_FACT_KEYS = [
  'manufacturer', 'manufacturerSku', 'boosterPackCount', 'cardsPerPack', 'boxContents', 'recommendedAge',
  'countryRegion', 'edition', 'franchise', 'officialSource', 'variationNotice',
] as const;
export type ProductFactKey = (typeof PRODUCT_FACT_KEYS)[number];
export type FactVerificationState = 'UNVERIFIED' | 'VERIFIED';

export type ProductFactInput = {
  key: ProductFactKey;
  value: string;
  verificationState: FactVerificationState;
  sourceReference?: string | null;
  notes?: string | null;
};

export const GENERATED_CONTENT_FIELDS = [
  'shortDescription', 'fullDescription', 'contents', 'highlights', 'specificationSummary',
  'seoTitle', 'metaDescription', 'searchTags', 'suggestedSlug', 'imageAltText',
] as const;
export type GeneratedContentField = (typeof GENERATED_CONTENT_FIELDS)[number];
export type GeneratedProductContent = {
  shortDescription: string;
  fullDescription: string;
  contents: string[];
  highlights: string[];
  specificationSummary: string;
  seoTitle: string;
  metaDescription: string;
  searchTags: string[];
  suggestedSlug: string;
  imageAltText: string;
  missingFactWarnings: string[];
};

type ContentDb = PrismaClient | Prisma.TransactionClient;

export function validateProductFacts(inputs: ProductFactInput[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  inputs.forEach((fact, index) => {
    if (!PRODUCT_FACT_KEYS.includes(fact.key)) errors.push(`Fact ${index + 1} uses an unsupported key.`);
    if (seen.has(fact.key)) errors.push(`Fact ${fact.key} is duplicated.`);
    seen.add(fact.key);
    if (!fact.value.trim() || fact.value.length > 1000) errors.push(`Fact ${fact.key} must contain 1 to 1000 characters.`);
    if (fact.verificationState === 'VERIFIED' && !fact.sourceReference?.trim()) errors.push(`Verified fact ${fact.key} requires a source reference.`);
  });
  return errors;
}

export async function replaceProductFacts(productId: string, facts: ProductFactInput[], actorId: string, db = prisma) {
  const errors = validateProductFacts(facts);
  if (errors.length) throw new Error(errors.join(' '));
  return db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new Error('Product not found.');
    await tx.productFact.deleteMany({ where: { productId } });
    if (facts.length) await tx.productFact.createMany({ data: facts.map((fact, sortOrder) => ({
      productId, key: fact.key, value: fact.value.trim(), verificationState: fact.verificationState,
      sourceReference: fact.sourceReference?.trim() || null, notes: fact.notes?.trim() || null, sortOrder,
      verifiedAt: fact.verificationState === 'VERIFIED' ? new Date() : null,
      verifiedById: fact.verificationState === 'VERIFIED' ? actorId : null,
    })) });
  });
}

export async function getProductContentWorkspace(productId: string, db = prisma) {
  return db.product.findUnique({
    where: { id: productId },
    select: {
      id: true, name: true, slug: true, brand: true, game: true, setName: true, productType: true, language: true,
      condition: true, releaseDate: true, barcode: true, description: true, longDescription: true, seoTitle: true,
      metaDescription: true, searchTags: true, productHighlights: true, specificationSummary: true, verifiedContents: true,
      published: true, lifecycleState: true,
      images: { where: { deletionState: 'ACTIVE' }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      facts: { orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }] },
      contentGenerations: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 10 },
    },
  });
}

export async function createContentGenerationDraft(input: {
  productId: string; requestedById: string; provider: string; model: string; requestedFields: GeneratedContentField[];
  content: GeneratedProductContent; warnings: string[];
}, db = prisma) {
  return db.productContentGeneration.create({ data: {
    productId: input.productId, requestedById: input.requestedById, provider: input.provider, model: input.model,
    requestedFields: input.requestedFields, generatedContent: input.content as unknown as Prisma.InputJsonValue,
    warnings: input.warnings, status: 'DRAFT',
  } });
}

function pickGeneratedUpdate(content: GeneratedProductContent, fields: GeneratedContentField[]) {
  const data: Prisma.ProductUpdateInput = {};
  if (fields.includes('shortDescription')) data.description = content.shortDescription;
  if (fields.includes('fullDescription')) data.longDescription = content.fullDescription;
  if (fields.includes('contents')) data.verifiedContents = content.contents;
  if (fields.includes('highlights')) data.productHighlights = content.highlights;
  if (fields.includes('specificationSummary')) data.specificationSummary = content.specificationSummary || null;
  if (fields.includes('seoTitle')) data.seoTitle = content.seoTitle || null;
  if (fields.includes('metaDescription')) data.metaDescription = content.metaDescription || null;
  if (fields.includes('searchTags')) data.searchTags = content.searchTags;
  return data;
}

export async function applyContentGeneration(generationId: string, fields: GeneratedContentField[], actorId: string, db = prisma) {
  if (!fields.length || fields.some((field) => !GENERATED_CONTENT_FIELDS.includes(field))) throw new Error('Choose valid generated fields to apply.');
  return db.$transaction(async (tx) => {
    const generation = await tx.productContentGeneration.findUnique({ where: { id: generationId }, include: { product: true } });
    if (!generation || generation.status !== 'DRAFT') throw new Error('Generation draft is not available.');
    if (generation.requestedById !== actorId) throw new Error('Only the requesting staff member may apply this draft.');
    const content = generation.generatedContent as unknown as GeneratedProductContent;
    const previousValues: Record<string, unknown> = {};
    for (const field of fields) {
      const map: Record<GeneratedContentField, keyof typeof generation.product | null> = {
        shortDescription: 'description', fullDescription: 'longDescription', contents: 'verifiedContents', highlights: 'productHighlights',
        specificationSummary: 'specificationSummary', seoTitle: 'seoTitle', metaDescription: 'metaDescription', searchTags: 'searchTags',
        suggestedSlug: null, imageAltText: null,
      };
      const key = map[field]; if (key) previousValues[field] = generation.product[key];
    }
    await tx.product.update({ where: { id: generation.productId }, data: pickGeneratedUpdate(content, fields) });
    if (fields.includes('imageAltText') && content.imageAltText) {
      const primary = await tx.productImage.findFirst({ where: { productId: generation.productId, deletionState: 'ACTIVE' }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] });
      if (primary) { previousValues.imageAltText = primary.altText; await tx.productImage.update({ where: { id: primary.id }, data: { altText: content.imageAltText } }); }
    }
    await tx.productContentGeneration.update({ where: { id: generationId }, data: {
      status: 'APPLIED', appliedFields: fields, previousValues: previousValues as Prisma.InputJsonValue, appliedAt: new Date(),
    } });
  });
}

export async function restoreContentGeneration(generationId: string, _actorId: string, db = prisma) {
  return db.$transaction(async (tx) => {
    const generation = await tx.productContentGeneration.findUnique({ where: { id: generationId } });
    if (!generation || generation.status !== 'APPLIED' || !generation.previousValues) throw new Error('No applied content is available to restore.');
    const previous = generation.previousValues as Record<string, unknown>;
    const fields = Object.keys(previous) as GeneratedContentField[];
    const synthetic = {
      shortDescription: String(previous.shortDescription ?? ''), fullDescription: String(previous.fullDescription ?? ''),
      contents: Array.isArray(previous.contents) ? previous.contents.map(String) : [], highlights: Array.isArray(previous.highlights) ? previous.highlights.map(String) : [],
      specificationSummary: String(previous.specificationSummary ?? ''), seoTitle: String(previous.seoTitle ?? ''), metaDescription: String(previous.metaDescription ?? ''),
      searchTags: Array.isArray(previous.searchTags) ? previous.searchTags.map(String) : [], suggestedSlug: '', imageAltText: String(previous.imageAltText ?? ''), missingFactWarnings: [],
    } satisfies GeneratedProductContent;
    await tx.product.update({ where: { id: generation.productId }, data: pickGeneratedUpdate(synthetic, fields) });
    if (fields.includes('imageAltText')) {
      const primary = await tx.productImage.findFirst({ where: { productId: generation.productId, deletionState: 'ACTIVE' }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] });
      if (primary) await tx.productImage.update({ where: { id: primary.id }, data: { altText: synthetic.imageAltText } });
    }
    await tx.productContentGeneration.update({ where: { id: generationId }, data: { status: 'RESTORED', appliedFields: fields, appliedAt: new Date() } });
  });
}

export async function countRecentContentGenerations(requestedById: string, since: Date, db = prisma) {
  return db.productContentGeneration.count({ where: { requestedById, createdAt: { gte: since } } });
}

export async function discardContentGeneration(generationId: string, actorId: string, db = prisma) {
  const result = await db.productContentGeneration.updateMany({ where: { id: generationId, requestedById: actorId, status: 'DRAFT' }, data: { status: 'DISCARDED' } });
  if (!result.count) throw new Error('Generation draft is not available.');
}

export async function setProductReviewLifecycle(productId: string, lifecycleState: 'DRAFT' | 'AWAITING_REVIEW', db = prisma) {
  await db.product.update({ where: { id: productId }, data: { lifecycleState, published: false, archivedAt: null } });
}
