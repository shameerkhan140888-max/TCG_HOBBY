# Changelog

All notable changes to TCG Hobby are documented here.

## 0.1.0

- Established initial project documentation for the TCG Hobby platform.
- Defined architecture, roadmap, decisions, API conventions, database approach, style guide, and contribution standards.

## Sprint 3

- Hardened the commerce database schema with address and product media support.
- Added seeded catalogue browsing, product detail related objects, and catalogue route UX states.
- Added catalogue filtering, search, sorting, and pagination tests.

## Sprint 4

- Added customer identity helpers, secure credential hashing, and Auth.js-compatible Prisma models for sessions and accounts.
- Built storefront login, registration, account overview, profile, and wishlist screens with protected customer routing.
- Added wishlist persistence, toggle actions, product-card wishlist actions, and account wishlist management.
- Documented the seeded customer credentials and local auth runbook.

## Sprint 5

- Added cart persistence, quantity validation, and stock-aware cart updates for signed-in customers.
- Built storefront cart and checkout screens with shipping method selection and Stripe test-mode payment handoff.
- Added order creation, confirmation, and customer order history pages.
- Introduced inventory reservation and stock decrement logic so checkout remains inventory-safe.
- Documented checkout setup, Stripe local runbook, order lifecycle notes, and ADRs for the commerce flow.

## Sprint 6

- Turned the admin shell into an operations console with dashboard metrics, product management, inventory controls, supplier management, and read-only order views.
- Added reusable admin UI primitives for metric cards, tables, search, page headers, form sections, and empty states.
- Added stock adjustment history, margin calculations, slug generation, and admin repository coverage.
- Documented the admin operations architecture, inventory philosophy, supplier relationships, and future media strategy.

## Sprint 7

- Added a reusable pricing engine with integer-only calculations, manual overrides, and rule-based snapshots.
- Built the customer buylist flow with search, draft management, submission, and estimated payout summaries.
- Added admin buylist review screens for workflow status, notes, payout adjustments, and payment tracking.
- Expanded the shared UI package with pricing badges, money inputs, buylist status badges, and pricing cards.
- Added pricing and buylist repository coverage plus local runbook and ADR documentation.

## Sprint 8

- Added the collection manager domain with owned quantities, print variants, foil and language tracking, and collection dashboard metrics.
- Built the deck builder with deck creation, rename/edit controls, card counts, duplicate limits, and collection gap warnings.
- Expanded the shared UI package with collection and deck cards, statistics, progress bars, and empty states for hobby workflows.
- Seeded starter collection and deck data so the new hobby tools are visible immediately after running the local seed task.
- Added repository coverage for collection math, deck rules, and deck composition calculations.

## Sprint 9

- Added the pre-order and upcoming releases experience with coming soon hub pages, release calendar filters, homepage merchandising, and admin release management.
- Extended the commerce schema so products can carry pre-order state, release timing, allocation controls, and notification subscriptions.
- Added notification foundation so customers can register interest in future releases without sending email yet.
- Expanded the shared UI package with countdown, release card, preorder badge, notify button, announcement banner, and allocation components.
- Added release repository coverage for countdown calculations, allocation warnings, release filters, notification persistence, and pre-order availability behavior.

## Sprint 10

- Added collection insights, approximate market values, watchlists, and notification centre foundations for returning collectors.
- Introduced guest checkout while keeping logged-in order history linked to customer accounts.
- Expanded the commerce domain and storefront checkout flow to support guest baskets without moving checkout behind authentication.
- Deferred the storefront header basket summary to Sprint 11 UI polish.
- Documented the members-only watchlist behavior, guest checkout behavior, and basket UI updates.

## Sprint 11

- Reworked the storefront shell with a cleaner premium header, mobile-friendly menu behavior, search access, and a commercial footer.
- Added storefront SEO and discovery foundations with metadata, robots, sitemap, manifest, and app icon assets.
- Moved Prisma configuration into `prisma.config.ts` and added a real mobile build output so Turbo can track workspace builds correctly.
- Removed the temporary lucide-react workspace package and confirmed the storefront uses local inline SVG icons instead.
- Deferred the header basket summary to launch polish.
