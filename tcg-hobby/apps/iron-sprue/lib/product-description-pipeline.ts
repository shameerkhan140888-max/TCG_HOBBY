export type IronSprueDescriptionField =
  | 'title'
  | 'shortDescription'
  | 'fullDescription'
  | 'featureBullets'
  | 'whatsIncluded'
  | 'skillLevel'
  | 'scale'
  | 'dimensions'
  | 'recommendedTools'
  | 'recommendedPaints'
  | 'relatedAccessories'
  | 'specifications';

export type IronSprueDescriptionSource = {
  sourceType: 'manufacturer' | 'authorised-distributor' | 'purchase-order' | 'manual-admin';
  sourceName: string;
  url?: string;
  factualUseOnly: boolean;
};

export type IronSprueDescriptionPlan = {
  requiredFields: readonly IronSprueDescriptionField[];
  allowedSources: readonly IronSprueDescriptionSource[];
  rules: readonly string[];
};

export const IRON_SPRUE_DESCRIPTION_FIELDS: readonly IronSprueDescriptionField[] = [
  'title',
  'shortDescription',
  'fullDescription',
  'featureBullets',
  'whatsIncluded',
  'skillLevel',
  'scale',
  'dimensions',
  'recommendedTools',
  'recommendedPaints',
  'relatedAccessories',
  'specifications',
];

export const IRON_SPRUE_DESCRIPTION_RULES = [
  'Do not copy supplier descriptions wholesale.',
  'Use manufacturer and authorised distributor information as factual source material only.',
  'Do not invent specifications, contents, colours, dimensions, skill levels or scale.',
  'Write original Iron Sprue copy in a concise premium retail tone.',
  'Keep operational claims such as stock, dispatch and pricing outside long-form descriptions.',
] as const;

export function createIronSprueDescriptionPlan(sources: readonly IronSprueDescriptionSource[]): IronSprueDescriptionPlan {
  if (sources.length === 0) throw new Error('At least one factual source is required before generating Iron Sprue product copy.');
  if (sources.some((source) => source.sourceType === 'authorised-distributor' && !source.factualUseOnly)) {
    throw new Error('Authorised distributor descriptions may only be used as factual source material.');
  }

  return {
    requiredFields: IRON_SPRUE_DESCRIPTION_FIELDS,
    allowedSources: sources.map((source) => ({ ...source, factualUseOnly: true })),
    rules: IRON_SPRUE_DESCRIPTION_RULES,
  };
}

export type IronSprueDescriptionProduct = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  productType: string;
  supplierSku?: string;
  manufacturerReference?: string;
  scale?: string;
  pieces?: string | number;
  skillLevel?: string;
  buildLevel?: string;
  difficulty?: string;
  glueRequired?: boolean;
  paintRequired?: boolean;
  shortDescription?: string;
  description?: string;
  features?: string[];
  specifications?: Record<string, unknown>;
  sourceMediaLinks?: Array<{ url: string; sourceType?: string; permissionBasis?: string }>;
  benchmarkUrl?: string | null;
};

export type IronSprueGeneratedDescription = {
  shortDescription: string;
  description: string;
  features: string[];
  specifications: Record<string, string>;
  seoTitle: string;
  metaDescription: string;
  omittedUncertainSpecifications: string[];
  sourceConfidence: 'sufficient' | 'limited';
};

export function isPlaceholderDescription(product: Pick<IronSprueDescriptionProduct, 'shortDescription' | 'description'>) {
  const copy = `${product.shortDescription ?? ''} ${product.description ?? ''}`.trim();
  if (!copy) return true;

  return /selected for (the )?(Iron Sprue )?launch|final box-specific details|manufacturer specifications required|for hobby bench preparation|modelling, assembly and finishing work|decorative puzzle object selected/i.test(copy);
}

