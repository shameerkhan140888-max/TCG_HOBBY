'use client';

import { useActionState, type TextareaHTMLAttributes } from 'react';
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
};

type ProductFormProps = {
  state?: ProductFormState;
  categories: Option[];
  suppliers: Option[];
  submitLabel: string;
};

export function ProductForm({ state, categories, suppliers, submitLabel }: ProductFormProps) {
  const [formState, formAction] = useActionState(saveProductAction, state ?? { fieldErrors: {}, values: emptyProductFormValues });

  return (
    <form key={JSON.stringify(formState.values)} action={formAction} className="space-y-6">
      <input type="hidden" name="productId" value={formState.values.productId} />
      {formState.formError ? <ErrorMessage>{formState.formError}</ErrorMessage> : null}

      <FormSection title="Core details" description="Identity, category, and supplier metadata.">
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
          <FormField label="Game / brand" htmlFor="game" error={formState.fieldErrors.game} required>
            <Input id="game" name="game" defaultValue={formState.values.game} />
          </FormField>
          <FormField label="Set name" htmlFor="setName">
            <Input id="setName" name="setName" defaultValue={formState.values.setName} />
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
        </div>
      </FormSection>

      <FormSection title="Copy and media" description="Description fields and future media placeholders.">
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
              <Input id="primaryImageUrl" name="primaryImageUrl" defaultValue={formState.values.primaryImageUrl} placeholder="Placeholder CDN URL" />
            </FormField>
          </div>
          <FormField label="Gallery image URL" htmlFor="galleryImageUrl">
            <Input id="galleryImageUrl" name="galleryImageUrl" defaultValue={formState.values.galleryImageUrl} placeholder="Optional secondary image" />
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

      <FormSection title="Pricing and stock" description="Retail, cost, stock visibility, and warehouse state.">
        <div className="grid gap-4 lg:grid-cols-3">
          <FormField label="Retail price (pence)" htmlFor="priceMinor" error={formState.fieldErrors.priceMinor} required>
            <Input id="priceMinor" name="priceMinor" type="number" min={0} defaultValue={formState.values.priceMinor} />
          </FormField>
          <FormField label="Cost price (pence)" htmlFor="costMinor" error={formState.fieldErrors.costMinor} required>
            <Input id="costMinor" name="costMinor" type="number" min={0} defaultValue={formState.values.costMinor} />
          </FormField>
          <FormField label="Location code" htmlFor="locationCode">
            <Input id="locationCode" name="locationCode" defaultValue={formState.values.locationCode} />
          </FormField>
          <FormField label="Current stock" htmlFor="stockOnHand" error={formState.fieldErrors.stockOnHand} required>
            <Input id="stockOnHand" name="stockOnHand" type="number" min={0} defaultValue={formState.values.stockOnHand} />
          </FormField>
          <FormField label="Reserved stock" htmlFor="reservedStock" error={formState.fieldErrors.reservedStock} required>
            <Input id="reservedStock" name="reservedStock" type="number" min={0} defaultValue={formState.values.reservedStock} />
          </FormField>
          <FormField label="Reorder point" htmlFor="reorderPoint" error={formState.fieldErrors.reorderPoint} required>
            <Input id="reorderPoint" name="reorderPoint" type="number" min={0} defaultValue={formState.values.reorderPoint} />
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

      <FormSection title="Publishing" description="Control storefront visibility and merchandising state.">
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
