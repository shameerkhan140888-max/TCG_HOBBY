# Iron Sprue Launch App

Iron Sprue is the first production-target storefront for the shared hybrid architecture.

This app is intentionally distinct from the TCG Hobby storefront. It owns the Iron Sprue presentation layer, protected staging gate and product merchandising language. Transaction-dependent customer and commerce mutations must be handled by the shared Node/Nest API.

## Protected Staging

Set `STOREFRONT_ACCESS_MODE=protected` to enable the site-wide gate. Configure:

- `IRON_SPRUE_STAGING_PASSWORD_SHA256` or `IRON_SPRUE_STAGING_PASSWORD`
- `IRON_SPRUE_STAGING_ACCESS_SECRET`

Use `STOREFRONT_ACCESS_MODE=public` only after explicit launch approval. This setting does not switch Stripe, Resend or any provider into live mode.

## Catalogue Import

The real purchase-order source is not present in the repository yet. Do not invent launch SKUs. Use `lib/launch-catalogue-import.ts` as the validation contract when the approved PO export is supplied.
