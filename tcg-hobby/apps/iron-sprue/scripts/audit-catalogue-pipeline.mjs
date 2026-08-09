import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(appRoot, relativePath), 'utf8'));
}

function countBy(items, pick) {
  return items.reduce((counts, item) => {
    const key = pick(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function mainReport(manifest, launchProducts, mediaReport) {
  const sourceLinkedProducts = launchProducts.filter((product) => product.sourceMediaLinks?.length);
  const reviewRequiredProducts = manifest.products.filter((product) => product.publicationState === 'REVIEW_REQUIRED');
  const placeholderProducts = manifest.products.filter((product) => product.publicationState !== 'REVIEW_REQUIRED');

  return {
    generatedAt: new Date().toISOString(),
    catalogue: {
      manifestProducts: manifest.products.length,
      launchProducts: launchProducts.length,
      importedProductCount: manifest.summary?.saleableSkuCount ?? manifest.products.length,
      physicalUnits: manifest.summary?.physicalUnitsSupplied,
      sourceLinkedProducts: sourceLinkedProducts.length,
      sourceLinkRequiredProducts: manifest.products.length - sourceLinkedProducts.length,
      manufacturerUrlProducts: 0,
      supplierUrlProducts: sourceLinkedProducts.length,
      reviewRequiredProducts: reviewRequiredProducts.length,
      publishedProducts: launchProducts.filter((product) => product.published !== false).length,
      byBrand: countBy(launchProducts, (product) => product.brand),
      byPublicationState: countBy(manifest.products, (product) => product.publicationState ?? 'MEDIA_PENDING'),
    },
    mediaClassification: {
      originalSourceAssets: mediaReport.postRepairDurableAssets?.sourceOriginalsUploaded ?? 0,
      technicalDerivatives: mediaReport.postRepairDurableAssets?.image2DerivativeFilesUploaded ?? 0,
      trueIsolatedImage2Assets: 0,
      trueCompletedResultAssets: 0,
      trueIronSprueWorkshopAssets: 0,
      workshopPlaceholders: mediaReport.postRepairDurableAssets?.workshopPlaceholderFilesUploaded ?? 0,
      placeholders: placeholderProducts.length,
      brandLogosCompleted: 0,
      heroAssetsCompleted: 0,
    },
    contentClassification: {
      generatedDescriptionsFromVerifiedSources: 0,
      importedDescriptionsPendingReview: launchProducts.length,
      provenanceLinkedRows: sourceLinkedProducts.length,
    },
    providerReadiness: {
      providerInterfacesImplemented: true,
      productionResearchProviderConfigured: false,
      productionContentProviderConfigured: false,
      productionCatalogueImageProviderConfigured: false,
      productionCreativeImageProviderConfigured: false,
      productionMediaValidationProviderConfigured: false,
      reason: 'Current implementation includes provider contracts and mock/unavailable providers. Production AI/image providers still require configuration.',
    },
  };
}

async function main() {
  const manifest = await readJson('data/final-launch-catalogue-manifest.json');
  const launchProducts = await readJson('data/launch-products.json');
  const mediaReport = await readJson('data/media-pilot-report.json');
  const report = mainReport(manifest, launchProducts, mediaReport);
  await writeFile(path.join(appRoot, 'data', 'catalogue-pipeline-audit.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
