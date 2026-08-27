# Iron Sprue Pre-Launch Housekeeping

## Production Architecture

The intended live path is:

Customer browser -> Cloudflare Iron Sprue storefront -> Railway API -> Railway Postgres.

The Iron Sprue admin uses the approved Railway production database/API path. For local admin work, `IRON_SPRUE_ADMIN_DATABASE_URL` should point at the local Railway Postgres tunnel. The Cloudflare storefront must not connect directly to Postgres in production.

## Naming Boundary

Capital Hobby Group Ltd is the parent/corporate identity. Iron Sprue and TCG Hobby are child trading brands/applications beneath that parent.

### Safe and Completed Now

- Root package metadata already uses `capital-hobby-group`.
- Architecture docs describe Capital Hobby Group as the parent application boundary.
- Iron Sprue launch docs now describe Railway Postgres as the production database path.
- Iron Sprue environment examples now call out Railway Postgres as canonical and mark `IRON_SPRUE_WORKER_READ_DATABASE_URL` as compatibility-only.
- Email media configuration documents the public media base required for customer inbox rendering.

### Coordinated Migration Required

- GitHub repository name `TCG_HOBBY`: requires remote rename, local clone updates, Cloudflare/Railway GitHub integration checks and user-facing coordination.
- Physical root directory `tcg-hobby`: local/developer path migration only; safe after launch but noisy before launch.
- npm workspace namespace `@capital-hobby/*`: used across imports, package-lock, deployed builds and tests. Rename to a parent namespace such as `@capital-hobby/*` only as a coordinated post-launch migration.
- Railway project/service names: must be changed in Railway with deployment-variable and webhook checks; do not rename before launch for cosmetics.
- Cloudflare Worker/Pages project names and deployed URLs: must remain stable while staging/live verification is active.
- Environment variable names containing `IRON_SPRUE_DATABASE_URL` and related aliases: retain compatibility while platform variables are consolidated.

### Deferred Post-Launch

- Shared package names such as `@capital-hobby/database`, `@capital-hobby/ui`, `@capital-hobby/types`, `@capital-hobby/config`, `@capital-hobby/utils`.
- TCG Hobby Cloudflare feasibility docs and package names where they genuinely refer to the TCG Hobby child brand.
- Database/schema naming where it is not user-facing and is already guarded by `storeCode`.
- Legacy Iron Sprue import/media scripts with explicit Neon guards. They should not be loosened during launch housekeeping because doing so could allow old tools to write to Railway production outside the current admin/publication path.

## Required Production Config

- Railway API/Admin/migration services: `DATABASE_URL` and any direct migration URL configured in Railway.
- Local Iron Sprue admin: `IRON_SPRUE_ADMIN_DATABASE_URL` targeting the local Railway tunnel.
- Cloudflare storefront: Railway API origin and Iron Sprue internal API signing variables.
- R2 media: Iron Sprue R2 bucket/binding plus `IRON_SPRUE_R2_PUBLIC_BASE_URL`.
- Transactional email: Iron Sprue Resend sender variables, `IRON_SPRUE_EMAIL_ASSET_BASE_URL`, `IRON_SPRUE_EMAIL_MEDIA_BASE_URL` and `IRON_SPRUE_EMAIL_LOGO_URL`.

## Compatibility Aliases Retained

- `IRON_SPRUE_DATABASE_URL`
- `IRON_SPRUE_DIRECT_DATABASE_URL`
- `IRON_SPRUE_WORKER_READ_DATABASE_URL`
- `IRON_SPRUE_NODE_API_ORIGIN`

These aliases are retained to avoid breaking working deployments and older launch/import tooling. Platform cleanup should remove or rename them only after Railway and Cloudflare are updated together.

## Canonical Content Cleanup

Use the guarded script:

```powershell
node --import tsx scripts/iron-sprue-content-cleanup.ts --report=tmp-iron-sprue-content-cleanup-report.json
```

The script is dry-run by default and writes a redacted report of affected SKUs, fields and proposed old/new values. Production writes require:

```powershell
node --import tsx scripts/iron-sprue-content-cleanup.ts --apply --allow-production-write
```

Do not use `--apply` until the dry-run report has been reviewed. The script only updates Iron Sprue product copy fields and does not touch stock, pricing, orders, publication state, media, Stripe data or unrelated stores.
