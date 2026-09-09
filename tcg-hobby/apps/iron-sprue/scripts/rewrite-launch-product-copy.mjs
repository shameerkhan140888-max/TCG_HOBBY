import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const launchProductsPath = path.join(appRoot, 'data', 'launch-products.json');
const launchManifestPath = path.join(appRoot, 'data', 'final-launch-catalogue-manifest.json');
const reportPath = path.join(appRoot, 'data', 'product-copy-rewrite-report.json');
const envPath = path.join(appRoot, '.env.local');
const apply = process.argv.includes('--apply');
const skipDb = process.argv.includes('--skip-db');

const vehicleFacts = [
  {
    match: /Toyota 2000GT/i,
    subject: 'Toyota 2000GT',
    marque: 'Toyota',
    copy: 'The Toyota 2000GT is one of Japan\'s landmark sports cars, remembered for its long-bonnet coupe profile, Yamaha-linked engineering story and rare 1960s grand-touring character.',
    feature: 'Toyota 2000GT grand-touring subject',
  },
  {
    match: /Suzuki Jimny/i,
    subject: 'Suzuki Jimny',
    marque: 'Suzuki',
    copy: 'The Suzuki Jimny is a compact off-road icon, known for its upright stance, short wheelbase and practical little-4x4 personality.',
    feature: 'Suzuki Jimny compact off-road subject',
  },
  {
    match: /Nissan Fairlady Z|S30 Fairlady Z/i,
    subject: 'Nissan Fairlady Z',
    marque: 'Nissan',
    copy: 'The Fairlady Z name is tied to Nissan\'s classic sports-car lineage, with the S30 shape especially loved for its low nose, fastback roofline and clean long-bonnet proportions.',
    feature: 'Nissan Fairlady Z sports-car subject',
  },
  {
    match: /Lamborghini Aventador/i,
    subject: 'Lamborghini Aventador',
    marque: 'Lamborghini',
    copy: 'The Lamborghini Aventador channels the marque\'s naturally aspirated V12 supercar drama: sharp surfaces, a low wedge stance and unmistakable poster-car presence.',
    feature: 'Lamborghini Aventador V12 supercar subject',
  },
  {
    match: /Skyline GTR/i,
    subject: 'Nissan Skyline GT-R',
    marque: 'Nissan',
    copy: 'The Skyline GT-R is a Japanese performance legend, recognised for its purposeful coupe stance, motorsport aura and deep tuning-culture following.',
    feature: 'Nissan Skyline GT-R performance subject',
  },
  {
    match: /Toyota GR86/i,
    subject: 'Toyota GR86',
    marque: 'Toyota',
    copy: 'The Toyota GR86 is a modern driver-focused coupe, built around compact proportions, rear-wheel-drive balance and the accessible sports-car spirit of Toyota Gazoo Racing.',
    feature: 'Toyota GR86 modern sports-coupe subject',
  },
  {
    match: /Countach LPI 800-4/i,
    subject: 'Lamborghini Countach LPI 800-4',
    marque: 'Lamborghini',
    copy: 'The Countach LPI 800-4 revisits Lamborghini\'s wedge-shaped Countach heritage through a limited modern hybrid V12 interpretation with dramatic vents, angles and stance.',
    feature: 'Lamborghini Countach LPI 800-4 subject',
  },
  {
    match: /Pagani Zonda F/i,
    subject: 'Pagani Zonda F',
    marque: 'Pagani',
    copy: 'The Pagani Zonda F is a boutique hypercar subject with exposed aerodynamic drama, an AMG V12 character and the sculptural detailing that makes Pagani builds so distinctive.',
    feature: 'Pagani Zonda F hypercar subject',
  },
  {
    match: /Honda Motocompo/i,
    subject: 'Honda Motocompo',
    marque: 'Honda',
    copy: 'The Honda Motocompo is a tiny folding scooter designed around clever urban mobility, famous for its compact shape and its connection to Honda\'s early-1980s City car.',
    feature: 'Honda Motocompo folding scooter subject',
  },
  {
    match: /Back to the Future Part II/i,
    subject: 'Back to the Future Part II time machine',
    marque: 'DeLorean',
    copy: 'This subject captures the DeLorean time machine in its Part II form, a film-vehicle favourite with gullwing-door proportions, sci-fi hardware and instant shelf recognition.',
    feature: 'Back to the Future Part II display subject',
  },
  {
    match: /Back to the Future Part III/i,
    subject: 'Back to the Future Part III time machine',
    marque: 'DeLorean',
    copy: 'This subject presents the DeLorean time machine in its Part III treatment, pairing the familiar stainless-steel movie silhouette with western-era detail cues.',
    feature: 'Back to the Future Part III display subject',
  },
];

