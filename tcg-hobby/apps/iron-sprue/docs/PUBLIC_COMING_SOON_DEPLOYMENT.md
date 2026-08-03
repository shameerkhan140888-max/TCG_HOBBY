# Iron Sprue Public Coming Soon Deployment

This document covers the temporary public holding page for `www.ironsprue.co.uk`.
It is separate from the protected Iron Sprue storefront and does not expose shop,
product, basket, account, checkout or Admin routes. It includes one Cloudflare
Pages Function for launch-list signup and one unsubscribe Function.

## Architecture

- Source: `apps/iron-sprue/public-coming-soon`
- Build script: `npm run build:coming-soon -w @capital-hobby/iron-sprue`
- Output directory: `apps/iron-sprue/dist/public-coming-soon`
- Hosting target: Cloudflare Pages Free, static assets only
- Runtime: Cloudflare Pages static assets plus Pages Functions for signup
- Secrets required: Iron Sprue-only Neon and Resend values listed below

The generated output contains only:

- `index.html`
- `404.html`
- `privacy.html`
- `cookies.html`
- `styles.css`
- `signup.js`
- `robots.txt`
- `sitemap.xml`
- `_headers`
- `_redirects`
- approved local static assets under `assets/`
- `/api/launch-list` Pages Function
- `/unsubscribe/:token` Pages Function

Do not deploy the full Next.js Iron Sprue storefront for this task.

## Cloudflare Pages Settings

- GitHub repository: `TCG_HOBBY`
- Project type: Pages, not Workers
- Project name: `iron-sprue-coming-soon`
- Production branch: `main`
- Root directory: `tcg-hobby`
- Framework preset: None
- Build command: `npm run build:coming-soon -w @capital-hobby/iron-sprue`
- Build output directory: `apps/iron-sprue/dist/public-coming-soon`
- Node.js version: 22
- Environment variables:
  - `IRON_SPRUE_DATABASE_URL` secret, dedicated Iron Sprue Neon preview or production branch
  - `IRON_SPRUE_RESEND_API_KEY` secret
  - `IRON_SPRUE_EMAIL_FROM` secret or plain value from an approved Iron Sprue sender
  - `IRON_SPRUE_SUPPORT_EMAIL` plain value, defaults to `info@ironsprue.co.uk`
  - `IRON_SPRUE_SITE_URL` plain value, public HTTPS origin such as `https://www.ironsprue.co.uk`
- Compatibility flags: none required
- Workers Paid: not required

## Custom Domain Checklist

1. Add `www.ironsprue.co.uk` as the Cloudflare Pages custom domain.
2. Confirm the Pages project points at the static coming-soon output, not the
   Next.js storefront build.
3. Confirm `https://www.ironsprue.co.uk/` serves `index.html`.
4. Confirm unknown commerce paths such as `/shop` and `/checkout` return the
   static `404.html` or a 404 status, not storefront content.
5. Confirm only Iron Sprue launch-list secrets are configured and no TCG Hobby
   database, Stripe, Auth or R2 write credentials are configured.

## Apex Redirect Checklist

The `_redirects` file includes:

```text
https://ironsprue.co.uk/* https://www.ironsprue.co.uk/:splat 301
```

After explicit DNS approval, attach the apex hostname to the same Pages project
or configure an equivalent Cloudflare redirect rule from `ironsprue.co.uk` to
`www.ironsprue.co.uk`.

## Rollback

Cloudflare Pages keeps immutable deployments. To roll back:

1. Open the Pages project deployments list.
2. Select the last known-good static coming-soon deployment.
3. Promote it to production.
4. Purge cache for `www.ironsprue.co.uk/*` if stale content remains.

## Cache Invalidation

- Static assets under `/assets/*` are long-cacheable.
- HTML uses a short cache window.
- Use Cloudflare cache purge for `www.ironsprue.co.uk/*` after replacing the
  page or switching to the full storefront.

## Launch List

The current page posts to `/api/launch-list`, a Cloudflare Pages Function backed
by the dedicated Iron Sprue Neon database and Resend. The Function stores a
normalised email address, consent wording/version, delivery state and a hashed
unsubscribe token. It never accepts TCG Hobby database URLs and returns duplicate
success without sending another confirmation email.

Before preview or production use, apply
`apps/iron-sprue/migrations/20260803090000_launch_list_subscribers.sql` only to
the selected Iron Sprue Neon branch. Do not run it against TCG Hobby.

Preview deployments should use the Iron Sprue development or preview Neon
branch. Production deployments should use the Iron Sprue production Neon branch
only after explicit approval.

## Replacement By Full Storefront

The full Iron Sprue storefront can replace this static page only after protected
hosted acceptance covers catalogue, basket, checkout, payment, order finalisation,
email and account flows. At that point, update the Cloudflare project build
settings or deploy a new storefront host behind `www.ironsprue.co.uk`.
