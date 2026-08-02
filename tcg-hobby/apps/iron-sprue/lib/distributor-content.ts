import { assertIronSprueMediaKey, type IronSprueMediaConfig } from './store-runtime-config';
import type { IronSprueProduct } from './catalogue';

export type DistributorProductRecord = {
  sourceId: string;
  sourceUrl?: string;
  supplierSku?: string;
  manufacturerSku?: string;
  barcode?: string;
  name: string;
  brand?: string;
  shortDescription?: string;
  fullDescriptionHtml?: string;
  primaryImageUrl?: string;
  galleryImageUrls?: string[];
};

export type DistributorMatch =
  | { status: 'matched'; method: 'supplierSku' | 'manufacturerSku' | 'barcode' | 'exactName'; confidence: 100; product: IronSprueProduct; record: DistributorProductRecord }
  | { status: 'ambiguous'; product: IronSprueProduct; candidates: DistributorProductRecord[] }
  | { status: 'unmatched'; product: IronSprueProduct };

type DistributorMatchMethod = Extract<DistributorMatch, { status: 'matched' }>['method'];

const SAFE_HTML_TAGS = new Set(['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']);

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

function exactCandidates(records: DistributorProductRecord[], predicate: (record: DistributorProductRecord) => boolean) {
  return records.filter(predicate);
}

function pickMatch(product: IronSprueProduct, records: DistributorProductRecord[], method: DistributorMatchMethod, predicate: (record: DistributorProductRecord) => boolean): DistributorMatch | null {
  const candidates = exactCandidates(records, predicate);
  if (candidates.length === 1 && candidates[0]) return { status: 'matched', method, confidence: 100, product, record: candidates[0] };
  if (candidates.length > 1) return { status: 'ambiguous', product, candidates };
  return null;
}

export function matchDistributorRecords(products: IronSprueProduct[], records: DistributorProductRecord[]): DistributorMatch[] {
  return products.map((product) => {
    const match =
      pickMatch(product, records, 'supplierSku', (record) => Boolean(product.supplierSku && normalize(record.supplierSku) === normalize(product.supplierSku))) ??
      pickMatch(product, records, 'manufacturerSku', (record) => Boolean(product.supplierSku && normalize(record.manufacturerSku) === normalize(product.supplierSku))) ??
      pickMatch(product, records, 'barcode', (record) => Boolean(record.barcode && product.barcode && normalize(record.barcode) === normalize(product.barcode))) ??
      pickMatch(product, records, 'exactName', (record) => normalize(record.name) === normalize(product.name));
    return match ?? { status: 'unmatched', product };
  });
}

export function sanitizeDistributorHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<img[^>]*(tracking|pixel)[^>]*>/gi, '')
    .replace(/<\/?([a-z0-9-]+)(?:\s[^>]*)?>/gi, (tag, rawName) => {
      const name = String(rawName).toLowerCase();
      if (!SAFE_HTML_TAGS.has(name)) return '';
      return tag.startsWith('</') ? `</${name}>` : `<${name}>`;
    })
    .replace(/\b(price|delivery|in stock|add to basket|buy now):?[^<]*/gi, '')
    .trim();
}

export function validateDistributorImageSource(url: string, approvedDomains: readonly string[]) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Distributor image source must use HTTPS.');
  if (!approvedDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))) {
    throw new Error('Distributor image source domain is not approved.');
  }
  const extension = parsed.pathname.toLowerCase().split('.').pop();
  if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    throw new Error('Distributor image source extension is not approved.');
  }
  return parsed;
}

export function buildIronSprueImportedImageKey(input: { productSku: string; sourceUrl: string; hash: string }, mediaConfig: IronSprueMediaConfig) {
  const source = validateDistributorImageSource(input.sourceUrl, ['authorized-distributor.example', 'manufacturer.example']);
  const extension = source.pathname.toLowerCase().split('.').pop() || 'jpg';
  return assertIronSprueMediaKey(`${mediaConfig.uploadPrefix}${input.productSku.toLowerCase()}/${input.hash}.${extension}`);
}
