# Pre-Baseline Migration Archive

These migrations were archived when the production migration history was baselined on 2026-07-11.

They are retained for audit only and are no longer part of Prisma's runtime migration chain.

## Why They Were Archived

The historical migration directory started at `20260704_sprint8_collection_decks`, which assumed the base commerce schema already existed. On a completely empty PostgreSQL database it failed because `CollectionItem.condition` referenced the `ProductCondition` enum before any migration created that enum.

The archived chain also assumed earlier tables such as `User`, `Product`, and `Category` existed. That indicates earlier development used an already-populated database or `prisma db push` before migration history was introduced.

## Runtime Replacement

Runtime migrations now start with:

- `packages/database/prisma/migrations/0_init/migration.sql`

That migration was generated from the current Prisma schema using `prisma migrate diff --from-empty`.
