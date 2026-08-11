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
  const omittedUncertainSpecifications = ['dimensions', 'piece count', 'age rating', 'skill level', 'materials'].filter((field) => !factualSpecs[field]);
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
  if (product.supplierSku) specs.supplierCode = product.supplierSku;
  if (product.manufacturerReference) specs.manufacturerReference = product.manufacturerReference;
  if (product.scale) specs.scale = product.scale;
  if (typeof product.glueRequired === 'boolean') specs.glueRequired = product.glueRequired ? 'Yes' : 'No';
  if (typeof product.paintRequired === 'boolean') specs.paintRequired = product.paintRequired ? 'Yes' : 'No';

  return specs;
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

function sourceSentence(confidence: IronSprueGeneratedDescription['sourceConfidence']) {
  return confidence === 'sufficient'
    ? 'The listing is built from the launch catalogue and associated supplier or manufacturer source material already captured for Iron Sprue.'
    : 'The listing uses the verified launch catalogue fields currently available; unsupported technical specifications have been deliberately left out.';
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
    description: [...paragraphs, sourceSentence(sourceConfidence)].join('\n\n'),
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
    `This Aoshima release focuses on the ${subject}${colourText}, making it a clean choice for an automotive modelling bench or a finished shelf display. The catalogue title, brand and supplier reference are preserved exactly so the kit can be matched back to the launch stock record.`,
    factualSpecs.scale
      ? `The recorded scale is ${factualSpecs.scale}. Beyond the confirmed catalogue data, Iron Sprue has not added unsupported claims about contents, dimensions, paint requirements or assembly method.`
      : 'Scale, contents and assembly requirements are not stated in the current verified catalogue fields, so those details are intentionally omitted until the product packaging or manufacturer data is reviewed.',
  ];
  const features = [
    `${product.brand} vehicle model kit`,
    `${subject}${colour ? ` colour variant: ${colour}` : ''}`,
    product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed',
  ];

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
    `This CubicFun model centres on ${product.name}, giving the launch range a structured display build rather than another vehicle or bench accessory. It suits customers browsing for a contained project with a recognisable subject and a decorative result.`,
    'Only catalogue-confirmed details have been used here. Piece count, finished dimensions and age guidance are not listed unless they are present in the verified Iron Sprue source data.',
  ];
  const features = [
    'CubicFun 3D display build',
    `${product.name} subject`,
    product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed',
  ];

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
    `This Pintoo piece is built around the ${product.name} design, offering a more giftable and display-led alternative to a conventional flat puzzle. The subject and format are kept specific so customers can compare it properly against the rest of the Pintoo launch range.`,
    'The catalogue currently confirms the brand, product title and supplier reference. Unsupported claims such as piece count, dimensions, materials and age grading have been left out until they are verified from manufacturer packaging or source data.',
  ];
  const features = [
    `Pintoo ${format} puzzle`,
    `${product.name} design`,
    product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed',
  ];

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
    `${product.name} gives Iron Sprue customers a named Deluxe Materials option for ${use}. It is positioned as a practical workshop companion rather than a display kit, so the copy focuses on the product's bench role and verified catalogue identity.`,
    'Handling, curing, compatibility and safety details are not expanded beyond the confirmed source fields. Customers should follow the manufacturer packaging for application and safety guidance.',
  ];
  const features = [
    'Deluxe Materials bench product',
    sentenceCase(use),
    product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed',
  ];

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
    'The catalogue record confirms the title, brand and supplier code. Specific dimensions, material details and compatibility claims are omitted unless present in the verified product source.',
  ];
  const features = [
    'OcCre Creations workshop accessory',
    'Supports modelling bench organisation or preparation',
    product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed',
  ];

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
    `${product.name} sits in the launch range as a functional tool rather than a kit. The listing is written around its confirmed catalogue role: helping with ${use} during model, puzzle or display-build preparation.`,
    'Exact materials, blade sizes, tolerances and compatibility claims are not added unless they already exist in the verified source data. This keeps the product page useful without overstating the tool specification.',
  ];
  const features = [
    'Bench tool or accessory',
    sentenceCase(use),
    product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed',
  ];

  return createBaseResponse(product, shortDescription, paragraphs, features, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function createGenericCopy(
  product: IronSprueDescriptionProduct,
  factualSpecs: Record<string, string>,
  omittedUncertainSpecifications: string[],
  sourceConfidence: IronSprueGeneratedDescription['sourceConfidence'],
) {
  const shortDescription = `${product.name} is a ${product.brand} ${product.productType.toLowerCase()} selected for the Iron Sprue launch catalogue.`;
  const paragraphs = [
    `${product.name} is included as part of Iron Sprue's launch range for customers looking across model kits, display builds and workshop essentials. The product identity has been kept tied to the verified catalogue title and supplier reference.`,
    'Additional specifications are omitted where they are not present in the current source material.',
  ];
  const features = [
    `${product.brand} product`,
    product.productType,
    product.supplierSku ? `Supplier code ${product.supplierSku}` : 'Supplier code to be confirmed',
  ];

  return createBaseResponse(product, shortDescription, paragraphs, features, factualSpecs, omittedUncertainSpecifications, sourceConfidence);
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
