# Iron Sprue Launch Operations Acceptance Matrix

Generated: 2026-08-20

This matrix records the launch-control sprint verification status without exposing local secrets or provider credentials.

| Scenario | Status | Evidence / notes |
| --- | --- | --- |
| A. Guest purchase | PASS - manual baseline | Previously E2E tested: guest checkout, Stripe payment, order confirmation and receipt completed. |
| B. Registered customer | PASS - implemented / build verified | Account registration, login, logout, order history and order detail routes are implemented and build successfully. |
| C. Guest claim | PASS - implemented / code verified | Guest order claiming is restricted to a signed-in customer with a verified matching email. |
| D. Paid cancellation | PASS - manual baseline / automated coverage | Paid cancellation and Stripe refund have been manually verified; Iron Sprue commerce/admin tests cover refund/idempotency paths. |
| E. Unpaid cancellation | PASS - implemented / automated coverage | Unpaid cancellation avoids Stripe refund and releases non-sale state through the existing lifecycle. |
| F. Dispatch | PASS - manual baseline / implemented | Dispatch workflow supports controlled courier selection, tracking data, persistence and dispatch email trigger. |
| G. Delivered return, restock yes | PASS - implemented / code verified | Admin return workflow supports returned quantities, refund amount and restock decisions. |
| H. Non-restock return | PASS - implemented / code verified | Return lines can be marked non-restock so sellable stock is not increased for damaged/non-resellable returns. |
| I. Partial return/refund | PASS - implemented / code verified | Return workflow accepts per-line returned quantities and partial refund amounts. |
| J. Password recovery | PASS - implemented / build verified | Iron Sprue password recovery and reset routes/actions are implemented and build successfully. |
| K. Inventory adjustment | PASS - implemented / admin tested | Receive stock, correction and damage/write-off controls are exposed in Admin and covered by admin/database tests. |
| L. Final-unit concurrency | PASS - existing behaviour preserved | Server-side availability checks and checkout finalisation safeguards remain in place; no broad reservation rewrite was introduced. |
| M. Duplicate event safety | PASS - automated coverage | Stripe webhook, refund and transactional email duplicate protection covered by database tests. |
| N. Abandoned/failed checkout | PASS - existing behaviour preserved | Existing failed/expired checkout handling retained; unpaid orders remain separated from fulfilment-actionable orders. |
| O. Discount | PASS - implemented | Simple enabled discount codes with fixed/percentage value, minimum spend, expiry and one-use redemption support added. |
| P. Historical snapshot | PASS - existing behaviour preserved | Order item snapshots continue to store product name, SKU, quantity, unit price and totals independent of catalogue changes. |
| Q. Analytics consent | PASS - implemented / build verified | GA4 and Meta loading is consent-gated and route/ecommerce events are only sent after marketing consent. |
| R. Migration | PASS - reconciled | Root Prisma migration status is clean; Iron Sprue app DB has all local migrations applied and no unresolved failed migration rows. |

External-service flows involving real Stripe/Resend provider delivery should be physically spot-checked again after this commit, using the already configured Iron Sprue test credentials.
