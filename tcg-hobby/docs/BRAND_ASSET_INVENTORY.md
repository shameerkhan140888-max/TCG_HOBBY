# Brand Asset Inventory

Canonical source:
- `assets/brand/master/`

The approved runtime brand folders are:
- `apps/storefront/public/brand/`
- `apps/admin/public/brand/`

Legacy assets have been moved out of runtime and into `docs/archive/brand-legacy/`.

| Filename | Path | Dimensions | Usage | Status |
| --- | --- | --- | --- | --- |
| `tcg-hobby-horizontal.svg` | `assets/brand/master/tcg-hobby-horizontal.svg` | Supplied master | Canonical horizontal vector logo | Approved master |
| `tcg-hobby-horizontal.png` | `assets/brand/master/tcg-hobby-horizontal.png` | Supplied master | Canonical horizontal bitmap logo | Approved master |
| `tcg-hobby-icon.svg` | `assets/brand/master/tcg-hobby-icon.svg` | Supplied master | Canonical icon vector logo | Approved master |
| `tcg-hobby-icon.png` | `assets/brand/master/tcg-hobby-icon.png` | Supplied master | Canonical icon bitmap logo | Approved master |
| `tcg-hobby-horizontal.svg` | `apps/storefront/public/brand/tcg-hobby-horizontal.svg` | Runtime copy | Storefront horizontal brand placements | Approved runtime copy |
| `tcg-hobby-horizontal.png` | `apps/storefront/public/brand/tcg-hobby-horizontal.png` | Runtime copy | Storefront metadata and horizontal brand placements | Approved runtime copy |
| `tcg-hobby-icon.svg` | `apps/storefront/public/brand/tcg-hobby-icon.svg` | Runtime copy | Storefront favicon and icon placements | Approved runtime copy |
| `tcg-hobby-icon.png` | `apps/storefront/public/brand/tcg-hobby-icon.png` | Runtime copy | Storefront app icons and generated icon routes | Approved runtime copy |
| `tcg-hobby-horizontal.svg` | `apps/admin/public/brand/tcg-hobby-horizontal.svg` | Runtime copy | Admin horizontal brand placements | Approved runtime copy |
| `tcg-hobby-horizontal.png` | `apps/admin/public/brand/tcg-hobby-horizontal.png` | Runtime copy | Admin metadata and horizontal brand placements | Approved runtime copy |
| `tcg-hobby-icon.svg` | `apps/admin/public/brand/tcg-hobby-icon.svg` | Runtime copy | Admin favicon and icon placements | Approved runtime copy |
| `tcg-hobby-icon.png` | `apps/admin/public/brand/tcg-hobby-icon.png` | Runtime copy | Admin app icons and generated icon routes | Approved runtime copy |
| `tcg-hobby-wordmark.storefront.svg` | `docs/archive/brand-legacy/tcg-hobby-wordmark.storefront.svg` | `960x240` | Archived legacy wrapper file | Legacy |
| `tcg-hobby-wordmark.admin.svg` | `docs/archive/brand-legacy/tcg-hobby-wordmark.admin.svg` | `960x240` | Archived legacy wrapper file | Legacy |

## Active code references

- `packages/ui/src/brand-mark.tsx` uses the approved horizontal logo.
- `apps/storefront/components/site-header.tsx` uses `BrandMark`.
- `apps/storefront/app/login/page.tsx` uses `BrandMark`.
- `apps/storefront/app/register/page.tsx` uses `BrandMark`.
- `apps/storefront/components/site-footer.tsx` uses `BrandMark`.
- `apps/storefront/app/layout.tsx` uses the approved horizontal logo in metadata and structured data.
- `apps/storefront/app/icon.tsx` and `apps/storefront/app/apple-icon.tsx` use the approved icon asset.
- `apps/admin/components/admin-shell.tsx` uses `BrandMark`.
- `apps/admin/app/login/page.tsx` uses `BrandMark`.
- `apps/admin/app/layout.tsx` uses the approved icon asset.
- `apps/admin/app/icon.tsx` and `apps/admin/app/apple-icon.tsx` use the approved icon asset.

## Legacy references removed from active UI

- The storefront temporary text-only header logo has been replaced with `BrandMark`.
- The storefront social metadata now uses the approved horizontal PNG instead of the legacy wordmark wrapper.
- Legacy runtime logo names such as `tcg-hobby-logo.png` and root-level derived favicons have been superseded by `tcg-hobby-icon.*` runtime copies.
