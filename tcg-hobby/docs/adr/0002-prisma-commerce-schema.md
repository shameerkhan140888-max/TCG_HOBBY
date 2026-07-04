# ADR 0002: Prisma Commerce Schema

## Context

The platform needs a commerce schema that can support catalogue browsing, inventory, carts, checkout, orders, addresses, and future media or fulfilment features.

## Decision

Model commerce with Prisma using explicit entities for users, addresses, products, inventory, carts, cart items, orders, order items, suppliers, and product images, plus indexes for lookup-heavy paths.

## Consequences

- Domain relationships remain visible and type-safe.
- Inventory-safe checkout and order history can be expressed cleanly.
- The schema can evolve toward fulfilment, CMS, and operations without reworking the core store model.
