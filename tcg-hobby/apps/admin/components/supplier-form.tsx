'use client';

import { useActionState, type TextareaHTMLAttributes } from 'react';
import { Button, ErrorMessage, FormField, FormSection, Input } from '@tcg-hobby/ui';
import {
  emptySupplierFormValues,
  type SupplierFormState,
} from '../lib/admin-form-state';
import { saveSupplierAction } from '../lib/admin-actions.server';

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-28 w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none transition-colors placeholder:text-neutral-500 focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  );
}

type SupplierFormProps = {
  state?: SupplierFormState;
  submitLabel: string;
};

export function SupplierForm({ state, submitLabel }: SupplierFormProps) {
  const [formState, formAction] = useActionState(saveSupplierAction, state ?? { fieldErrors: {}, values: emptySupplierFormValues });

  return (
    <form key={JSON.stringify(formState.values)} action={formAction} className="space-y-6">
      <input type="hidden" name="supplierId" value={formState.values.supplierId} />
      {formState.formError ? <ErrorMessage>{formState.formError}</ErrorMessage> : null}

      <FormSection title="Supplier details" description="Identity and contact record for the supplier.">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="Name" htmlFor="name" error={formState.fieldErrors.name} required>
            <Input id="name" name="name" defaultValue={formState.values.name} />
          </FormField>
          <FormField label="Slug" htmlFor="slug">
            <Input id="slug" name="slug" defaultValue={formState.values.slug} placeholder="auto-generated when left blank" />
          </FormField>
          <FormField label="Contact name" htmlFor="contactName">
            <Input id="contactName" name="contactName" defaultValue={formState.values.contactName} />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={formState.values.email} />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={formState.values.phone} />
          </FormField>
          <FormField label="Website" htmlFor="website">
            <Input id="website" name="website" defaultValue={formState.values.website} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Address" description="Supplier location and shipping correspondence.">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="Address line 1" htmlFor="addressLine1">
            <Input id="addressLine1" name="addressLine1" defaultValue={formState.values.addressLine1} />
          </FormField>
          <FormField label="Address line 2" htmlFor="addressLine2">
            <Input id="addressLine2" name="addressLine2" defaultValue={formState.values.addressLine2} />
          </FormField>
          <FormField label="City" htmlFor="city">
            <Input id="city" name="city" defaultValue={formState.values.city} />
          </FormField>
          <FormField label="Region" htmlFor="region">
            <Input id="region" name="region" defaultValue={formState.values.region} />
          </FormField>
          <FormField label="Postal code" htmlFor="postalCode">
            <Input id="postalCode" name="postalCode" defaultValue={formState.values.postalCode} />
          </FormField>
          <FormField label="Country" htmlFor="country">
            <Input id="country" name="country" defaultValue={formState.values.country} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Status and notes" description="Supplier preference and internal notes for the operations team.">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input name="active" type="checkbox" value="true" defaultChecked={formState.values.active} />
              Active supplier
            </label>
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input name="preferred" type="checkbox" value="true" defaultChecked={formState.values.preferred} />
              Preferred supplier
            </label>
          </div>
          <FormField label="Internal notes" htmlFor="internalNotes">
            <Textarea id="internalNotes" name="internalNotes" defaultValue={formState.values.internalNotes} />
          </FormField>
        </div>
      </FormSection>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg">
          {submitLabel}
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href="/admin/suppliers">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
