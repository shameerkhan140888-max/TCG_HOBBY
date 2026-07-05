# Sprint 10 Completion Notes

## What shipped

- Collection insights with approximate market values and collection health metrics.
- Watchlists for logged-in members only.
- Guest checkout support alongside logged-in checkout.
- Collection insight and notification foundations for later expansion.

## Important behavior

- Watchlist pages and watchlist data remain members-only. Guests are redirected to `/login`.
- Checkout does not require a logged-in account.
- Logged-in checkout still links the order to the customer account.
- Guest orders store the email address and shipping details entered at checkout.
- Header basket summary deferred to Sprint 11 UI polish.

## Local runbook

```bash
docker compose up -d
npm run db:generate
npm run db:seed
npm run dev
```

Then open:

- `http://localhost:3000/cart`
- `http://localhost:3000/checkout`
- `http://localhost:3000/watchlist`
- `http://localhost:3000/collection/insights`

## Known limitations

- Market values are approximate and intentionally not investment advice.
- Notification delivery is still architecture-only.
- Guest checkout does not create an account automatically.
- The basket is still a single-storefront checkout surface and is not yet shared with mobile parity work.