const landmarkFacts = [
  { match: /Burj Khalifa/i, subject: 'Burj Khalifa', copy: 'Dubai\'s Burj Khalifa is the world\'s tallest building, a needle-like skyscraper whose tiered form gives the finished model a strong vertical display presence.', feature: 'Burj Khalifa skyscraper subject' },
  { match: /Brandenburg Gate/i, subject: 'Brandenburg Gate', copy: 'Berlin\'s Brandenburg Gate is a neoclassical landmark with a six-column gateway profile and a long association with the city\'s civic identity.', feature: 'Brandenburg Gate architectural subject' },
  { match: /St Peter/i, subject: 'St Peter\'s Basilica', copy: 'St Peter\'s Basilica in Vatican City is one of the great churches of Renaissance architecture, recognised for its monumental dome and grand piazza setting.', feature: 'St Peter\'s Basilica architectural subject' },
  { match: /St Basil/i, subject: 'St Basil\'s Cathedral', copy: 'St Basil\'s Cathedral is one of Moscow\'s most recognisable landmarks, known for its clustered towers, colourful domes and storybook silhouette.', feature: 'St Basil\'s Cathedral architectural subject' },
  { match: /Chateau de Chenonceau/i, subject: 'Chateau de Chenonceau', copy: 'Chateau de Chenonceau is a Loire Valley landmark famed for its elegant arches spanning the River Cher and its refined French Renaissance character.', feature: 'Chateau de Chenonceau architectural subject' },
  { match: /Thomas Jefferson Memorial/i, subject: 'Thomas Jefferson Memorial', copy: 'The Thomas Jefferson Memorial in Washington, D.C. is a domed classical monument with an open colonnade and a calm, symmetrical display profile.', feature: 'Thomas Jefferson Memorial architectural subject' },
  { match: /St Patrick/i, subject: 'St Patrick\'s Cathedral', copy: 'St Patrick\'s Cathedral in New York is a Gothic Revival landmark, giving the model pointed arches, twin-spire character and a recognisable city-centre silhouette.', feature: 'St Patrick\'s Cathedral architectural subject' },
  { match: /Basilica of the National Shrine/i, subject: 'Basilica of the National Shrine', copy: 'The Basilica of the National Shrine brings a large-scale domed church subject to the range, with layered architectural massing and strong display symmetry.', feature: 'Basilica display-build subject' },
  { match: /Magic Box\s+Underwater World/i, subject: 'Underwater World Magic Box', copy: 'Underwater World turns the Magic Box format into a compact scene build, using ocean-themed detail to create a small display piece with depth and colour.', feature: 'Underwater World display scene' },
  { match: /Magic Box\s+London at Night/i, subject: 'London at Night Magic Box', copy: 'London at Night uses the Magic Box format for a city-atmosphere display, giving the finished piece a compact illuminated-street-scene feel.', feature: 'London at Night display scene' },
];

const shipFacts = [
  { match: /Era of Navigation/i, subject: 'Era of Navigation', copy: 'Era of Navigation gives the range a compact maritime display build, focused on the exploratory age-of-sail mood rather than a single modern vehicle subject.', feature: 'Maritime exploration subject' },
  { match: /Santa Maria/i, subject: 'Santa Maria', copy: 'Santa Maria is a historic sailing-ship subject associated with Christopher Columbus, bringing masts, sails and old-world maritime character to the display shelf.', feature: 'Santa Maria sailing-ship subject' },
  { match: /Queen Anne/i, subject: 'Queen Anne\'s Revenge', copy: 'Queen Anne\'s Revenge is tied to pirate history and Blackbeard legend, making it a dramatic sailing-ship subject with strong adventure appeal.', feature: 'Queen Anne\'s Revenge pirate-ship subject' },
  { match: /Two Masted Schooner/i, subject: 'Two Masted Schooner', copy: 'The Two Masted Schooner focuses on a classic sailing profile, with the twin-mast shape giving the completed build a balanced nautical display form.', feature: 'Two-masted schooner subject' },
];

