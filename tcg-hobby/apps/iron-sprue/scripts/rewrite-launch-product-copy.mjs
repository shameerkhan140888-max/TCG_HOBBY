import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const launchProductsPath = path.join(appRoot, 'data', 'launch-products.json');
const launchManifestPath = path.join(appRoot, 'data', 'final-launch-catalogue-manifest.json');
const reportPath = path.join(appRoot, 'data', 'product-copy-rewrite-report.json');
const apply = process.argv.includes('--apply');
const skipDb = process.argv.includes('--skip-db');

const vehicleFacts = [
  {
    match: /Toyota 2000GT/i,
    subject: 'Toyota 2000GT',
    shortSubject: 'Toyota 2000GT',
    marque: 'Toyota',
    copy: 'The Toyota 2000GT is one of Japan\'s landmark sports cars, remembered for its long-bonnet coupe profile, Yamaha-linked engineering story and rare 1960s grand-touring character.',
    feature: 'Toyota 2000GT grand-touring subject',
    displayUse: 'a classic Japanese sports-car line-up',
  },
  {
    match: /Suzuki Jimny/i,
    subject: 'Suzuki Jimny',
    shortSubject: 'Jimny',
    marque: 'Suzuki',
    copy: 'The Suzuki Jimny is a compact off-road icon, known for its upright stance, short wheelbase and practical little-4x4 personality.',
    feature: 'Suzuki Jimny compact off-road subject',
    displayUse: 'an off-road or compact-vehicle shelf',
  },
  {
    match: /Nissan Fairlady Z|S30 Fairlady Z/i,
    subject: 'Nissan Fairlady Z',
    shortSubject: 'Fairlady Z',
    marque: 'Nissan',
    copy: 'The Fairlady Z name is tied to Nissan\'s classic sports-car lineage, with the S30 shape especially loved for its low nose, fastback roofline and clean long-bonnet proportions.',
    feature: 'Nissan Fairlady Z sports-car subject',
    displayUse: 'a Japanese performance-car collection',
  },
  {
    match: /Lamborghini Aventador/i,
    subject: 'Lamborghini Aventador',
    shortSubject: 'Aventador',
    marque: 'Lamborghini',
    copy: 'The Lamborghini Aventador channels the marque\'s naturally aspirated V12 supercar drama: sharp surfaces, a low wedge stance and unmistakable poster-car presence.',
    feature: 'Lamborghini Aventador V12 supercar subject',
    displayUse: 'a modern supercar display',
  },
  {
    match: /Skyline GTR/i,
    subject: 'Nissan Skyline GT-R',
    shortSubject: 'Skyline GT-R',
    marque: 'Nissan',
    copy: 'The Skyline GT-R is a Japanese performance legend, recognised for its purposeful coupe stance, motorsport aura and deep tuning-culture following.',
    feature: 'Nissan Skyline GT-R performance subject',
    displayUse: 'a tuner or motorsport-inspired shelf',
  },
  {
    match: /Toyota GR86/i,
    subject: 'Toyota GR86',
    shortSubject: 'GR86',
    marque: 'Toyota',
    copy: 'The Toyota GR86 is a modern driver-focused coupe, built around compact proportions, rear-wheel-drive balance and the accessible sports-car spirit of Toyota Gazoo Racing.',
    feature: 'Toyota GR86 modern sports-coupe subject',
    displayUse: 'a modern Japanese sports-coupe line-up',
  },
  {
    match: /Countach LPI 800-4/i,
    subject: 'Lamborghini Countach LPI 800-4',
    shortSubject: 'Countach LPI 800-4',
    marque: 'Lamborghini',
    copy: 'The Countach LPI 800-4 revisits Lamborghini\'s wedge-shaped Countach heritage through a limited modern hybrid V12 interpretation with dramatic vents, angles and stance.',
    feature: 'Lamborghini Countach LPI 800-4 subject',
    displayUse: 'a Lamborghini or wedge-supercar display',
  },
  {
    match: /Pagani Zonda F/i,
    subject: 'Pagani Zonda F',
    shortSubject: 'Zonda F',
    marque: 'Pagani',
    copy: 'The Pagani Zonda F is a boutique hypercar subject with exposed aerodynamic drama, an AMG V12 character and the sculptural detailing that makes Pagani builds so distinctive.',
    feature: 'Pagani Zonda F hypercar subject',
    displayUse: 'a hypercar-focused display',
  },
  {
    match: /Honda Motocompo/i,
    subject: 'Honda Motocompo',
    shortSubject: 'Motocompo',
    marque: 'Honda',
    copy: 'The Honda Motocompo is a tiny folding scooter designed around clever urban mobility, famous for its compact shape and its connection to Honda\'s early-1980s City car.',
    feature: 'Honda Motocompo folding scooter subject',
    displayUse: 'a small-scale Honda or city-vehicle collection',
  },
  {
    match: /Back to the Future Part III/i,
    subject: 'Back to the Future Part III time machine',
    shortSubject: 'Part III time machine',
    marque: 'DeLorean',
    copy: 'This subject presents the DeLorean time machine in its Part III treatment, pairing the familiar stainless-steel movie silhouette with western-era detail cues.',
    feature: 'Back to the Future Part III display subject',
    displayUse: 'a film-vehicle display',
  },
  {
    match: /Back to the Future Part II/i,
    subject: 'Back to the Future Part II time machine',
    shortSubject: 'Part II time machine',
    marque: 'DeLorean',
    copy: 'This subject captures the DeLorean time machine in its Part II form, a film-vehicle favourite with gullwing-door proportions, sci-fi hardware and instant shelf recognition.',
    feature: 'Back to the Future Part II display subject',
    displayUse: 'a screen-vehicle collection',
  },
];

