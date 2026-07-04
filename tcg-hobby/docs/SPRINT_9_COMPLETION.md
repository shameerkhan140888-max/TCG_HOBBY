# Sprint 9 Completion

Sprint 9 introduced the pre-order and upcoming releases platform for TCG Hobby.

## What Changed

- Added the `/coming-soon` hub for featured releases, trending upcoming products, release timing, and announcement banners.
- Added the `/releases` calendar with search, game, brand, category, and month filtering.
- Extended product data so the storefront can show pre-order, coming soon, release countdown, allocation warnings, and availability messaging.
- Added customer notification subscriptions with `/account/notifications` for interest tracking without email sending.
- Added admin release management at `/admin/releases`, `/admin/releases/new`, and `/admin/releases/[id]`.
- Expanded the shared UI package with countdown and release merchandising components.
- Added database models and indexes for releases, release products, and notification subscriptions.

## Customer Experience

- Customers can discover upcoming launches before products go live.
- Pre-order and coming soon merchandise is displayed with strong visual hierarchy and premium dark-theme treatment.
- Interested customers can register for notifications and manage subscription preferences later from their account area.

## Operational Experience

- Staff can create and edit releases, attach products, control allocation messaging, and feature launches on the homepage.
- Release data is seeded for local development so the whole experience is visible immediately after seeding.

## Known Limitations

- No email delivery exists yet.
- No supplier API or release webhook integration is present.
- No valuation, live pricing, OCR, barcode scanning, or mobile parity work was added in this sprint.

