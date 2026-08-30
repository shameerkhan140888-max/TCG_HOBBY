# Iron Sprue Pre-Launch Performance Hardening - 2026-08-30

## Environment Tested

- Storefront staging Worker: `https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev`
- Live admin: `https://admin.capitalhobbygroup.co.uk`
- Railway API: `https://considerate-unity-production-b734.up.railway.app`
- Media path: `https://media.ironsprue.co.uk` via storefront `/media/iron-sprue/...`
- Railway CLI status: project `sublime-stillness`, environment `production`, service `considerate-unity`, database `Postgres`
- Stripe: no checkout-session or payment-capture load was run in this pass

## Deployment Freshness Incident

The first Cloudflare deploy completed but the staging Worker still served older storefront output. Live checks against `/`, `/privacy`, and `/cookies` were missing approved markers such as `A trading name of` and the updated cookie category wording.

Root cause observed: the deploy wrapper rebuilt through OpenNext on Windows, while the live Worker output did not match the current local source/build output. A clean rebuild after removing generated `apps/iron-sprue/.next` and `apps/iron-sprue/.open-next` produced current page artifacts. Deploying that freshly built `.open-next` artifact directly with Wrangler restored the approved storefront.

Corrected deployment:

- Worker version: `9096e228-c608-4644-9ad8-879559134af9`
- Verification after direct deploy:
  - `/` includes `A trading name of`, `Brands we stock`, `Cookie Preferences`, `Capital Hobby Group Ltd`
  - `/privacy` includes `A trading name of`, `Strictly Necessary`, `Cookie Preferences`
  - `/cookies` includes `Strictly Necessary`, analytics wording, `Cookie Preferences`

Risk to carry forward: OpenNext reports Windows as not fully compatible. For launch-critical deploys, prefer a clean artifact build and direct Wrangler deploy, or move Worker packaging to WSL/CI so stale local build output cannot be republished.

## Safe Request-Efficiency Fix

Issue found: the homepage production path could fetch Railway `/v1/home` separately for products, homepage placements, and approved brand carousel logos.

Fix applied: `getIronSprueProductionApiHomeSnapshot()` now maps products, placements, and brand presentation from one `/v1/home` response. The homepage consumes that snapshot in production.

Validation:

- `npm run test -w @capital-hobby/iron-sprue -- production-api`: 9 passed
- `npm run typecheck -w @capital-hobby/iron-sprue`: passed
- `npm run typecheck -w @capital-hobby/database`: passed

## Baseline And Load Results

All tests below used non-stateful requests only. No destructive admin actions, stock changes, order writes, bulk checkout-session creation, or Stripe payment capture were run.

### Post-Fix Baseline

Profile: `baseline`, concurrency 1, iterations 1.

| Route | Status | Time |
| --- | --- | ---: |
| Storefront home | 200 | 292 ms |
| Shop | 200 | 163 ms |
| Model kits category | 200 | 128 ms |
| Aoshima PDP | 200 | 249 ms |
| Multi-media PDP | 200 | 300 ms |
| Railway API health | 200 | 41 ms |
| Railway API home | 200 | 238 ms |
| Railway API catalogue | 200 | 207 ms |
| Railway API PDP | 200 | 56 ms |
| Product media 1 | 200 | 209 ms |
| Product media 2 | 200 | 155 ms |
| Product media 3 | 200 | 403 ms |

### Storefront Moderate

Profile: `storefront-moderate`, concurrency 5, iterations 10, 120 total requests.

| Route | Status | p50 | p95 |
| --- | --- | ---: | ---: |
| Storefront home | 200 | 348 ms | 392 ms |
| Shop | 200 | 182 ms | 553 ms |
| Model kits category | 200 | 253 ms | 725 ms |
| Aoshima PDP | 200 | 241 ms | 753 ms |
| Multi-media PDP | 200 | 240 ms | 377 ms |
| API health | 200 | 51 ms | 67 ms |
| API home | 200 | 137 ms | 286 ms |
| API catalogue | 200 | 111 ms | 300 ms |
| API PDP | 200 | 67 ms | 240 ms |
| Media product 1 | 200 | 150 ms | 286 ms |
| Media product 2 | 200 | 85 ms | 133 ms |
| Media product 3 | 200 | 146 ms | 228 ms |

### Combined Storefront Plus Live Admin Login Surface

Profile: `storefront-moderate` with `IRON_SPRUE_LOAD_ADMIN_URL=https://admin.capitalhobbygroup.co.uk`, concurrency 5, iterations 10.

| Route | Status | p50 | p95 |
| --- | --- | ---: | ---: |
| Storefront home | 200 | 242 ms | 827 ms |
| Shop | 200 | 206 ms | 787 ms |
| Model kits category | 200 | 212 ms | 430 ms |
| Aoshima PDP | 200 | 238 ms | 651 ms |
| Multi-media PDP | 200 | 208 ms | 416 ms |
| API health | 200 | 47 ms | 75 ms |
| API home | 200 | 146 ms | 195 ms |
| API catalogue | 200 | 118 ms | 228 ms |
| API PDP | 200 | 59 ms | 173 ms |
| Media product 1 | 200 | 173 ms | 266 ms |
| Media product 2 | 200 | 90 ms | 187 ms |
| Media product 3 | 200 | 196 ms | 365 ms |
| Live admin login | 200 | 162 ms | 1399 ms |