const landmarkFacts = [
  { match: /Burj Khalifa/i, subject: 'Burj Khalifa', copy: 'Dubai\'s Burj Khalifa is the world\'s tallest building, a needle-like skyscraper whose tiered form gives the finished model a strong vertical display presence.', feature: 'Burj Khalifa skyscraper subject', audience: 'Ideal for a skyline-themed display or anyone drawn to bold modern architecture.' },
  { match: /Brandenburg Gate/i, subject: 'Brandenburg Gate', copy: 'Berlin\'s Brandenburg Gate is a neoclassical landmark with a six-column gateway profile and a long association with the city\'s civic identity.', feature: 'Brandenburg Gate architectural subject', audience: 'A strong choice for builders who like historic city landmarks with a clean architectural outline.' },
  { match: /St Peter/i, subject: 'St Peter\'s Basilica', copy: 'St Peter\'s Basilica in Vatican City is one of the great churches of Renaissance architecture, recognised for its monumental dome and grand piazza setting.', feature: 'St Peter\'s Basilica architectural subject', audience: 'The dome and piazza profile make it a calm centrepiece for an architecture shelf.' },
  { match: /St Basil/i, subject: 'St Basil\'s Cathedral', copy: 'St Basil\'s Cathedral is one of Moscow\'s most recognisable landmarks, known for its clustered towers, colourful domes and storybook silhouette.', feature: 'St Basil\'s Cathedral architectural subject', audience: 'Its distinctive outline suits customers who want a more colourful landmark subject.' },
  { match: /Chateau de Chenonceau/i, subject: 'Chateau de Chenonceau', copy: 'Chateau de Chenonceau is a Loire Valley landmark famed for its elegant arches spanning the River Cher and its refined French Renaissance character.', feature: 'Chateau de Chenonceau architectural subject', audience: 'This is a gentler architecture pick, with a chateau profile that feels more decorative than urban.' },
  { match: /Thomas Jefferson Memorial/i, subject: 'Thomas Jefferson Memorial', copy: 'The Thomas Jefferson Memorial in Washington, D.C. is a domed classical monument with an open colonnade and a calm, symmetrical display profile.', feature: 'Thomas Jefferson Memorial architectural subject', audience: 'Its balanced circular form gives the finished build a neat, display-friendly presence.' },
  { match: /St Patrick/i, subject: 'St Patrick\'s Cathedral', copy: 'St Patrick\'s Cathedral in New York is a Gothic Revival landmark, giving the model pointed arches, twin-spire character and a recognisable city-centre silhouette.', feature: 'St Patrick\'s Cathedral architectural subject', audience: 'A good fit for anyone who prefers vertical Gothic detail and city architecture.' },
  { match: /Basilica of the National Shrine/i, subject: 'Basilica of the National Shrine', copy: 'The Basilica of the National Shrine is represented as a large-scale domed church subject, with layered architectural massing and strong display symmetry.', feature: 'Basilica display-build subject', audience: 'The broad, layered form gives the finished model a substantial architectural feel.' },
  { match: /Magic Box\s+Underwater World/i, subject: 'Underwater World Magic Box', copy: 'Underwater World uses the Magic Box format for a compact ocean-themed scene with depth, colour and small display detail.', feature: 'Underwater World display scene', audience: 'It suits customers looking for a smaller scene build rather than a traditional landmark model.' },
  { match: /Magic Box\s+London at Night/i, subject: 'London at Night Magic Box', copy: 'London at Night uses the Magic Box format for a city-atmosphere display, giving the finished piece a compact illuminated-street-scene feel.', feature: 'London at Night display scene', audience: 'A nice option for customers who like miniature scenes with evening-city character.' },
];

