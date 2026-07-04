import type { PriceStatus, PricingRuleScope, PricingRuleType, PricingSnapshot } from '@tcg-hobby/types';
import { calculatePercentage, clampMinorAmount, roundToMinor } from '@tcg-hobby/utils';
import { prisma } from './client';

type PricingRuleConfig = {
  buyMinor?: number;
  marginMinor?: number;
  percentage?: number;
  multiplier?: number;
  minimumMarginPercent?: number;
  maximumDiscountPercent?: number;
};

export type PricingRuleRecord = {
  id: string;
  name: string;
  ruleType: PricingRuleType;
  ruleScope: PricingRuleScope;
  productId: string | null;
  categoryId: string | null;
  supplierId: string | null;
  currency: string;
  priority: number;
  active: boolean;
  config: PricingRuleConfig;
};

export type PricingContext = {
  productId: string;
  categoryId: string;
  supplierId: string;
  costMinor: number;
  retailMinor: number;
  currentBuyMinor?: number | null;
  manualOverrideBuyMinor?: number | null;
};

export type ProductPricingSnapshot = PricingSnapshot & {
  pricingRuleId: string | null;
  ruleName: string | null;
};

type ProductPricingRecord = {
  id: string;
  productId: string;
  pricingRuleId: string | null;
  costMinor: number;
  retailMinor: number;
  buyMinor: number;
  marginMinor: number;
  markupPercent: number;
  profitMinor: number;
  minimumMarginPercent: number;
  maximumDiscountPercent: number;
  priceSource: string;
  priceStatus: PriceStatus;
  manualOverride: boolean;
  updatedAt: Date;
  createdAt: Date;
  pricingRule: { id: string; name: string } | null;
};

type PricingProductRow = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  priceMinor: number;
  categoryId: string;
  category: { id: string; slug: string; name: string };
  inventory: { stockOnHand: number; reservedStock: number } | null;
  supplierProducts: Array<{
    supplierId: string;
    costMinor: number;
    supplier: { id: string; name: string };
  }>;
  pricing: ProductPricingRecord | null;
};

function scopeMatches(rule: PricingRuleRecord, context: PricingContext) {
  if (rule.ruleScope === 'GLOBAL') {
    return true;
  }

  if (rule.ruleScope === 'PRODUCT') {
    return rule.productId === context.productId;
  }

  if (rule.ruleScope === 'CATEGORY') {
    return rule.categoryId === context.categoryId;
  }

  if (rule.ruleScope === 'SUPPLIER') {
    return rule.supplierId === context.supplierId;
  }

  return false;
}

function sortRules(a: PricingRuleRecord, b: PricingRuleRecord) {
  if (a.priority !== b.priority) {
    return b.priority - a.priority;
  }

  const scopeOrder: Record<PricingRuleScope, number> = {
    PRODUCT: 0,
    CATEGORY: 1,
    SUPPLIER: 2,
    GLOBAL: 3,
  };

  return scopeOrder[a.ruleScope] - scopeOrder[b.ruleScope];
}

function resolveBaseBuyPrice(rule: PricingRuleRecord | null, context: PricingContext) {
  const fallbackBuy = roundToMinor(context.retailMinor * 0.7);
  const currentBuy = clampMinorAmount(context.currentBuyMinor ?? fallbackBuy);

  if (!rule) {
    return currentBuy;
  }

  const config = rule.config ?? {};

  switch (rule.ruleType) {
    case 'MANUAL':
      return clampMinorAmount(config.buyMinor ?? context.manualOverrideBuyMinor ?? currentBuy);
    case 'COST_PLUS_PERCENT': {
      const percentage = config.percentage ?? 0;
      return clampMinorAmount(context.costMinor + roundToMinor((context.costMinor * percentage) / 100));
    }
    case 'FIXED_MARGIN': {
      const marginMinor = config.marginMinor ?? 0;
      return clampMinorAmount(context.retailMinor - marginMinor);
    }
    case 'SUPPLIER_COST': {
      const multiplier = config.multiplier ?? 1;
      return clampMinorAmount(context.costMinor + roundToMinor(context.costMinor * multiplier));
    }
    case 'PROMOTIONAL':
      return clampMinorAmount(config.buyMinor ?? roundToMinor(context.retailMinor * 0.65));
    case 'FUTURE_MARKET_FEED':
      return clampMinorAmount(config.buyMinor ?? context.currentBuyMinor ?? fallbackBuy);
    default:
      return currentBuy;
  }
}

