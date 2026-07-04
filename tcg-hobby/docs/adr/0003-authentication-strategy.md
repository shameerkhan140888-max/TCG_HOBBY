# ADR 0003: Authentication Strategy

## Context

Customers need secure sign-in, profile access, wishlist persistence, and checkout identity without pulling authentication concerns into UI components.

## Decision

Use Auth.js-compatible session handling with Prisma-backed persistence, credentials-based local login and registration, and server-side route protection for customer areas.

## Consequences

- Authentication logic remains on the server.
- Customer routes can enforce access consistently.
- Future OAuth providers can be added without changing the customer UI contract.
