# ADR 0004: Shared UI Package

## Context

The storefront and admin portal need the same premium visual language, form controls, and commerce widgets without duplicating component implementations.

## Decision

Build a shared Tailwind-based UI package for reusable primitives, account surfaces, commerce widgets, and branding elements.

## Consequences

- Visual consistency improves across apps.
- Commerce flows can reuse tested UI behavior.
- Design updates can be rolled out from one package instead of many app-local copies.
