# Sprint 7 Completion

Sprint 7 introduced the pricing engine and the first buylist workflow for TCG Hobby.

## Delivered

- Reusable pricing engine with rule evaluation and integer-only money calculations.
- Customer buylist routes:
  - `/buylist`
  - `/buylist/search`
  - `/buylist/cart`
- Admin buylist routes:
  - `/admin/buylist`
  - `/admin/buylist/[id]`
- Shared pricing UI primitives for badges, pricing snapshots, and money inputs.
- Seeded pricing rules, product pricing, and buylist records for local development.

## Validation

- `npm run db:generate`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

## Notes

- Pricing stays in integer minor units only.
- Buylist estimates are advisory and subject to inspection.
- Live market feeds and customer payout automation are intentionally deferred.
