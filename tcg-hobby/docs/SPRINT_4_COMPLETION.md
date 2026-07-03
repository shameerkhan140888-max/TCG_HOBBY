# Sprint 4 Completion Notes

## What Shipped

- Customer registration and login pages at `/login` and `/register`.
- Protected customer account routes at `/account`, `/account/profile`, and `/account/wishlist`.
- Customer profile display and basic name editing.
- Wishlist persistence with add/remove/toggle support.
- Wishlist buttons on catalogue and product cards.
- Dark premium form and account UI using the shared design system.

## Local Runbook

Start the local stack:

```bash
docker compose up -d
npm run db:generate
npm run db:seed
npm run dev -w @tcg-hobby/storefront
```

Then visit:

- `http://localhost:3000/login`
- `http://localhost:3000/register`
- `http://localhost:3000/account`
- `http://localhost:3000/account/wishlist`

## Environment Variables

Current Sprint 4 implementation uses a local credential/session flow and still relies on:

- `DATABASE_URL`
- `NODE_ENV`

For an eventual Auth.js adapter swap, keep these common variables ready:

- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `AUTH_URL` or `NEXTAUTH_URL`
- `DATABASE_URL`

The storefront also honors:

- `TCG_HOBBY_CATALOGUE_DATA_SOURCE=seed` for local seed-backed browsing

## Seeded Credentials

Seeded customer account:

- Email: `sam.customer@tcghobby.test`
- Password: `SamCollector123!`

Seeded staff account:

- Email: `ops@tcghobby.test`
- Password: `OpsDesk123!`

## Test Coverage Added

- Auth validation utilities
- Session/account access policy helpers
- Password hashing and verification
- Wishlist repository behavior
- Existing seeded catalogue coverage

## Known Limitations

- OAuth providers are not wired yet.
- Password reset, MFA, and email verification remain for later sprints.
- Wishlist actions are customer-only and do not yet support guest persistence.
- This sprint keeps checkout, Stripe, deck builder, tournaments, and mobile parity out of scope.