function clampBuyPrice(buyMinor: number, context: PricingContext, minimumMarginPercent: number, maximumDiscountPercent: number) {
  const maxBuyMinor = clampMinorAmount(context.retailMinor - roundToMinor((context.retailMinor * minimumMarginPercent) / 100));
  const minBuyMinor = clampMinorAmount(context.retailMinor - roundToMinor((context.retailMinor * maximumDiscountPercent) / 100));

  return Math.max(minBuyMinor, Math.min(buyMinor, maxBuyMinor));
}

export function calculateMarginMinor(costMinor: number, retailMinor: number) {
  return clampMinorAmount(retailMinor - costMinor);
}

export function calculateMarkupPercent(costMinor: number, retailMinor: number) {
  return calculatePercentage(calculateMarginMinor(costMinor, retailMinor), costMinor);
}

export function evaluatePricingSnapshot(context: PricingContext, rules: PricingRuleRecord[] = []): ProductPricingSnapshot {
  const activeRules = rules.filter((rule) => rule.active).sort(sortRules);
  const matchedRule = activeRules.find((rule) => scopeMatches(rule, context)) ?? null;
  const minimumMarginPercent = matchedRule?.config.minimumMarginPercent ?? 30;
  const maximumDiscountPercent = matchedRule?.config.maximumDiscountPercent ?? 45;
  const priceStatus: PriceStatus = context.manualOverrideBuyMinor != null ? 'MANUAL_OVERRIDE' : matchedRule ? 'ACTIVE' : 'FUTURE';
  const baseBuyMinor = context.manualOverrideBuyMinor ?? resolveBaseBuyPrice(matchedRule, context);
  const buyMinor = clampBuyPrice(baseBuyMinor, context, minimumMarginPercent, maximumDiscountPercent);
  const marginMinor = calculateMarginMinor(context.costMinor, context.retailMinor);

  return {
    costMinor: clampMinorAmount(context.costMinor),
    retailMinor: clampMinorAmount(context.retailMinor),
    buyMinor,
    marginMinor,
    markupPercent: calculateMarkupPercent(context.costMinor, context.retailMinor),
    profitMinor: marginMinor,
    minimumMarginPercent,
    maximumDiscountPercent,
    priceSource: matchedRule?.name ?? 'Manual',
    priceStatus,
    manualOverride: context.manualOverrideBuyMinor != null,
    updatedAt: new Date().toISOString(),
    pricingRuleId: matchedRule?.id ?? null,
    ruleName: matchedRule?.name ?? null,
  };
}

