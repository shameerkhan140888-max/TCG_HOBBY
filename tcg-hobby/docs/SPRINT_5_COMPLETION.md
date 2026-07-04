# Sprint 5 Completion Notes

Sprint 5 delivered the first real purchasing flow for TCG Hobby.

## What Shipped

- Customer cart persistence with add, update, remove, clear, and view actions.
- Stock-aware cart updates that prevent ordering beyond available inventory.
- Premium storefront cart and checkout screens in the dark orange design system.
- Shipping method selection for UK Standard, UK Express, and Worldwide Standard.
- Stripe test-mode checkout handoff with server-side payment intent/session tracking.
- Order creation, confirmation, and customer order history pages.
- Order detail pages with payment and fulfilment status visibility.
- Inventory reservation and stock decrement logic tied to successful payment completion.

## Local Runbook

```bash
docker compose up -d
npm run db:generate
npm run db:seed
npm run dev -w @tcg-hobby/storefront
```

Then open:

- `http://localhost:3000/cart`
- `http://localhost:3000/checkout`
- `http://localhost:3000/account/orders`

## Stripe Setup

Add these environment variables for checkout:

- `APP_URL=http://localhost:3000`
- `STRIPE_SECRET_KEY=sk_test_...`

Notes:

- The flow uses Stripe hosted checkout in test mode.
- No webhook listener is required for this sprint.
- Orders are finalized after the storefront confirms the Stripe session is paid.

## Order Lifecycle

1. A signed-in customer starts checkout from the cart.
2. The app validates address, shipping method, cart totals, and stock availability.
3. Inventory is reserved and a pending order is created.
4. Stripe Checkout is created in test mode.
5. After Stripe confirms payment, the order is marked paid and stock is reduced.
6. The customer lands on the success page and can review the order in account history.

## Known Limitations

- No refunds, disputes, or subscription billing.
- No live courier integration yet.
- No real tax/VAT engine yet.
- No guest checkout yet.
- No admin order management yet.
- Reservation expiry is basic and will be hardened later.
