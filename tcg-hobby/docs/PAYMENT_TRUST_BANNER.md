# Payment Trust Banner

Work Package 2B adds a compact payment reassurance banner to the storefront layout.

## Component Location

The component lives at:

`apps/storefront/components/payment-trust-banner.tsx`

It is rendered once from:

`apps/storefront/app/layout.tsx`

This places it between main page content and the active storefront footer. It is not part of product cards, checkout forms, email templates or the Admin app.

## Current Payment Methods

The current checkout flow creates Stripe hosted checkout sessions with card payments. The banner therefore displays:

- Visa
- Mastercard

PayPal is not displayed because there is no active PayPal checkout implementation in the storefront.

## Wording

The banner uses conservative wording:

- `Secure checkout`
- `Card payments are processed through Stripe.`
- `VAT included in product prices.`

It does not claim:

- PayPal support
- fake security certification
- fake SSL certification
- guaranteed 100% security
- unsupported payment methods

## Official Marks

WP2B uses clean text labels rather than official card-network artwork. Do not download random payment logos from unofficial sources.

If official marks are added later:

1. Use approved brand assets only.
2. Preserve aspect ratio and clear space.
3. Do not recolour or redraw marks.
4. Provide accessible text labels or alt text.
5. Keep the current compact layout.

## Accessibility

Payment method names are rendered as text in a semantic list with an accessible label. The banner does not rely on logo imagery alone.

## Adding Future Methods

Only add a payment method when the checkout flow genuinely supports it or the page copy clearly explains that it is not currently available.

Future additions such as Apple Pay, Google Pay or PayPal should update:

- checkout implementation
- checkout copy
- `PaymentTrustBanner`
- component tests
- this document

Accuracy is more important than displaying a longer list of payment brands.
