# Iron Sprue Cloudflare Hybrid Handoff

Iron Sprue should be the first production storefront to use the shared hybrid architecture: Cloudflare Worker for storefront reads and presentation, Node/Nest for transaction-dependent commerce and customer mutations.

## Reusable Cloudflare Files

- `apps/tcg-hobby/open-next.config.ts`: minimal OpenNext Cloudflare adapter configuration.
- `apps/tcg-hobby/wrangler.jsonc`: compatibility flags, assets binding, service binding shape, vars and WASM packaging rule.
- `apps/tcg-hobby/scripts/cloudflare-build.mjs`: deterministic build, preview and dry-run wrapper plus Prisma WASM copy step.
- `apps/tcg-hobby/next.config.ts`: Worker-safe image optimisation switch.
- `.gitignore`: local `.dev.vars` protection.
- `apps/tcg-hobby/app/icon.png` and `apps/tcg-hobby/app/apple-icon.png`: static icon pattern that avoids runtime file reads.

## Reusable Database Read Path

- `packages/database/src/client.ts`: runtime detection with `PrismaNeonHTTP` for Workers and `PrismaNeon` for Node.
- `packages/database/src/storefront.ts`: Worker-safe package export boundary for storefront reads.
- `packages/database/prisma/schema.prisma`: JavaScript Prisma engine configuration.
- Catalogue, merchandising and product-visibility read helpers can be reused if they stay transaction-free and do not import Admin/import modules.

## Reusable Node And Nest Services

The Node side should own all mutation-heavy services. Reuse the existing database package logic and wrap it behind explicit API endpoints rather than duplicating the rules in Worker handlers.

## Reusable Auth Foundations

Reuse validation, password hashing, session model and account recovery foundations from the existing TCG implementation, but execute writes through Node/Nest. Worker pages should render forms and submit to proxied Node endpoints or same-origin Worker proxy routes.

## Reusable Basket And Checkout Logic

Reuse basket validation, stock availability checks, shipping calculations and checkout creation logic from the current commerce/order modules. Member basket writes and checkout-session creation belong in Node/Nest because they require transactions and idempotency.

## Reusable Order And Inventory Logic

Reuse order creation, reservation, finalisation, release and inventory-decrement logic from `packages/database/src/orders.ts`. Keep inventory mutation exactly-once in the Node service.

## Reusable Stripe Webhook Logic

Reuse Stripe event construction and webhook processing foundations. The signed webhook endpoint should remain a Node/Nest responsibility so raw-body verification, idempotency, paid order finalisation and inventory mutation stay in one transactional boundary.

## Reusable Resend Logic

Reuse transactional email templates, provider invocation and delivery tracking. Email claim, sent and failure state must remain retryable and should execute in Node/Nest after Stripe finalisation.

## Reusable R2 And Media Logic

Reuse public media URL resolution and product image snapshot logic. Worker reads may render public R2 URLs, but private object keys and write/update media actions belong to Admin or Node services.

## Reusable Admin Foundations

Admin authentication, product management, image management, content editing, imports, buylist administration and role changes remain Node/Admin responsibilities. Do not include Admin mutation modules in the Worker runtime bundle.

## Required Multi-Store Schema And Configuration Changes

Iron Sprue needs explicit store configuration before launch: store code or tenant ownership on products, orders, carts, email templates, Stripe metadata, R2 prefixes, domain config, sender identities, brand assets, fulfilment settings, Admin scoping and feature flags. Add only the minimum multi-store shape needed for Iron Sprue and TCG to share foundations without mixing customer/order data.

## Files Not To Copy Directly

Do not copy TCG-specific page copy, product slugs, launch content, brand assets, email sender names, R2 paths, metadata, receipt wording, fixture products or seed assumptions into Iron Sprue without deliberate rebranding and data scoping.

## Technical Risks

- Prisma transactions cannot run over `PrismaNeonHTTP` in Workers.
- Worker bundle size can grow quickly if Admin/import modules leak into the Worker graph.
- Auth and CSRF must be designed carefully across Worker and Node boundaries.
- Stripe webhook idempotency and inventory mutation must remain exactly-once.
- Free-tier Worker CPU and request limits may not suit production checkout traffic without paid capacity.
- Environment variables must not drift between local Worker preview, Node local dev and production.

## Recommended Branch Base

Start Iron Sprue implementation from clean updated `main` after the parked Cloudflare feasibility branch is reviewed. Bring across the proven Worker/OpenNext foundation deliberately, then add the Node/Nest mutation boundary as the first production work package.
