# Capital Hobby Group Technical Namespace

This repository uses Capital Hobby Group as the parent technical namespace, with Iron Sprue and TCG Hobby as child brands.

## Workspace Package Convention

Shared and application packages use the `@capital-hobby/*` npm workspace scope. TCG Hobby remains a child-brand application at `apps/tcg-hobby` and package `@capital-hobby/tcg-hobby`.

## Production Architecture

- Customer storefront: Cloudflare Iron Sprue storefront -> Railway API -> Railway PostgreSQL.
- Media: Cloudflare R2, served through the configured Iron Sprue media domain.
- Staff admin: Vercel-hosted Iron Sprue admin -> guarded Railway-backed admin data path.

Iron Sprue production must not depend on Neon, localhost, or a developer Railway tunnel. TCG Hobby-specific settings remain valid only where they describe the TCG Hobby child brand.

## Platform Inventory

| System | Current identifier | Classification | Migration decision |
| --- | --- | --- | --- |
| npm workspaces | `@tcg-hobby/*` | Incorrect parent/platform namespace | Migrated to `@capital-hobby/*`. |
| GitHub repository | `shameerkhan140888-max/TCG_HOBBY` | Coordinated platform identifier | Retained temporarily. Rename requires GitHub repository rename plus Vercel, Railway and Cloudflare Git-link verification. |
| Local repository subdirectory | `tcg-hobby/` | Coordinated path identifier | Retained temporarily. CI and platform build roots currently depend on this directory. |
| Vercel Iron Sprue admin project | `iron-sprue-admin` | Brand-specific deployment | Retained. |
| Vercel TCG Hobby project | `tcg-hobby` | Child-brand deployment | Retained. |
| Railway project/service URL | `sublime-stillness` / `considerate-unity` | Stable deployment identifiers | Retained to avoid unnecessary API URL churn before launch. |
| Cloudflare Iron Sprue Worker/R2 | `iron-sprue-storefront-staging` / `iron-sprue-product-media` | Brand-specific deployment/media identifiers | Retained. |
| Cloudflare TCG Hobby Worker/R2 | `tcg-hobby-*` | Child-brand resources | Retained. |

## Environment Naming

Shared CHG configuration should use `CHG_*` names. Existing brand-specific variables remain `IRON_SPRUE_*` or `TCG_HOBBY_*`.

The Iron Sprue Cloudflare build now uses `CHG_CLOUDFLARE_UNOPTIMIZED_IMAGES` and backfills the former `TCG_HOBBY_CLOUDFLARE_UNOPTIMIZED_IMAGES` process variable during the build as a compatibility alias.

## Deferred Hard Items

These items require a separate coordinated platform migration:

- Rename the GitHub repository slug from `TCG_HOBBY` to `capital-hobby-group`.
- Rename the physical repo subdirectory from `tcg-hobby/` after CI and platform build roots are updated together.
- Re-point Vercel, Railway and Cloudflare Git integrations after any GitHub slug/path rename.
- Remove compatibility aliases only after all platform deployments have used the CHG names successfully.