export function generateIronSprueProductDescription(product: IronSprueDescriptionProduct): IronSprueGeneratedDescription {
  const factualSpecs = buildFactualSpecifications(product);
  const omittedUncertainSpecifications = omittedSpecificationLabels(factualSpecs);
  const sourceConfidence = hasSourceMaterial(product) ? 'sufficient' : 'limited';

  if (product.brand === 'Aoshima') {
    return createAoshimaCopy(product, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
  }

  if (product.brand === 'CubicFun') {
    return createCubicFunCopy(product, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
  }

  if (product.brand === 'Pintoo') {
    return createPintooCopy(product, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
  }

  if (product.brand === 'Deluxe Materials') {
    return createDeluxeMaterialsCopy(product, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
  }

  if (product.brand === 'OcCre Creations') {
    return createOccreCopy(product, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
  }

  if (product.brand === 'Expo Tools' || product.brand === 'Tasma') {
    return createToolCopy(product, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
  }

  return createGenericCopy(product, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function buildFactualSpecifications(product: IronSprueDescriptionProduct) {
  const specs: Record<string, string> = {};

  if (product.brand) specs.manufacturer = product.brand;
  if (product.category) specs.category = product.category;
  if (product.productType) specs.productType = product.productType;
  if (product.scale) specs.scale = product.scale;
  appendStringSpec(specs, 'pieces', product.pieces);
  appendStringSpec(specs, 'buildLevel', product.buildLevel ?? product.skillLevel ?? product.difficulty);
  if (typeof product.glueRequired === 'boolean') specs.glueRequired = product.glueRequired ? 'Yes' : 'No';
  if (typeof product.paintRequired === 'boolean') specs.paintRequired = product.paintRequired ? 'Yes' : 'No';
  if (product.specifications && typeof product.specifications === 'object') {
    appendStringSpec(specs, 'scale', product.specifications.scale);
    appendStringSpec(specs, 'pieces', product.specifications.pieces ?? product.specifications.pieceCount);
    appendStringSpec(specs, 'buildLevel', product.specifications.buildLevel ?? product.specifications.skillLevel ?? product.specifications.difficulty);
    appendStringSpec(specs, 'dimensions', product.specifications.dimensions);
    appendStringSpec(specs, 'contents', product.specifications.contents);
  }

  return specs;
}

function omittedSpecificationLabels(specifications: Record<string, string>) {
  return [
    { key: 'dimensions', label: 'dimensions' },
    { key: 'pieces', label: 'piece count' },
    { key: 'safetyAgeGuidance', label: 'age rating' },
    { key: 'buildLevel', label: 'skill level' },
    { key: 'material', label: 'materials' },
  ]
    .filter(({ key }) => !specifications[key])
    .map(({ label }) => label);
}

function appendStringSpec(specs: Record<string, string>, key: string, value: unknown) {
  if (specs[key]) return;
  if (value == null) return;
  const text = String(value).trim();
  if (text) specs[key] = text;
}

function hasSourceMaterial(product: IronSprueDescriptionProduct) {
  return Boolean(product.benchmarkUrl || product.sourceMediaLinks?.length || product.supplierSku || product.manufacturerReference);
}

function colourFromTitle(name: string) {
  const colours = ['White Pearl', 'Red Pearl', 'Spark Red', 'White', 'Silver', 'Blue', 'Red', 'Brown', 'Green'];
  return colours.find((colour) => new RegExp(`\\b${escapeRegExp(colour)}\\b`, 'i').test(name));
}

function titleWithoutColour(name: string) {
  const colour = colourFromTitle(name);
  return colour ? name.replace(new RegExp(`\\b${escapeRegExp(colour)}\\b`, 'i'), '').replace(/\s{2,}/g, ' ').trim() : name;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function customerFeatureFallback(product: IronSprueDescriptionProduct, label: string) {
  return `${product.brand} ${label}`;
}

function factualFeatureBullets(
  product: IronSprueDescriptionProduct,
  factualSpecs: Record<string, string>,
  primary: string,
) {
  const bullets = [primary];
  if (factualSpecs.scale) bullets.push(`${factualSpecs.scale} scale`);
  if (factualSpecs.pieces) bullets.push(`${factualSpecs.pieces} pieces`);
  if (factualSpecs.buildLevel) bullets.push(`${factualSpecs.buildLevel} build level`);
  if (factualSpecs.contents) bullets.push(factualSpecs.contents);
  if (bullets.length < 2) bullets.push(customerFeatureFallback(product, product.productType.toLowerCase()));
  return Array.from(new Set(bullets));
}

function createBaseResponse(
  product: IronSprueDescriptionProduct,
  shortDescription: string,
  paragraphs: string[],
  features: string[],
  factualSpecs: Record<string, string>,
  omittedUncertainSpecifications: string[],
  sourceConfidence: IronSprueGeneratedDescription['sourceConfidence'],
): IronSprueGeneratedDescription {
  return {
    shortDescription,
    description: paragraphs.join('\n\n'),
    features,
    specifications: factualSpecs,
    seoTitle: `${product.name} | ${product.brand} | Iron Sprue`,
    metaDescription: shortDescription.length > 155 ? `${shortDescription.slice(0, 152).trim()}...` : shortDescription,
    omittedUncertainSpecifications,
    sourceConfidence,
  };
}

function createAoshimaCopy(
  product: IronSprueDescriptionProduct,
  factualSpecs: Record<string, string>,
  omittedUncertainSpecifications: string[],
  sourceConfidence: IronSprueGeneratedDescription['sourceConfidence'],
) {
  const colour = colourFromTitle(product.name);
  const subject = titleWithoutColour(product.name);
  const colourText = colour ? ` in ${colour}` : '';
  const shortDescription = `${product.name} is an Aoshima ${product.productType.toLowerCase()} of the ${subject}${colourText}, selected for builders who want a sharp vehicle subject with strong display presence.`;
  const paragraphs = [
    `This Aoshima release focuses on the ${subject}${colourText}, making it a clean choice for an automotive modelling bench or a finished shelf display.`,
    factualSpecs.scale
      ? `The recorded scale is ${factualSpecs.scale}. It suits modellers looking for a compact vehicle subject with strong visual appeal once completed.`
      : 'It suits modellers looking for a compact vehicle subject with strong visual appeal once completed, whether displayed on its own or alongside a wider automotive collection.',
  ];
  const features = factualFeatureBullets(product, factualSpecs, `${subject}${colour ? ` colour variant: ${colour}` : ''}`);

  return createBaseResponse(product, shortDescription, paragraphs, features, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function createCubicFunCopy(
  product: IronSprueDescriptionProduct,
  factualSpecs: Record<string, string>,
  omittedUncertainSpecifications: string[],
  sourceConfidence: IronSprueGeneratedDescription['sourceConfidence'],
) {
  const shortDescription = `${product.name} is a CubicFun display build for customers who enjoy recognisable architectural or object-based 3D projects with a finished-piece focus.`;
  const paragraphs = [
    `This CubicFun model centres on ${product.name}, giving customers a structured display build rather than another vehicle or bench accessory.`,
    'The finished subject gives the project a clear display purpose, making it a good fit for customers who want an architectural build with a recognisable result.',
  ];
  const features = factualFeatureBullets(product, factualSpecs, `${product.name} subject`);

  return createBaseResponse(product, shortDescription, paragraphs, features, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function createPintooCopy(
  product: IronSprueDescriptionProduct,
  factualSpecs: Record<string, string>,
  omittedUncertainSpecifications: string[],
  sourceConfidence: IronSprueGeneratedDescription['sourceConfidence'],
) {
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
  const shortDescription = `${product.name} is a Pintoo ${format} puzzle selected for customers who want a decorative 3D build with a finished-object feel.`;
  const paragraphs = [
    `This Pintoo piece is built around the ${product.name} design, offering a more giftable and display-led alternative to a conventional flat puzzle.`,
    'The appeal is in the completed decorative form: a puzzle build that can remain on show rather than being packed away after assembly.',
  ];
  const features = factualFeatureBullets(product, factualSpecs, `${product.name} design`);

  return createBaseResponse(product, shortDescription, paragraphs, features, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function createDeluxeMaterialsCopy(
  product: IronSprueDescriptionProduct,
  factualSpecs: Record<string, string>,
  omittedUncertainSpecifications: string[],
  sourceConfidence: IronSprueGeneratedDescription['sourceConfidence'],
) {
  const lowerName = product.name.toLowerCase();
  const use = lowerName.includes('masking')
    ? 'masking and finishing preparation'
    : lowerName.includes('glue') || lowerName.includes('cyano') || lowerName.includes('bond') || lowerName.includes('epoxy') || lowerName.includes('grip')
      ? 'adhesive and assembly work'
      : lowerName.includes('tip') || lowerName.includes('tube')
        ? 'controlled adhesive application'
        : 'bench finishing work';
  const shortDescription = `${product.name} from Deluxe Materials is a specialist bench product for ${use}, selected to support model kit assembly and finishing.`;
  const paragraphs = [
    `${product.name} gives Iron Sprue customers a named Deluxe Materials option for ${use}. It is positioned as a practical workshop companion rather than a display kit.`,
    'Customers should follow the manufacturer packaging for application and safety guidance.',
  ];
  const features = factualFeatureBullets(product, factualSpecs, sentenceCase(use));

  return createBaseResponse(product, shortDescription, paragraphs, features, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function createOccreCopy(
  product: IronSprueDescriptionProduct,
  factualSpecs: Record<string, string>,
  omittedUncertainSpecifications: string[],
  sourceConfidence: IronSprueGeneratedDescription['sourceConfidence'],
) {
  const shortDescription = `${product.name} from OcCre Creations is a workshop accessory selected for careful modelling preparation, finishing or storage tasks.`;
  const paragraphs = [
    `${product.name} adds an OcCre Creations support item to the Iron Sprue bench range. It is listed for customers building out a more organised modelling setup alongside kits, adhesives and finishing tools.`,
    'It is aimed at builders who value a satisfying project and a finished piece with display character.',
  ];
  const features = factualFeatureBullets(product, factualSpecs, 'Supports modelling bench organisation or preparation');

  return createBaseResponse(product, shortDescription, paragraphs, features, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function createToolCopy(
  product: IronSprueDescriptionProduct,
  factualSpecs: Record<string, string>,
  omittedUncertainSpecifications: string[],
  sourceConfidence: IronSprueGeneratedDescription['sourceConfidence'],
) {
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
  const shortDescription = `${product.name} is an Iron Sprue bench essential for ${use}, chosen for model makers building a practical tool setup.`;
  const paragraphs = [
    `${product.name} is a functional tool rather than a kit, helping with ${use} during model, puzzle or display-build preparation.`,
    'It is a straightforward addition to the workbench for modellers building out a reliable set of everyday tools and accessories.',
  ];
  const features = factualFeatureBullets(product, factualSpecs, sentenceCase(use));

  return createBaseResponse(product, shortDescription, paragraphs, features, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function createGenericCopy(
  product: IronSprueDescriptionProduct,
  factualSpecs: Record<string, string>,
  omittedUncertainSpecifications: string[],
  sourceConfidence: IronSprueGeneratedDescription['sourceConfidence'],
) {
  const shortDescription = `${product.name} is a ${product.brand} ${product.productType.toLowerCase()} selected for builders, modellers and hobbyists.`;
  const paragraphs = [
    `${product.name} supports customers looking across model kits, display builds and workshop essentials.`,
    'It has a clear place in the Iron Sprue modelling and hobby range.',
  ];
  const features = factualFeatureBullets(product, factualSpecs, product.productType);

  return createBaseResponse(product, shortDescription, paragraphs, features, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
