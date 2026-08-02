# Iron Sprue Public Coming Soon Deployment

This document covers the temporary public holding page for `www.ironsprue.co.uk`.
It is separate from the protected Iron Sprue storefront and does not expose shop,
product, basket, account, checkout, Admin or API routes.

## Architecture

- Source: `apps/iron-sprue/public-coming-soon`
- Build script: `npm run build:coming-soon -w @capital-hobby/iron-sprue`
- Output directory: `apps/iron-sprue/dist/public-coming-soon`
- Hosting target: Cloudflare Pages Free, static assets only
- Runtime: none
- Secrets required: none

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
- Environment variables: none required
- Compatibility flags: none required
- Workers Paid: not required

## Custom Domain Checklist

1. Add `www.ironsprue.co.uk` as the Cloudflare Pages custom domain.
2. Confirm the Pages project points at the static coming-soon output, not the
   Next.js storefront build.
3. Confirm `https://www.ironsprue.co.uk/` serves `index.html`.
4. Confirm unknown commerce paths such as `/shop` and `/checkout` return the
   static `404.html` or a 404 status, not storefront content.
5. Confirm no environment secret is configured for the static Pages project.

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

## Mailing List

The current page uses a safe temporary `mailto:` flow. It does not silently store
addresses and does not claim a server-side signup has succeeded. Visitors must
send the prepared email to complete the request.

A production backend form remains blocked until the approved privacy wording,
abuse controls and email-list storage path are confirmed.

## Replacement By Full Storefront

The full Iron Sprue storefront can replace this static page only after protected
hosted acceptance covers catalogue, basket, checkout, payment, order finalisation,
email and account flows. At that point, update the Cloudflare project build
settings or deploy a new storefront host behind `www.ironsprue.co.uk`.
