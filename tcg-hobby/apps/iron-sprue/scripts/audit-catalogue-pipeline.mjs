import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(appRoot, relativePath), 'utf8'));
}

async function readJsonOptional(relativePath) {
  try {
    return await readJson(relativePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function countBy(items, pick) {
  return items.reduce((counts, item) => {
    const key = pick(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function mainReport(manifest, launchProducts, mediaReport, maintenanceReport, missingSourceReport, heroReport, workshopReport) {
  const sourceLinkedProducts = launchProducts.filter((product) => product.sourceMediaLinks?.length);
  const reviewRequiredProducts = manifest.products.filter((product) => product.publicationState === 'REVIEW_REQUIRED');
  const placeholderProducts = manifest.products.filter((product) => product.publicationState !== 'REVIEW_REQUIRED');
  const image2 = maintenanceReport?.image2;
  const image2Completed = (image2?.sourceReused ?? 0) + (image2?.generated ?? 0);
  const workshopCompleted = (workshopReport?.generated ?? 0) + (workshopReport?.proofRetained ?? 0);
  const currentTechnicalDerivatives =
    maintenanceReport?.mode === 'applied'
      ? 0
      : maintenanceReport?.duplicateResizedObjectsIdentified ?? mediaReport.postRepairDurableAssets?.image2DerivativeFilesUploaded ?? 0;

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
      originalSourceAssets: maintenanceReport?.originalSourceImagesRetained ?? mediaReport.postRepairDurableAssets?.sourceOriginalsUploaded ?? 0,
      technicalDerivatives: currentTechnicalDerivatives,
      trueIsolatedImage2Assets: image2Completed,
      trueCompletedResultAssets: 0,
      trueIronSprueWorkshopAssets: workshopCompleted,
      workshopPlaceholders: 0,
      placeholders: missingSourceReport?.productsWithoutUsableOriginals ?? placeholderProducts.length,
      brandLogosCompleted: 0,
      heroAssetsCompleted: heroReport?.heroMastersUploaded ?? 0,
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
  const maintenanceReport = await readJsonOptional('data/product-media-maintenance-report.json');
  const missingSourceReport = await readJsonOptional('data/missing-source-media-report.json');
  const heroReport = await readJsonOptional('data/hero-master-upload-report.json');
  const workshopReport = await readJsonOptional('data/workshop-master-batch-report.json');
  const report = mainReport(manifest, launchProducts, mediaReport, maintenanceReport, missingSourceReport, heroReport, workshopReport);
  await writeFile(path.join(appRoot, 'data', 'catalogue-pipeline-audit.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
