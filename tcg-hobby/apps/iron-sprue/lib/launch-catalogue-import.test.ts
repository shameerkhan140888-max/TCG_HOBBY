import { describe, expect, it } from 'vitest';
import { validateLaunchCatalogueRows, type LaunchCatalogueRow } from './launch-catalogue-import';

const validRow: LaunchCatalogueRow = {
  name: 'Aoshima display model',
  sku: 'IS-AOS-001',
  brand: 'Aoshima',
  category: 'Scale model kits',
  productType: 'Model kit',
  vatRate: 20,
  retailPriceMinor: 2499,
  stockQuantity: 6,
  published: true,
};

describe('Iron Sprue launch catalogue import validation', () => {
  it('accepts valid purchase-order rows in dry-run mode', () => {
    const report = validateLaunchCatalogueRows([validRow], { dryRun: true });
    expect(report.acceptedCount).toBe(1);
    expect(report.rejectedCount).toBe(0);
    expect(report.genuineSkuCount).toBe(1);
    expect(report.dryRun).toBe(true);
  });

  it('rejects duplicate SKUs and invalid VAT/stock values', () => {
    const report = validateLaunchCatalogueRows([
      validRow,
      { ...validRow, name: '', vatRate: 99, stockQuantity: -1 },
    ]);
    expect(report.acceptedCount).toBe(1);
    expect(report.duplicateSkus).toEqual(['IS-AOS-001']);
    expect(report.rejectedRows.map((row) => row.field)).toEqual(expect.arrayContaining(['name', 'sku', 'vatRate', 'stockQuantity']));
  });

  it('rejects unsupported brands unless the row is a workshop tool/add-on', () => {
    const report = validateLaunchCatalogueRows([{ ...validRow, sku: 'IS-UNK-001', brand: 'Unsupported', category: 'Model kits' }]);
    expect(report.acceptedCount).toBe(0);
    expect(report.rejectedRows[0]?.field).toBe('brand');
  });
});
