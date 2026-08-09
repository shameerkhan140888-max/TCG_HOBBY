import { describe, expect, it } from 'vitest';
import launchProducts from '../data/launch-products.json';
import type { IronSprueProduct } from './catalogue';
import {
  assertGeneratedContentUsesOnlyFacts,
  canApproveCataloguePrimary,
  classifyIronSprueMediaAsset,
  createInitialCataloguePipelineSnapshot,
  createLocalCatalogueImagePlan,
  createMockCataloguePipelineProviders,
  createTechnicalDerivativePlan,
  nextCataloguePipelineStage,
  sourceProvenanceFromProduct,
  validateCatalogueSourceUrl,
  type SourceMediaAsset,
  type MediaValidationResult,
} from './catalogue-enrichment-pipeline';

const products = launchProducts as IronSprueProduct[];
const linkedProduct = products.find((product) => product.sourceMediaLinks?.length)!;

describe('Iron Sprue catalogue enrichment pipeline', () => {
  it('maps existing imported products into a resumable identity-confirmed pipeline state', () => {
    const snapshot = createInitialCataloguePipelineSnapshot(linkedProduct);

    expect(snapshot.stage).toBe('IDENTITY_CONFIRMED');
    expect(snapshot.completedStages).toEqual(['IMPORT_PENDING', 'IDENTITY_PENDING', 'IDENTITY_CONFIRMED']);
    expect(snapshot.identity).toMatchObject({
      canonicalBrand: linkedProduct.brand,
      supplierSku: linkedProduct.supplierSku,
      canonicalTitle: linkedProduct.name,
    });
    expect(snapshot.identity?.provenance).toHaveLength(linkedProduct.sourceMediaLinks?.length ?? 0);
  });

  it('moves to review when a non-retryable provider failure occurs', () => {
    const snapshot = createInitialCataloguePipelineSnapshot(linkedProduct);
    snapshot.error = { code: 'LOW_CONFIDENCE', message: 'Ambiguous product identity.', retryable: false };

    expect(nextCataloguePipelineStage(snapshot)).toBe('REVIEW_REQUIRED');
  });

  it('keeps source provenance separate from generated content', async () => {
    const providers = createMockCataloguePipelineProviders();
    const context = {
      batchId: 'test-batch',
      product: linkedProduct,
      attempt: 1,
      dryRun: true,
      retryPolicy: providers.research.retryPolicy,
    };
    const identity = await providers.sourceDiscovery.run({ product: linkedProduct, knownUrls: sourceProvenanceFromProduct(linkedProduct) }, context);
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const research = await providers.research.run(identity.value, context);
    expect(research.ok).toBe(true);
    if (!research.ok) return;

    const content = await providers.contentGeneration.run(research.value, context);
    expect(content.ok).toBe(true);
    if (!content.ok) return;

    expect(() => assertGeneratedContentUsesOnlyFacts(content.value, research.value.facts)).not.toThrow();
    expect(() =>
      assertGeneratedContentUsesOnlyFacts({ ...content.value, inputFactIds: [...content.value.inputFactIds, 'invented-dimensions'] }, research.value.facts),
    ).toThrow(/invented-dimensions/);
  });

  it('plans routine Image 2 and derivatives with zero marginal AI cost', async () => {
    const providers = createMockCataloguePipelineProviders();
    const original: SourceMediaAsset = {
      sourceUrl: linkedProduct.sourceMediaLinks![0]!.url,
      source: sourceProvenanceFromProduct(linkedProduct)[0]!,
      checksum: 'abc123',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 900,
      byteSize: 125000,
      r2Key: `archive/products/${linkedProduct.sku.toLowerCase()}/original/source.jpg`,
    };
    const context = {
      batchId: 'test-batch',
      product: linkedProduct,
      attempt: 1,
      dryRun: true,
      retryPolicy: providers.catalogueImageProcessor.retryPolicy,
    };

    const image2 = await providers.catalogueImageProcessor.run({ product: linkedProduct, original }, context);
    expect(image2.ok).toBe(true);
    if (!image2.ok) return;
    expect(image2.value.requiresPaidAi).toBe(false);
    expect(image2.value.outputMasterR2Key).toContain('/image-2/catalogue-primary-master.webp');
    expect(image2.metadata.costModel).toBe('ZERO_MARGINAL_COST');

    const derivatives = await providers.derivativeProcessor.run({ product: linkedProduct, master: image2.value }, context);
    expect(derivatives.ok).toBe(true);
    if (!derivatives.ok) return;
    expect(derivatives.value.requiresPaidAi).toBe(false);
    expect(derivatives.value.derivatives.map((item) => item.label)).toEqual([
      'desktop',
      'tablet',
      'mobile',
      'thumbnail',
      'webp',
      'avif',
      'fallback',
    ]);
    expect(derivatives.metadata.costModel).toBe('ZERO_MARGINAL_COST');
  });

  it('keeps paid creative media optional and fail-closed when not explicitly configured', async () => {
    const providers = createMockCataloguePipelineProviders();
    const context = {
      batchId: 'test-batch',
      product: linkedProduct,
      attempt: 1,
      dryRun: true,
      retryPolicy: providers.optionalCreativeMedia.retryPolicy,
    };

    const result = await providers.optionalCreativeMedia.run(
      { product: linkedProduct, original: {} as never, recipe: 'hero', approvedException: true },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('MISSING_CONFIGURATION');
    expect(result.error.retryable).toBe(false);
  });

  it('rejects unsafe source URLs before any download provider can fetch them', () => {
    expect(validateCatalogueSourceUrl('http://example.com/image.jpg')).toMatchObject({ ok: false });
    expect(validateCatalogueSourceUrl('https://localhost/image.jpg')).toMatchObject({ ok: false });
    expect(validateCatalogueSourceUrl('https://127.0.0.1/image.jpg')).toMatchObject({ ok: false });
    expect(validateCatalogueSourceUrl('https://192.168.1.5/image.jpg')).toMatchObject({ ok: false });
    expect(validateCatalogueSourceUrl('https://www.tasmaproducts.com/cubic-fun/c007h-era-of-navigation')).toMatchObject({ ok: true });
  });

  it('distinguishes originals, technical derivatives, true catalogue primaries, placeholders and reused hero workshop assets', () => {
    expect(
      classifyIronSprueMediaAsset({
        role: 'manufacturer-original',
        storageKey: 'archive/products/is-aos-05627/original/hash.jpg',
      }),
    ).toBe('VALID_ORIGINAL');
    expect(
      classifyIronSprueMediaAsset({
        role: 'catalogue-derivative',
        storageKey: 'published/products/is-aos-05627/image-2/1280.webp',
      }),
    ).toBe('VALID_TECHNICAL_DERIVATIVE');
    expect(
      classifyIronSprueMediaAsset({
        role: 'catalogue-primary',
        storageKey: 'published/products/is-aos-05627/catalogue-primary-placeholder.json',
        lastError: 'Image 2 required.',
      }),
    ).toBe('PLACEHOLDER');
    expect(
      classifyIronSprueMediaAsset({
        role: 'catalogue-primary',
        storageKey: 'published/products/is-aos-05627/generated/image-2-master.webp',
        approvalState: 'APPROVED',
        isPrimary: true,
      }),
    ).toBe('TRUE_CATALOGUE_PRIMARY');
    expect(
      classifyIronSprueMediaAsset({
        role: 'workshop-photography',
        storageKey: 'processed/products/is-aos-05627/hero-placeholder/workshop.webp',
      }),
    ).toBe('REUSED_HERO_PLACEHOLDER');
  });

  it('exposes deterministic helper functions for local processors without invoking paid providers', () => {
    const original: SourceMediaAsset = {
      sourceUrl: 'https://example.com/source.jpg',
      source: sourceProvenanceFromProduct(linkedProduct)[0]!,
      checksum: 'abc123',
      mimeType: 'image/jpeg',
      width: 1000,
      height: 1000,
      byteSize: 1000,
      r2Key: 'archive/products/example/original/source.jpg',
    };
    const plan = createLocalCatalogueImagePlan(linkedProduct, original);
    const derivatives = createTechnicalDerivativePlan(linkedProduct, plan.outputMasterR2Key);

    expect(plan.requiresPaidAi).toBe(false);
    expect(plan.treatment.marginPercent).toBe(8);
    expect(derivatives.requiresPaidAi).toBe(false);
    expect(derivatives.derivatives).toHaveLength(7);
  });

  it('requires Image 2 validation pass or explicit manual override before approval', () => {
    const reviewRequired: MediaValidationResult = {
      status: 'REVIEW_REQUIRED',
      materiallyDiffersFromSource: true,
      checks: [{ key: 'background', passed: true, detail: 'Clean white canvas.' }],
    };

    expect(canApproveCataloguePrimary(reviewRequired)).toBe(false);
    expect(canApproveCataloguePrimary(reviewRequired, true)).toBe(true);
    expect(canApproveCataloguePrimary({ ...reviewRequired, status: 'FAIL' }, true)).toBe(false);
  });
});
