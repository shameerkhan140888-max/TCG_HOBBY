import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const launchProductsPath = path.join(appRoot, 'data', 'launch-products.json');
const launchManifestPath = path.join(appRoot, 'data', 'final-launch-catalogue-manifest.json');
const reportPath = path.join(appRoot, 'data', 'product-description-enrichment-report.json');
const envPath = path.join(appRoot, '.env.local');
const apply = process.argv.includes('--apply');
const skipDb = process.argv.includes('--skip-db');

const placeholderPattern = /selected for (the )?(Iron Sprue )?launch|final box-specific details|manufacturer specifications required|for hobby bench preparation|modelling, assembly and finishing work|decorative puzzle object selected/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function isPlaceholder(product) {
  const copy = `${product.shortDescription ?? ''} ${product.description ?? ''}`.trim();
  return !copy || placeholderPattern.test(copy);
}

function hasSource(product) {
  return Boolean(product.benchmarkUrl || product.sourceMediaLinks?.length || product.supplierSku || product.manufacturerReference);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function colourFromTitle(name) {
  const colours = ['White Pearl', 'Red Pearl', 'Spark Red', 'White', 'Silver', 'Blue', 'Red', 'Brown', 'Green'];
  return colours.find((colour) => new RegExp(`\\b${escapeRegExp(colour)}\\b`, 'i').test(name));
}

function titleWithoutColour(name) {
  const colour = colourFromTitle(name);
  return colour ? name.replace(new RegExp(`\\b${escapeRegExp(colour)}\\b`, 'i'), '').replace(/\s{2,}/g, ' ').trim() : name;
}

function sentenceCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildSpecs(product) {
  const specs = {};
  if (product.brand) specs.manufacturer = product.brand;
  if (product.category) specs.category = product.category;
  if (product.productType) specs.productType = product.productType;
  if (product.supplierSku) specs.supplierCode = product.supplierSku;
  if (product.manufacturerReference) specs.manufacturerReference = product.manufacturerReference;
  if (product.scale) specs.scale = product.scale;
  if (typeof product.glueRequired === 'boolean') specs.glueRequired = product.glueRequired ? 'Yes' : 'No';
  if (typeof product.paintRequired === 'boolean') specs.paintRequired = product.paintRequired ? 'Yes' : 'No';
  return specs;
}

function sourceSentence(confidence) {
  return confidence === 'sufficient'
    ? 'The listing is built from the launch catalogue and associated supplier or manufacturer source material already captured for Iron Sprue.'
    : 'The listing uses the verified launch catalogue fields currently available; unsupported technical specifications have been deliberately left out.';
}

function base(product, shortDescription, paragraphs, features, specifications, confidence) {
  return {
    shortDescription,
    description: [...paragraphs, sourceSentence(confidence)].join('\n\n'),
    features,
    specifications,
    seoTitle: `${product.name} | ${product.brand} | Iron Sprue`,
    metaDescription: shortDescription.length > 155 ? `${shortDescription.slice(0, 152).trim()}...` : shortDescription,
    omittedUncertainSpecifications: ['dimensions', 'piece count', 'age rating', 'skill level', 'materials'].filter((field) => !specifications[field]),
    sourceConfidence: confidence,
  };
}

function generateCopy(product) {
  const specs = buildSpecs(product);
  const confidence = hasSource(product) ? 'sufficient' : 'limited';

  if (product.brand === 'Aoshima') {
    const colour = colourFromTitle(product.name);
    const subject = titleWithoutColour(product.name);
    const colourText = colour ? ` in ${colour}` : '';
    return base(
      product,
      `${product.name} is an Aoshima ${product.productType.toLowerCase()} of the ${subject}${colourText}, selected for builders who want a sharp vehicle subject with strong display presence.`,
      [
        `This Aoshima release focuses on the ${subject}${colourText}, making it a clean choice for an automotive modelling bench or a finished shelf display. The catalogue title, brand and supplier reference are preserved exactly so the kit can be matched back to the launch stock record.`,
        specs.scale
          ? `The recorded scale is ${specs.scale}. Beyond the confirmed catalogue data, Iron Sprue has not added unsupported claims about contents, dimensions, paint requirements or assembly method.`
          : 'Scale, contents and assembly requirements are not stated in the current verified catalogue fields, so those details are intentionally omitted until the product packaging or manufacturer data is reviewed.',
      ],
      [`${product.brand} vehicle model kit`, `${subject}${colour ? ` colour variant: ${colour}` : ''}`, product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed'],
      specs,
      confidence,
    );
  }

  if (product.brand === 'CubicFun') {
    return base(
      product,
      `${product.name} is a CubicFun display build for customers who enjoy recognisable architectural or object-based 3D projects with a finished-piece focus.`,
      [
        `This CubicFun model centres on ${product.name}, giving the launch range a structured display build rather than another vehicle or bench accessory. It suits customers browsing for a contained project with a recognisable subject and a decorative result.`,
        'Only catalogue-confirmed details have been used here. Piece count, finished dimensions and age guidance are not listed unless they are present in the verified Iron Sprue source data.',
      ],
      ['CubicFun 3D display build', `${product.name} subject`, product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed'],
      specs,
      confidence,
    );
  }

  if (product.brand === 'Pintoo') {
    const format = product.name.includes('Vase')
      ? 'vase'
      : product.name.includes('Clock')
        ? 'clock'
        : product.name.includes('Lantern')
          ? 'lantern'
          : product.name.includes('Screen')
            ? 'screen'
            : product.name.includes('Globe')
              ? 'globe'
              : 'decorative puzzle object';
    return base(
      product,
      `${product.name} is a Pintoo ${format} puzzle selected for customers who want a decorative 3D build with a finished-object feel.`,
      [
        `This Pintoo piece is built around the ${product.name} design, offering a more giftable and display-led alternative to a conventional flat puzzle. The subject and format are kept specific so customers can compare it properly against the rest of the Pintoo launch range.`,
        'The catalogue currently confirms the brand, product title and supplier reference. Unsupported claims such as piece count, dimensions, materials and age grading have been left out until they are verified from manufacturer packaging or source data.',
      ],
      [`Pintoo ${format} puzzle`, `${product.name} design`, product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed'],
      specs,
      confidence,
    );
  }

  if (product.brand === 'Deluxe Materials') {
    const lowerName = product.name.toLowerCase();
    const use = lowerName.includes('masking')
      ? 'masking and finishing preparation'
      : lowerName.includes('glue') || lowerName.includes('cyano') || lowerName.includes('bond') || lowerName.includes('epoxy') || lowerName.includes('grip')
        ? 'adhesive and assembly work'
        : lowerName.includes('tip') || lowerName.includes('tube')
          ? 'controlled adhesive application'
          : 'bench finishing work';
    return base(
      product,
      `${product.name} from Deluxe Materials is a specialist bench product for ${use}, selected to support model kit assembly and finishing.`,
      [
        `${product.name} gives Iron Sprue customers a named Deluxe Materials option for ${use}. It is positioned as a practical workshop companion rather than a display kit, so the copy focuses on the product's bench role and verified catalogue identity.`,
        'Handling, curing, compatibility and safety details are not expanded beyond the confirmed source fields. Customers should follow the manufacturer packaging for application and safety guidance.',
      ],
      ['Deluxe Materials bench product', sentenceCase(use), product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed'],
      specs,
      confidence,
    );
  }

  if (product.brand === 'OcCre Creations') {
    return base(
      product,
      `${product.name} from OcCre Creations is a workshop accessory selected for careful modelling preparation, finishing or storage tasks.`,
      [
        `${product.name} adds an OcCre Creations support item to the Iron Sprue bench range. It is listed for customers building out a more organised modelling setup alongside kits, adhesives and finishing tools.`,
        'The catalogue record confirms the title, brand and supplier code. Specific dimensions, material details and compatibility claims are omitted unless present in the verified product source.',
      ],
      ['OcCre Creations workshop accessory', 'Supports modelling bench organisation or preparation', product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed'],
      specs,
      confidence,
    );
  }

  if (product.brand === 'Expo Tools' || product.brand === 'Tasma') {
    const lowerName = product.name.toLowerCase();
    const use = lowerName.includes('drill')
      ? 'small drilling and preparation work'
      : lowerName.includes('loupe') || lowerName.includes('magnifier')
        ? 'close inspection and detailed bench work'
        : lowerName.includes('plier')
          ? 'holding, bending and controlled handling tasks'
          : lowerName.includes('tweezer')
            ? 'holding small parts during assembly'
            : lowerName.includes('knife') || lowerName.includes('blade')
              ? 'cutting and trimming tasks'
              : lowerName.includes('sander') || lowerName.includes('file')
                ? 'shaping, smoothing and finishing work'
                : lowerName.includes('calliper')
                  ? 'checking small measurements at the bench'
                  : 'general modelling bench work';
    return base(
      product,
      `${product.name} is an Iron Sprue bench essential for ${use}, chosen for model makers building a practical tool setup.`,
      [
        `${product.name} sits in the launch range as a functional tool rather than a kit. The listing is written around its confirmed catalogue role: helping with ${use} during model, puzzle or display-build preparation.`,
        'Exact materials, blade sizes, tolerances and compatibility claims are not added unless they already exist in the verified source data. This keeps the product page useful without overstating the tool specification.',
      ],
      ['Bench tool or accessory', sentenceCase(use), product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed'],
      specs,
      confidence,
    );
  }

  return base(
    product,
    `${product.name} is a ${product.brand} ${product.productType.toLowerCase()} selected for the Iron Sprue launch catalogue.`,
    [
      `${product.name} is included as part of Iron Sprue's launch range for customers looking across model kits, display builds and workshop essentials. The product identity has been kept tied to the verified catalogue title and supplier reference.`,
      'Additional specifications are omitted where they are not present in the current source material.',
    ],
    [`${product.brand} product`, product.productType, product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed'],
    specs,
    confidence,
  );
}

function classify(products) {
  const withMeaningful = products.filter((product) => !isPlaceholder(product) && product.shortDescription && product.description && product.description.length > 160);
  const noDescription = products.filter((product) => !product.shortDescription && !product.description);
  const placeholderOrMinimal = products.filter((product) => !withMeaningful.includes(product) && !noDescription.includes(product));
  const sufficientSource = products.filter(hasSource);
  const insufficientSource = products.filter((product) => !hasSource(product));

  return {
    totalProducts: products.length,
    meaningfulExistingDescriptions: withMeaningful.length,
    noDescription: noDescription.length,
    placeholderOrMinimal: placeholderOrMinimal.length,
    sufficientSourceInformation: sufficientSource.length,
    insufficientSourceInformation: insufficientSource.length,
    insufficientSourceSkus: insufficientSource.map((product) => product.sku),
  };
}

function auditQuality(products) {
  const byDescription = new Map();
  for (const product of products) {
    const key = product.description?.trim();
    if (!key) continue;
    byDescription.set(key, [...(byDescription.get(key) ?? []), product.sku]);
  }

  const duplicateDescriptions = Array.from(byDescription.entries())
    .filter(([, skus]) => skus.length > 1)
    .map(([description, skus]) => ({ skus, descriptionPreview: description.slice(0, 120) }));

  const emptyDescriptions = products.filter((product) => !product.shortDescription || !product.description).map((product) => product.sku);
  const placeholderDescriptions = products.filter(isPlaceholder).map((product) => product.sku);
  const speculativeLanguage = products
    .filter((product) => /perfect for collectors and hobbyists|professional-grade|premium quality|non-toxic|waterproof|easy snap|no glue required|paint included|age[s ]+\d+\+|\d+\s*pieces/i.test(`${product.shortDescription} ${product.description}`))
    .map((product) => product.sku);

  return {
    duplicateDescriptions,
    emptyDescriptions,
    placeholderDescriptions,
    speculativeLanguage,
  };
}

function loadEnv() {
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

async function mirrorToNeon(products) {
  if (skipDb) return { attempted: false, updated: 0, error: 'Skipped by --skip-db.' };

  loadEnv();
  const connectionString = process.env.IRON_SPRUE_DATABASE_URL?.trim();
  if (!connectionString) return { attempted: false, updated: 0, error: 'IRON_SPRUE_DATABASE_URL is not configured.' };

  try {
    const [{ PrismaClient }, { PrismaNeon }] = await Promise.all([import('@prisma/client'), import('@prisma/adapter-neon')]);
    const prisma = new PrismaClient({
      adapter: new PrismaNeon({
        connectionString,
        allowExitOnIdle: true,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 5_000,
        max: 5,
      }),
    });

    let updated = 0;
    try {
      for (const product of products) {
        await prisma.ironSprueAdminProduct.update({
          where: { storeCode_sku: { storeCode: 'IRON_SPRUE', sku: product.sku } },
          data: {
            shortDescription: product.shortDescription,
            fullDescription: product.description,
            featureBullets: product.features ?? [],
            specifications: product.specifications ?? {},
            seoTitle: product.seoTitle,
            metaDescription: product.metaDescription,
          },
        });
        updated += 1;
      }
    } finally {
      await prisma.$disconnect();
    }

    return { attempted: true, updated, error: null };
  } catch (error) {
    const message = error?.message || error?.cause?.message || String(error?.stack ?? error ?? 'Unknown Neon mirror error');
    const firstStackLine = String(error?.stack ?? '').split('\n').find((line) => line.trim().startsWith('at '))?.trim();

    return {
      attempted: true,
      updated: 0,
      errorCategory: 'NEON_MIRROR_FAILED',
      error: message || 'Neon mirror failed before returning a detailed adapter message.',
      firstStackLine,
    };
  }
}

const originalProducts = readJson(launchProductsPath);
const originalManifest = readJson(launchManifestPath);
const before = classify(originalProducts);
const enrichedProducts = originalProducts.map((product) => {
  const generated = generateCopy(product);
  return {
    ...product,
    shortDescription: generated.shortDescription,
    description: generated.description,
    features: generated.features,
    specifications: {
      ...(product.specifications ?? {}),
      ...generated.specifications,
    },
    seoTitle: generated.seoTitle,
    metaDescription: generated.metaDescription,
    descriptionReview: {
      status: generated.sourceConfidence === 'sufficient' ? 'READY_FOR_REVIEW' : 'SOURCE_LIMITED_REVIEW',
      omittedUncertainSpecifications: generated.omittedUncertainSpecifications,
      sourceConfidence: generated.sourceConfidence,
      generatedAt: '2026-08-11T00:00:00.000Z',
    },
  };
});
const after = classify(enrichedProducts);
const quality = auditQuality(enrichedProducts);

const dbMirror = apply ? await mirrorToNeon(enrichedProducts) : { attempted: false, updated: 0, error: 'Dry run.' };
const enrichedBySku = new Map(enrichedProducts.map((product) => [product.sku, product]));
const enrichedManifest = {
  ...originalManifest,
  products: originalManifest.products.map((product) => {
    const enriched = enrichedBySku.get(product.sku);
    if (!enriched) return product;

    return {
      ...product,
      shortDescription: enriched.shortDescription,
      description: enriched.description,
      features: enriched.features,
      specifications: enriched.specifications,
      seoTitle: enriched.seoTitle,
      metaDescription: enriched.metaDescription,
      descriptionReview: enriched.descriptionReview,
    };
  }),
};
const report = {
  generatedAt: new Date().toISOString(),
  applied: apply,
  fieldsPopulated: ['shortDescription', 'description', 'features', 'specifications', 'seoTitle', 'metaDescription', 'descriptionReview'],
  before,
  after,
  enrichedCount: enrichedProducts.filter((product, index) => JSON.stringify(product) !== JSON.stringify(originalProducts[index])).length,
  quality,
  dbMirror,
  omittedUncertainSpecifications: enrichedProducts.map((product) => ({
    sku: product.sku,
    name: product.name,
    omitted: product.descriptionReview.omittedUncertainSpecifications,
    sourceConfidence: product.descriptionReview.sourceConfidence,
  })),
};

if (apply) {
  writeJson(launchProductsPath, enrichedProducts);
  writeJson(launchManifestPath, enrichedManifest);
}

writeJson(reportPath, report);

console.log(JSON.stringify({
  applied: apply,
  totalProducts: report.before.totalProducts,
  beforeMeaningful: report.before.meaningfulExistingDescriptions,
  enrichedCount: report.enrichedCount,
  afterMeaningful: report.after.meaningfulExistingDescriptions,
  manualReview: report.after.insufficientSourceInformation + report.quality.speculativeLanguage.length + report.quality.placeholderDescriptions.length + report.quality.emptyDescriptions.length,
  dbMirror,
  reportPath: path.relative(repoRoot, reportPath),
}, null, 2));
