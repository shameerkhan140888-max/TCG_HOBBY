# Iron Sprue Automated Catalogue Content And Media Pipeline

This document defines the corrected catalogue pipeline for Iron Sprue launch products.

The pipeline must not treat supplier links, downloaded originals, resized files or format conversions as completed storefront media. Technical derivatives are delivery assets only. A publishable product still requires approved catalogue media, including Image 2 as the storefront primary.

## Current Status

As of the latest local audit:

- Launch products: 81
- Physical units: 256
- Source-linked products from the PO/provisional links: 43
- Products still requiring source discovery: 38
- Review-required products: 5
- Published products: 0
- Source originals uploaded to R2: 34
- Technical derivatives uploaded to R2: 510
- True approved Image 2 assets: 0
- True completed-result assets: 0
- True Iron Sprue workshop assets: 0
- Brand logos completed: 0
- Hero assets completed: 0

The audit can be regenerated with:

```powershell
npm run pipeline:audit -w @capital-hobby/iron-sprue
```

The report is written to `apps/iron-sprue/data/catalogue-pipeline-audit.json`.

## State Machine

The launch catalogue pipeline uses explicit product states:

1. `IMPORT_PENDING`
2. `IDENTITY_PENDING`
3. `IDENTITY_CONFIRMED`
4. `RESEARCH_PENDING`
5. `RESEARCH_COMPLETE`
6. `SOURCE_MEDIA_PENDING`
7. `SOURCE_MEDIA_COMPLETE`
8. `CONTENT_GENERATION_PENDING`
9. `CONTENT_GENERATED`
10. `CATALOGUE_MEDIA_PENDING`
11. `CATALOGUE_MEDIA_GENERATED`
12. `MEDIA_VALIDATION_PENDING`
13. `REVIEW_REQUIRED`
14. `READY`
15. `APPROVED`
16. `PUBLISHED`

Any unsafe source URL, low-confidence identity match, missing production provider, failed media validation or workbook verification note must fail closed to `REVIEW_REQUIRED` or remain draft.

## Provider Contracts

The provider interfaces live in `apps/iron-sprue/lib/catalogue-enrichment-pipeline.ts`.

Required provider categories:

- Source discovery: resolves manufacturer and supplier URLs.
- Research: extracts factual product metadata from verified sources.
- Content generation: creates customer copy using only verified fact IDs.
- Source media acquisition: downloads originals and records source, permission basis, checksum and retrieval date.
- Background removal: isolates product subjects for catalogue media.
- Catalogue image generation: creates Image 2 clean primary assets.
- Creative image generation: creates campaign/hero/workshop scenes.
- Media validation: verifies format, dimensions, safety, product identity and suitability.
- Brand asset: resolves approved brand logos.

Production providers are intentionally not hard-coded. Missing providers return `MISSING_CONFIGURATION`, and the product must remain draft or review-required.

## Source Discovery Rules

Use source links in this order:

1. Product links from the PO/provisional supplier source.
2. Authorised supplier product page.
3. Official manufacturer product page.

Verify identity using supplier code, manufacturer reference, title and packaging. Record supplier and manufacturer URLs separately. Do not guess unresolved products.

URL safety requirements:

- HTTPS only.
- No localhost.
- No private, loopback or link-local IP ranges.
- No unauthenticated browser-supplied store target.

## Provenance

Every generated fact, description and asset must carry provenance:

- Source URL.
- Source type: manufacturer, supplier, distributor, physical invoice, packaging, admin override or generated derivative.
- Retrieved date.
- Confidence.
- Checksum where media is downloaded.
- Permission basis.
- Provider metadata and version.

Generated copy must reference verified fact IDs. Copy that introduces unsupported facts must fail validation.

## Media Definitions

Image 1: original manufacturer or authorised supplier reference.

Image 2: clean catalogue primary image. It must be isolated, consistently framed, white or near-white background, and approved for storefront use. It cannot be a simple resize of Image 1.

Image 3: completed product/result image where available and factually accurate.

Image 4: Iron Sprue workshop image using the approved mat, Foamex, bench, lighting and camera treatment.

Image 5+: useful contents, detail or in-use imagery where available.

Gallery order:

1. Image 2
2. Image 3
3. Image 4
4. Supporting images
5. Original reference image

Technical derivatives include desktop, tablet, mobile, thumbnail, WebP, AVIF and fallback formats. They are generated from an approved master and do not themselves make a product publishable.

## Hero Library

Hero images are separate from product gallery images.

Hero artwork should use real stocked products as subjects, remove packaging clutter and original advertising layout, and create a premium Iron Sprue campaign scene. CTA buttons, prices, badges and copy remain HTML/CSS overlays.

Only stocked launch products can be used for hero campaigns.

## Admin Review

Admin must expose reviewable records for:

- Identity match.
- Research facts.
- Generated descriptions.
- Source originals.
- Image 2 candidate.
- Completed-result image.
- Workshop image.
- Brand logo.
- Hero candidate.
- Validation results.
- Provider errors.

Admin approval is required before a product can leave draft/media pending. No product should publish without an approved Image 2 asset unless a documented manual override is recorded.

## Pilot Batch

Run only a representative pilot before any full 81-product creative batch:

- Aoshima
- Deluxe Materials
- Expo/general tools
- OcCre
- Pintoo
- CubicFun

The pilot must be visually reviewed for identity accuracy, Image 2 quality, gallery order, workshop consistency, storefront rendering and brand logo treatment before processing the remaining catalogue.

## Current Blockers

The architecture, audit and tests are now in place, but production automation is not complete until the following providers are configured and proven:

- Research provider.
- Content generation provider.
- Source media acquisition provider.
- Background removal provider.
- Catalogue Image 2 provider.
- Creative hero/workshop provider.
- Media validation provider.
- Brand logo provider.

Until those providers are configured and a visual pilot is approved, all affected products must remain `MEDIA_PENDING`, `CONTENT_PENDING` or `REVIEW_REQUIRED`.

## TCG Isolation

This pipeline is Iron Sprue scoped. It must use Iron Sprue products, Iron Sprue Neon configuration and the `iron-sprue-product-media` R2 bucket only. It must not alter TCG Hobby catalogue, media, checkout, email or admin behaviour.
