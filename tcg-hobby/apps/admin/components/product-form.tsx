'use client';

import { useActionState, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, FormField, Input } from '@capital-hobby/ui';
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

type ProductSectionId = (typeof onboardingSections)[number]['id'];

const fieldsBySection: Record<ProductSectionId, string[]> = {
  'product-identity': ['name', 'slug', 'sku', 'barcode', 'gameId', 'brandId', 'productTypeId', 'categoryId', 'languageId', 'setId'],
  'product-media': ['description', 'longDescription', 'verifiedContents', 'primaryImageUrl', 'primaryImageAlt', 'imageLabel', 'galleryImagesText'],
  'product-pricing': ['priceMinor', 'rrpMinor', 'salePriceMinor', 'saleStartsAt', 'saleEndsAt', 'vatRate', 'costMinor', 'landedCostMinor'],
  'product-supplier': ['supplierId', 'supplierSku', 'supplierProductName'],
  'product-inventory': ['stockOnHand', 'reorderPoint', 'targetStockLevel', 'minimumOrderQuantity', 'purchaseLimitQuantity'],
  'product-seo': ['seoTitle', 'seoDescription'],
  'product-visibility': ['featured', 'published', 'homepagePriority', 'hideWhenOutOfStock'],
};

function ProductSection({
  id,
  title,
  description,
  open,
  onToggle,
  children,
}: {
  id: ProductSectionId;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;

  return (
    <section id={id} className="scroll-mt-24 rounded-xl bg-surface-base shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left outline-none transition-colors hover:bg-white/[0.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
      >
        <span>
          <span className="block text-base font-semibold text-neutral-50">{title}</span>
          <span className="mt-1 block text-sm leading-5 text-neutral-400">{description}</span>
        </span>
        <span aria-hidden="true" className="mt-0.5 text-xl leading-none text-accent">
          {open ? '−' : '+'}
        </span>
      </button>
      <div id={panelId} role="region" aria-labelledby={triggerId} className={open ? 'px-5 pb-5' : 'hidden'}>
        {children}
      </div>
    </section>
  );
}

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

function calculateVatExclusiveMinor(grossMinorValue: string, vatRateValue: string) {
  const grossMinor = parseMinor(grossMinorValue);
  const vatRate = parseMinor(vatRateValue);
  if (grossMinor <= 0) return 0;
  if (vatRate <= 0) return grossMinor;
  return Math.round((grossMinor * 100) / (100 + vatRate));
}

function getErrorFieldLabel(fieldName: string) {
  const labels: Record<string, string> = {
    name: 'Name',
    sku: 'SKU',
    gameId: 'Game',
    productTypeId: 'Product type',
    languageId: 'Language',
    description: 'Short description',
    longDescription: 'Long description',
    categoryId: 'Category',
    supplierId: 'Supplier',
    priceMinor: 'Retail price',
    vatRate: 'VAT rate',
    costMinor: 'Cost price',
    stockOnHand: 'Current stock',
    reorderPoint: 'Reorder point',
    primaryImageUrl: 'Primary image URL',
    primaryImageAlt: 'Primary image alt text',
    galleryImagesText: 'Gallery images',
  };

  return labels[fieldName] ?? fieldName;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const pendingLabel = label.toLowerCase().includes('create') ? 'Creating...' : 'Saving...';

  return (
    <Button type="submit" size="lg" disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function ProductForm({ state, categories, suppliers, games, brands, productTypes, languages, sets, submitLabel }: ProductFormProps) {
  const [formState, formAction] = useActionState(saveProductAction, state ?? { fieldErrors: {}, values: emptyProductFormValues });
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [selectedGameId, setSelectedGameId] = useState(formState.values.gameId);
  const [selectedSetId, setSelectedSetId] = useState(formState.values.setId);
  const costGrossMinorValue = formState.values.landedCostMinor || formState.values.costMinor;
  const retailGrossMinorValue = formState.values.salePriceMinor || formState.values.priceMinor;
  const costExVatMinor = calculateVatExclusiveMinor(costGrossMinorValue, formState.values.vatRate);
  const retailVatMinor = parseMinor(retailGrossMinorValue) - calculateVatExclusiveMinor(retailGrossMinorValue, formState.values.vatRate);
  const pricing = calculateMargin(String(costExVatMinor), retailGrossMinorValue);
  const lossWarning =
    parseMinor(formState.values.landedCostMinor || formState.values.costMinor) > parseMinor(formState.values.salePriceMinor || formState.values.priceMinor);
  const selectedSet = sets.find((set) => set.id === selectedSetId);
  const selectedSetIsCompatible = !selectedSet || !selectedGameId || !selectedSet.gameId || selectedSet.gameId === selectedGameId;
  const filteredSets = sets.filter((set) => !set.gameId || !selectedGameId || set.gameId === selectedGameId || set.id === selectedSetId);
  const errorEntries = useMemo(() => Object.entries(formState.fieldErrors), [formState.fieldErrors]);
  const hasPrimaryImage = Boolean(formState.values.primaryImageUrl);
  const [openSections, setOpenSections] = useState<Set<ProductSectionId>>(
    () => new Set<ProductSectionId>(['product-identity', 'product-pricing']),
  );

  useEffect(() => {
    setSelectedGameId(formState.values.gameId);
    setSelectedSetId(formState.values.setId);
  }, [formState.values.gameId, formState.values.setId]);

  useEffect(() => {
    if (errorEntries.length === 0 && !formState.formError) {
      return;
    }

    setOpenSections((current) => {
      const next = new Set(current);
      for (const [fieldName] of errorEntries) {
        const section = onboardingSections.find(({ id }) => fieldsBySection[id].includes(fieldName));
        if (section) {
          next.add(section.id);
        }
      }
      return next;
    });

    errorSummaryRef.current?.focus();
    const firstFieldName = errorEntries[0]?.[0];
    if (!firstFieldName) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(firstFieldName)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [errorEntries, formState.formError]);

  function handleGameChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextGameId = event.target.value;
    setSelectedGameId(nextGameId);

    const currentSet = sets.find((set) => set.id === selectedSetId);
    if (currentSet?.gameId && currentSet.gameId !== nextGameId) {
      setSelectedSetId('');
    }
  }

  function toggleSection(sectionId: ProductSectionId) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  return (
    <form key={JSON.stringify(formState.values)} action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="productId" value={formState.values.productId} />
      <input type="hidden" name="heroFeatured" value={formState.values.heroFeatured ? 'true' : 'false'} />
      {errorEntries.length || formState.formError ? (
        <div
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100 outline-none focus:ring-2 focus:ring-red-300/60"
        >
          <p className="font-semibold">Product could not be saved. Review the highlighted fields below.</p>
          {formState.formError ? <p className="mt-2">{formState.formError}</p> : null}
          {errorEntries.length ? (
            <ul className="mt-3 space-y-1">
              {errorEntries.map(([fieldName, message]) => (
                <li key={fieldName}>
                  <a className="underline decoration-red-300 underline-offset-4" href={`#${fieldName}`}>
                    {getErrorFieldLabel(fieldName)}: {message}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-xl bg-surface-base p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)] lg:grid-cols-[1fr_280px]">
        <div>
          <nav aria-label="Product onboarding sections" className="flex flex-wrap gap-2">
            {onboardingSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setOpenSections((current) => new Set(current).add(section.id))}
                className="rounded-full bg-surface-ink px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition-colors hover:bg-accent/15 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {section.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex gap-3 text-xs">
            <button type="button" className="font-semibold text-accent hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent/40" onClick={() => setOpenSections(new Set(onboardingSections.map(({ id }) => id)))}>
              Expand all
            </button>
            <button type="button" className="font-semibold text-neutral-400 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-accent/40" onClick={() => setOpenSections(new Set())}>
              Collapse all
            </button>
          </div>
        </div>
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

      <ProductSection id="product-identity" title="Product identity" description="Identity, category, classification, and publish-safe URLs." open={openSections.has('product-identity')} onToggle={() => toggleSection('product-identity')}>
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
      </ProductSection>

      <ProductSection id="product-media" title="Copy and media" description="Product copy and URL-managed image metadata." open={openSections.has('product-media')} onToggle={() => toggleSection('product-media')}>
        <div className="grid gap-4">
          <FormField label="Short description" htmlFor="description" error={formState.fieldErrors.description} required>
            <Textarea id="description" name="description" defaultValue={formState.values.description} />
          </FormField>
          <FormField label="Long description" htmlFor="longDescription" error={formState.fieldErrors.longDescription} required>
            <Textarea id="longDescription" name="longDescription" defaultValue={formState.values.longDescription} />
          </FormField>
          <FormField label="Product contents" htmlFor="contents" error={formState.fieldErrors.contents}>
            <Textarea
              id="contents"
              name="contents"
              defaultValue={formState.values.contents}
              placeholder={'1 promotional card\n8 booster packs\n1 reusable sticker'}
            />
            <p className="mt-2 text-xs leading-5 text-neutral-400">
              List the items included with the sealed product. One item per line is recommended.
            </p>
          </FormField>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Image label" htmlFor="imageLabel">
              <Input id="imageLabel" name="imageLabel" defaultValue={formState.values.imageLabel} />
            </FormField>
            <FormField label="Primary image URL" htmlFor="primaryImageUrl" error={formState.fieldErrors.primaryImageUrl}>
              <Input id="primaryImageUrl" name="primaryImageUrl" defaultValue={formState.values.primaryImageUrl} placeholder="/products/game/slug/primary.webp or https://..." />
            </FormField>
            <FormField label="Primary image alt text" htmlFor="primaryImageAlt" error={formState.fieldErrors.primaryImageAlt} required={hasPrimaryImage}>
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
          {!hasPrimaryImage ? (
            <div className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              No product image configured. The storefront placeholder will be displayed.
            </div>
          ) : (
            <div className="rounded-lg bg-surface-ink px-4 py-3 text-sm text-neutral-300">
              Primary image configured. Make sure the alt text describes the product image for customers who cannot see it.
            </div>
          )}
          <FormField label="Availability / shipping promotion" htmlFor="availabilityMessage">
            <Textarea
              id="availabilityMessage"
              name="availabilityMessage"
              defaultValue={formState.values.availabilityMessage}
              placeholder="Optional product-specific delivery, limit or availability note"
            />
          </FormField>
        </div>
      </ProductSection>

      <ProductSection id="product-pricing" title="Pricing" description="VAT-inclusive retail pricing, supplier cost, sale windows, and commercial margin." open={openSections.has('product-pricing')} onToggle={() => toggleSection('product-pricing')}>
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
            <p>Cost: {formatMoney(String(costExVatMinor))} ex VAT</p>
            <p>Retail: {formatMoney(retailGrossMinorValue)} VAT inclusive</p>
            <p>VAT included in retail: {formatMoney(String(retailVatMinor))}</p>
            <p>Gross profit: {formatMoney(String(pricing.profitMinor))} ex VAT cost basis</p>
            <p>Gross margin: {pricing.marginPercent}% on VAT-inclusive retail</p>
            {lossWarning ? <p className="mt-2 text-amber-200">Warning: current selling price is below landed cost.</p> : null}
          </div>
        </div>
      </ProductSection>

      <ProductSection id="product-supplier" title="Supplier information" description="Supplier-specific catalogue and purchasing metadata." open={openSections.has('product-supplier')} onToggle={() => toggleSection('product-supplier')}>
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
      </ProductSection>

      <ProductSection id="product-inventory" title="Inventory" description="Physical stock and operational replenishment settings." open={openSections.has('product-inventory')} onToggle={() => toggleSection('product-inventory')}>
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
      </ProductSection>

      <ProductSection id="product-seo" title="SEO" description="Optional search and social metadata overrides." open={openSections.has('product-seo')} onToggle={() => toggleSection('product-seo')}>
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
      </ProductSection>

      <ProductSection id="product-visibility" title="Visibility" description="Storefront publication and merchandising controls." open={openSections.has('product-visibility')} onToggle={() => toggleSection('product-visibility')}>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex items-center gap-3 text-sm text-neutral-300">
            <input name="featured" type="checkbox" value="true" defaultChecked={formState.values.featured} />
            Featured product
          </label>
          <label className="flex items-center gap-3 text-sm text-neutral-300">
            <input name="published" type="checkbox" value="true" defaultChecked={formState.values.published} />
            Published in storefront
          </label>
          <FormField label="Featured priority" htmlFor="homepagePriority" error={formState.fieldErrors.homepagePriority} hint="Lower values appear first in Featured products. Manage hero placements under Storefront.">
            <Input id="homepagePriority" name="homepagePriority" type="number" min="0" defaultValue={formState.values.homepagePriority} placeholder="Lower appears first" />
          </FormField>
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
      </ProductSection>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={submitLabel} />
        <Button asChild variant="outline" size="lg">
          <a href="/admin/products">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
