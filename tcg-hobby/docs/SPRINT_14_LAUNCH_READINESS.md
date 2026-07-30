# Sprint 14 Launch Readiness

## Shipping rules

UK delivery is calculated by the canonical commerce functions in `packages/database/src/commerce.ts`.

| VAT-inclusive merchandise subtotal after discounts | Standard delivery | Express delivery |
| --- | ---: | ---: |
| Below £50.00 | £2.99 | £4.99 |
| £50.00 or more | Free | £2.99 |

The threshold is evaluated before shipping. Exactly £50.00 qualifies. A genuine product-specific free-standard-delivery promotion can reduce Standard delivery to zero for an eligible basket; it does not make unrelated products free by itself. Storefront, API, mobile, persisted orders and Stripe line items use the same server-side quote.

The basket progress message is derived from the same £50 threshold and integer minor-unit subtotal.

## Checkout lifecycle

1. The customer submits delivery and shipping details.
2. The server validates the current basket, pricing, purchase limits and stock.
3. A `PENDING_PAYMENT` order with `REQUIRES_PAYMENT` payment status is created and inventory is reserved.
4. Stripe Checkout is created with the order ID as the idempotency-key source.
5. The Stripe session is attached to the pending order.
6. The client navigates to the returned HTTPS Stripe Checkout URL.
7. Stripe posts a signed event to `/api/stripe/webhook`.
8. The webhook verifies the raw request body and signature before it can change order state.
9. A paid `checkout.session.completed` event finalizes the order, changes payment status to `SUCCEEDED`, reduces reserved and on-hand stock once, and clears purchased account-cart lines.
10. The success return reads canonical order state only. It never marks an order paid and shows a processing state until the webhook has completed.

Framework redirect exceptions are not used for the hosted-payment handoff and cannot enter the provider-failure path.

### Idempotency

Each rendered checkout form receives an opaque `checkoutAttemptId`. The database enforces uniqueness and repeated submissions reuse the same pending order. Stripe receives `checkout-session:{orderId}` as its idempotency key. A simultaneous unique-key race resolves to the winning pending order instead of creating a duplicate.

The client payment button is disabled while its server action is pending. Server-side idempotency remains authoritative.

### Failure, cancellation and expiry

- Basket or reservation failure: no Stripe session is created and a safe customer message is returned.
- Stripe session creation failure: the order is cancelled and its stock reservation is released.
- Stripe session linking failure: the valid Stripe session is not cancelled as a side effect; a retry uses the same order and Stripe idempotency key.
- Customer cancellation at Stripe: Stripe returns to `/checkout/cancel` with the order ID and opaque checkout-attempt ID. A matching unpaid reservation is cancelled and released, then the customer returns to checkout.
- `checkout.session.expired`: the signed webhook cancels the unpaid order and releases its reservation once.
- `payment_intent.payment_failed`: the signed webhook records a failed payment and releases its reservation once.
- Expired unpaid reservations: a bounded sweep remains as recovery and releases up to 100 expired `PENDING_PAYMENT` / `REQUIRES_PAYMENT` reservations when a new checkout begins. Completed or already-cancelled orders cannot be released twice.

Failed and cancelled orders remain available as operational evidence.

### Webhook idempotency

Every Stripe event ID is stored in `StripeWebhookEvent`. Processed duplicate deliveries return successfully without repeating inventory or payment transitions. Order transition predicates also prevent concurrent deliveries from claiming the same unpaid order twice. Failed processing remains retryable, while event records retain a safe outcome or error code without storing card data or webhook bodies.

## Stripe configuration

Server processes use:

- `STRIPE_SECRET_KEY`: Stripe test or live secret key used by hosted Checkout.
- `STRIPE_WEBHOOK_SECRET`: endpoint signing secret for `/api/stripe/webhook`.
- `APP_URL`: canonical storefront origin used by web Checkout return URLs.
- `PUBLIC_STOREFRONT_URL`: canonical storefront origin used by API/mobile Checkout return URLs.

Checkout and webhook attempts fail with safe configuration errors when the corresponding server-only secret is absent. Non-checkout storefront development remains available. No Stripe secret may use a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefix. Hosted Checkout does not require a publishable key in this architecture.

## Test-mode Stripe acceptance

1. Create or reveal a Stripe **test-mode** secret key in the Stripe Dashboard.
2. Put `STRIPE_SECRET_KEY=sk_test_...`, `APP_URL=http://localhost:3000`, and `PUBLIC_STOREFRONT_URL=http://localhost:3000` in the ignored root `.env.local`.
3. Install and authenticate the Stripe CLI, then run:
   `stripe listen --events checkout.session.completed,checkout.session.expired,payment_intent.payment_failed --forward-to http://localhost:3000/api/stripe/webhook`
4. Copy the CLI's temporary `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then restart the storefront.
5. Add an in-stock product and proceed through guest or customer checkout.
6. Confirm Standard and Express prices at £49.99 and £50.00 boundaries.
7. Complete hosted Checkout with test card `4242 4242 4242 4242`, any future expiry, any CVC and any valid postal code.
8. Confirm the CLI reports a successful signed webhook delivery.
9. Confirm exactly one order and Checkout Session exist, the order becomes paid from the webhook, inventory changes once, and Stripe, checkout, order and Admin totals match.
10. Replay the completed event with the Stripe CLI and confirm no stock or order values change.
11. Repeat using Stripe's decline test card to verify failed-payment handling.
12. Cancel hosted Checkout and confirm the documented cancellation path releases the reservation.
13. Use a Stripe CLI fixture or expire a test Session from the Dashboard/API to verify `checkout.session.expired`.
14. Inspect Dashboard Developers > Events and the local safe logs for event IDs and outcomes.

