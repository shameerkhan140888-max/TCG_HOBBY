# Sprint 3 Completion Notes

Sprint 3 completed the commerce foundation for TCG Hobby.

## What changed

- Hardened the Prisma schema with `Address` and `ProductImage` models.
- Added useful indexes for catalogue, inventory, and order lookup paths.
- Seeded development data for users, addresses, products, inventory, carts, orders, supplier links, and product media.
- Implemented seeded catalogue search, filtering, sorting, pagination, and detail pages.
- Upgraded product detail pages to expose related product objects.
- Added loading and not-found UI for the catalogue routes.
- Added tests for catalogue filtering, search, sorting, pagination, and product detail shape.
- Documented local setup commands for Docker, Prisma generation, seeding, and storefront browsing.

## Local runbook

1. Start PostgreSQL and the supporting stack:

```bash
docker compose up -d
```

2. Generate the Prisma client:

```bash
npm run db:generate
```

3. Seed the development database:

```bash
npm run db:seed
```

4. Open the storefront catalogue:

```bash
npm run dev -w @tcg-hobby/storefront
```

Then visit `http://localhost:3000/catalogue`.

## Notes

- Seed fallback remains available outside production so local development keeps working even when the database is unavailable.
- Production paths now fail loudly instead of silently dropping to seeded data.
