export type LaunchCatalogueRow = {
  name: string;
  sku: string;
  supplierSku?: string;
  barcode?: string;
  brand: string;
  category: string;
  productType: string;
  description?: string;
  vatRate: number;
  wholesaleCostMinor?: number;
  retailPriceMinor: number;
  stockQuantity: number;
  imageReference?: string;
  supplier?: string;
  scale?: string;
  skillLevel?: string;
  assemblyRequired?: string;
  glueRequired?: boolean;
  paintRequired?: boolean;
  published: boolean;
};

export type LaunchCatalogueIssue = {
  rowNumber: number;
  sku?: string;
  field: keyof LaunchCatalogueRow | 'row';
  message: string;
};

export type LaunchCatalogueImportReport = {
  acceptedRows: LaunchCatalogueRow[];
  rejectedRows: LaunchCatalogueIssue[];
  duplicateSkus: string[];
  acceptedCount: number;
  rejectedCount: number;
  genuineSkuCount: number;
  dryRun: boolean;
};

const supportedBrands = new Set(['Aoshima', 'CubicFun', 'Pintoo', 'Deluxe Materials', 'Expo Tools', 'OcCre Creations', 'Swann Morton', 'Tasma']);

function issue(rowNumber: number, field: LaunchCatalogueIssue['field'], message: string, sku?: string): LaunchCatalogueIssue {
  return { rowNumber, field, message, ...(sku ? { sku } : {}) };
}

export function validateLaunchCatalogueRows(rows: LaunchCatalogueRow[], options: { dryRun?: boolean } = {}): LaunchCatalogueImportReport {
  const seenSkus = new Set<string>();
  const duplicateSkus = new Set<string>();
  const acceptedRows: LaunchCatalogueRow[] = [];
  const rejectedRows: LaunchCatalogueIssue[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const rowIssues: LaunchCatalogueIssue[] = [];
    const sku = row.sku?.trim();

    if (!row.name?.trim()) rowIssues.push(issue(rowNumber, 'name', 'Product name is required.', sku));
    if (!sku) rowIssues.push(issue(rowNumber, 'sku', 'SKU is required.'));
    if (sku && seenSkus.has(sku)) {
      duplicateSkus.add(sku);
      rowIssues.push(issue(rowNumber, 'sku', 'Duplicate SKU in import file.', sku));
    }
    if (!row.brand?.trim()) rowIssues.push(issue(rowNumber, 'brand', 'Brand is required.', sku));
    if (row.brand && !supportedBrands.has(row.brand) && !row.category.toLowerCase().includes('tool')) {
      rowIssues.push(issue(rowNumber, 'brand', 'Brand is not in the approved launch range list.', sku));
    }
    if (!row.category?.trim()) rowIssues.push(issue(rowNumber, 'category', 'Category is required.', sku));
    if (!row.productType?.trim()) rowIssues.push(issue(rowNumber, 'productType', 'Product type is required.', sku));
    if (!Number.isInteger(row.vatRate) || row.vatRate < 0 || row.vatRate > 25) {
      rowIssues.push(issue(rowNumber, 'vatRate', 'VAT rate must be an integer percentage between 0 and 25.', sku));
    }
    if (!Number.isInteger(row.retailPriceMinor) || row.retailPriceMinor <= 0) {
      rowIssues.push(issue(rowNumber, 'retailPriceMinor', 'Retail price must be a positive minor-unit amount.', sku));
    }
    if (!Number.isInteger(row.stockQuantity) || row.stockQuantity < 0) {
      rowIssues.push(issue(rowNumber, 'stockQuantity', 'Stock quantity must be zero or greater.', sku));
    }

    if (sku) seenSkus.add(sku);

    if (rowIssues.length > 0) {
      rejectedRows.push(...rowIssues);
      return;
    }

    acceptedRows.push({ ...row, sku });
  });

  return {
    acceptedRows,
    rejectedRows,
    duplicateSkus: Array.from(duplicateSkus).sort(),
    acceptedCount: acceptedRows.length,
    rejectedCount: rejectedRows.length,
    genuineSkuCount: new Set(acceptedRows.map((row) => row.sku)).size,
    dryRun: options.dryRun ?? true,
  };
}
