'use client';

import { useActionState } from 'react';
import { Button, ErrorMessage, FormField, StatusBadge } from '@tcg-hobby/ui';
import { productCsvImportAction } from '../lib/admin-actions.server';
import { emptyProductCsvImportFormState } from '../lib/admin-form-state';

const productCsvTemplate = [
  'name,sku,slug,barcode,brand,game,categorySlug,supplierSlug,productType,language,condition,priceMinor,vatRate,costMinor,rrpMinor,salePriceMinor,saleStartsAt,saleEndsAt,stockOnHand,reorderPoint,reorderQuantity,incomingQuantity,locationCode,supplierSku,supplierProductUrl,minimumOrderQuantity,packQuantity,supplierLeadTimeDays,description,longDescription,primaryImageUrl,primaryImageAlt,imageLabel,featured,published,hideWhenOutOfStock,customerPurchaseLimit,freeUkStandardShipping,shippingPromotionProductOnly,homepagePriority,heroFeatured,recommendationWeight,isAccessory,isStaffPick,isBestSeller,isNewArrival,seoTitle,metaDescription,canonicalUrl,ogImageUrl,noindex',
  'Example Product,EXAMPLE-SKU-001,example-product,,Pokemon TCG,Pokemon TCG,sealed-product,tcg-hobby,Premium Collection,English,SEALED,4999,20,3500,,,,,3,1,0,0,MAIN,EXAMPLE-SUPPLIER-SKU,,1,,7,Short customer-facing description.,Long customer-facing product description.,/products/example/primary.webp,Example Product primary image,Example Product,false,false,false,,false,true,,false,0,false,false,false,false,,,,,false',
].join('\n');

function csvTemplateDownloadHref() {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(productCsvTemplate)}`;
}

export function ProductCsvImportForm() {
  const [state, formAction, pending] = useActionState(productCsvImportAction, emptyProductCsvImportFormState);
  const plan = state.plan;
  const result = state.result;

  return (
    <form action={formAction} className="space-y-6">
      {state.formError ? <ErrorMessage>{state.formError}</ErrorMessage> : null}
      {state.formSuccess ? (
        <div className="rounded-lg bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100 ring-1 ring-emerald-500/30">
          {state.formSuccess}
        </div>
      ) : null}

      <div className="rounded-xl bg-surface-base p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-50">Paste product CSV</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-400">
              Preview validates categories, suppliers, prices, stock, URLs and duplicate matches before anything is written. Imports run as one transaction.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={csvTemplateDownloadHref()} download="tcg-hobby-product-template.csv">
              Download template
            </a>
          </Button>
        </div>

        <FormField label="CSV content" htmlFor="csvText" error={state.fieldErrors.csvText} required>
          <textarea
            id="csvText"
            name="csvText"
            defaultValue={state.csvText}
            className="min-h-80 w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 font-mono text-xs leading-5 text-neutral-50 outline-none transition-colors placeholder:text-neutral-500 focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="Paste the product CSV here, including the header row."
          />
        </FormField>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="submit" name="intent" value="preview" disabled={pending}>
            Preview import
          </Button>
          <Button type="submit" name="intent" value="import" variant="outline" disabled={pending || !plan || plan.summary.errorRows > 0}>
            Import ready rows
          </Button>
        </div>
      </div>

      {plan ? (
        <div className="rounded-xl bg-surface-base p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
          <div className="mb-4 flex flex-wrap gap-3 text-sm text-neutral-300">
            <StatusBadge tone="neutral">{plan.summary.totalRows} rows</StatusBadge>
            <StatusBadge tone="success">{plan.summary.readyRows} ready</StatusBadge>
            <StatusBadge tone={plan.summary.errorRows ? 'warning' : 'success'}>{plan.summary.errorRows} errors</StatusBadge>
            <StatusBadge tone="accent">{plan.summary.creates} creates</StatusBadge>
            <StatusBadge tone="neutral">{plan.summary.updates} updates</StatusBadge>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-line text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Match</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-line text-neutral-300">
                {plan.rows.map((row) => (
                  <tr key={row.rowNumber} className="align-top">
                    <td className="px-3 py-3 text-neutral-500">{row.rowNumber}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-neutral-50">{row.name || 'Unnamed product'}</div>
                      <div className="text-xs text-neutral-500">{row.sku}</div>
                      <div className="text-xs text-neutral-500">{row.slug}</div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={row.action === 'create' ? 'accent' : 'neutral'}>{row.action}</StatusBadge>
                      <div className="mt-1 text-xs text-neutral-500">{row.match}</div>
                    </td>
                    <td className="px-3 py-3">{row.publicStockState}</td>
                    <td className="px-3 py-3">
                      {row.errors.length ? (
                        <ul className="space-y-1 text-xs text-amber-200">
                          {row.errors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-emerald-200">Ready</span>
                      )}
                      {row.warnings.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-neutral-500">
                          {row.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl bg-surface-base p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
          <h2 className="text-lg font-semibold text-neutral-50">Import report</h2>
          <ul className="mt-4 space-y-2 text-sm text-neutral-300">
            {result.reportRows.map((row) => (
              <li key={`${row.rowNumber}-${row.productId}`}>
                Row {row.rowNumber}: {row.action} <a className="text-accent hover:text-accent-light" href={`/admin/products/${row.productId}`}>{row.slug}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
