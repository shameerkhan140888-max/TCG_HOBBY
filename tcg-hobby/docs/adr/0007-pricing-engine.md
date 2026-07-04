# ADR 0007: Pricing Engine

## Context

TCG Hobby needs a pricing layer that can support both retail valuation and buylist purchasing. The platform must keep all monetary values in integer minor units, support rule-based pricing, and allow the strategy to evolve without rewriting the commerce core.

## Decision

We introduced a dedicated pricing engine in `packages/database` backed by Prisma models for pricing rules and product pricing snapshots. The engine evaluates matching rules by scope and priority, clamps buy prices to guard rails, and stores the resulting snapshot on the product.

Pricing rules support:

- Manual
- Cost plus percentage
- Fixed margin
- Supplier cost
- Promotional
- Future market feed

## Consequences

- Pricing logic is centralized and reusable across storefront and admin workflows.
- Product pricing can be refreshed without touching the UI layer.
- Development data can seed realistic pricing scenarios for local work.
- Future integrations, such as live market feeds, can be added as additional rule types instead of a rewrite.
- The platform remains integer-safe for money, but the rule engine will need careful governance as more pricing sources are introduced.
