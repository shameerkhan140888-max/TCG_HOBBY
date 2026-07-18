# Meta Tracking

TCG Hobby uses a consent-aware analytics layer for Meta Pixel and Meta Conversions API.

## Architecture

The storefront integration lives under:

- `apps/storefront/lib/analytics/events.ts`
- `apps/storefront/lib/analytics/consent.ts`
- `apps/storefront/lib/analytics/browser.ts`
- `apps/storefront/lib/analytics/server.ts`
- `apps/storefront/lib/analytics/meta.ts`
- `apps/storefront/components/analytics/meta-analytics.tsx`

Browser components should not call `fbq()` directly. Use the analytics layer so future providers such as GA4 or Google Ads can be added without scattering tracking code through the storefront.

## Environment Variables

Public browser setting:

- `NEXT_PUBLIC_META_PIXEL_ID`

Server-only settings:

- `META_CONVERSIONS_API_ACCESS_TOKEN`
- `META_CONVERSIONS_API_TEST_EVENT_CODE`
- `META_CONVERSIONS_API_ENABLED`

`META_CONVERSIONS_API_ACCESS_TOKEN` and `META_CONVERSIONS_API_TEST_EVENT_CODE` must never be exposed to the browser.

## Consent Behaviour

Meta tracking is blocked until the visitor accepts marketing cookies.

- Reject all: no Meta tracking
- Necessary only: no Meta tracking
- Accept marketing: Meta Pixel can load and track
- Withdrawal or cleared consent: future browser tracking stops

The launch-list marketing email consent remains separate from cookie consent. Joining the mailing list does not automatically consent a visitor to advertising cookies.

## Pixel

`MetaAnalyticsProvider` is mounted once in the storefront root layout.

It:

- waits for marketing cookie consent
- initializes the Pixel once
- tracks `PageView` on initial load
- tracks `PageView` on client-side navigation

Admin does not use the storefront layout and is not tracked.

## Conversions API

The launch signup action creates a Meta event ID only after subscriber persistence succeeds and only when a genuinely new subscriber is created.

For a new launch signup:

1. The subscriber is persisted.
2. A server-side `CompleteRegistration` event is sent through Conversions API with a short timeout before the redirect is returned.
3. The same safe event ID is returned in the redirect URL.
4. If the browser has marketing cookie consent, the global analytics provider reads the redirect URL and the Pixel fires `CompleteRegistration` with the same event ID.

Meta deduplicates the browser `eventID` and server `event_id`.

Duplicates, validation failures, missing consent, honeypot submissions, database failures and rate-limited submissions do not create conversion events.

Meta outages are non-blocking. They must never fail the signup.

## Production Diagnostics

The signup conversion path emits safe structured logs:

- `meta_complete_registration_created`
- `meta_complete_registration_browser_handoff_created`
- `meta_capi_request_attempted`
- `meta_capi_request_succeeded`
- `meta_capi_request_failed`

These logs may include the correlation ID, Meta event name, shared event ID, enabled/configured booleans, HTTP status and sanitized Meta error details. They must never include access tokens, raw email addresses, first names, IP addresses, cookies or full request bodies.

## Customer Data

Only supported, appropriate customer data is sent.

Currently:

- email is SHA-256 hashed server-side for CAPI
- user agent may be sent server-side when available

Do not log raw email, first name, request bodies, API keys or database URLs.

## Test Events

Set `META_CONVERSIONS_API_TEST_EVENT_CODE` only for Meta Events Manager test mode.

The test event code is server-only and is never sent to browser code.

## Future Ecommerce Events

Typed placeholders exist for:

- `trackViewContent()`
- `trackSearch()`
- `trackAddToCart()`
- `trackInitiateCheckout()`
- `trackPurchase()`

These are intentionally not wired to product, cart or checkout flows yet.

## Deployment Checklist

In Vercel Production, configure:

1. `NEXT_PUBLIC_META_PIXEL_ID`
2. `META_CONVERSIONS_API_ACCESS_TOKEN`
3. `META_CONVERSIONS_API_ENABLED=true`
4. Optional during testing: `META_CONVERSIONS_API_TEST_EVENT_CODE`

Deploy the storefront, then verify with Meta Events Manager.

## Meta Events Manager QA

Use Meta Events Manager to confirm:

- Pixel detected
- `PageView` appears after accepting marketing cookies
- no `PageView` before accepting marketing cookies
- `CompleteRegistration` appears only after a real new launch signup
- browser event includes an event ID
- server event includes the same event ID
- event is deduplicated
- duplicate signups do not create another conversion

## Troubleshooting

If Pixel is not detected:

- confirm `NEXT_PUBLIC_META_PIXEL_ID` is configured
- accept marketing cookies in the browser
- check browser network requests for `fbevents.js`

If CAPI is not sending:

- confirm `META_CONVERSIONS_API_ENABLED=true`
- confirm `META_CONVERSIONS_API_ACCESS_TOKEN` is present in Vercel Production
- confirm the Pixel ID matches the Events Manager data source
- check server logs for `meta_capi_request_attempted` and either `meta_capi_request_succeeded` or `meta_capi_request_failed`
- if no CAPI attempt log appears, confirm the signup was a genuinely new eligible subscriber and not a privacy-safe duplicate

If conversions duplicate:

- verify the browser `eventID` and server `event_id` match exactly
- confirm duplicate signup responses do not include `metaEventId`
