'use client';

import { useActionState, useEffect, useState, type ChangeEvent, type TextareaHTMLAttributes } from 'react';
import { Button, ErrorMessage, FormField, FormSection, Input } from '@tcg-hobby/ui';
import {
  emptyProductFormValues,
  type ProductFormState,
} from '../lib/admin-form-state';
import { saveProductAction } from '../lib/admin-actions.server';

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-28 w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none transition-colors placeholder:text-neutral-500 focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  );
}

type Option = {
  id: string;
  label: string;
  active?: boolean;
  gameId?: string | null;
};

type ProductFormProps = {
  state?: ProductFormState;
  categories: Option[];
  suppliers: Option[];
  games: Option[];
  brands: Option[];
  productTypes: Option[];
  languages: Option[];
  sets: Option[];
  submitLabel: string;
};

const onboardingSections = [
  { id: 'product-identity', label: 'Identity' },
  { id: 'product-media', label: 'Media' },
  { id: 'product-pricing', label: 'Pricing' },
  { id: 'product-supplier', label: 'Supplier' },
  { id: 'product-inventory', label: 'Inventory' },
  { id: 'product-seo', label: 'SEO' },
  { id: 'product-visibility', label: 'Visibility' },
] as const;

function parseMinor(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(parseMinor(value) / 100);
}

function calculateMargin(costMinorValue: string, priceMinorValue: string) {
  const priceMinor = parseMinor(priceMinorValue);
  const costMinor = parseMinor(costMinorValue);
  const profitMinor = priceMinor - costMinor;
  const marginPercent = priceMinor > 0 ? Math.round((profitMinor / priceMinor) * 100) : 0;

  return { profitMinor, marginPercent };
}

