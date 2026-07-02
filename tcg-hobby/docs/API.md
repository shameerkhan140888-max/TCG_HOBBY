# API

The API is implemented with NestJS and exposes versioned HTTP endpoints under `/v1`.

## Conventions

- JSON request and response bodies.
- ISO 8601 timestamps.
- Minor currency units for money, such as pence for GBP.
- Stable resource identifiers.
- Role-based authorization for admin and staff routes.
- Idempotency keys for payment and order mutation endpoints.

## Initial Resource Areas

- `/v1/catalogue`: products, categories, search, and merchandising data.
- `/v1/accounts`: customer profile and account preferences.
- `/v1/wishlist`: customer wishlist items.
- `/v1/decks`: deck builder records and cards.
- `/v1/collection`: collection manager items without value tracking.
- `/v1/buylist`: buylist submissions and grading outcomes.
- `/v1/tournaments`: events and registrations.
- `/v1/rewards`: rewards balances and ledger entries.
- `/v1/orders`: carts, orders, payments, and fulfilment.
- `/v1/admin`: protected operational workflows.
- `/v1/webhooks/stripe`: verified Stripe webhook receiver.

## Error Shape

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "requestId": "req_123"
  }
}
```
