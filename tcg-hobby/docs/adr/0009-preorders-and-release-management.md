# ADR 0009: Pre-orders and Release Management

## Context

TCG Hobby needed a way to generate repeat visits before products launch. Pre-orders, release countdowns, and upcoming launch discovery are a natural fit for the business, but they need to be structured so they can evolve into richer launch operations later.

## Decision

We will model releases as a first-class domain rather than treating them as a product tag.

The release model will own:

- release timing
- pre-order state
- allocation limits
- announcement text
- customer notification subscriptions
- release calendars and merchandising surfaces

Products will retain release metadata so the storefront can surface countdowns and availability messaging without duplicating business logic.

Notification interest will be stored locally but no email delivery will be sent yet.

## Consequences

- The storefront can feel intentionally built around launches instead of adding another generic category.
- Admin staff can manage release metadata without mutating unrelated catalogue workflows.
- The data model stays flexible enough for future improvements such as email orchestration, supplier integration, and launch automation.
- Customers gain a strong reason to return weekly, even before products are available to buy.

