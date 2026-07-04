# ADR 0008: Collection Manager

## Context

TCG Hobby has commerce, auth, cart, checkout, orders, pricing, buylist, and admin operations in place. The next retention layer is a collection tool that lets customers track what they own without drifting into live valuation or marketplace pricing.

## Decision

We will model collection ownership separately from the catalogue and store:

- owned quantity
- print variant
- condition
- foil flag
- language
- notes
- acquisition date
- optional purchase price

Decks will be stored as separate aggregates with card counts and duplicate limits, but without legality enforcement in this sprint. The UI will present collection and deck data as premium hobby tools, not CRUD tables.

## Consequences

- Collection data is flexible enough for future grading and valuation work, but does not calculate value today.
- Decks can evolve toward game-specific legality rules without changing the base data model.
- The feature set increases retention and repeat visits by giving customers a reason to use TCG Hobby between purchases.
- Future work can add legality, sharing, valuation, and image-based collection tools without breaking the current design.
