# ADR 0011: Production Hardening

## Context

TCG Hobby has moved from feature delivery into a quality and readiness phase. The storefront, admin portal, mobile app, and commerce flows already exist, but the shell, metadata, and workspace configuration still need polish before public beta.

## Decision

We will prioritize production hardening over new features:

- redesign the storefront header and footer for a more commercial feel,
- add SEO and discovery assets,
- move Prisma configuration into `prisma.config.ts`,
- ensure the mobile workspace produces a real build artifact,
- remove temporary workspace packages that are no longer needed.

## Consequences

- The codebase becomes easier to reason about and more consistent for future work.
- Search engines and social previews receive better metadata.
- Turbo can track builds more accurately across the monorepo.
- We reduce technical drift from temporary tooling packages and older configuration patterns.
