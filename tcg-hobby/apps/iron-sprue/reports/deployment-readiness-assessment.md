# Iron Sprue Deployment Readiness Assessment

Generated for the launch-operations sprint. This is a dry-run assessment only; no production deployment was performed.

## Iron Sprue

Intended shape: Cloudflare for the public frontend/domain layer, Railway for backend/database/service runtime where the existing application requires long-lived Node.js behaviour.

### Compatible Assumptions

- The Iron Sprue storefront and admin use Next.js application routes and server actions.
- Stripe Checkout remains hosted by Stripe; the app must expose the Iron Sprue webhook route.
- Resend transactional email is invoked from server-side order lifecycle code.
- Neon/Postgres remains the Prisma datasource.
- R2-backed media is consumed through configured public/preview URL helpers.
- GA4 and Meta Pixel IDs are runtime environment configuration, not hard-coded.

### Required Runtime Configuration

- Database connection variables used by the existing Prisma/Neon setup.
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

## Capital Hobby / TCG Hobby

TCG Hobby remains the reference implementation for existing commerce and admin behaviour. Nothing in this sprint requires moving it away from its current hosting plan.

### Recommendation

Keep TCG Hobby on its current Vercel-compatible path unless a future shared runtime requirement forces consolidation. Reassess only if shared API/runtime constraints create production divergence; do not migrate hosting providers speculatively.

## Blockers Before Production Deployment

- Prisma migration status must be clean against the target production database.
- Final environment variable inventory must be checked in the hosting provider without exposing secret values.
- Stripe webhook endpoint must be configured for the deployed Iron Sprue route and verified in test mode before live mode.
- GA4/Search Console/Meta verification should be completed against the deployed domain.
