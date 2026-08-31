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

## 2026-08-31 Continuation

### Runtime Fixes Applied

- Added the existing `iron-sprue-product-media` bucket as the `IRON_SPRUE_PRODUCT_MEDIA` native R2 binding in the staging Worker config.
- Updated the storefront media route so published hash-addressed media is served with long-lived immutable cache headers.
- Added Worker Cache API use for immutable media route responses.
- Preserved the signed R2 fetch fallback, but verified the deployed staging Worker now uses the native binding.
- Added a short in-memory public API read cache/dedupe in the storefront production API adapter for public GET catalogue/home/PDP style reads only. Basket, checkout, auth and admin state are not cached by this adapter.
- Added guarded load and Railway/Postgres sampling scripts. These print only safe target metadata and connection counts, not secrets.

### Deployment Verification

Staging Worker redeployed after reverting the unsafe page-level `revalidate` experiment.

- Worker version: `4298eeac-9c41-4e1c-a7f0-eefb79b5a02a`
- Native R2 binding visible in Wrangler deploy output: `env.IRON_SPRUE_PRODUCT_MEDIA (iron-sprue-product-media)`
- Live smoke after deploy:
  - `/` 200
  - `/shop` 200
  - `/products/aoshima-06347-lamborghini-aventador-red` 200
  - `/basket` 200
  - `/checkout` 200

### Media Path Proof

Railway is not proxying image bytes.

Observed customer-facing image-byte path:

`browser -> Cloudflare Worker /media/iron-sprue/... -> native R2 binding`

Railway provides product/media metadata and URLs only. Deployed media responses now include:

- `X-Iron-Sprue-Media-Source: r2-binding`
- `X-Iron-Sprue-Media-Cache: hit` on repeated checks
- `Cache-Control: public, max-age=31536000, immutable`
- `cf-cache-status: HIT` on representative repeated checks

Representative media sizes remain large:

| Asset | Bytes | Notes |
| --- | ---: | --- |
| Aoshima image2 PNG | 1,293,201 | large for mobile/card thumbnail use |
| Aoshima manufacturer JPG | 141,375 | acceptable |
| Aoshima workshop PNG | 1,860,703 | large for mobile/card thumbnail use |

No existing Railway catalogue payload field currently exposes a thumbnail or responsive derivative URL for Iron Sprue product images. Responsive derivative generation/delivery should therefore be treated as a separate media-delivery improvement rather than invented in the storefront layer during this hardening pass.

### Consolidated Load Results

| Profile | Concurrency | Requests | Duration | p50 | p95 | p99 | Errors | DB Peak | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Existing baseline | 1 | 12 | n/a | n/a | n/a | n/a | 0 | not sampled | previously proven healthy |
| Existing storefront moderate | 5 | 120 | n/a | n/a | n/a | n/a | 0 | not sampled | previously proven healthy |
| Storefront high, post-fix | 10 | 168 | 21.5s | route p50 up to 682ms media / 476ms page | media p95 up to 10.9s on cold run | same sample ceiling | 0 | 6 total / 1 active | clean |
| Storefront high, final combined window | 10 | 168 | 3.4s load window | route p50 up to 228ms API / 149ms page / 129ms media | page p95 up to 1.27s, media p95 up to 449ms | same sample ceiling | 0 | 8 total / 1 active | run concurrently with authenticated admin navigation |
| Storefront stress | 20 | 210 | 57.1s | route p50 up to 17.0s media / 2.3s API | media p95 up to 20.0s timeout, pages/API up to 15.2s | same sample ceiling | 20 total route errors/timeouts | 6 total / 1 active | stress edge, not launch baseline |
| Media-only | 4 | 36 | 36.3s | manufacturer 340ms, image2 2.71s, workshop 4.74s | manufacturer 1.63s, image2 5.84s, workshop 13.56s | same sample ceiling | 0 | 6 total / 1 active | confirms media size is the slow visible component |
| Authenticated admin read navigation | 3 browser tabs | 33 | 25.2s | 1.55s | 4.62s | 5.46s | 0 | 3 total / 1 active | signed-in browser session, no login redirects |
| Combined storefront high + authenticated admin | 10 storefront + 3 admin tabs | 201 | overlapping | admin p50 2.59s | admin p95 7.33s | admin p99 9.02s | 0 | 8 total / 1 active | admin slows under load, no failures |
| Capped checkout-start/payment-intent | 1 | 34 | 16.1s | checkout intent 959ms | checkout intent 1.03s | checkout intent 1.03s | 0 | 6 total / 1 active | 2 Stripe TEST payment intents created and 2 cancelled |

