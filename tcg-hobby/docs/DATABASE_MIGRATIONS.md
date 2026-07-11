# Database Migrations

## Production Baseline

The production migration history was repaired with a new baseline migration:

- `packages/database/prisma/migrations/0_init/migration.sql`

This migration represents the complete current Prisma schema from an empty PostgreSQL database. Historical sprint migrations were moved to:

- `packages/database/prisma/migrations_archive/pre_baseline_20260711`

The archive is for audit only. Prisma does not apply migrations from that directory.

## Why The Baseline Exists

The previous runtime migration chain began with `20260704_sprint8_collection_decks`. That migration referenced `ProductCondition` and base tables such as `User` and `Product`, but no earlier migration in the repository created them. This means the old chain was not reproducible from an empty database.

The new baseline creates all enums before tables. `ProductCondition` is created before `Product.condition` and `CollectionItem.condition` reference it.

## Deploying Migrations

For production and shared environments, deploy migrations with:

```bash
cd packages/database
node ./scripts/prisma-run.mjs migrate deploy
node ./scripts/prisma-run.mjs generate
```

Do not use `prisma db push` for shared or production schema changes. `db push` can mutate a database without creating migration history, which makes fresh production databases and teammate environments unreproducible.

## Future Schema Changes

For future schema changes:

1. Update `packages/database/prisma/schema.prisma`.
2. Generate a migration in development:

```bash
cd packages/database
node ./scripts/prisma-run.mjs migrate dev --name descriptive_change_name
```

3. Review the generated SQL.
4. Commit both the schema change and the new migration folder.
5. Deploy with `migrate deploy`.

## Empty Neon Database Recovery

The current Neon production database is empty. To recover from a failed historical migration attempt:

1. Reset or recreate the empty Neon branch/database from the Neon console.
2. Do not mark the failed historical migration as applied.
3. Do not manually create only `ProductCondition`.
4. Deploy the repository migration chain from scratch:

```bash
cd packages/database
node ./scripts/prisma-run.mjs migrate deploy
node ./scripts/prisma-run.mjs generate
```

Because production has no data, recreating the empty branch is safer than trying to repair `_prisma_migrations` manually.
