# Iron Sprue Protected Staging

Iron Sprue supports a production-safe password gate for live staging on the real Worker/domain before public launch.

## Environment

- `STOREFRONT_ACCESS_MODE=protected|public`
- `IRON_SPRUE_STAGING_PASSWORD_SHA256`, preferred, or `IRON_SPRUE_STAGING_PASSWORD`
- `IRON_SPRUE_STAGING_ACCESS_SECRET`

Provider mode remains separate from access mode. Setting `STOREFRONT_ACCESS_MODE=public` must not activate live Stripe, live email or public DNS changes.

## Behaviour

Protected mode:

- redirects protected customer-facing routes to `/access`;
- validates the access password server-side;
- issues a signed `iron_sprue_staging_access` cookie;
- returns `X-Robots-Tag: noindex, nofollow, noarchive`;
- serves a restrictive robots policy;
- keeps customer session cookies separate from staging-access cookies.

Public mode:

- removes the staging gate;
- allows normal robots output only after explicit launch approval;
- leaves payment/email provider mode unchanged.

## Explicit Exemptions

- `/access`
- `/api/staging-access`
- `/api/staging-access/logout`
- `/robots.txt`
- `/favicon.ico`
- `/_next/*`
- `/brand/*`
- `/api/health`
- `/api/readiness`
- `/api/stripe/webhook`

Do not exempt catalogue APIs, product data, account APIs, basket APIs, checkout APIs, order status, Admin or arbitrary `/api/*` routes.

## Public Launch Control

Public launch requires explicit approval after stock reconciliation, legal review, domain review, Stripe review, webhook review, Resend sender review and a final low-risk purchase plan. Rollback is to set `STOREFRONT_ACCESS_MODE=protected` and rotate `IRON_SPRUE_STAGING_ACCESS_SECRET` if required.
