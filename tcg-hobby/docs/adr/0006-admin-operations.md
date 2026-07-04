# ADR 0006: Admin Operations Platform

## Context

TCG Hobby is moving from a commerce MVP toward a retailer operations platform. The admin shell needs to support product, inventory, supplier, and order workflows without collapsing into one-off CRUD screens.

## Decision

Use a lightweight ERP-style admin architecture built on shared domain repositories, thin Next.js pages, server actions for mutations, and reusable admin UI primitives. Keep inventory, supplier, and order data modeled as operational records rather than presentation-only views.

## Consequences

- Business logic stays in shared domain helpers instead of page components.
- Admin screens stay consistent with storefront data models and avoid duplicated logic.
- Manual inventory adjustments and supplier relationships are first-class operational concepts.
- The platform is ready for future enhancements such as media uploads, richer fulfilment, and automated replenishment without reworking the core admin structure.
