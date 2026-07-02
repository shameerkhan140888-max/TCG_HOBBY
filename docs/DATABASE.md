# Database

TCG Hobby uses PostgreSQL with Prisma migrations.

## Core Models

- Users and roles
- Products and catalogue metadata
- Inventory items and reservations
- Suppliers and supplier products
- Wishlists
- Decks and deck cards
- Collection items without value fields
- Orders and order lines
- Buylist offers and buylist lines
- Tournaments and registrations
- Rewards ledger entries
- CMS pages and content blocks

## Money

Money is stored as integer minor units plus currency code. Floating point values must not be used for persisted financial amounts.

## Inventory

Inventory uses explicit `stockOnHand` and `reservedStock` values. Checkout, admin edits, fulfilment, cancellations, and refunds must update stock through auditable operations.

## Collection Manager

Collection records may include product, quantity, condition, acquisition date, and notes. They must not include market value, estimated value, portfolio value, or profit-and-loss fields.

## Live Pricing

Pricing feed data must include provider, permission metadata, retrieval time, and scope. Products must opt in before live prices can be used.
