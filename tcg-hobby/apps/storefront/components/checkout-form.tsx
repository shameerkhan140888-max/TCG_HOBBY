'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Button,
  CheckoutStep,
  ErrorMessage,
  FormField,
  Input,
  OrderSummary,
  SecureCheckoutNotice,
  ShippingMethodCard,
} from '@tcg-hobby/ui';
import type { CheckoutFormState } from '../lib/checkout';
import { placeCheckoutOrderAction } from '../lib/checkout-actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit" size="lg">
      {pending ? 'Starting secure payment...' : 'Pay securely with Stripe'}
    </Button>
  );
}

export function CheckoutForm({ state, cartSubtotalMinor }: { state: CheckoutFormState; cartSubtotalMinor: number }) {
  const [formState, formAction] = useActionState(placeCheckoutOrderAction, state);
  const selectedMethod =
    formState.shippingMethods.find((method) => method.code === formState.values.shippingMethodCode) ??
    formState.shippingMethods[0];

  const summary = {
    currency: 'GBP' as const,
    subtotalMinor: cartSubtotalMinor,
    shippingMinor: selectedMethod?.amountMinor ?? 0,
    taxMinor: 0,
    totalMinor: cartSubtotalMinor + (selectedMethod?.amountMinor ?? 0),
  };

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <input type="hidden" name="returnTo" value="/checkout" />

      <div className="space-y-6">
        <div className="space-y-4 rounded-lg border border-surface-line bg-surface-base p-5">
          <CheckoutStep
            number="1"
            title="Delivery details"
            description="Use the same details you want on the order confirmation and shipping label."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="fullName" error={formState.fieldErrors.fullName} required>
              <Input id="fullName" name="fullName" defaultValue={formState.values.fullName} placeholder="Sam Collector" />
            </FormField>
            <FormField label="Email" htmlFor="email" error={formState.fieldErrors.email} required>
              <Input id="email" name="email" type="email" defaultValue={formState.values.email} placeholder="sam@example.com" />
            </FormField>
          </div>

          <FormField label="Address line 1" htmlFor="line1" error={formState.fieldErrors.line1} required>
            <Input id="line1" name="line1" defaultValue={formState.values.line1} placeholder="14 Aurora Street" />
          </FormField>

          <FormField label="Address line 2" htmlFor="line2" error={formState.fieldErrors.line2}>
            <Input id="line2" name="line2" defaultValue={formState.values.line2 ?? ''} placeholder="Apartment, suite, or unit" />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="City" htmlFor="city" error={formState.fieldErrors.city} required>
              <Input id="city" name="city" defaultValue={formState.values.city} placeholder="Bristol" />
            </FormField>
            <FormField label="Region" htmlFor="region" error={formState.fieldErrors.region}>
              <Input id="region" name="region" defaultValue={formState.values.region ?? ''} placeholder="County or state" />
            </FormField>
            <FormField label="Postal code" htmlFor="postalCode" error={formState.fieldErrors.postalCode} required>
              <Input id="postalCode" name="postalCode" defaultValue={formState.values.postalCode} placeholder="BS1 4TR" />
            </FormField>
            <FormField label="Country code" htmlFor="country" error={formState.fieldErrors.country} required>
              <Input id="country" name="country" defaultValue={formState.values.country} placeholder="GB" />
            </FormField>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-surface-line bg-surface-base p-5">
          <CheckoutStep number="2" title="Shipping method" description="Choose the delivery option that matches your destination and timing." />
          <div className="grid gap-3">
            {formState.shippingMethods.map((method) => (
              <ShippingMethodCard
                key={method.code}
                method={method}
                name="shippingMethodCode"
                checked={method.code === (formState.values.shippingMethodCode || formState.shippingMethods[0]?.code)}
              />
            ))}
          </div>
          {formState.fieldErrors.shippingMethodCode ? <ErrorMessage>{formState.fieldErrors.shippingMethodCode}</ErrorMessage> : null}
        </div>

        <div className="space-y-4 rounded-lg border border-surface-line bg-surface-base p-5">
          <CheckoutStep number="3" title="Payment" description="Stripe test mode handles the card step in a secure hosted checkout." />
          <SecureCheckoutNotice />
          {formState.formError ? <ErrorMessage>{formState.formError}</ErrorMessage> : null}
          <SubmitButton />
        </div>
      </div>

      <aside className="space-y-4">
        <OrderSummary
          summary={summary}
          actionSlot={
            <div className="space-y-3">
              <p className="text-sm leading-6 text-neutral-400">The final Stripe amount will include your product total plus the shipping method you selected above.</p>
            </div>
          }
        />
      </aside>
    </form>
  );
}
