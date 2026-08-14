# Iron Sprue Stripe Local Testing

Iron Sprue reuses the hosted Stripe Checkout and signed-webhook pattern already proven for TCG Hobby, with store-scoped Iron Sprue configuration and separate Iron Sprue order/cart tables.

## Required Local Variables

Copy `.env.example` to ignored local environment files and fill in test-mode values only:

- `COMMERCE_ENVIRONMENT=test`
- `IRON_SPRUE_STRIPE_ACCOUNT_ID`
- `IRON_SPRUE_STRIPE_TEST_SECRET_KEY`
- `IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET`
- `IRON_SPRUE_STRIPE_TEST_PUBLISHABLE_KEY`
- `IRON_SPRUE_STRIPE_STATEMENT_DESCRIPTOR`
- `IRON_SPRUE_STRIPE_PUBLIC_BUSINESS_NAME`
- `IRON_SPRUE_CHECKOUT_SUCCESS_URL`
- `IRON_SPRUE_CHECKOUT_CANCEL_URL`
- `IRON_SPRUE_NODE_API_ORIGIN`
- `IRON_SPRUE_INTERNAL_API_KEY_ID`
- `IRON_SPRUE_INTERNAL_API_SECRET`

Do not use live keys locally. Do not put actual keys in tracked files.

## Local Webhook

Use the Stripe CLI against the Iron Sprue webhook route:

```powershell
stripe listen --forward-to http://localhost:3004/api/stripe/iron-sprue/webhook
```

Copy the temporary `whsec_...` value printed by the CLI into the ignored local variable `IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET`, then restart the Iron Sprue storefront process. This CLI secret is not the same as a Dashboard webhook endpoint signing secret. Iron Sprue must not use the shared `STRIPE_WEBHOOK_SECRET`.

## Manual Test Flow

1. Start the API and Iron Sprue storefront with the ignored local environment loaded.
2. Visit `http://localhost:3004/shop`.
3. Add an Iron Sprue product to the basket.
4. Go to `http://localhost:3004/basket`.
5. Enter a test delivery address and start Stripe Checkout.
6. Complete hosted Checkout with a Stripe test card.
7. Confirm Stripe redirects to `/checkout/success`.
8. Confirm the signed webhook finalises the Iron Sprue order exactly once and inventory is decremented once.
9. Replay the Stripe event from the CLI and confirm no duplicate order, duplicate inventory decrement or cross-store mutation occurs.

Stripe account-level branding may still show the configured Capital Hobby Group account identity. Application-controlled checkout metadata, success/cancel URLs and order records must remain Iron Sprue scoped.
