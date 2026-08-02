# Capital Hobby Group Architecture

Capital Hobby Group follows clean architecture so business rules remain independent from framework, persistence, and delivery mechanisms.

## Monorepo Shape

- `apps/corporate`: Capital Hobby Group corporate application.
- `apps/tcg-hobby`: TCG Hobby customer web storefront built with Next.js 15.
- `apps/iron-sprue`: Iron Sprue customer web storefront built with Next.js 15.
- `apps/admin`: shared internal admin portal built with Next.js 15.
- `apps/api`: shared NestJS backend API.
- `apps/mobile`: TCG Hobby Expo mobile application.
- `packages/auth`: shared authorization helpers.
- `packages/database`: Prisma schema, migrations, and database client boundary.
- `packages/types`: shared API and domain-facing TypeScript types.
- `packages/ui`: shared Tailwind and shadcn/ui-compatible components.
- `packages/config`: shared TypeScript and tooling configuration.
- `packages/utils`: shared utility functions.

## Dependency Rule

Domain code must not import from applications, Prisma, Stripe, Auth.js, React, Next.js, NestJS, or Expo. Applications depend inward on domain contracts and adapt them to HTTP, UI, persistence, payments, and authentication.

## Primary Boundaries

- Identity: Auth.js-backed customer and staff sessions.
- Commerce: carts, orders, Stripe payments, shipping, rewards, and fulfilment.
- Hobby tools: wishlist, deck builder, collection manager, buylist, and events.
- Operations: suppliers, inventory, catalogue, CMS, and admin reporting.
- Pricing: live pricing only where provider permissions allow it.

## Quality Bar

Each slice must include compiling TypeScript, focused tests, documentation, and CI coverage before expanding the feature surface.
