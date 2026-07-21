# Public Commerce API

The reusable public commerce API lives in `apps/api` and is versioned under `/v1`. It serves mobile and future public clients; it is not a mobile-specific backend.

## Authority

The API calls `@tcg-hobby/database` repositories for catalogue visibility, prices, VAT-inclusive totals, inventory, purchase limits, shipping, carts, checkout and orders. Public responses never include exact stock quantities, supplier details, costs or internal merchandising fields.

## Endpoints

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/health` | None | Service health |
| GET | `/v1/home` | None | Featured, latest and category discovery |
| GET | `/v1/catalogue` | None | Search, filters, sorting and pagination |
| GET | `/v1/catalogue/filters` | None | Controlled catalogue options |
| GET | `/v1/catalogue/:slug` | None | Public product detail |
| POST | `/v1/basket/resolve` | Optional | Reconcile guest input or return member basket |
| POST | `/v1/basket/items` | Bearer | Add a member basket item |
| PATCH | `/v1/basket/items/:productId` | Bearer | Update member quantity |
| DELETE | `/v1/basket/items/:productId` | Bearer | Remove member item |
| DELETE | `/v1/basket/items` | Bearer | Clear member basket |
| GET | `/v1/shipping-methods?country=GB` | None | Available shipping methods |
| POST | `/v1/checkout/session` | Optional | Validate basket/address and create hosted checkout |
| POST | `/v1/auth/login` | None | Existing customer identity login |
| POST | `/v1/auth/register` | None | Existing customer identity registration |
| POST | `/v1/auth/logout` | Bearer | Revoke session |
| GET | `/v1/account` | Bearer | Customer summary |
| PATCH | `/v1/account/profile` | Bearer | Update customer name |
| GET | `/v1/orders` | Bearer | Customer order history |
| GET | `/v1/orders/:orderNumber` | Bearer | Customer-owned order detail |

## Authentication

The API reuses the existing `User` and `Session` identity tables and `@tcg-hobby/auth` password/session utilities. It issues an opaque bearer session token with the existing expiry policy. It does not create a parallel mobile identity.

## Errors

Errors use a safe JSON envelope:

```json
{ "code": "VALIDATION", "message": "Customer-safe message" }
```

Codes are `UNAUTHORISED`, `VALIDATION`, `NOT_FOUND`, `CONFLICT` and `SERVER`. Network and timeout errors are client-side codes. Raw Prisma errors are not returned.

## Local Device Access

The API listens on `0.0.0.0:4000`. A physical device must use the development machine's LAN address, not `localhost`. Keep server secrets in root environment files; never place them in `EXPO_PUBLIC_*` variables.
