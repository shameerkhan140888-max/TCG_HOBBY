# Iron Sprue Deployment Readiness Assessment

Generated for the launch-operations sprint. This is a dry-run assessment only; no production deployment was performed.

## Iron Sprue

Intended shape: Cloudflare for the public frontend/domain layer, Railway for backend/database/service runtime where the existing application requires long-lived Node.js behaviour.

### Compatible Assumptions

- The Iron Sprue storefront and admin use Next.js application routes and server actions.
- Stripe Checkout remains hosted by Stripe; the app must expose the Iron Sprue webhook route.
- Resend transactional email is invoked from server-side order lifecycle code.
- Railway Postgres is the canonical production Prisma datasource for Iron Sprue.
- R2-backed media is consumed through configured public/preview URL helpers.
- GA4 and Meta Pixel IDs are runtime environment configuration, not hard-coded.

### Production Data Source Guard

For live Iron Sprue catalogue, publication, media and readiness audits, use Railway Postgres only. The canonical target is `IRON_SPRUE_ADMIN_DATABASE_URL` for admin/local audit work, or Railway runtime `DATABASE_URL` when commands execute inside the Railway production environment.

Local `apps/iron-sprue/.env.local` compatibility variables such as `IRON_SPRUE_DATABASE_URL`, `IRON_SPRUE_DIRECT_DATABASE_URL` and `IRON_SPRUE_WORKER_READ_DATABASE_URL` may still point at the legacy dedicated Neon database. They must not be used for current live product/media counts unless the task is explicitly a legacy Neon comparison. Reports should identify the target as Railway/Neon by host/database metadata without printing credentials.

### Required Runtime Configuration

- Railway database connection variables used by the API/Admin runtime and migration tooling.
- Iron Sprue Stripe variables: account id, secret key, publishable key, webhook secret.
- Iron Sprue Resend variables: API key, from address, reply-to/site URL where configured.
- Iron Sprue analytics variables: GA4 measurement id and Meta pixel id.
- Iron Sprue internal API/shared application secrets already documented in the app-specific env example.
- Public base URLs for success/cancel/account/email links.

### Watch Points

- Stripe webhook signature verification requires the raw request body and the Iron Sprue-specific webhook secret for the correct deployed route.
- Railway/Cloudflare deployments must not accidentally inject generic TCG Stripe or Resend credentials into Iron Sprue.
- Cookie/session settings must be checked against the final production domains and HTTPS.
- R2 public URLs and any image remote patterns must match production hostnames.
- Next.js server actions and API routes should run on a Node-compatible runtime where Prisma, Stripe and Resend are supported.

### Recommendation

Proceed with the planned Cloudflare plus Railway split only after staging environment variables are populated and the full paid/refund/dispatch/email E2E is repeated against staging. Do not move Stripe webhooks until the deployed URL is known and the Stripe CLI/Dashboard endpoint secret has been updated.

## Capital Hobby Group / TCG Hobby

Capital Hobby Group is the parent identity. TCG Hobby remains the trading-card child brand and the reference implementation for existing commerce and admin behaviour. Nothing in this sprint requires moving TCG Hobby away from its current hosting plan.

### Recommendation

Keep TCG Hobby on its current Vercel-compatible path unless a future shared runtime requirement forces consolidation. Reassess only if shared API/runtime constraints create production divergence; do not migrate hosting providers speculatively.

## Blockers Before Production Deployment

- Prisma migration status must be clean against the target production database.
- Final environment variable inventory must be checked in the hosting provider without exposing secret values.
- Stripe webhook endpoint must be configured for the deployed Iron Sprue route and verified in test mode before live mode.
- GA4/Search Console/Meta verification should be completed against the deployed domain.
