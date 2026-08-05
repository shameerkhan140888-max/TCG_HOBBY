# Iron Sprue Launch Architecture

Iron Sprue is the first production-target storefront for the shared Capital Hobby Group hybrid commerce architecture.

## Runtime Split

Cloudflare Worker storefront:

- Iron Sprue homepage and presentation.
- Catalogue, search and product detail rendering.
- Read-only product data.
- Public R2/media display once supplier-approved media is attached.
- Same-origin proxy surface for customer mutation calls.
- Site-wide protected staging gate while `STOREFRONT_ACCESS_MODE=protected`.

Shared Node/Nest API:

- Registration, login, logout and sessions.
- Customer profile and address writes.
- Wishlist and member basket writes.
- Guest-to-member basket merge.
- Checkout-session creation, order creation and stock reservation.
- Stripe webhooks, order finalisation and inventory mutation.
- Transactional email state and retry.
- Admin mutations and reporting.

The Worker database path must remain read-oriented. Do not run Prisma transactions through `PrismaNeonHTTP`.

## Operational Isolation

Iron Sprue must use dedicated operational resources. Store-aware schema fields remain useful as a safety layer, but they are not the primary production boundary.

- Neon: Iron Sprue uses its own Neon project, production branch, development branch, roles, pooled runtime URL, direct migration URL and Worker read URL. Do not point Iron Sprue at the TCG Hobby production database.
- R2: Iron Sprue media uses a dedicated `iron-sprue-product-media` bucket and `IRON_SPRUE_MEDIA` Worker binding. Product images, order images, email images, logos and import assets must not be stored in the TCG Hobby bucket.
- Stripe: Iron Sprue uses a separate Stripe account and store-specific test/live keys, webhook secrets, account ID, descriptor, public business name, success URL and cancel URL. Do not use the unqualified `STRIPE_SECRET_KEY` for Iron Sprue.
- Railway/Node API: Worker-to-Railway mutation calls are signed with HMAC using Iron Sprue-scoped key IDs and secrets. Stripe webhooks call the Node API directly and are authenticated only by store-specific Stripe raw-body signature validation.

Required environment names are intentionally explicit:

- `IRON_SPRUE_DATABASE_URL`
- `IRON_SPRUE_DIRECT_DATABASE_URL`
- `IRON_SPRUE_WORKER_READ_DATABASE_URL`
- `IRON_SPRUE_R2_BUCKET_NAME`
- `IRON_SPRUE_R2_PUBLIC_BASE_URL`
- `IRON_SPRUE_INTERNAL_API_KEY_ID`
- `IRON_SPRUE_INTERNAL_API_SECRET`
- `IRON_SPRUE_STRIPE_ACCOUNT_ID`
- `IRON_SPRUE_STRIPE_TEST_SECRET_KEY`
- `IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET`
- `IRON_SPRUE_STRIPE_LIVE_SECRET_KEY`
- `IRON_SPRUE_STRIPE_LIVE_WEBHOOK_SECRET`

Migration and import commands must require explicit store and environment selection, display the target host/database without credentials, and fail closed on ambiguity. No command should migrate both production databases together without an explicit operator choice.

## Store Context

Iron Sprue product data uses `storeCode: "IRON_SPRUE"` in the launch import seed. The production database migration still needs to add durable store ownership to products, inventory, orders, Stripe metadata, email branding and Admin filters. Because Iron Sprue now requires a dedicated Neon project, this store context is a defence-in-depth guard rather than permission to share TCG Hobby operational data.

## Application Path

The launch storefront app lives at `apps/iron-sprue`. It is deliberately separate from `apps/tcg-hobby` so Iron Sprue can have a premium modelling-workshop identity without becoming a TCG reskin.

## Current Implementation Slice

- Distinct homepage and shop shell.
- Approved Iron Sprue logo asset copied unchanged into the app public assets.
- PO-derived launch product JSON with 67 genuine stocked lines and 183 opening units.
- Product detail routes for the imported launch products.
- Structured import validation contract and tests.
- Password-protected staging access gate with signed cookie tests.
- Same-origin mutation proxy allowlist and HMAC signing foundation with key ID, method, path, query, body hash, timestamp, nonce, store and environment.
- Dedicated Iron Sprue Neon/R2 runtime config guards.
- Store-aware Stripe configuration resolver and cross-store webhook finalisation guard.
- Catalogue-derived text-fallback "Brands we stock" section.

## Authorised Distributor Content

The PO remains the source of truth for launch selection, SKU, supplier SKU, quantity, wholesale cost, launch stock and reviewed retail price. Authorised distributor records may enrich names, descriptions, verified specifications and imagery only when matched by strong identifiers:

1. supplier SKU;
2. manufacturer SKU;
3. barcode;
4. exact normalised product name;
5. manually approved mapping.

Ambiguous matches enter review and must not be published automatically. Imported HTML is sanitised, distributor pricing/stock/delivery claims are removed, and images must be copied into the Iron Sprue R2 bucket after approved-domain, MIME, extension, size and content validation. The live catalogue must not permanently hotlink distributor images.

## Remaining Backend Work

The Node/Nest API already has early auth and public commerce endpoints. It still needs the full multi-store mutation boundary: request signing, replay protection, CSRF/origin policy, store-scoped sessions, store-scoped basket and checkout, Stripe webhook store isolation, Admin filters and email branding isolation.
