# Decisions

## ADR-001: Use Turborepo

Turborepo coordinates builds, tests, linting, and shared package dependencies across web, API, admin, mobile, database, and UI workspaces.

## ADR-002: Keep Domain Logic Framework-Free

Business rules live in `packages/domain` so they can be reused by API, admin, storefront, and mobile without coupling core policy to any delivery framework.

## ADR-003: Use PostgreSQL and Prisma

PostgreSQL provides reliable relational modelling for commerce and operations. Prisma supplies type-safe persistence access and migration management.

## ADR-004: Use Auth.js for Web Authentication

Auth.js is the authentication boundary for customer and staff web sessions. API authorization must validate the resulting identity and role claims.

## ADR-005: Use Stripe for Payments

Stripe is the payment provider for checkout and payment lifecycle events. Order state changes caused by payment events must be driven by verified webhooks.

## ADR-006: Exclude Value Tracking from Collection Manager

The collection manager records ownership, quantities, conditions, and notes. It does not calculate or display collection value.

## ADR-007: Gate Live Pricing by Permission

Live pricing is allowed only for providers, products, and regions where usage is contractually permitted.
