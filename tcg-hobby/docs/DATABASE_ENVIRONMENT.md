# Database Environment

TCG Hobby uses one database environment source for local database tooling, Prisma, product imports, storefront server code and Admin server code.

## Source Of Truth

Use the repository root `.env.local` for local development:

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

`.env.example` is documentation only. Runtime scripts never load it as configuration, so placeholder or localhost values cannot accidentally become the active database.

Loading priority:

1. Existing `process.env.DATABASE_URL`
2. Root `.env.local`
3. Root `.env`

An explicit `process.env.DATABASE_URL` is never overwritten. If it is present but invalid, commands fail immediately.

## Safety Rules

- `DATABASE_URL` must start with `postgresql://` or `postgres://`.
- Missing or invalid configuration fails before Prisma, Admin, storefront or importer work begins.
- Diagnostics may print the database hostname only.
- Full connection strings, passwords and tokens must never be printed or committed.
- There is no implicit `localhost:5432` fallback.

## Commands

From the repository root:

```bash
npm run db:status
npm run db:migrate
npm run db:generate
npm run db:seed
npm run db:verify
```

Product import commands use the same environment loader:

```bash
npm run product:validate -- --path product-imports/pokemon/pokemon-tcg-mega-greninja-ex-premium-collection
npm run product:dry-run -- --path product-imports/pokemon/pokemon-tcg-mega-greninja-ex-premium-collection
npm run product:import -- --path product-imports/pokemon/pokemon-tcg-mega-greninja-ex-premium-collection
```

`product:validate` can validate manifest and media files without a live database. `product:dry-run`, `product:import` and `product:import:all` require `DATABASE_URL`.

## App Runtime

The storefront and Admin build/dev scripts load the same root database environment before starting Next.js. This keeps local route QA, Admin product management, imports, seed and Prisma commands pointed at the same database.

## Troubleshooting

If a command reports `DATABASE_URL is not configured`, create root `.env.local` or export `DATABASE_URL` in the current shell.

If a command reports `Invalid DATABASE_URL`, check that the value is a PostgreSQL URL and that it has not been replaced with a placeholder.

If Admin and storefront show different data, verify both were started after the same root `.env.local` was created:

```bash
npm run db:verify
```

This prints the safe database host and lookup counts, never the full connection string.
