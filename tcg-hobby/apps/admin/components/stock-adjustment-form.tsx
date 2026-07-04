'use client';

import { useActionState, type TextareaHTMLAttributes } from 'react';
import { Button, ErrorMessage, FormField, FormSection, Input } from '@tcg-hobby/ui';
import { emptyStockAdjustmentFormValues, type StockAdjustmentFormState } from '../lib/admin-form-state';
import { adjustStockAction } from '../lib/admin-actions.server';

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-24 w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none transition-colors placeholder:text-neutral-500 focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  );
}

export function StockAdjustmentForm({
  productId,
  products = [],
  defaultPerformedBy = 'Operations Desk',
}: {
  productId?: string;
  products?: Array<{ id: string; label: string }>;
  defaultPerformedBy?: string;
}) {
  const [formState, formAction] = useActionState(adjustStockAction, {
    fieldErrors: {},
    values: { ...emptyStockAdjustmentFormValues, productId: productId ?? '', performedBy: defaultPerformedBy },
  } satisfies StockAdjustmentFormState);

  return (
    <form key={JSON.stringify(formState.values)} action={formAction} className="space-y-4">
      {formState.formError ? <ErrorMessage>{formState.formError}</ErrorMessage> : null}
      <FormSection title="Adjust stock" description="Record a manual stock movement and capture the reason.">
        <div className="grid gap-4 lg:grid-cols-2">
          {productId ? (
            <input type="hidden" name="productId" value={productId} />
          ) : (
            <FormField label="Product" htmlFor="productId" error={formState.fieldErrors.productId} required>
              <select id="productId" name="productId" defaultValue={formState.values.productId} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">Select a product</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Quantity delta" htmlFor="delta" error={formState.fieldErrors.delta} required>
            <Input id="delta" name="delta" type="number" defaultValue={formState.values.delta} />
          </FormField>
          <FormField label="Performed by" htmlFor="performedBy">
            <Input id="performedBy" name="performedBy" defaultValue={formState.values.performedBy} />
          </FormField>
        </div>
        <FormField label="Reason" htmlFor="reason" error={formState.fieldErrors.reason} required>
          <Textarea id="reason" name="reason" defaultValue={formState.values.reason} />
        </FormField>
        <Button type="submit">Record adjustment</Button>
      </FormSection>
    </form>
  );
}
