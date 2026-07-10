# Brand Asset Guidelines

## Canonical Source

The approved production brand master assets live in:

- `assets/brand/master/tcg-hobby-horizontal.svg`
- `assets/brand/master/tcg-hobby-horizontal.png`
- `assets/brand/master/tcg-hobby-icon.svg`
- `assets/brand/master/tcg-hobby-icon.png`

These files are the canonical source for TCG Hobby branding. Do not recreate, retrace, rasterise, recolour, resize, optimise, or otherwise modify these supplied master assets.

## Runtime Copies

Runtime copies are published from the master assets into:

- `apps/storefront/public/brand/`
- `apps/admin/public/brand/`

Contributors must never edit runtime copies directly. If a runtime copy needs to be refreshed, copy the corresponding file from `assets/brand/master/` without modifying it.

## Usage

- Use `tcg-hobby-horizontal` for headers, footers, login surfaces, social metadata, and other horizontal brand placements.
- Use `tcg-hobby-icon` for favicons, app icons, generated icon routes, and compact icon-only placements.
- Do not introduce alternate wordmarks, wrapper SVGs, temporary text branding, or generated derivatives unless a future approved production master is added to `assets/brand/master/`.