The live admin route was unauthenticated, so this verifies only the public login surface during storefront traffic. Authenticated product/order read load still needs an approved signed-in session or a safe read-only admin test token.

### Commerce Readiness, No Stripe Sessions

Profile: `commerce-readiness`, concurrency 2, iterations 5.

This profile loaded basket and checkout pages and posted guest basket-resolution payloads through both Railway and the storefront proxy. It did not create checkout sessions, payment intents, orders, stock reservations or authenticated cart rows.

| Route | Status | p50 | p95 |
| --- | --- | ---: | ---: |
| Storefront home | 200 | 253 ms | 779 ms |
| Shop | 200 | 233 ms | 780 ms |
| Model kits category | 200 | 186 ms | 298 ms |
| Aoshima PDP | 200 | 204 ms | 309 ms |
| Multi-media PDP | 200 | 219 ms | 308 ms |
| Basket page | 200 | 204 ms | 304 ms |
| Checkout page | 200 | 109 ms | 203 ms |
| API health | 200 | 38 ms | 39 ms |
| API home | 200 | 92 ms | 155 ms |
| API catalogue | 200 | 80 ms | 94 ms |
| API PDP | 200 | 55 ms | 100 ms |
| Railway guest basket resolve | 201 | 53 ms | 56 ms |
| Storefront guest basket resolve | 201 | 69 ms | 72 ms |
| Product media 1 | 200 | 154 ms | 259 ms |
| Product media 2 | 200 | 108 ms | 139 ms |
| Product media 3 | 200 | 172 ms | 282 ms |

An earlier commerce probe used `/v1/cart/resolve` and returned 404. That was a harness mistake; the actual Railway public route is `/v1/basket/resolve`, while the storefront compatibility route remains `/api/cart/resolve`.

## Mobile Media Reliability

Mobile browser checks against the staging Worker at 390px width were run on an Aoshima PDP with three product media entries.

Observed:

- Five reloads completed with `failedImages = 0`
- No horizontal overflow was detected
- Product/media images completed after a short wait

Interpretation: the tested issue did not reproduce as a broken URL or missing mobile gallery logic. The largest product/workshop images remain the slowest visible resources and should stay on the pre-launch hardening watch list.

## Cloudflare Worker 1102

An error-only Worker tail was active during the post-fix moderate storefront run. No Worker errors were emitted and no 1102 recurrence was observed in this sample.

Current risk: not reproduced under the tested read-only load. Continue monitoring during stateful checkout and authenticated admin tests.

## Database Pressure

Railway CLI verified the production project/environment/service target. Direct database connection metrics were not collected in this pass because the automated load run stayed read-only and did not open a guarded production DB tunnel.

Known relevant guard behaviour:

- Live product/media audits must use Railway Postgres, not legacy local Neon variables.
- Local package typecheck may still print a Neon target for Prisma metadata validation; that is not proof of the live data target.

Deferred measurement:

- Active DB connections and `pg_stat_activity` sampling during combined storefront/admin load.
- Authenticated admin product/order read profile.
- Controlled stateful basket/checkout-start profile with Stripe TEST only.

## client.ts Advisory

The two likely VS-highlighted issues in `packages/database/src/client.ts` are advisory rather than immediately runtime-critical:

1. `PrismaNeon` is imported but unused. This can trigger an editor/no-unused warning. Runtime impact is low while `@prisma/adapter-neon` is installed and exports the symbol.
2. `@prisma/client/wasm.js` / `WorkerPrismaClient` may be highlighted by editor module-resolution settings. Project typecheck passes and the Cloudflare Worker build/deploy path completed, so there is no current evidence of a runtime failure from this import.

Additional note: the file intentionally selects `PrismaNeonHTTP` for Cloudflare Worker reads and `PrismaPg` for Node/Railway/Admin runtime. Transaction-dependent commerce writes should remain on the Node/Railway path.

## Current Launch Judgement

Interim classification: AMBER.

Evidence supporting launch readiness:

- Corrected staging Worker now serves the approved current storefront.
- Read-only storefront/API/media tests returned all 200s at baseline and moderate concurrency.
- Worker 1102 did not recur during the observed moderate run.
- Mobile media failure was not reproduced under repeated 390px PDP reloads.

Reasons this is not GREEN yet:

- Authenticated admin load has not been measured.
- Stateful basket/checkout-start load has not been measured.
- Guest basket resolution and basket/checkout page loading are clean; checkout-session/payment-intent creation is still deliberately untested pending explicit volume caps.
- Railway DB connection peaks were not sampled during combined traffic.
- Deployment packaging on Windows produced a stale-live-output incident and needs a safer repeatable path.

## Deferred Post-Launch / Separate Hardening

- Advanced Cloudflare caching and paid-plan/WAF/rate-limit design.
- Fair-launch traffic controls.
- Authenticated admin read-load harness.
- Guarded DB connection sampling during load.
- Controlled Stripe TEST checkout-session profile with explicit volume caps.