const pintooForms = [
  { match: /Koi Carp and Lotus/i, subject: 'Koi Carp and Lotus', form: 'vase', copy: 'The koi and lotus artwork gives the finished vase a calm decorative character, with fish, flower and ceramic-style patterning designed to stay on display.' },
  { match: /Magpies on a Plum Tree/i, subject: 'Magpies on a Plum Tree', form: 'vase', copy: 'The magpie and plum-tree design leans into traditional decorative motifs, turning the puzzle build into a finished object with an elegant display feel.' },
  { match: /Children/i, subject: 'Children', form: 'vase', copy: 'The Children vase brings a softer illustrated motif to the Pintoo range, suited to customers who want a display puzzle with a lighter decorative tone.' },
  { match: /Classic Rose/i, subject: 'Classic Rose', form: 'clock', copy: 'Classic Rose combines a floral puzzle artwork with a clock-shaped finished form, so the completed build reads as a decorative object rather than a flat puzzle.' },
  { match: /Into the Woods/i, subject: 'Into the Woods', form: 'clock', copy: 'Into the Woods gives the clock format a woodland-themed mood, pairing the puzzle process with a finished piece made for display.' },
  { match: /Singing Birds and Fragrant Flowers|Singing Birds & Flowers/i, subject: 'Singing Birds and Flowers', form: 'decorative object', copy: 'Singing Birds and Flowers uses a nature-led motif, giving the finished form a bright ornamental character once assembled.' },
  { match: /Red Carpet of Life/i, subject: 'Red Carpet of Life', form: 'flowerpot', copy: 'Red Carpet of Life uses the flowerpot format for a compact decorative build, combining puzzle assembly with a display-ready finished shape.' },
  { match: /Slow Down/i, subject: 'Slow Down', form: 'flowerpot', copy: 'Slow Down brings a relaxed decorative theme to the flowerpot format, making it a small display piece with more personality than a conventional puzzle.' },
  { match: /Famous Architecture/i, subject: 'Famous Architecture', form: 'lantern or screen', copy: 'Famous Architecture gathers landmark-inspired artwork into a functional-looking display form, giving the finished build an architectural theme.' },
  { match: /Floral/i, subject: 'Floral', form: 'lantern', copy: 'The Floral lantern focuses on decorative flower artwork, with the built form giving the puzzle a more sculptural finished presence.' },
  { match: /Derjen Dancing Girls/i, subject: 'Derjen Dancing Girls', form: 'lantern', copy: 'Derjen Dancing Girls brings figure-led artwork to the lantern format, creating a display puzzle with movement and illustration at its centre.' },
  { match: /Blue Marble/i, subject: 'The Blue Marble', form: 'globe', copy: 'The Blue Marble turns Earth imagery into a globe-format puzzle, giving the completed build a rounded display object with recognisable world-map appeal.' },
  { match: /Le Papillon et la Fleur/i, subject: 'Le Papillon et la Fleur', form: 'screen', copy: 'Le Papillon et la Fleur pairs butterfly and floral artwork with the screen format, creating a decorative build intended to remain visible after assembly.' },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function colourFromName(name) {
  return ['White Pearl', 'Red Pearl', 'Spark Red', 'White', 'Silver', 'Blue', 'Red', 'Brown'].find((colour) => new RegExp(`\\b${colour}\\b`, 'i').test(name));
}

function findFact(product, facts) {
  return facts.find((fact) => fact.match.test(product.name));
}

function sentenceList(values) {
  return values.filter(Boolean).join(' ');
}

function specs(product, extra = {}) {
  return {
    ...(product.specifications ?? {}),
    manufacturer: product.brand,
    category: product.category,
    productType: product.productType,
    ...(product.scale ? { scale: product.scale } : {}),
    ...(product.pieces ? { pieces: String(product.pieces) } : {}),
    ...(product.manufacturerReference ? { manufacturerReference: product.manufacturerReference } : {}),
    ...extra,
  };
}

function meta(shortDescription) {
  return shortDescription.length > 155 ? `${shortDescription.slice(0, 152).trim()}...` : shortDescription;
}

function base(product, shortDescription, paragraphs, features, extraSpecs = {}) {
  return {
    ...product,
    shortDescription,
    description: paragraphs.join('\n\n'),
    features: Array.from(new Set(features.filter(Boolean))),
    specifications: specs(product, extraSpecs),
    seoTitle: `${product.name} | ${product.brand} | Iron Sprue`,
    metaDescription: meta(shortDescription),
    descriptionReview: {
      ...(product.descriptionReview ?? {}),
      status: 'READY_FOR_REVIEW',
      sourceConfidence: 'sufficient',
      generatedAt: new Date().toISOString(),
    },
  };
}

function rewriteAoshima(product) {
  const fact = findFact(product, vehicleFacts) ?? {
    subject: product.name,
    marque: product.brand,
    copy: `${product.name} gives the Aoshima range a focused vehicle subject with clear display appeal.`,
    feature: `${product.name} vehicle subject`,
  };
  const colour = colourFromName(product.name);
  const scaleText = product.scale ? `${product.scale} ` : '';
  const shortDescription = `${product.name} is a ${scaleText}Aoshima model kit focused on the ${fact.subject}${colour ? ` in ${colour}` : ''}, with the real vehicle's character brought into a compact display build.`;
  const paragraphs = [
    sentenceList([
      `${product.name} keeps the current Aoshima display-kit positioning, but gives the page more useful context around the subject.`,
      fact.copy,
    ]),
    sentenceList([
      product.scale ? `The canonical scale is ${product.scale}.` : '',
      colour ? `This listing is the ${colour} variant.` : '',
      'It suits builders who want a recognisable automotive or screen-vehicle subject without the product page relying on unverified kit-part claims.',
    ]),
  ];
  return base(product, shortDescription, paragraphs, [
    fact.feature,
    product.scale ? `${product.scale} scale` : '',
    colour ? `${colour} colour variant` : '',
    product.manufacturerReference ? `Manufacturer reference ${product.manufacturerReference}` : '',
  ], { marque: fact.marque });
}

function rewriteCubicFun(product) {
  const landmark = findFact(product, landmarkFacts);
  const ship = findFact(product, shipFacts);
  const fact = landmark ?? ship ?? {
    subject: product.name,
    copy: `${product.name} gives the CubicFun range a structured display build with a recognisable finished subject.`,
    feature: `${product.name} display subject`,
  };
  const shortDescription = `${product.name} is a CubicFun ${product.category.toLowerCase()} build centred on ${fact.subject}, chosen for customers who want a recognisable finished display piece.`;
  const paragraphs = [
    `${product.name} keeps the current CubicFun display-build positioning while adding clearer subject context for shoppers. ${fact.copy}`,
    'It is listed as a display-focused 3D build in the Iron Sprue catalogue, with unverified dimensions, piece counts or build-time claims deliberately left out of the public copy.',
  ];
  return base(product, shortDescription, paragraphs, [
    fact.feature,
    `${product.category} display build`,
    product.manufacturerReference ? `Manufacturer reference ${product.manufacturerReference}` : '',
  ], { subject: fact.subject, structure: product.category });
}

function rewritePintoo(product) {
  const fact = findFact(product, pintooForms) ?? {
    subject: product.name,
    form: product.category,
    copy: `${product.name} is selected for its decorative finished-object character.`,
  };
  const form = fact.form ?? product.category.toLowerCase();
  const shortDescription = `${product.name} is a Pintoo ${form} puzzle with a decorative finished form, chosen for customers who want the completed build to stay on show.`;
  const paragraphs = [
    `${product.name} expands the current Pintoo product copy with clearer display context. ${fact.copy}`,
    'The page focuses on the verified format and visual theme rather than guessing dimensions, piece counts or difficulty where those facts are not currently canonical.',
  ];
  return base(product, shortDescription, paragraphs, [
    `${fact.subject} decorative theme`,
    `${form} finished form`,
    product.pieces ? `${product.pieces} pieces` : '',
    product.manufacturerReference ? `Manufacturer reference ${product.manufacturerReference}` : '',
  ], { subject: fact.subject, structure: form });
}

function toolUse(product) {
  const name = product.name.toLowerCase();
  if (name.includes('micro tips') || name.includes('glue tips')) return 'controlled adhesive application in small joins, seams and hard-to-reach modelling areas';
  if (name.includes('speedbond')) return 'wood, card and porous-material bonding where a clean modelling adhesive is useful';
  if (name.includes('super phatic')) return 'fine capillary adhesive work where glue needs to run neatly into close-fitting joints';
  if (name.includes('citrus grip')) return 'temporary grip and positioning work during modelling and finishing';
  if (name.includes('cyano')) return 'fast cyanoacrylate bonding for small modelling parts and quick bench repairs';
  if (name.includes('glue buster')) return 'loosening and cleaning adhesive mistakes where the manufacturer guidance allows';
  if (name.includes('glue n glaze')) return 'clear glazing and small window work as well as light adhesive tasks';
  if (name.includes('epoxy')) return 'strong two-part bonding where a slower, more robust adhesive is needed';
  if (name.includes('fix n flex')) return 'flexible bonding jobs where a rigid joint is not ideal';
  if (name.includes('masking magic')) return 'masking and edge control before painting or finishing';
  if (name.includes('drill')) return 'small drilling tasks, pilot holes and precision preparation at the modelling bench';
  if (name.includes('loupe')) return 'magnified inspection, close painting checks and fine assembly work';
  if (name.includes('pin vice')) return 'hand drilling and controlled burr work on small parts';
  if (name.includes('tweezer')) return 'holding, placing and positioning small parts without using fingertip pressure';
  if (name.includes('plier')) return 'gripping, bending and controlled handling of wire, tabs or small parts';
  if (name.includes('knife') || name.includes('blade')) return 'trimming, cutting and cleaning up parts, packaging or modelling material';
  if (name.includes('tool case')) return 'organising small tools so knives, files and tweezers are easier to keep together';
  if (name.includes('sander')) return 'shaping and smoothing edges during model preparation and finishing';
  if (name.includes('file')) return 'controlled filing, shaping and clean-up on small modelling surfaces';
  if (name.includes('calliper')) return 'checking small measurements and comparing part sizes at the bench';
  return 'general model-making preparation and finishing work';
}

function rewriteTool(product) {
  const use = toolUse(product);
  const shortDescription = `${product.name} is a practical ${product.brand} bench item for ${use}.`;
  const paragraphs = [
    `${product.name} is listed as a functional workshop product rather than a display kit. It helps with ${use}, giving builders a clearer reason to add it to a modelling setup.`,
    'The description stays focused on practical use and avoids unsupported claims about materials, compatibility, safety ratings or professional performance beyond the verified catalogue data.',
  ];
  return base(product, shortDescription, paragraphs, [
    sentenceCase(use),
    product.category,
    product.manufacturerReference ? `Manufacturer reference ${product.manufacturerReference}` : '',
  ]);
}

function sentenceCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function rewrite(product) {
  if (product.brand === 'Aoshima') return rewriteAoshima(product);
  if (product.brand === 'CubicFun') return rewriteCubicFun(product);
  if (product.brand === 'Pintoo') return rewritePintoo(product);
  return rewriteTool(product);
}

function audit(products) {
  const descriptions = new Map();
  for (const product of products) {
    const key = product.description?.trim();
    if (!key) continue;
    descriptions.set(key, [...(descriptions.get(key) ?? []), product.sku]);
  }
  return {
    totalProducts: products.length,
    emptyDescriptions: products.filter((product) => !product.shortDescription || !product.description).map((product) => product.sku),
    duplicateDescriptions: [...descriptions.entries()].filter(([, skus]) => skus.length > 1).map(([description, skus]) => ({ skus, preview: description.slice(0, 120) })),
    speculativeClaims: products
      .filter((product) => /\b\d{3,4}\s?(bhp|hp|ps|kw)\b|officially licensed|non-toxic|professional-grade|waterproof|age[s ]+\d+\+|\b\d+\s*pieces\b/i.test(`${product.shortDescription} ${product.description}`) && !String(product.pieces ?? '').trim())
      .map((product) => product.sku),
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

async function applyToDatabase(products) {
  if (skipDb) return { attempted: false, updated: 0, error: 'Skipped by --skip-db.' };
  loadEnv();
  const connectionString = process.env.IRON_SPRUE_ADMIN_DATABASE_URL?.trim();
  if (!connectionString) {
    return { attempted: false, updated: 0, error: 'IRON_SPRUE_ADMIN_DATABASE_URL is required.' };
  }
  const [{ PrismaClient }, { PrismaPg }] = await Promise.all([import('@prisma/client'), import('@prisma/adapter-pg')]);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
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
}

const originalProducts = readJson(launchProductsPath);
const rewrittenProducts = originalProducts.map(rewrite);
const originalManifest = readJson(launchManifestPath);
const rewrittenBySku = new Map(rewrittenProducts.map((product) => [product.sku, product]));
const rewrittenManifest = {
  ...originalManifest,
  products: originalManifest.products.map((product) => ({ ...product, ...rewrittenBySku.get(product.sku) })),
};
const quality = audit(rewrittenProducts);
let dbApply = { attempted: false, updated: 0, error: 'Dry run.' };

if (apply) {
  writeJson(launchProductsPath, rewrittenProducts);
  writeJson(launchManifestPath, rewrittenManifest);
  try {
    dbApply = await applyToDatabase(rewrittenProducts);
  } catch (error) {
    dbApply = {
      attempted: true,
      updated: 0,
      errorCategory: 'IRON_SPRUE_CONTENT_APPLY_FAILED',
      error: error?.message || String(error),
    };
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  applied: apply,
  changedProducts: rewrittenProducts.filter((product, index) => JSON.stringify(product) !== JSON.stringify(originalProducts[index])).length,
  quality,
  dbApply,
  samples: rewrittenProducts.slice(0, 5).map((product) => ({
    sku: product.sku,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
  })),
};
writeJson(reportPath, report);

console.log(JSON.stringify({
  applied: apply,
  changedProducts: report.changedProducts,
  quality,
  dbApply,
  reportPath: path.relative(repoRoot, reportPath),
}, null, 2));