const shipFacts = [
  { match: /Era of Navigation/i, subject: 'Era of Navigation', copy: 'Era of Navigation gives the range a compact maritime display build, focused on the exploratory age-of-sail mood rather than a single modern vehicle subject.', feature: 'Maritime exploration subject', audience: 'It works well as a giftable shelf build for fans of old maps, sailing routes and exploration themes.' },
  { match: /Santa Maria/i, subject: 'Santa Maria', copy: 'Santa Maria is a historic sailing-ship subject associated with Christopher Columbus, bringing masts, sails and old-world maritime character to the display shelf.', feature: 'Santa Maria sailing-ship subject', audience: 'The classic ship profile gives the finished model a traditional nautical look.' },
  { match: /Queen Anne/i, subject: 'Queen Anne\'s Revenge', copy: 'Queen Anne\'s Revenge is tied to pirate history and Blackbeard legend, making it a dramatic sailing-ship subject with strong adventure appeal.', feature: 'Queen Anne\'s Revenge pirate-ship subject', audience: 'A bolder maritime option for customers who want a ship build with a darker adventure story.' },
  { match: /Two Masted Schooner/i, subject: 'Two Masted Schooner', copy: 'The Two Masted Schooner focuses on a classic sailing profile, with the twin-mast shape giving the completed build a balanced nautical display form.', feature: 'Two-masted schooner subject', audience: 'Its simpler sailing silhouette makes it a tidy companion to larger ship or harbour displays.' },
];

