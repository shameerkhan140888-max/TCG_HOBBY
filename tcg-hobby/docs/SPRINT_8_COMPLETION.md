# Sprint 8 Completion Notes

Sprint 8 adds the first engagement tools beyond commerce:

- Collection Manager for authenticated customers
- Deck Builder for authenticated customers
- Shared hobby UI primitives for collection and deck screens
- Prisma models and seed data for collections, collection items, decks, and deck cards
- Repository coverage for collection math and deck validation

## What ships

- `/collection`
- `/collection/import`
- `/customer/collection`
- `/decks`
- `/decks/new`
- `/decks/[id]`

## Collection philosophy

The collection experience tracks ownership and hobby metadata without attempting to calculate value. That keeps the tool useful for collectors, avoids false precision, and leaves room for a separate valuation system later.

## Deck architecture

Decks store a reusable list of cards with size and duplicate limits. The structure is intentionally generic so future game-specific legality rules can be layered in without rewriting the persistence model.

## Known limitations

- No legality engine yet.
- No deck sharing or public publishing workflow.
- No OCR, barcode scanning, or image recognition.
- No valuation or market pricing for owned collection items.
- No mobile parity yet.
