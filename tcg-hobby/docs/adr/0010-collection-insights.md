# ADR 0010: Collection Insights

## Context

TCG Hobby needed a stronger reason for collectors to return between purchases. A collection insights surface gives customers a reason to review their owned cards, watch approximate value movement, and stay engaged with the platform.

## Decision

We will add a collection insights layer that uses approximate market values, collection health indicators, and watchlist-style summaries without turning the product into an investment tool.

The implementation will:

- keep market valuation behind a clean provider abstraction
- store approximate values in integer minor units
- keep valuation separate from collection ownership data
- surface a clear disclaimer that values are approximate
- leave room for future analytics, trend feeds, and notification delivery

## Consequences

- Customers get a premium collector dashboard that encourages repeat visits.
- The domain can evolve toward richer analytics without rewrites.
- The platform avoids making investment promises or implying guaranteed returns.
- Future market integrations can plug into the provider abstraction instead of changing every screen.
