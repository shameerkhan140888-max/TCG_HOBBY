# Iron Sprue Polish 3 Production Readiness Checklist

Generated: 2026-08-21

This is an operational readiness checklist only. No deployment, live Stripe switch or production data migration was performed during Polish 3.

## Environment Groups

- Database: `IRON_SPRUE_DATABASE_URL`, `IRON_SPRUE_DIRECT_DATABASE_URL`, `IRON_SPRUE_WORKER_READ_DATABASE_URL`.
- Internal API: `IRON_SPRUE_NODE_API_ORIGIN`, `IRON_SPRUE_INTERNAL_API_KEY_ID`, `IRON_SPRUE_INTERNAL_API_SECRET`.
- Stripe test and live: `IRON_SPRUE_STRIPE_ACCOUNT_ID`, `IRON_SPRUE_STRIPE_TEST_SECRET_KEY`, `IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET`, `IRON_SPRUE_STRIPE_TEST_PUBLISHABLE_KEY`, `IRON_SPRUE_STRIPE_LIVE_SECRET_KEY`, `IRON_SPRUE_STRIPE_LIVE_WEBHOOK_SECRET`, `IRON_SPRUE_STRIPE_LIVE_PUBLISHABLE_KEY`.
- Stripe branding/callbacks: `IRON_SPRUE_STRIPE_STATEMENT_DESCRIPTOR`, `IRON_SPRUE_STRIPE_PUBLIC_BUSINESS_NAME`, `IRON_SPRUE_CHECKOUT_SUCCESS_URL`, `IRON_SPRUE_CHECKOUT_CANCEL_URL`.
- Email: `IRON_SPRUE_RESEND_API_KEY`, `IRON_SPRUE_EMAIL_FROM`, `IRON_SPRUE_EMAIL_REPLY_TO`, `IRON_SPRUE_SUPPORT_EMAIL`, `IRON_SPRUE_EMAIL_LOGO_URL`.
- Media: `IRON_SPRUE_R2_ACCOUNT_ID`, `IRON_SPRUE_R2_BUCKET_NAME`, `IRON_SPRUE_R2_ACCESS_KEY_ID`, `IRON_SPRUE_R2_SECRET_ACCESS_KEY`, `IRON_SPRUE_R2_ENDPOINT`, `IRON_SPRUE_R2_REGION`, `IRON_SPRUE_R2_PUBLIC_BASE_URL`, `IRON_SPRUE_R2_UPLOAD_PREFIX`.
- Analytics/search: `NEXT_PUBLIC_IRON_SPRUE_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_IRON_SPRUE_META_PIXEL_ID`, `NEXT_PUBLIC_IRON_SPRUE_SEARCH_CONSOLE_VERIFICATION`, `NEXT_PUBLIC_IRON_SPRUE_META_DOMAIN_VERIFICATION`.
- Public URLs: `IRON_SPRUE_SITE_URL`, `NEXT_PUBLIC_IRON_SPRUE_SITE_URL`, `IRON_SPRUE_ADMIN_URL`.

## Stripe Launch Controls

- Current embedded PaymentIntent creation is application-controlled with `payment_method_types[0] = card`.
- Stripe automatic payment methods must remain disabled for Iron Sprue launch unless the approved launch set changes.
- Approved launch set: Visa, Mastercard, American Express when enabled for card processing, Apple Pay and Google Pay where Stripe/browser/device eligibility allows.
- PayPal is intended for launch only after it is configured in the chosen Stripe/payment architecture. Do not expose a selectable PayPal route before provider configuration is complete.
- Klarna is deferred post-launch. Amazon Pay, Revolut Pay and other unapproved methods must not be customer-facing.
- Live launch requires a Dashboard webhook endpoint for the deployed Iron Sprue route and the matching `IRON_SPRUE_STRIPE_LIVE_WEBHOOK_SECRET`.

## Email Operations

- Resend must use an Iron Sprue sender identity only.
- Transactional emails covered by code: order confirmation, cancellation/refund, dispatch/tracking and customer cancellation/return request acknowledgement.
- Receipt/order confirmation, cancellation/refund and dispatch/tracking templates share the Iron Sprue header/branding template; if `IRON_SPRUE_EMAIL_LOGO_URL` is not supplied, emails fall back to the approved horizontal Iron Sprue logo at `${IRON_SPRUE_SITE_URL}/brand/iron-sprue-horizontal.svg`.
- Order item images in transactional emails are resolved from persisted order item image data; relative Iron Sprue media paths are made absolute against the configured Iron Sprue site URL for email clients.
- Provider failures are logged and recorded without reversing commerce state.
- Resend domain verification and sender authentication must be checked in Resend before live launch.

## Analytics And Consent

- GA4 and Meta scripts load only after optional analytics/marketing consent.
- Route and ecommerce events are dispatched through the consent-gated runtime.
- Purchase events are marked locally per order number to reduce duplicate purchase reporting on receipt refreshes.
- Search Console and Meta domain verification values are configuration-driven through public environment variables.

## Hosting Assessment

- Iron Sprue storefront is viable on a paid Cloudflare plan only if the deployed runtime supports the Next.js/server-action requirements used by the storefront or if server/API duties remain on Railway.
- Railway remains the safer home for Node/Prisma/Stripe/Resend API work because webhook signature verification, Prisma access and provider SDK/runtime assumptions are Node-oriented.
- Capital Hobby Group site/admin can remain viable on Vercel where current Next.js/Admin runtime assumptions are already aligned, provided Iron Sprue-specific secrets are not injected into TCG/Capital Hobby environments.

## Backup And Rollback Readiness

- Confirm Neon automated backups/PITR policy before launch.
- Take a named pre-launch database backup or branch before switching live traffic.
- Keep the Polish 2 checkpoint commit and Polish 3 commit available as source rollback points.
- Do not use destructive Prisma reset commands against production data.

## Final External Checks Before Launch

- Repeat one full Stripe test purchase, refund and dispatch email flow against the deployed staging URL.
- Confirm webhook event delivery in Stripe Dashboard for the deployed endpoint.
- Confirm Resend delivery and domain status for each transactional email type.
- Confirm R2 media URLs resolve from the production domain.
- Confirm robots/sitemap output after `STOREFRONT_ACCESS_MODE` is set for public launch.
