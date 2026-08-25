# Iron Sprue Staging Deployment Runbook

This runbook is for the production-like Iron Sprue staging/UAT environment only. It must use Stripe test mode and must not be treated as public launch.

## Baseline

- Application baseline commit: `5ef3089 feat(iron-sprue): lock staging application baseline`
- Deployment branch: `codex/iron-sprue-staging-deployment`
- Frontend target: Cloudflare OpenNext Worker
- Backend target: Railway Nest API
- Admin target: Railway Next app, unless a separate approved Vercel staging target is chosen
- Database target: dedicated staging PostgreSQL database

## Required Staging URLs

Use final hostnames chosen in Cloudflare/Railway, for example:

- Storefront: `https://staging.ironsprue.co.uk`
- Admin: `https://staging-admin.ironsprue.co.uk`
- API: Railway HTTPS service URL, or an approved API subdomain
- Stripe webhook: `https://staging.ironsprue.co.uk/api/stripe/iron-sprue/webhook`

## Cloudflare

The Iron Sprue storefront uses the same OpenNext Cloudflare deployment shape as the proven TCG storefront.

Commands:

```bash
npm run cloudflare:build:iron-sprue
npm run cloudflare:dry-run:iron-sprue
```

After Cloudflare authentication and secrets are configured:

```bash
cd apps/iron-sprue
npx wrangler deploy
```

Recommended staging controls:

- Set `STOREFRONT_ACCESS_MODE=protected`.
- Set `IRON_SPRUE_STAGING_ACCESS_SECRET`.
- Set either `IRON_SPRUE_STAGING_PASSWORD_SHA256` or `IRON_SPRUE_STAGING_PASSWORD`.
- Keep Stripe values test-mode only.
- Do not enable Cloudflare JavaScript minification or transformations before checkout is re-tested.
- Do not cache dynamic/private routes.

No-cache routes:

- `/basket`
- `/checkout`
- `/checkout/*`
- `/account`
- `/account/*`
- `/wishlist`
- `/api/*`
- `/iron-sprue-admin`
- `/iron-sprue-admin/*`
- any auth/session/customer-order route

Cacheable routes/assets:

- `/_next/static/*`
- `/brand/*`
- immutable product media where backed by public object storage
- payment logo assets

## Railway Services

Create separate Railway services where practical:

1. `iron-sprue-api-staging`
   - Root directory: repository root
   - Config file: `apps/api/railway.json`
   - Health check: `/v1/health`
2. `iron-sprue-admin-staging`
   - Root directory: repository root
   - Config file: `apps/admin/railway.json`
   - Health check: `/iron-sprue-admin/login`
3. `iron-sprue-postgres-staging`
   - Dedicated staging database only
   - Do not reuse local or future production databases

Run migrations against staging:

```bash
npm run db:migrate
npm run db:status
npm run db:verify
```

## Environment Variable Matrix

Do not paste secret values into logs, issues or reports.

