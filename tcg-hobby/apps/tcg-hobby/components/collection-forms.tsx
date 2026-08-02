'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, ErrorMessage, FormField, Input, MoneyInput } from '@tcg-hobby/ui';
import { addCollectionItemAction, type CollectionImportFormState } from '../lib/collection-actions';

const emptyState: CollectionImportFormState = {
  fieldErrors: {},
  values: {
    productId: '',
    quantity: '1',
    printVariant: 'REGULAR',
    condition: 'NEAR_MINT',
    language: 'EN',
    foil: false,
    notes: '',
    dateAcquired: '',
    purchasePriceMinor: '',
  },
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Adding...' : 'Add to collection'}
    </Button>
  );
}

export function CollectionImportForm({ productId, returnTo }: { productId: string; returnTo: string }) {
  const [state, formAction] = useActionState(addCollectionItemAction, emptyState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-surface-line bg-surface-base p-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Quantity" htmlFor={`collection-qty-${productId}`} error={state.fieldErrors.quantity} required>
          <Input id={`collection-qty-${productId}`} name="quantity" type="number" min={1} defaultValue={state.values.quantity} />
        </FormField>
        <FormField label="Variant" htmlFor={`collection-variant-${productId}`} error={state.fieldErrors.printVariant} required>
          <select
            id={`collection-variant-${productId}`}
            name="printVariant"
            defaultValue={state.values.printVariant}
            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
          >
            {['REGULAR', 'REVERSE_HOLO', 'HOLO', 'PROMO', 'FIRST_EDITION', 'FOIL'].map((item) => (
              <option key={item} value={item}>
                {item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Condition" htmlFor={`collection-condition-${productId}`} error={state.fieldErrors.condition} required>
          <select
            id={`collection-condition-${productId}`}
            name="condition"
            defaultValue={state.values.condition}
            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
          >
            {['MINT', 'NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED', 'SEALED'].map((item) => (
              <option key={item} value={item}>
                {item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Language" htmlFor={`collection-language-${productId}`} error={state.fieldErrors.language}>
          <Input id={`collection-language-${productId}`} name="language" defaultValue={state.values.language} placeholder="EN" />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Date acquired" htmlFor={`collection-date-${productId}`} error={state.fieldErrors.dateAcquired}>
          <Input id={`collection-date-${productId}`} name="dateAcquired" type="date" defaultValue={state.values.dateAcquired} />
        </FormField>
        <FormField label="Foil" htmlFor={`collection-foil-${productId}`}>
          <label className="flex h-10 items-center gap-3 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-200">
            <input id={`collection-foil-${productId}`} name="foil" type="checkbox" defaultChecked={state.values.foil} />
            Foil card
          </label>
        </FormField>
      </div>
      <div className="space-y-2">
        <MoneyInput
          label="Purchase price (pence)"
          id={`collection-price-${productId}`}
          name="purchasePriceMinor"
          defaultValue={state.values.purchasePriceMinor}
        />
        {state.fieldErrors.purchasePriceMinor ? <p className="text-sm text-red-300">{state.fieldErrors.purchasePriceMinor}</p> : null}
      </div>
      <FormField label="Notes" htmlFor={`collection-notes-${productId}`} error={state.fieldErrors.notes}>
        <Input id={`collection-notes-${productId}`} name="notes" defaultValue={state.values.notes} placeholder="Binder copy, top loader, trade stock..." />
      </FormField>
      <ErrorMessage>{state.formError}</ErrorMessage>
      <SubmitButton />
    </form>
  );
}
