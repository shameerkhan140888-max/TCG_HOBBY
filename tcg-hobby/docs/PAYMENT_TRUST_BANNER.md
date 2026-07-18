# Payment Trust Banner

The storefront payment trust banner is implemented by `apps/storefront/components/payment-trust-banner.tsx`.

Payment methods are configured in `apps/storefront/lib/payment-methods.ts`.

## Current Public Methods

The checkout flow currently creates Stripe Checkout sessions with `payment_method_types[0] = card`.

Publicly displayed methods:

- Visa
- Mastercard

Payment wording:

> Card payments are securely processed by Stripe.

This avoids implying that Stripe processes PayPal.

## Supported But Disabled

The configuration includes disabled entries for:

- PayPal
- Klarna
- Clearpay
- Apple Pay
- Google Pay
- American Express

Do not enable these publicly until checkout genuinely supports them.

## Assets

Local payment mark assets live in:

- `apps/storefront/public/payments/visa.svg`
- `apps/storefront/public/payments/mastercard.svg`
- `apps/storefront/public/payments/paypal.svg`

These are bundled locally and not hotlinked. The component renders official-supplied SVGs without recolouring, stretching or distortion. Disabled assets are kept for configuration readiness but are not displayed publicly.

If future methods are added, use compliant official or approved local assets. If a compliant asset is unavailable, use a clear text fallback rather than recreating a brand mark.

## Accessibility

The banner includes visible payment wording, not logos alone. Payment marks have accessible labels and the lock icon is decorative because the visible text already says "Secure checkout".

## Extension

To add a future method:

1. Add an approved local asset under `apps/storefront/public/payments/`.
2. Add or update the method in `storefrontPaymentMethods`.
3. Enable it only after checkout support is verified.
4. Update tests to prove enabled methods render and disabled methods remain hidden.