export async function getPricingRules(db = prisma): Promise<PricingRuleRecord[]> {
  const rows = await db.pricingRule.findMany({
    where: { active: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  return rows.map((rule) => ({
    id: rule.id,
    name: rule.name,
    ruleType: rule.ruleType as PricingRuleType,
    ruleScope: rule.ruleScope as PricingRuleScope,
    productId: rule.productId,
    categoryId: rule.categoryId,
    supplierId: rule.supplierId,
    currency: rule.currency,
    priority: rule.priority,
    active: rule.active,
    config: (rule.config as PricingRuleConfig) ?? {},
  }));
}

export async function getProductPricingSnapshot(productId: string, db = prisma): Promise<ProductPricingSnapshot | null> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      inventory: true,
      supplierProducts: { include: { supplier: true }, orderBy: { leadTimeDays: 'asc' }, take: 1 },
      pricing: { include: { pricingRule: true } },
    },
  });

  if (!product) {
    return null;
  }

  const supplierProduct = product.supplierProducts[0];
  const pricing = product.pricing;
  const rules = await getPricingRules(db);
  const snapshot = evaluatePricingSnapshot(
    {
      productId: product.id,
      categoryId: product.categoryId,
      supplierId: supplierProduct?.supplierId ?? '',
      costMinor: supplierProduct?.costMinor ?? pricing?.costMinor ?? 0,
      retailMinor: product.priceMinor,
      currentBuyMinor: pricing?.buyMinor ?? null,
      manualOverrideBuyMinor: pricing?.manualOverride ? pricing.buyMinor : null,
    },
    rules,
  );

  return {
    ...snapshot,
    updatedAt: pricing?.updatedAt?.toISOString() ?? snapshot.updatedAt,
    priceSource: pricing?.priceSource ?? snapshot.priceSource,
    priceStatus: pricing?.priceStatus ?? snapshot.priceStatus,
    manualOverride: pricing?.manualOverride ?? snapshot.manualOverride,
    pricingRuleId: pricing?.pricingRuleId ?? snapshot.pricingRuleId,
    ruleName: pricing?.pricingRule?.name ?? snapshot.ruleName,
  };
}

export async function refreshProductPricing(productId: string, db = prisma): Promise<ProductPricingSnapshot> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      inventory: true,
      supplierProducts: { include: { supplier: true }, orderBy: { leadTimeDays: 'asc' }, take: 1 },
      pricing: { include: { pricingRule: true } },
    },
  });

  if (!product) {
    throw new Error('Product not found for pricing refresh.');
  }

  const supplierProduct = product.supplierProducts[0];
  const rules = await getPricingRules(db);
  const snapshot = evaluatePricingSnapshot(
    {
      productId: product.id,
      categoryId: product.categoryId,
      supplierId: supplierProduct?.supplierId ?? '',
      costMinor: supplierProduct?.costMinor ?? product.pricing?.costMinor ?? 0,
      retailMinor: product.priceMinor,
      currentBuyMinor: product.pricing?.buyMinor ?? null,
      manualOverrideBuyMinor: product.pricing?.manualOverride ? product.pricing.buyMinor : null,
    },
    rules,
  );

  const pricing = await db.productPricing.upsert({
    where: { productId },
    create: {
      productId,
      pricingRuleId: snapshot.pricingRuleId,
      costMinor: snapshot.costMinor,
      retailMinor: snapshot.retailMinor,
      buyMinor: snapshot.buyMinor,
      marginMinor: snapshot.marginMinor,
      markupPercent: snapshot.markupPercent,
      profitMinor: snapshot.profitMinor,
      minimumMarginPercent: snapshot.minimumMarginPercent,
      maximumDiscountPercent: snapshot.maximumDiscountPercent,
      priceSource: snapshot.priceSource,
      priceStatus: snapshot.priceStatus,
      manualOverride: snapshot.manualOverride,
    },
    update: {
      pricingRuleId: snapshot.pricingRuleId,
      costMinor: snapshot.costMinor,
      retailMinor: snapshot.retailMinor,
      buyMinor: snapshot.buyMinor,
      marginMinor: snapshot.marginMinor,
      markupPercent: snapshot.markupPercent,
      profitMinor: snapshot.profitMinor,
      minimumMarginPercent: snapshot.minimumMarginPercent,
      maximumDiscountPercent: snapshot.maximumDiscountPercent,
      priceSource: snapshot.priceSource,
      priceStatus: snapshot.priceStatus,
      manualOverride: snapshot.manualOverride,
    },
    include: { pricingRule: true },
  });

  return {
    ...snapshot,
    updatedAt: pricing.updatedAt.toISOString(),
    priceSource: pricing.priceSource,
    priceStatus: pricing.priceStatus,
    manualOverride: pricing.manualOverride,
    pricingRuleId: pricing.pricingRuleId,
    ruleName: pricing.pricingRule?.name ?? snapshot.ruleName,
  };
}