### Database Headroom

All sampled profiles used the guarded Railway production tunnel and `pg_stat_activity`.

- Storefront high: peak `6` total connections, `1` active, `5` idle.
- Authenticated admin navigation: peak `3` total connections, `1` active, `2` idle.
- Combined storefront high + authenticated admin: peak `8` total connections, `1` active, `7` idle.
- Capped checkout-start: peak `6` total connections, `1` active, `5` idle.
- No idle-in-transaction connections observed.
- No connection exhaustion observed.

Slow query and query-rate detail were not available from the current sampler beyond `pg_stat_activity` connection state. No schema/index/pooling change was made because the measured issue was not DB saturation.

### Checkout

The guarded stateful profile was explicitly enabled with `IRON_SPRUE_LOAD_ALLOW_STATEFUL=1`.

- Stripe live payment capture was not used.
- The harness created two staging/TEST payment-intent starts through `/api/checkout/payment-intent`.
- Both returned `201`.
- Both were cancelled by the harness after hook.
- No checkout-start failures were recorded.

### Worker Resource / 1102

No literal Cloudflare 1102 page/code was observed in the harness output after the fixes. The earlier stress investigation did observe Worker CPU/resource-limit class failures under concurrency 20 before the public API/runtime cache work. The final concurrency-20 run still showed timeouts/fetch failures, especially around large media and some Railway/API fetches, so concurrency 20 remains an edge/stress level rather than a proven launch-safe baseline.

### Current Launch Judgement

Classification: AMBER.

Launch-like read traffic at concurrency 10 plus authenticated admin activity stayed error-free, checkout-start was clean at the deliberately capped Stripe TEST level, and Railway/Postgres connection pressure stayed low. The remaining pre-launch risk is media weight and concurrency-20 instability: large PNGs can dominate mobile-visible completion and timed out under the stress profile.

Free Cloudflare Worker tier appears adequate for the currently proven launch-like concurrency 10 profile. Paid Workers may reduce CPU/resource-limit risk under larger bursts, but the measured immediate bottleneck is oversized media delivery rather than DB connection saturation. Advanced Cloudflare caching, WAF/rate limiting, fair-launch controls and responsive media derivatives remain sensible post-launch or pre-launch hardening extensions depending on launch traffic expectations.

## 2026-08-31 Responsive Media Delivery Completion

### Changes Applied

- Added display-only WebP derivatives for published Iron Sprue media at widths `320`, `480`, `640`, `960` and `1400`.
- Preserved all canonical full-resolution originals in R2.
- Updated the Worker media route so `/media/iron-sprue/...?...w=<width>` serves the matching derivative through the native `IRON_SPRUE_PRODUCT_MEDIA` R2 binding.
- Preserved fallback to the canonical original when a derivative is unavailable.
- Updated homepage, catalogue, product cards, PDP gallery, thumbnails, basket, checkout and account order thumbnails to request responsive display candidates.
- Kept PDP lightbox/zoom on the original high-resolution image path so full-resolution media is loaded only when the customer explicitly enlarges the image.
- Reduced the mobile PDP main media footprint by roughly 15-20% while preserving the approved machined frame and desktop sizing.

### Derivative Generation

The derivative generation pass scanned the deployed catalogue and uploaded display derivatives for `139` unique public media objects. It was scoped to public product media keys only. No stock, pricing, product content, publication state, order, fulfilment, Stripe, VAT or accounting data was modified.

Representative byte reductions:

| Asset | Original | Mobile/display derivative | Larger display derivative |
| --- | ---: | ---: | ---: |
| Aoshima image2 PNG | 1,293,201 bytes, 1729x910 PNG | 12,798 bytes, 480x253 WebP | 34,422 bytes, 960x505 WebP |
| Aoshima workshop PNG | 1,860,703 bytes, 1586x992 PNG | 20,642 bytes, 480x300 WebP | 56,914 bytes, 960x600 WebP |
| Pintoo S1024 workshop PNG | 1,973,892 bytes, 1536x1024 PNG | 18,862 bytes, 480x320 WebP | 56,474 bytes, 960x640 WebP |

