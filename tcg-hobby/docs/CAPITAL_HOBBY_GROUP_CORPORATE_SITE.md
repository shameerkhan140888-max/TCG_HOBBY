# Capital Hobby Group Corporate Site

## Add the site locally

1. Install workspace dependencies from the repository root with `npm install`.
2. Copy `apps/corporate/.env.example` to `apps/corporate/.env.local` only when local overrides are needed.
3. Run `npm run dev -w @tcg-hobby/corporate`.
4. Open `http://localhost:3100`.

The app is an independent static Next.js workspace at `apps/corporate`. It does not import the TCG Hobby storefront, Admin, API, authentication, database, Stripe, product or mobile runtimes.

## Approved identity

- Legal company: Capital Hobby Group Ltd
- Company number: 17336948
- Registered in England and Wales
- Registered office: 4-6 Greatorex Street, London, United Kingdom, E1 5NF
- General corporate enquiries: `info@capitalhobbygroup.co.uk`
- Supplier, trade and accounts enquiries: `accounts@capitalhobbygroup.co.uk`

The approved vector artwork is stored in `apps/corporate/public/brand`:

- `capital-hobby-group-horizontal.svg`
- `capital-hobby-group-stacked.svg`
- `tcg-hobby-horizontal.svg`
- `iron-sprue-horizontal.svg`

The Capital Hobby Group and Iron Sprue export canvases are normalised to their artwork bounds, and the TCG Hobby card uses the approved dark-background vector already used by the storefront. The logo paths, colours and proportions are not redrawn or rasterised. Replace an asset only with newly approved owner-supplied artwork using the same stable path.

## Configuration

`apps/corporate/lib/site-config.ts` is the canonical typed configuration. Environment variables may override public deployment values:

| Variable | Purpose |
| --- | --- |
| `CORPORATE_SITE_URL` | Canonical corporate origin |
| `TCG_HOBBY_URL` | Approved TCG Hobby origin |
| `IRON_SPRUE_URL` | Optional live Iron Sprue origin |
| `CORPORATE_INFO_EMAIL` | General corporate contact |
| `CORPORATE_ACCOUNTS_EMAIL` | Supplier, trade and accounts contact |

URLs must be public HTTPS URLs. Localhost and insecure public links fail validation. When `IRON_SPRUE_URL` is empty, the site renders a controlled coming-soon state and no broken link.

## Content and routes

- `/` uses one compact framed composition containing the group statement, two trading-division cards, four operating principles and the legal footer.
- `/about` explains the specialist division model without unsupported history or scale claims.
- `/contact` directs corporate, supplier, TCG Hobby and Iron Sprue enquiries.
- `/privacy` describes the initial cookie-free static website and email handling.
- `/legal` provides the confirmed legal disclosure.

Update factual copy directly in these routes. Do not add unverified awards, partnerships, trading history, claims, social accounts or contact details.

## Build and test

```text
npm run typecheck -w @tcg-hobby/corporate
npm run test -w @tcg-hobby/corporate
npm run lint -w @tcg-hobby/corporate
npm run build -w @tcg-hobby/corporate
npm run test:e2e -w @tcg-hobby/corporate
```

The production app remains server-rendered/static, uses no database, analytics, marketing cookies or third-party browser scripts, and requires no secret environment variables.

## Deployment

Create a separate deployment project with:

- Root directory: repository root
- Workspace: `@tcg-hobby/corporate`
- Build command: `npm run build -w @tcg-hobby/corporate`
- Framework: Next.js
- Primary domain: `www.capitalhobbygroup.co.uk`

Set `CORPORATE_SITE_URL=https://www.capitalhobbygroup.co.uk`. Add the apex `capitalhobbygroup.co.uk` and configure a permanent redirect to the preferred `www` hostname in the hosting platform. Configure `capitalhobbygroup.com` and its `www` hostname as permanent redirects to `https://www.capitalhobbygroup.co.uk`. Do not point these domains at the TCG Hobby storefront project.

Verify issued HTTPS certificates, canonical metadata, `robots.txt`, `sitemap.xml`, security headers and all division links before production release. Prefer immutable caching for versioned framework assets and normal revalidation for HTML.

For rollback, select the previous successful corporate deployment. This app has no database migration or shared runtime state to reverse.

## Accessibility and SEO

The app provides semantic landmarks, one H1 per page, a skip link, visible focus, keyboard/mobile navigation, meaningful image alternatives, reduced-motion handling, constrained readable text and responsive layouts from 320px upward. Metadata includes canonical URLs, Open Graph, Twitter cards, robots, sitemap and an Organization graph containing only approved facts.

## Future work

- Set `IRON_SPRUE_URL` only when the independent Iron Sprue website is production-ready.
- Add approved social links through typed configuration, with meaningful labels and secure external-link behaviour.
- Keep future Iron Sprue ecommerce separate from this static corporate application.
- Add analytics or a contact form only through a separately approved privacy, security and abuse-protection review.
