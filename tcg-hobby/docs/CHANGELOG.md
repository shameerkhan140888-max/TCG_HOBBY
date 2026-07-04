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
