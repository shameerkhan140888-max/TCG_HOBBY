# ADR 0001: Monorepo Structure

## Context

TCG Hobby needs storefront, admin, API, mobile, database, UI, auth, config, types, and utility code to move together without losing shared standards.

## Decision

Use a Turborepo monorepo with application workspaces in `apps/` and shared packages in `packages/`.

## Consequences

- Shared UI, types, and domain helpers stay reusable across apps.
- Build, lint, test, and typecheck can be coordinated from one root.
- The workspace can enforce consistent design, data, and tooling decisions across all products.
