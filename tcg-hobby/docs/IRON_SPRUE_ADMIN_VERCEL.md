# Iron Sprue Admin Vercel Deployment

The Iron Sprue admin is deployed as a dedicated Vercel project for `apps/admin`. It remains separate from the Capital Hobby Group corporate site and the Cloudflare-hosted Iron Sprue storefront.

## Vercel Project

- Project root directory: `apps/admin`
- Install command: `cd ../.. && npm ci`
- Build command: `cd ../.. && npm run build -w @capital-hobby/database && npm run build -w @capital-hobby/admin`
- Framework preset: Next.js
- Intended hostname: `admin.capitalhobbygroup.co.uk`
- Acceptable fallback hostname: `ironsprue-admin.capitalhobbygroup.co.uk`

## Required Secrets

Set these only in the Vercel project for the hosted admin. Do not expose them to client-side `NEXT_PUBLIC_*` variables.

- `IRON_SPRUE_ADMIN_DATABASE_URL`
- `IRON_SPRUE_R2_ACCESS_KEY_ID`
- `IRON_SPRUE_R2_SECRET_ACCESS_KEY`
- `IRON_SPRUE_RESEND_API_KEY`
- `IRON_SPRUE_EMAIL_FROM`
- `IRON_SPRUE_EMAIL_REPLY_TO`
- `IRON_SPRUE_SUPPORT_EMAIL`
- `IRON_SPRUE_STRIPE_ACCOUNT_ID`
- `IRON_SPRUE_STRIPE_TEST_SECRET_KEY`
- `IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET`
- `IRON_SPRUE_STRIPE_LIVE_SECRET_KEY`
- `IRON_SPRUE_STRIPE_LIVE_WEBHOOK_SECRET`

## Required Non-Secret Config

- `IRON_SPRUE_ADMIN_ENVIRONMENT=railway-production`
- `IRON_SPRUE_ADMIN_REQUIRE_EXPLICIT_DATABASE_URL=true`
- `ADMIN_ROOT_REDIRECT_PATH=/iron-sprue-admin`
- `IRON_SPRUE_ENVIRONMENT`
- `IRON_SPRUE_SITE_URL`
- `IRON_SPRUE_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_IRON_SPRUE_SITE_URL`
- `NEXT_PUBLIC_IRON_SPRUE_STOREFRONT_URL`
- `IRON_SPRUE_R2_BUCKET_NAME=iron-sprue-product-media`
- `IRON_SPRUE_R2_ENDPOINT`
- `IRON_SPRUE_R2_ACCOUNT_ID`
- `IRON_SPRUE_R2_REGION=auto`
- `IRON_SPRUE_R2_PUBLIC_BASE_URL`
- `IRON_SPRUE_EMAIL_ASSET_BASE_URL`
- `IRON_SPRUE_EMAIL_MEDIA_BASE_URL`
- `IRON_SPRUE_EMAIL_LOGO_URL`
- `IRON_SPRUE_STRIPE_STATEMENT_DESCRIPTOR`
- `IRON_SPRUE_STRIPE_PUBLIC_BUSINESS_NAME`
- `IRON_SPRUE_CHECKOUT_SUCCESS_URL`
- `IRON_SPRUE_CHECKOUT_CANCEL_URL`

## Local-Only Or Obsolete For Hosted Admin

- Local Railway tunnel URLs such as `127.0.0.1:64843`
- `DATABASE_URL` as the Iron Sprue admin production target
- `IRON_SPRUE_DATABASE_URL` as the Iron Sprue admin production target
- Neon connection strings as the Iron Sprue admin production target

The hosted admin fails closed when running on Vercel without `IRON_SPRUE_ADMIN_DATABASE_URL`, or when that variable points at localhost/tunnel or Neon targets.

## DNS

After Vercel creates the project and custom domain, add the DNS record Vercel provides for `admin.capitalhobbygroup.co.uk` at the CHG DNS provider. Do not change Cloudflare storefront DNS as part of this deployment.
