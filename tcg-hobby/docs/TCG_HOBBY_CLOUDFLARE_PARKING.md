# TCG Hobby Cloudflare Feasibility Parking

This document parks the TCG Hobby Cloudflare Worker proof so it can be resumed later without repeating the Prisma, Neon, OpenNext and Worker runtime investigation. TCG Hobby remains the completed technical proof. Iron Sprue is the next production storefront and should use the hybrid Worker plus Node architecture described here.

## 1. What Was Attempted

The TCG Hobby storefront was built with `@opennextjs/cloudflare` and run through the generated Cloudflare Worker preview. The goal was to prove whether the existing Next.js App Router storefront could run on Cloudflare Workers while continuing to use the monorepo packages, Neon PostgreSQL, Prisma, Stripe, Resend and R2/public media.

## 2. What Failed Initially

The initial Worker builds exposed Prisma runtime packaging issues, missing WASM assets, Node-specific imports being pulled into the Worker graph, environment loading mismatches and Neon adapter configuration problems. Browser acceptance later proved a harder boundary: registration reached the Worker but failed when Prisma attempted a transaction over the HTTP adapter.

## 3. Prisma And WASM Fixes Applied

The Prisma generator now uses the JavaScript client engine so the Worker can package the Prisma runtime without a native query engine. The Cloudflare build script copies `query_compiler_bg.wasm` into the OpenNext worker file tree so `wrangler` can include it. Wrangler also declares a `CompiledWasm` rule for the Prisma WASM artifact.

## 4. Neon Adapter Fixes Applied

The database client selects the Neon adapter by runtime. Node continues to use the normal `PrismaNeon` adapter path. Cloudflare Workers use `PrismaNeonHTTP`, which has been proven for storefront reads. The Worker path removes `channel_binding` from the connection string because the HTTP adapter path does not support it in the same way as the Node connection path.

## 5. Environment And Credential Issues Resolved

The local Worker preview reads `DATABASE_URL` from `apps/storefront/.dev.vars` at request runtime. That value was aligned with the known-good Neon credential source without printing or committing the secret. `.dev.vars` is ignored by Git and must stay local or be configured as a Cloudflare secret in real environments.

## 6. Current Successful Worker Routes

The generated Worker preview has proven the database-backed read path:

- `/shop` returns 200.
- `/catalogue?query=mega` returns 200.
- `/catalogue/pokemon-mega-evolution-pitch-black-booster-pack` returns 200.
- Expected product content appears on the product detail route.

## 7. Current Bundle Size

The latest recorded upload-relevant generated output contains 109 files and about 13,830.66 KiB before compression. The last canonical Wrangler dry-run recorded a compressed upload size of 4,283.61 KiB, leaving about 5,956.39 KiB below the Cloudflare Workers Paid 10 MiB compressed script limit. Recheck this with `npm run cloudflare:dry-run -w @tcg-hobby/storefront` before any future deployment decision.

## 8. Current Runtime Limitation

`PrismaNeonHTTP` does not support Prisma transactions in the Worker runtime. Registration proved this directly: the browser form reached the Worker, but the request failed with `Transactions are not supported in HTTP mode`. Treat this as an architectural boundary, not a bug to work around inside the Worker.

## 9. Approved Hybrid Architecture

Cloudflare Worker handles storefront rendering, catalogue reads, search, product details, read-only merchandising, safe read-only account/order presentation, public media and same-origin proxying to the Node mutation API.

Node/Nest is authoritative for authentication mutations, sessions, customer writes, member basket writes, checkout, order creation, stock reservation, Stripe webhook handling, order finalisation, inventory mutation, transactional email state, Admin mutations, all Prisma transactions and financially sensitive operations.

## 10. Work Intentionally Deferred

Do not continue the full TCG customer and commerce journey in this branch. The transaction-heavy runtime acceptance matrix is deferred until the shared Node mutation backend is wired behind the Worker facade. Do not force registration, checkout, webhooks or email state through PrismaNeonHTTP.

## 11. Reconnecting TCG Hobby Later

To reconnect TCG Hobby to the shared Node backend later:

1. Keep Worker routes for read-only storefront rendering.
2. Replace Worker-side mutation server actions with calls to the Node/Nest API.
3. Forward session identity using approved signed cookies or short-lived tokens.
4. Add same-origin proxy routes where browser CORS should be avoided.
5. Keep checkout and webhook idempotency inside the Node service.
6. Re-run Worker preview acceptance for read routes and proxy behaviour.
7. Re-run Node acceptance for registration, login, basket writes, checkout, Stripe webhook, email and inventory.

## 12. Known TCG Follow-Ups

Future TCG refinements retained from the previous work:

- Gmail/BIMI sender avatar.
- VAT breakdown in receipt.
- Remove receipt product-image border.
- Make receipt product image and title link to the product.
- Make email logo link home.
- Add social links/icons.
- Move desktop checkout action into the right summary panel.
- Revisit any other documented TCG receipt and email polish items after the hybrid backend is in place.

## 13. Build And Preview Commands

Run from the repository root:

```powershell
npm run cloudflare:build -w @tcg-hobby/storefront
npm run cloudflare:preview -w @tcg-hobby/storefront
npm run cloudflare:dry-run -w @tcg-hobby/storefront
```

Do not run repeated full Cloudflare builds while investigating runtime issues. Prefer the existing generated Worker preview for route checks unless source changes require a rebuild.

## 14. Required Local Environment Files

Local Worker preview requires `apps/storefront/.dev.vars` with non-committed values for `DATABASE_URL` and any other runtime secrets needed by the route under test. Real Cloudflare environments must use Cloudflare secrets or vars. Do not commit `.dev.vars`, `.env.local` or copied credential files.

## 15. Troubleshooting Guidance

If read routes fail, first check that `.dev.vars` is loaded by Wrangler and that the Worker runtime is selecting `TCG_HOBBY_PRISMA_RUNTIME=worker`. If Prisma cannot find WASM, rerun the Cloudflare build script once and confirm `query_compiler_bg.wasm` exists under `.open-next/.worker-files/node_modules/.prisma/client`. If transaction errors appear, move that path to the Node/Nest API rather than trying additional Neon HTTP experiments.

## 16. Do Not Reintroduce Worker-Side Transactional Commerce

The Worker database path is intentionally read-oriented. Do not present Worker-side registration writes, basket writes, checkout creation, Stripe webhook finalisation, inventory mutation or transactional email state changes as production-ready while they depend on Prisma transactions through `PrismaNeonHTTP`.
