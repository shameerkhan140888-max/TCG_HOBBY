# ADR 0005: Checkout and Payments

## Context

TCG Hobby needs a trustworthy first purchase flow that can reserve inventory, calculate totals, hand off to payments, and confirm orders without introducing unnecessary payment complexity.

## Decision

Use a server-side checkout flow that creates a pending order, reserves inventory, and opens a Stripe hosted checkout session in test mode before finalizing the order after payment confirmation.

## Consequences

- Card handling stays off the storefront and inside Stripe.
- Totals and inventory checks stay on the server.
- The system remains ready for webhooks, refunds, and richer fulfilment later without blocking Sprint 5 delivery.