| Variable | Service | Required | Secret | Staging value source |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Railway API/Admin/migration services | Yes | Yes | Railway Postgres connection string |
| `DIRECT_DATABASE_URL` | Migration runner | Recommended | Yes | Staging Postgres direct connection |
| `IRON_SPRUE_DATABASE_URL` | Compatibility alias for older Iron Sprue tooling | Transitional | Yes | Same Railway Postgres target only while alias is retained |
| `IRON_SPRUE_DIRECT_DATABASE_URL` | Compatibility alias for older migration tooling | Transitional | Yes | Railway direct target only while alias is retained |
| `IRON_SPRUE_WORKER_READ_DATABASE_URL` | Deprecated compatibility alias | No for production storefront | Yes | Do not use for production Cloudflare storefront direct DB reads |
| `IRON_SPRUE_SITE_URL` | Storefront/API/email | Yes | No | `https://staging.ironsprue.co.uk` |
| `NEXT_PUBLIC_IRON_SPRUE_SITE_URL` | Storefront browser | Yes | No | `https://staging.ironsprue.co.uk` |
| `IRON_SPRUE_ADMIN_URL` | API/Admin/email links | Yes | No | `https://staging-admin.ironsprue.co.uk` |
| `IRON_SPRUE_NODE_API_ORIGIN` | Storefront | Yes | No | Railway API HTTPS origin |
| `API_CORS_ALLOWED_ORIGINS` | API | Yes | No | Storefront and Admin staging origins only |
| `IRON_SPRUE_INTERNAL_API_KEY_ID` | Storefront/API | Yes | Yes | Generated staging internal key id |
| `IRON_SPRUE_INTERNAL_API_SECRET` | Storefront/API | Yes | Yes | Generated staging internal secret |
| `IRON_SPRUE_STRIPE_ACCOUNT_ID` | Storefront/API/webhook | Yes | No | Iron Sprue Stripe test account id |
| `IRON_SPRUE_STRIPE_TEST_SECRET_KEY` | Storefront/API | Yes | Yes | Stripe test secret key |
| `IRON_SPRUE_STRIPE_TEST_PUBLISHABLE_KEY` | Storefront browser | Yes | No | Stripe test publishable key |
| `IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET` | Webhook route | Yes | Yes | Stripe staging webhook signing secret |
| `IRON_SPRUE_STRIPE_STATEMENT_DESCRIPTOR` | Stripe metadata | Yes | No | `IRON SPRUE` |
| `IRON_SPRUE_STRIPE_PUBLIC_BUSINESS_NAME` | Stripe metadata | Yes | No | `Iron Sprue` |
| `IRON_SPRUE_RESEND_API_KEY` | Transactional email | Yes for email test | Yes | Resend staging/production-safe key |
| `IRON_SPRUE_EMAIL_FROM` | Transactional email | Yes | No | Verified Iron Sprue sender |
| `IRON_SPRUE_EMAIL_REPLY_TO` | Transactional email | Yes | No | Iron Sprue support mailbox |
| `IRON_SPRUE_EMAIL_ASSET_BASE_URL` | Transactional email | Yes | No | Public staging HTTPS origin |
| `IRON_SPRUE_EMAIL_LOGO_URL` | Transactional email | Yes | No | Public staging logo URL |
| `IRON_SPRUE_R2_*` | Admin/media/API | If using R2 media | Mixed | Dedicated Iron Sprue media bucket settings |
| `STOREFRONT_ACCESS_MODE` | Storefront | Yes | No | `protected` for staging |
| `IRON_SPRUE_STAGING_PASSWORD_SHA256` | Storefront | One password option required | Yes | Hashed UAT password |
| `IRON_SPRUE_STAGING_PASSWORD` | Storefront | Alternative password option | Yes | Plain staging password if hash not used |
| `IRON_SPRUE_STAGING_ACCESS_SECRET` | Storefront | Yes when protected | Yes | Random signing secret |
| `NEXT_PUBLIC_IRON_SPRUE_GA4_MEASUREMENT_ID` | Storefront | Optional | No | Dedicated staging GA4 or blank |
| `NEXT_PUBLIC_IRON_SPRUE_META_PIXEL_ID` | Storefront | Optional | No | Dedicated staging Meta pixel or blank |

## Stripe Test Mode

Use only Stripe test keys and a test webhook endpoint.

Required webhook endpoint:

```text
https://staging.ironsprue.co.uk/api/stripe/iron-sprue/webhook
```

Required events:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded` or the existing refund events handled by the app

Verify that the event account id matches `IRON_SPRUE_STRIPE_ACCOUNT_ID` and that events are not live mode.

## Email Checks

Send only a small number of test emails to safe recipients.

Verify:

- Order confirmation email arrives.
- Refund/cancellation email arrives.
- Dispatch/tracking email arrives where applicable.
- Header uses the approved Iron Sprue logo.
- Product images are absolute public HTTPS URLs and render in the mail client.
- No TCG Hobby sender, domain, copy or logo appears.

Existing old emails will not update when assets/config are fixed.

## Hosted UAT Script

1. Open staging storefront and pass the staging access gate.
2. Browse homepage modules.
3. Search/browse catalogue.
4. Filter by manufacturer.
5. Open a product page.
6. Add product to basket.
7. Add an add-on from the product page or basket.
8. Change basket quantities within stock limits.
9. Apply/remove any staging discount code.
10. Enter guest checkout details.
11. Review order and edit address.
12. Continue to secure payment.
13. Pay with Stripe test card `4242 4242 4242 4242`.
14. Confirm processing state resolves to confirmation.
15. Confirm basket is empty after success.
16. Confirm Admin order appears and inventory decremented once.
17. Confirm customer email arrives with logo and product image.
18. Repeat with Stripe declined card `4000 0000 0000 0002`.
19. Confirm failed payment does not create a paid order.
20. Check mobile Safari/Chrome for product, basket, checkout, confirmation and cookies.

## Production Readiness Gaps

- Cloudflare authentication and zone access are required before deployment.
- Railway CLI/project access is required before API/Admin/database deployment.
- Staging database must be created and migrated.
- Stripe test webhook must be created for the staging URL.
- Resend sender/domain and public asset URLs must be verified from the hosted domain.
- Production backup/recovery design must be confirmed separately before live launch.
