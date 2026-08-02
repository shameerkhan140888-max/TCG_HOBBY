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

## Store Context

Iron Sprue product data uses `storeCode: "IRON_SPRUE"` in the launch import seed. The production database migration still needs to add durable store ownership to products, inventory, orders, Stripe metadata, email branding and Admin filters. TCG Hobby must continue to resolve with its existing store context until that migration is complete.

## Application Path

The launch storefront app lives at `apps/iron-sprue`. It is deliberately separate from `apps/storefront` so Iron Sprue can have a premium modelling-workshop identity without becoming a TCG reskin.

## Current Implementation Slice

- Distinct homepage and shop shell.
- Approved Iron Sprue logo asset copied unchanged into the app public assets.
- PO-derived launch product JSON with 67 genuine stocked lines and 183 opening units.
- Product detail routes for the imported launch products.
- Structured import validation contract and tests.
- Password-protected staging access gate with signed cookie tests.
- Same-origin mutation proxy allowlist and HMAC signing foundation.

## Remaining Backend Work

The Node/Nest API already has early auth and public commerce endpoints. It still needs the full multi-store mutation boundary: request signing, replay protection, CSRF/origin policy, store-scoped sessions, store-scoped basket and checkout, Stripe webhook store isolation, Admin filters and email branding isolation.
