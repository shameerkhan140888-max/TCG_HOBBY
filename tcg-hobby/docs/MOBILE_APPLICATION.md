# TCG Hobby Mobile Application

## Architecture

`apps/mobile/App.tsx` composes safe-area, status bar, fatal-error protection, authentication, basket state, connectivity status and React Navigation. Screens and domain state live in `apps/mobile/src`; the mobile app never imports Prisma or database repositories.

Navigation:

- Root stack: main tabs, product, login, registration, checkout, profile, orders and order detail.
- Main tabs: Home, Catalogue, Basket and Account.

The typed API client is `src/api.ts`. Public environment validation is in `src/config.ts`. Shared public contracts are in `@tcg-hobby/types`.

## Local Setup

Run the API and Expo in separate terminals:

```powershell
npm run dev -w @tcg-hobby/api
npm run dev:mobile
```

For a physical phone, both devices must be on the same Wi-Fi network and Windows Firewall must permit Node on the private network. Expo derives the API host from Metro in development. Explicit public overrides are supported:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='http://192.168.0.85:4000'
$env:EXPO_PUBLIC_STOREFRONT_URL='http://192.168.0.85:3000'
npm run dev:mobile
```

Only origins belong in these variables. Do not expose database URLs, Stripe secrets, auth secrets or API credentials.

## Identity

Login and registration use the existing TCG Hobby customer identity through `/v1/auth/*`. The opaque session token is stored in Expo SecureStore, restored on startup, validated against `/v1/account`, removed on expiry/unauthorised startup, and revoked on logout. Passwords are never persisted by mobile.

## Basket

Guest basket input contains only product IDs and requested quantities in AsyncStorage. Every load and mutation is reconciled with the server, which returns canonical prices, availability, limits and totals. Member baskets use the existing account cart. Guest-to-member merging is intentionally not invented in Sprint 13: signing in shows the member basket, and the preserved guest basket becomes available again after logout.

## Checkout

Mobile collects delivery details, asks the API to create an existing hosted Stripe checkout session, validates the returned destination, then opens it with Expo WebBrowser. No payment data or Stripe secret is handled by the app. Browser dismissal returns to the basket and triggers server reconciliation; opening a browser is not treated as proof of payment.

## Data States

Home, catalogue, product, basket and order flows include loading, empty, recoverable error and retry states. NetInfo displays an offline banner. Product images preserve aspect ratio and use the branded placeholder when no canonical image is returned.

## Validation

```powershell
npm run typecheck -w @tcg-hobby/mobile
npm run test -w @tcg-hobby/mobile
npm run build -w @tcg-hobby/mobile
cd apps/mobile
npx expo-doctor
npx expo export --platform ios --output-dir $env:TEMP\tcg-hobby-mobile-export
```

## Known Sprint 13 Limits

- No collection manager, deck builder, buylist or release-notification management.
- No push notifications, biometrics, social login or native card collection.
- No guest-to-member cart merge until the backend defines that policy.
- Analytics is a typed no-op interface only; no tracking or personal data collection is enabled.