export function ProductForm({ state, categories, suppliers, games, brands, productTypes, languages, sets, submitLabel }: ProductFormProps) {
  const [formState, formAction] = useActionState(saveProductAction, state ?? { fieldErrors: {}, values: emptyProductFormValues });
  const [selectedGameId, setSelectedGameId] = useState(formState.values.gameId);
  const [selectedSetId, setSelectedSetId] = useState(formState.values.setId);
  const pricing = calculateMargin(formState.values.landedCostMinor || formState.values.costMinor, formState.values.salePriceMinor || formState.values.priceMinor);
  const lossWarning =
    parseMinor(formState.values.landedCostMinor || formState.values.costMinor) > parseMinor(formState.values.salePriceMinor || formState.values.priceMinor);
  const selectedSet = sets.find((set) => set.id === selectedSetId);
  const selectedSetIsCompatible = !selectedSet || !selectedGameId || !selectedSet.gameId || selectedSet.gameId === selectedGameId;
  const filteredSets = sets.filter((set) => !set.gameId || !selectedGameId || set.gameId === selectedGameId || set.id === selectedSetId);

  useEffect(() => {
    setSelectedGameId(formState.values.gameId);
    setSelectedSetId(formState.values.setId);
  }, [formState.values.gameId, formState.values.setId]);

  function handleGameChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextGameId = event.target.value;
    setSelectedGameId(nextGameId);

    const currentSet = sets.find((set) => set.id === selectedSetId);
    if (currentSet?.gameId && currentSet.gameId !== nextGameId) {
      setSelectedSetId('');
    }
  }

  return (
    <form key={JSON.stringify(formState.values)} action={formAction} className="space-y-6">
      <input type="hidden" name="productId" value={formState.values.productId} />
      {formState.formError ? <ErrorMessage>{formState.formError}</ErrorMessage> : null}

      <div className="grid gap-4 rounded-xl bg-surface-base p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)] lg:grid-cols-[1fr_280px]">
        <nav aria-label="Product onboarding sections" className="flex flex-wrap gap-2">
          {onboardingSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full bg-surface-ink px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition-colors hover:bg-accent/15 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {section.label}
            </a>
          ))}
        </nav>
        <aside className="rounded-lg bg-surface-ink p-3 text-xs leading-5 text-neutral-400" aria-label="Product review summary">
          <p className="font-semibold text-neutral-50">Review before saving</p>
          <p>{formState.values.name || 'Unnamed product'}</p>
          <p>{formState.values.sku || 'SKU required'}</p>
          <p>{games.find((game) => game.id === formState.values.gameId)?.label ?? 'Game required'}</p>
          <p>{productTypes.find((type) => type.id === formState.values.productTypeId)?.label ?? 'Product type required'}</p>
          <p>{formState.values.priceMinor ? formatMoney(formState.values.priceMinor) : 'Price required'}</p>
          <p>{formState.values.published ? 'Will be published' : 'Will be hidden'}</p>
        </aside>
      </div>

      <section id="product-identity" className="scroll-mt-24">
        <FormSection title="Product identity" description="Identity, category, classification, and publish-safe URLs.">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="Name" htmlFor="name" error={formState.fieldErrors.name} required>
            <Input id="name" name="name" defaultValue={formState.values.name} />
          </FormField>
          <FormField label="Slug" htmlFor="slug" error={formState.fieldErrors.slug}>
            <Input id="slug" name="slug" defaultValue={formState.values.slug} placeholder="auto-generated when left blank" />
          </FormField>
          <FormField label="SKU" htmlFor="sku" error={formState.fieldErrors.sku} required>
            <Input id="sku" name="sku" defaultValue={formState.values.sku} />
          </FormField>
          <FormField label="Barcode / EAN / UPC" htmlFor="barcode" error={formState.fieldErrors.barcode}>
            <Input id="barcode" name="barcode" defaultValue={formState.values.barcode} />
          </FormField>
          <FormField label="Game" htmlFor="gameId" error={formState.fieldErrors.gameId} required>
            <select
              id="gameId"
              name="gameId"
              value={selectedGameId}
              onChange={handleGameChange}
              className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="">Select a game</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.label}{game.active === false ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Brand" htmlFor="brandId" error={formState.fieldErrors.brandId}>
            <select id="brandId" name="brandId" defaultValue={formState.values.brandId} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
              <option value="">Select a brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.label}{brand.active === false ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Product type / format" htmlFor="productTypeId" error={formState.fieldErrors.productTypeId} required>
            <select id="productTypeId" name="productTypeId" defaultValue={formState.values.productTypeId} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
              <option value="">Select a product type</option>
              {productTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}{type.active === false ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Language" htmlFor="languageId" error={formState.fieldErrors.languageId} required>
            <select id="languageId" name="languageId" defaultValue={formState.values.languageId} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
              <option value="">Select a language</option>
              {languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}{language.active === false ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Set" htmlFor="setId" error={formState.fieldErrors.setId}>
            <select
              id="setId"
              name="setId"
              value={selectedSetId}
              onChange={(event) => setSelectedSetId(event.target.value)}
              className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="">No set</option>
              {filteredSets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.label}{set.active === false ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
            {selectedGameId ? <p className="mt-2 text-xs text-neutral-500">Set options are limited to the selected game.</p> : null}
            {!selectedSetIsCompatible ? <p className="mt-2 text-xs text-amber-300">Select a set that belongs to the selected game.</p> : null}
          </FormField>
          <FormField label="Condition" htmlFor="condition" required>
            <select id="condition" name="condition" defaultValue={formState.values.condition} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
              {['MINT', 'NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED', 'SEALED'].map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Category" htmlFor="categoryId" error={formState.fieldErrors.categoryId} required>
            <select id="categoryId" name="categoryId" defaultValue={formState.values.categoryId} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        </FormSection>
      </section>

      <section id="product-media" className="scroll-mt-24">
        <FormSection title="Copy and media" description="Product copy and URL-managed image metadata. Binary upload is handled by the product media/import workflow.">
        <div className="grid gap-4">
          <FormField label="Short description" htmlFor="description" error={formState.fieldErrors.description} required>
            <Textarea id="description" name="description" defaultValue={formState.values.description} />
          </FormField>
          <FormField label="Long description" htmlFor="longDescription" error={formState.fieldErrors.longDescription} required>
            <Textarea id="longDescription" name="longDescription" defaultValue={formState.values.longDescription} />
          </FormField>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Image label" htmlFor="imageLabel" required>
              <Input id="imageLabel" name="imageLabel" defaultValue={formState.values.imageLabel} />
            </FormField>
            <FormField label="Primary image URL" htmlFor="primaryImageUrl">
              <Input id="primaryImageUrl" name="primaryImageUrl" defaultValue={formState.values.primaryImageUrl} placeholder="/products/game/slug/primary.webp or https://..." />
            </FormField>
            <FormField label="Primary image alt text" htmlFor="primaryImageAlt">
              <Input id="primaryImageAlt" name="primaryImageAlt" defaultValue={formState.values.primaryImageAlt} placeholder="Meaningful alt text" />
            </FormField>
            <FormField label="Open Graph image URL" htmlFor="ogImageUrl" error={formState.fieldErrors.ogImageUrl}>
              <Input id="ogImageUrl" name="ogImageUrl" defaultValue={formState.values.ogImageUrl} placeholder="Optional social preview image" />
            </FormField>
          </div>
          <FormField label="Gallery images" htmlFor="galleryImagesText" error={formState.fieldErrors.galleryImagesText}>
            <Textarea
              id="galleryImagesText"
              name="galleryImagesText"
              defaultValue={formState.values.galleryImagesText}
              placeholder={'One image per line. Use: URL | alt text | role\n/products/example/gallery-02.webp | Rear packaging | gallery'}
            />
          </FormField>
          <FormField label="Availability / shipping promotion" htmlFor="availabilityMessage">
            <Textarea
              id="availabilityMessage"
              name="availabilityMessage"
              defaultValue={formState.values.availabilityMessage}
              placeholder="Optional product-specific delivery, limit or availability note"
            />
          </FormField>
        </div>
        </FormSection>
      </section>

      <section id="product-pricing" className="scroll-mt-24">
        <FormSection title="Pricing" description="VAT-inclusive retail pricing, supplier cost, sale windows, and commercial margin preview.">
        <div className="grid gap-4 lg:grid-cols-3">
          <FormField label="Retail price (pence)" htmlFor="priceMinor" error={formState.fieldErrors.priceMinor} required>
            <Input id="priceMinor" name="priceMinor" type="number" min={0} defaultValue={formState.values.priceMinor} />
          </FormField>
          <FormField label="RRP (pence)" htmlFor="rrpMinor" error={formState.fieldErrors.rrpMinor}>
            <Input id="rrpMinor" name="rrpMinor" type="number" min={0} defaultValue={formState.values.rrpMinor} placeholder="Optional" />
          </FormField>
          <FormField label="VAT rate (%)" htmlFor="vatRate" error={formState.fieldErrors.vatRate} required>
            <Input id="vatRate" name="vatRate" type="number" min={0} max={100} defaultValue={formState.values.vatRate} />
          </FormField>
          <FormField label="Sale price (pence)" htmlFor="salePriceMinor" error={formState.fieldErrors.salePriceMinor}>
            <Input id="salePriceMinor" name="salePriceMinor" type="number" min={0} defaultValue={formState.values.salePriceMinor} placeholder="Optional" />
          </FormField>
          <FormField label="Sale starts" htmlFor="saleStartsAt" error={formState.fieldErrors.saleStartsAt}>
            <Input id="saleStartsAt" name="saleStartsAt" type="datetime-local" defaultValue={formState.values.saleStartsAt} />
          </FormField>
          <FormField label="Sale ends" htmlFor="saleEndsAt" error={formState.fieldErrors.saleEndsAt}>
            <Input id="saleEndsAt" name="saleEndsAt" type="datetime-local" defaultValue={formState.values.saleEndsAt} />
          </FormField>
          <FormField label="Cost price (pence)" htmlFor="costMinor" error={formState.fieldErrors.costMinor} required>
            <Input id="costMinor" name="costMinor" type="number" min={0} defaultValue={formState.values.costMinor} />
          </FormField>
          <FormField label="Landed cost (pence)" htmlFor="landedCostMinor" error={formState.fieldErrors.landedCostMinor}>
            <Input id="landedCostMinor" name="landedCostMinor" type="number" min={0} defaultValue={formState.values.landedCostMinor} placeholder="Optional" />
          </FormField>
          <div className="rounded-lg bg-surface-ink p-4 text-sm leading-6 text-neutral-300">
            <p className="font-semibold text-neutral-50">Commercial preview</p>
            <p>Profit per unit: {formatMoney(String(pricing.profitMinor))}</p>
            <p>Gross margin: {pricing.marginPercent}%</p>
            {lossWarning ? <p className="mt-2 text-amber-200">Warning: current selling price is below landed cost.</p> : null}
          </div>
        </div>
        </FormSection>
      </section>

      <section id="product-supplier" className="scroll-mt-24">
        <FormSection title="Supplier information" description="Supplier-specific metadata. Supplier SKUs are separate from the public product SKU.">
        <div className="grid gap-4 lg:grid-cols-3">
          <FormField label="Supplier" htmlFor="supplierId" error={formState.fieldErrors.supplierId} required>
            <select id="supplierId" name="supplierId" defaultValue={formState.values.supplierId} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Supplier SKU" htmlFor="supplierSku" error={formState.fieldErrors.supplierSku}>
            <Input id="supplierSku" name="supplierSku" defaultValue={formState.values.supplierSku} placeholder="Defaults to product SKU" />
          </FormField>
          <FormField label="Supplier product URL" htmlFor="supplierProductUrl" error={formState.fieldErrors.supplierProductUrl}>
            <Input id="supplierProductUrl" name="supplierProductUrl" defaultValue={formState.values.supplierProductUrl} placeholder="https://supplier.example/product" />
          </FormField>
          <FormField label="Minimum order quantity" htmlFor="minimumOrderQuantity" error={formState.fieldErrors.minimumOrderQuantity}>
            <Input id="minimumOrderQuantity" name="minimumOrderQuantity" type="number" min={1} defaultValue={formState.values.minimumOrderQuantity} />
          </FormField>
          <FormField label="Pack / case quantity" htmlFor="packQuantity" error={formState.fieldErrors.packQuantity}>
            <Input id="packQuantity" name="packQuantity" type="number" min={1} defaultValue={formState.values.packQuantity} placeholder="Optional" />
          </FormField>
          <FormField label="Supplier lead time (days)" htmlFor="supplierLeadTimeDays" error={formState.fieldErrors.supplierLeadTimeDays}>
            <Input id="supplierLeadTimeDays" name="supplierLeadTimeDays" type="number" min={0} defaultValue={formState.values.supplierLeadTimeDays} />
          </FormField>
        </div>
        </FormSection>
      </section>

      <section id="product-inventory" className="scroll-mt-24">
        <FormSection title="Inventory" description="Physical stock is editable. Reserved and available stock are calculated operational values.">
        <div className="grid gap-4 lg:grid-cols-3">
          <FormField label="Current stock" htmlFor="stockOnHand" error={formState.fieldErrors.stockOnHand} required>
            <Input id="stockOnHand" name="stockOnHand" type="number" min={0} defaultValue={formState.values.stockOnHand} />
          </FormField>
          <FormField label="Reserved stock" htmlFor="reservedStock">
            <Input id="reservedStock" name="reservedStock" type="number" value={formState.values.reservedStock} readOnly aria-readonly="true" />
          </FormField>
          <FormField label="Available stock" htmlFor="availableStock">
            <Input id="availableStock" name="availableStock" type="number" value={formState.values.availableStock} readOnly aria-readonly="true" />
          </FormField>
          <FormField label="Reorder point" htmlFor="reorderPoint" error={formState.fieldErrors.reorderPoint} required>
            <Input id="reorderPoint" name="reorderPoint" type="number" min={0} defaultValue={formState.values.reorderPoint} />
          </FormField>
          <FormField label="Reorder quantity" htmlFor="reorderQuantity" error={formState.fieldErrors.reorderQuantity}>
            <Input id="reorderQuantity" name="reorderQuantity" type="number" min={0} defaultValue={formState.values.reorderQuantity} />
          </FormField>
          <FormField label="Incoming quantity" htmlFor="incomingQuantity" error={formState.fieldErrors.incomingQuantity}>
            <Input id="incomingQuantity" name="incomingQuantity" type="number" min={0} defaultValue={formState.values.incomingQuantity} />
          </FormField>
          <FormField label="Location code" htmlFor="locationCode">
            <Input id="locationCode" name="locationCode" defaultValue={formState.values.locationCode} />
          </FormField>
          <FormField label="Purchase limit" htmlFor="customerPurchaseLimit" error={formState.fieldErrors.customerPurchaseLimit}>
            <Input
              id="customerPurchaseLimit"
              name="customerPurchaseLimit"
              type="number"
              min={1}
              defaultValue={formState.values.customerPurchaseLimit}
              placeholder="Optional"
            />
          </FormField>
        </div>
        </FormSection>
      </section>

      <section id="product-seo" className="scroll-mt-24">
        <FormSection title="SEO" description="Generated defaults are used when these fields are left blank.">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="SEO title" htmlFor="seoTitle" error={formState.fieldErrors.seoTitle}>
            <Input id="seoTitle" name="seoTitle" defaultValue={formState.values.seoTitle} />
          </FormField>
          <FormField label="Canonical URL override" htmlFor="canonicalUrl" error={formState.fieldErrors.canonicalUrl}>
            <Input id="canonicalUrl" name="canonicalUrl" defaultValue={formState.values.canonicalUrl} placeholder="Optional absolute URL" />
          </FormField>
          <FormField label="Meta description" htmlFor="metaDescription" error={formState.fieldErrors.metaDescription}>
            <Textarea id="metaDescription" name="metaDescription" defaultValue={formState.values.metaDescription} />
          </FormField>
          <label className="flex items-start gap-3 self-end text-sm text-neutral-300">
            <input name="noindex" type="checkbox" value="true" defaultChecked={formState.values.noindex} className="mt-1" />
            <span>
              <span className="block font-semibold text-neutral-100">Noindex product page</span>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">Use only for pages that should remain routeable but not indexed.</span>
            </span>
          </label>
        </div>
        </FormSection>
      </section>

      <section id="product-visibility" className="scroll-mt-24">
        <FormSection title="Visibility" description="Control storefront visibility and merchandising state.">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex items-center gap-3 text-sm text-neutral-300">
            <input name="featured" type="checkbox" value="true" defaultChecked={formState.values.featured} />
            Featured product
          </label>
          <label className="flex items-center gap-3 text-sm text-neutral-300">
            <input name="published" type="checkbox" value="true" defaultChecked={formState.values.published} />
            Published in storefront
          </label>
          <label className="flex items-start gap-3 text-sm text-neutral-300">
            <input name="hideWhenOutOfStock" type="checkbox" value="true" defaultChecked={formState.values.hideWhenOutOfStock} className="mt-1" />
            <span>
              <span className="block font-semibold text-neutral-100">Hide when out of stock</span>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">
                When enabled, this product is removed from catalogue and search when available stock reaches zero. Its direct product page remains accessible.
              </span>
            </span>
          </label>
        </div>
        </FormSection>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg">
          {submitLabel}
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href="/admin/products">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