const pintooForms = [
  { match: /Koi Carp and Lotus/i, subject: 'Koi Carp and Lotus', form: 'vase', copy: 'The koi and lotus artwork gives the finished vase a calm decorative character, with fish, flower and ceramic-style patterning designed to stay on display.', audience: 'It suits a quiet display space where the finished object can read as decor as much as puzzle.' },
  { match: /Magpies on a Plum Tree/i, subject: 'Magpies on a Plum Tree', form: 'vase', copy: 'The magpie and plum-tree design leans into traditional decorative motifs, turning the puzzle build into a finished object with an elegant display feel.', audience: 'Choose it for a more refined illustrated vase theme with bird and blossom detail.' },
  { match: /Children/i, subject: 'Children', form: 'vase', copy: 'The Children vase brings a softer illustrated motif to the Pintoo range, suited to customers who want a display puzzle with a lighter decorative tone.', audience: 'Its gentler artwork makes it a friendly gift option or a softer accent for a shelf.' },
  { match: /Classic Rose/i, subject: 'Classic Rose', form: 'clock', copy: 'Classic Rose combines a floral puzzle artwork with a clock-shaped finished form, so the completed build reads as a decorative object rather than a flat puzzle.', audience: 'The floral clock format gives it a useful focal shape for a side table or display nook.' },
  { match: /Into the Woods/i, subject: 'Into the Woods', form: 'clock', copy: 'Into the Woods gives the clock format a woodland-themed mood, pairing the puzzle process with a finished piece made for display.', audience: 'It is a warmer, storybook-style option for customers who prefer nature-led artwork.' },
  { match: /Singing Birds and Fragrant Flowers/i, subject: 'Singing Birds and Fragrant Flowers', form: 'clock', copy: 'Singing Birds and Fragrant Flowers pairs a clock-shaped finished form with a bright nature illustration, giving the build a practical-looking decorative profile.', audience: 'It suits customers who want a clock-format puzzle with a lively bird-and-flower finish.' },
  { match: /Red Carpet of Life/i, subject: 'Red Carpet of Life', form: 'flowerpot', copy: 'Red Carpet of Life uses the flowerpot format for a compact decorative build, combining puzzle assembly with a display-ready finished shape.', audience: 'Its small footprint makes it an easy entry point into Pintoo display objects.' },
  { match: /Slow Down/i, subject: 'Slow Down', form: 'flowerpot', copy: 'Slow Down brings a relaxed decorative theme to the flowerpot format, making it a small display piece with more personality than a conventional puzzle.', audience: 'A relaxed pick for customers who want a softer, slower-feeling puzzle project.' },
  { match: /Jigsaw Lantern - Famous Architecture/i, subject: 'Famous Architecture', form: 'lantern', copy: 'Famous Architecture gathers landmark-inspired artwork into a lantern-style form, giving the finished build an architectural theme with a more sculptural outline.', audience: 'It works for customers who like landmark artwork but want a compact decorative lantern shape.' },
  { match: /Floral/i, subject: 'Floral', form: 'lantern', copy: 'The Floral lantern focuses on decorative flower artwork, with the built form giving the puzzle a more sculptural finished presence.', audience: 'A floral choice for customers who want the finished lantern shape to soften a display space.' },
  { match: /Derjen Dancing Girls/i, subject: 'Derjen Dancing Girls', form: 'lantern', copy: 'Derjen Dancing Girls brings figure-led artwork to the lantern format, creating a display puzzle with movement and illustration at its centre.', audience: 'The figure-led artwork gives this lantern a livelier, more illustrative personality.' },
  { match: /Blue Marble/i, subject: 'The Blue Marble', form: 'globe', copy: 'The Blue Marble turns Earth imagery into a globe-format puzzle, giving the completed build a rounded display object with recognisable world-map appeal.', audience: 'A natural fit for map lovers, desk displays or anyone who wants a round finished puzzle form.' },
  { match: /Le Papillon et la Fleur/i, subject: 'Le Papillon et la Fleur', form: 'screen', copy: 'Le Papillon et la Fleur pairs butterfly and floral artwork with the screen format, creating a decorative build intended to remain visible after assembly.', audience: 'Its butterfly-and-flower artwork gives the screen format a delicate decorative finish.' },
  { match: /Jigsaw Screen - Famous Architectures/i, subject: 'Famous Architectures', form: 'screen', copy: 'Famous Architectures uses the screen format for a panel-style display piece built around landmark artwork and architectural rhythm.', audience: 'A good pick for customers who want architecture themes in a slimmer, decorative screen form.' },
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
  const shortDescription = `${product.name} is a ${scaleText}Aoshima ${fact.feature.replace(/ subject$/i, '')}${colour ? ` in ${colour}` : ''}, suited to ${fact.displayUse ?? 'a themed vehicle line-up'}.`;
  const paragraphs = [
    fact.copy,
    sentenceList([
      product.scale ? `Presented in ${product.scale} scale, it is a compact choice for ${fact.displayUse ?? 'a themed vehicle line-up'}.` : `It is a compact choice for ${fact.displayUse ?? 'a themed vehicle line-up'}.`,
      colour ? `Choose this ${colour} version if that finish best suits your collection.` : '',
      product.manufacturerReference ? `Aoshima reference ${product.manufacturerReference}.` : '',
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
  const category = product.category.toLowerCase();
  const shortDescription = `${product.name} is a CubicFun ${category} build centred on ${fact.subject}, made for a finished model you can keep on display.`;
  const paragraphs = [
    `This CubicFun build focuses on ${fact.subject}. ${fact.copy}`,
    sentenceList([
      fact.audience ?? `It works well for customers who enjoy display builds with a clear visual identity.`,
      product.manufacturerReference ? `CubicFun reference ${product.manufacturerReference}.` : '',
    ]),
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
    fact.copy,
    sentenceList([
      fact.audience ?? `It is a good fit for puzzle builders who want the making process and the finished object to feel equally important.`,
      product.pieces ? `Includes ${product.pieces} pieces.` : '',
      product.manufacturerReference ? `Pintoo reference ${product.manufacturerReference}.` : '',
    ]),
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
  if (name.includes('micro tips')) return { use: 'controlled adhesive application in small joins and hard-to-reach modelling areas', context: 'Useful when the job needs a finer glue path than the bottle nozzle alone can give.' };
  if (name.includes('glue tips')) return { use: 'refreshing or extending adhesive nozzles for neater glue placement', context: 'A sensible add-on for builders who use cyano or specialist adhesives regularly.' };
  if (name.includes('speedbond')) return { use: 'wood, card and porous-material bonding where a clean modelling adhesive is useful', context: 'Best suited to railway, scenery, wooden-kit and general craft-style bench work.' };
  if (name.includes('super phatic')) return { use: 'fine capillary adhesive work where glue needs to run neatly into close-fitting joints', context: 'A good bench choice when a joint is already aligned and needs adhesive drawn into place.' };
  if (name.includes('citrus grip')) return { use: 'temporary grip and positioning work during modelling and finishing', context: 'Handy when parts need a little control before the final fix or finish is applied.' };
  if (name.includes('roket hot')) return { use: 'fast cyanoacrylate bonding for quick joins and small modelling repairs', context: 'Keep it for jobs where speed matters and the parts are ready to place accurately.' };
  if (name.includes('roket rapid')) return { use: 'medium-speed cyanoacrylate bonding for small assemblies and bench repairs', context: 'The medium pace gives a little more handling time than the fastest cyano options.' };
  if (name.includes('odourless cyano')) return { use: 'cyanoacrylate bonding where a lower-odour option is preferred', context: 'A useful alternative for quick adhesive jobs when strong cyano fumes are unwelcome.' };
  if (name.includes('glue buster')) return { use: 'loosening and cleaning adhesive mistakes where the manufacturer guidance allows', context: 'Worth keeping nearby for rescue work, clean-up and correcting small glue mishaps.' };
  if (name.includes('glue n glaze')) return { use: 'clear glazing and small window work as well as light adhesive tasks', context: 'Particularly useful for windows, canopies and small clear-detail jobs.' };
  if (name.includes('epoxy')) return { use: 'strong two-part bonding where a more robust adhesive is needed', context: 'A better fit for heavier joins or mixed materials than a quick detail adhesive.' };
  if (name.includes('fix n flex')) return { use: 'flexible bonding jobs where a rigid joint is not ideal', context: 'Use it where a little movement or flexibility matters after the parts are joined.' };
  if (name.includes('masking magic') && name.includes('opaque')) return { use: 'masking and edge control before painting or finishing', context: 'The opaque finish makes it easier to see where the mask has been applied.' };
  if (name.includes('masking magic') && name.includes('clear')) return { use: 'masking and edge control before painting or finishing', context: 'The clear tint suits jobs where visibility of the underlying area still matters.' };
  if (name.includes('drill')) return { use: 'small drilling tasks, pilot holes and precision preparation at the modelling bench', context: 'A useful set for opening holes, preparing fittings and working carefully on small parts.' };
  if (name.includes('loupe')) return { use: 'magnified inspection, close painting checks and fine assembly work', context: 'Helpful for decals, tiny joins, paint edges and detail checks under stronger magnification.' };
  if (name.includes('pin vice')) return { use: 'hand drilling and controlled burr work on small parts', context: 'A manual option for careful drilling where powered tools would be too aggressive.' };
  if (name.includes('tweezer')) return { use: 'holding, placing and positioning small parts without using fingertip pressure', context: 'Ideal for decals, small kit parts, puzzle tabs and careful placement work.' };
  if (name.includes('long nose')) return { use: 'gripping, bending and controlled handling of wire, tabs or small parts', context: 'The longer nose gives extra reach when parts are awkward to hold by hand.' };
  if (name.includes('bent nose')) return { use: 'angled gripping and positioning where straight pliers cannot comfortably reach', context: 'Useful around tight corners, recessed areas and small assemblies.' };
  if (name.includes('retractable') && name.includes('blades')) return { use: 'replacing worn blades for cleaner trimming and cutting', context: 'Fresh blades help keep cuts neater and reduce the temptation to force a dull edge.' };
  if (name.includes('retractable') && name.includes('knife')) return { use: 'controlled trimming and cutting with a covered retractable blade format', context: 'A practical everyday cutter for packaging, sheet material and general bench prep.' };
  if (name.includes('snap-off')) return { use: 'light trimming and cutting with snap-off blade sections', context: 'A straightforward spare cutter for general craft and modelling tasks.' };
  if (name.includes('11mm hobby knife')) return { use: 'trimming, cutting and cleaning up small modelling material', context: 'Keep it close for neat cuts, part clean-up and general bench preparation.' };
  if (name.includes('tool case')) return { use: 'organising small tools so knives, files and tweezers are easier to keep together', context: 'A simple way to stop everyday bench tools disappearing between projects.' };
  if (name.includes('short sander')) return { use: 'shaping and smoothing edges during model preparation and finishing', context: 'The shorter format suits tighter areas and smaller surfaces.' };
  if (name.includes('rigid sander')) return { use: 'flattening and smoothing edges where a firmer sanding face is useful', context: 'Use it when you want a straighter sanding surface and more controlled pressure.' };
  if (name.includes('flexible sander')) return { use: 'smoothing curved or uneven areas during model preparation', context: 'The flexible format helps follow softer shapes without digging in as harshly.' };
  if (name.includes('file')) return { use: 'controlled filing, shaping and clean-up on small modelling surfaces', context: 'A useful choice for tidying tabs, edges and small areas that need more control than sanding alone.' };
  if (name.includes('calliper')) return { use: 'checking small measurements and comparing part sizes at the bench', context: 'Helpful for dry-fitting, spacing, matching parts and checking small dimensions.' };
  return { use: 'general model-making preparation and finishing work', context: 'A practical addition for keeping the bench better equipped between builds.' };
}

function rewriteTool(product) {
  const { use, context } = toolUse(product);
  const shortDescription = `${product.name} is a practical ${product.brand} bench item for ${use}.`;
  const paragraphs = [
    `${product.name} helps with ${use}. ${context}`,
    sentenceList([
      product.manufacturerReference ? `${product.brand} reference ${product.manufacturerReference}.` : '',
    ]),
  ].filter(Boolean);
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

function reviewProducts(products) {
  return products.map((product) => {
    const text = `${product.shortDescription ?? ''}\n${product.description ?? ''}`;
    const issues = [];
    if (!product.shortDescription?.trim()) issues.push('Missing short description.');
    if (!product.description?.trim()) issues.push('Missing PDP description.');
    if (/unverified|verified catalogue|canonical|current .*positioning|without the product page relying|unsupported claims|corporate/i.test(text)) {
      issues.push('Contains admin/process wording.');
    }
    if ((product.description ?? '').includes(`${product.name} brings`) || (product.description ?? '').includes(`${product.name} turns`)) {
      issues.push('Contains awkward product-name echo.');
    }
    if (/\b\d{3,4}\s?(bhp|hp|ps|kw)\b|non-toxic|professional-grade|waterproof|age[s ]+\d+\+/i.test(text)) {
      issues.push('Contains claim requiring source verification.');
    }
    return {
      sku: product.sku,
      brand: product.brand,
      name: product.name,
      status: issues.length ? 'REVIEW_REQUIRED' : 'PASS',
      issues,
    };
  });
}

function assertRailwayProductionTarget(getIronSprueAdminDatabaseTargetInfo) {
  const target = getIronSprueAdminDatabaseTargetInfo();
  const safeTarget = {
    source: target.source,
    environment: target.environment,
    label: target.label,
    host: target.host,
    port: target.port,
    database: target.database,
  };
  if (target.source !== 'IRON_SPRUE_ADMIN_DATABASE_URL' || target.label !== 'RAILWAY PRODUCTION') {
    throw new Error(`Refusing product-copy mutation for non-Railway admin target: ${JSON.stringify(safeTarget)}`);
  }
  return safeTarget;
}

async function applyToDatabase(products) {
  if (skipDb) return { attempted: false, updated: 0, error: 'Skipped by --skip-db.' };
  const {
    getIronSprueAdminDatabaseTargetInfo,
    getIronSprueAdminPrisma,
    resetIronSprueAdminPrisma,
  } = await import('../../../packages/database/src/index.ts');
  const target = assertRailwayProductionTarget(getIronSprueAdminDatabaseTargetInfo);
  const prisma = getIronSprueAdminPrisma();
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
    await resetIronSprueAdminPrisma();
  }
  return { attempted: true, updated, target, error: null };
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
  reviewedProducts: reviewProducts(rewrittenProducts),
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