Never put Stripe secret keys in browser-visible environment variables or committed files.

### Production checklist and rotation

1. Register `https://tcg-hobby.co.uk/api/stripe/webhook` in Stripe live mode with only the supported events.
2. Configure the live secret key and endpoint-specific webhook secret in the production secret manager.
3. Set both canonical storefront origins to the HTTPS production origin.
4. Apply database migrations before enabling Checkout.
5. Complete one controlled low-risk payment, cancellation and webhook replay.
6. Verify neither secrets nor payment details appear in logs or client bundles.
7. To rotate a key, create the replacement, update the secret manager, restart the affected server, validate, then revoke the old key.
8. To rotate a webhook secret, roll the endpoint secret in Stripe, update the server immediately, send a test event, then retire the old secret.

## Storefront merchandising

### Hero placements

`/admin/storefront` provides ADMIN-only management of homepage hero placements. A placement stores its associated product, independent headline and supporting copy, one internal CTA, optional dedicated image, schedule, order and active state.

Selecting a product fills its canonical `/catalogue/{slug}` route, previews its canonical image immediately, and fills the product name only when the headline is blank. `Use product image` is the default and follows the shared canonical product-image resolver. `Use custom hero image` may select an active image owned by the associated product or upload placement-owned promotional artwork to R2. Custom media overrides imagery only for that hero placement and never enters or changes the product gallery.

Uploaded hero media stores the server-controlled R2 key, public and thumbnail URLs, dimensions, MIME type, byte size, alt text, upload timestamp, uploader and cleanup state on the placement. Switching back to product mode retains custom media until an ADMIN uses the explicit remove action. Removal clears only placement-owned metadata and objects; failed R2 cleanup is recorded through the existing cleanup queue. An unavailable custom image falls back to the canonical product image and then the approved placeholder without changing the stored source.

Migration `20260729190000_add_hero_image_source` is additive. It adds the constrained source value, optional selected product-image relation and managed hero metadata. Existing placements with a dedicated `imageUrl` are backfilled to `CUSTOM`; all others remain `PRODUCT`. It does not rewrite or delete any `ProductImage` record.

Invalid CTA or image paths return as accessible inline Admin form errors and preserve the entered values. Uploads require ADMIN authorization, validated file signatures and decoding, approved image formats, size limits and placement-owned collision-resistant object keys. Artwork rights guidance is displayed beside the upload control.

Public selection is deterministic, limited to three, and excludes inactive, expired, unpublished and out-of-stock products. A dedicated image falls back to the same canonical product-image resolver used by catalogue cards. If no usable managed placement is available, the maintained static hero slides remain the safe fallback. Featured-product settings do not automatically create hero placements.

Migration `20260728120000_backfill_mega_greninja_hero` restores only the previously configured Mega Greninja placement when that exact product is still published and `heroFeatured`. It is additive and idempotent and does not convert other featured products into hero placements.

### Promotional banner

The same Admin screen manages thin site-wide banners with optional label, icon, internal CTA, schedule and display order. When no banner has ever been configured, the storefront derives the default message from the canonical £50 threshold. Once banners exist, deactivating all of them hides the banner.

CTA destinations accept internal storefront paths only. Banner content is rendered as text, never raw HTML.
The shared storefront shell keeps the resolved active banner directly beneath the sticky header. Because the header and banner remain in one sticky flow container, active content is offset naturally and disabling the banner removes its height without leaving a blank strip.

### Shop landing pages

Admin can maintain heading, supporting copy, SEO title, meta description, active state and optional merchandising references for:

- Shop All
- Pokémon TCG
- Magic: The Gathering
- One Piece Card Game
- Disney Lorcana
- Yu-Gi-Oh!
- Accessories

Inactive records fall back to maintained department copy. Existing `/catalogue` URLs remain valid, while new navigation uses `/shop` and dedicated `/shop/{department}` routes.

## Header search

The search icon opens an inline desktop or full-width mobile search form without navigating. Focus moves to the input; Escape closes it and restores focus. Submission sends an encoded `search` query to `/shop`. An empty query opens unfiltered Shop All.

## Admin usability

The Admin shell groups working routes into Overview, Catalogue, Commerce, Marketing and Operations. Desktop navigation supports expanded and icon-only modes and stores the preference in local storage. Navigation icons are constrained to 20px inside consistent hit targets. The mobile drawer locks body scrolling, closes after navigation, returns focus to its trigger, supports Escape and traps keyboard focus while open.

The product form uses accessible collapsible sections. Identity and Pricing open initially, Expand all and Collapse all are non-submit controls, fields remain mounted, and sections containing validation errors open automatically.

## Product images

Catalogue cards, merchandising cards, product detail, basket, checkout, order views and public commerce projections share the canonical image resolver:

1. active managed primary image;
2. deterministic active managed fallback;
3. legacy canonical external URL;
4. approved placeholder.

Ordinary product images render contained on a stable white canvas. Hero and editorial artwork remain separate.

## Deferred work

- preorder commerce and release-calendar redesign;
- split fulfilment and preorder allocations;
- broad CMS functionality;
- unrelated mobile expansion.
