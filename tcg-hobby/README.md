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

If you reset the database, rerun:

```bash
npm run db:generate
npm run db:seed
```

## Infrastructure

- PostgreSQL is defined in `docker-compose.yml`.
- CI is defined in `.github/workflows/ci.yml`.
- Docker verification image is defined in `docker/Dockerfile`.