### Deployed Verification

- Staging Worker version: `bdb27654-e882-4a4f-b3a7-ed629ed94aa6`
- Native R2 binding visible in deployment output: `env.IRON_SPRUE_PRODUCT_MEDIA (iron-sprue-product-media)`
- Example live derivative response: Aoshima image2 `?w=480` returned `200`, `image/webp`, `X-Iron-Sprue-Media-Source: r2-binding-derivative`, immutable cache headers and `12,798` transferred bytes.
- Example live derivative response: Aoshima workshop `?w=960` returned `200`, `image/webp`, `X-Iron-Sprue-Media-Source: r2-binding-derivative`, immutable cache headers and `56,914` transferred bytes.
- Example canonical original response still returned the original PNG through `X-Iron-Sprue-Media-Source: r2-binding`.
- Live PDP HTML contains `srcset`/`sizes` responsive candidates with `?w=` derivative URLs.
- Browser smoke at mobile PDP, mobile homepage and desktop PDP found no horizontal overflow and no incomplete images.

### Post-Fix Load Results

| Profile | Concurrency | Requests | Duration | p50 | p95 | p99 | Errors | DB Peak | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Media-only, post-derivative | 4 | 36 | 45s sampler window | 36ms overall | 410ms overall | 410ms overall | 0 | 6 total / 1 active | media p95 max 410ms |
| Storefront high, post-derivative | 10 | 168 | 45s sampler window | 61ms overall | 894ms overall | 894ms overall | 0 | 6 total / 3 active | clean |
| Storefront stress, post-derivative | 20 | 210 | 45s sampler window | 60ms overall | 1.22s overall | 1.22s overall | 0 | 6 total / 1 active | previous timeout pattern not reproduced |
| Capped checkout-start, post-derivative | 2 | 34 | 45s sampler window | 44ms overall | 859ms overall | 859ms overall | 0 | 6 total / 1 active | 2 Stripe TEST starts returned `201`; 2 cancelled by harness |

Post-fix media timings in the stress profile:

| Media target | p50 | p95 | Transferred bytes across run |
| --- | ---: | ---: | ---: |
| product.1 | 46ms | 143ms | 516,330 |
| product.2 | 45ms | 496ms | 1,061,580 |
| product.3 | 47ms | 638ms | 853,710 |

Before this derivative fix, the same concurrency-20 stress profile recorded `20` route errors/timeouts and media p95 reached the 20s timeout ceiling. After the derivative fix, concurrency 20 completed with `0` errors and no Worker 1102 recurrence.

### Admin / Combined Verification Status

Authenticated admin read-load and combined storefront + authenticated admin load were already proven before the responsive-media fix. The responsive-media change affects storefront media delivery only and reduces Worker/R2 byte pressure; it does not change admin routing, admin data access, Railway API behaviour, DB pooling, checkout logic or Stripe logic.

The strict post-derivative combined authenticated-admin rerun was not executed in the local terminal because `IRON_SPRUE_LOAD_ADMIN_COOKIE` was not present and no safe cookie export tool was available in this session. Prior authenticated-admin evidence remains valid for the unchanged admin surface, but a final signed-in combined rerun can be repeated when a fresh admin cookie is supplied to the terminal.

### Final Hardening Judgement

Classification: GREEN for the tested launch-like storefront, media, checkout and database profiles.

Evidence:

- Worker 1102 was not observed after the media fix.
- Concurrency 20 now completed cleanly with `0` errors in the comparable storefront stress profile.
- The measured bottleneck, oversized mobile/display PNG delivery, has been materially reduced by responsive WebP derivatives.
- DB pressure remained low: peak sampled total connections stayed at `6`, active connections peaked at `3`, and no connection exhaustion was observed.
- Stripe TEST checkout-start remained clean at the deliberately capped profile.
- Free Cloudflare Worker tier remains adequate for the measured launch profile. Paid Workers are not required by the current evidence, though advanced Cloudflare caching, WAF/rate limiting and fair-launch controls remain sensible post-launch hardening work.

Remaining caveat: repeat one final authenticated combined run with a fresh admin session cookie before launch sign-off if strict admin-under-load evidence must be current to this exact derivative deployment.
