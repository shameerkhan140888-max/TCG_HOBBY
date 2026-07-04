# TCG Hobby

TCG Hobby is a Turborepo monorepo for a premium trading card game commerce platform.

## Workspaces

- `apps/storefront`: Next.js 15 customer storefront.
- `apps/admin`: Next.js 15 admin portal.
- `apps/api`: NestJS API.
- `apps/mobile`: React Native Expo mobile app.
- `packages/auth`: shared authorization helpers.
- `packages/config`: shared TypeScript and Tailwind configuration.
- `packages/database`: Prisma schema and database client boundary.
- `packages/types`: shared API and domain-facing TypeScript types.
- `packages/ui`: shadcn/ui-style Tailwind React primitives.
- `packages/utils`: shared utility functions.

## Verification

Run these commands from this folder:

```bash
npm install
npm run db:generate
npm run typecheck
npm run test
npm run build
npm run lint
```

## Sprint 3 Local Commerce Flow

```bash
docker compose up -d
npm run db:generate
npm run db:seed
npm run dev -w @tcg-hobby/storefront
```

Then open `http://localhost:3000/catalogue`.

## Sprint 4 Identity Flow

```bash
npm run dev -w @tcg-hobby/storefront
```

Then open:

- `http://localhost:3000/login`
- `http://localhost:3000/register`
- `http://localhost:3000/account`

Seeded customer login:

- Email: `sam.customer@tcghobby.test`
- Password: `SamCollector123!`

## Sprint 5 Checkout Flow

```bash
docker compose up -d
npm run db:generate
npm run db:seed
npm run dev -w @tcg-hobby/storefront
```

Set these environment variables before starting the storefront:

- `APP_URL=http://localhost:3000`
- `STRIPE_SECRET_KEY=sk_test_...`

Then open:

- `http://localhost:3000/cart`
- `http://localhost:3000/checkout`
- `http://localhost:3000/account/orders`

Stripe test mode notes:

- Checkout uses a hosted Stripe payment page in test mode.
- A successful payment is confirmed from the Stripe session before the order is finalized.
- No webhook listener is required for this sprint.

## Sprint 6 Admin Operations

```bash
docker compose up -d
npm run db:generate
npm run db:seed
npm run dev -w @tcg-hobby/admin
```

Then open:

- `http://localhost:3001/admin`
- `http://localhost:3001/admin/products`
- `http://localhost:3001/admin/inventory`
- `http://localhost:3001/admin/suppliers`
- `http://localhost:3001/admin/orders`

Admin notes:

- Product, supplier, inventory, and order logic is served from shared repository helpers.
- Inventory adjustments require a reason and are recorded in stock history.
- Product and supplier forms use server actions, while shared UI primitives keep the admin surface consistent.

If you reset the database, rerun:

```bash
npm run db:generate
npm run db:seed
```

## Sprint 7 Pricing and Buylist Flow

```bash
docker compose up -d
npm run db:generate
npm run db:seed
npm run dev
```

Then open:

- `http://localhost:3000/buylist`
- `http://localhost:3000/buylist/search`
- `http://localhost:3000/buylist/cart`
- `http://localhost:3001/admin/buylist`

Pricing notes:

- Pricing calculations use integer minor units only.
- Buylist estimates are seeded and rule-driven in development.
- Live market feed integration is intentionally deferred.

## Sprint 8 Collection and Deck Tools

```bash
docker compose up -d
npm run db:generate
npm run db:seed
npm run dev
```

Then open:

- `http://localhost:3000/collection`
- `http://localhost:3000/collection/import`
- `http://localhost:3000/customer/collection`
- `http://localhost:3000/decks`
- `http://localhost:3000/decks/new`

Sprint 8 notes:

- Collection records track owned quantities, print variants, condition, foil, language, notes, and acquisition details.
- Decks support names, visibility, card counts, duplicate limits, and collection gap warnings.
- Collection and deck screens are intentionally valuation-free; no market pricing is calculated for owned cards.
- Seed data includes a starter customer collection and a starter deck so the new tools are visible immediately after seeding.

## Local Commands

- `npm run db:generate` regenerates the Prisma client.
- `npm run db:seed` loads the seeded catalogue, pricing, order, and buylist data.
- `npm run db:seed` also loads the starter collection and deck data for Sprint 8.
- `npm run dev` starts the full Turborepo workspace.

## Infrastructure

- PostgreSQL is defined in `docker-compose.yml`.
- CI is defined in `.github/workflows/ci.yml`.
- Docker verification image is defined in `docker/Dockerfile`.
