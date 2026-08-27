# Iron Sprue Pre-Launch Soft Cleanup

Date: 2026-08-27

This note records the low-risk pre-launch cleanup baseline before the later CHG technical namespace migration and visual pass.

## Canonical Product Content

The Railway-backed Iron Sprue canonical product rows were audited through the explicit guarded admin database target (`IRON_SPRUE_ADMIN_DATABASE_URL`). The cleanup tool scanned 81 products and proposed customer-facing copy cleanup for 43 SKUs.

The approved safe cleanup removed internal provenance/review wording from product copy fields only. It did not add new facts and did not alter stock, price, publication state, media state, orders, fulfilment, Stripe/payment data, or VAT/accounting data.

Cleaned SKUs:

- IS-AOS-05603
- IS-AOS-05627
- IS-AOS-05628
- IS-AOS-05629
- IS-AOS-06259
- IS-AOS-06345
- IS-AOS-06357
- IS-DLM-AC20
- IS-DLM-AC9
- IS-DLM-AD10
- IS-DLM-AD21
- IS-DLM-AD22
- IS-DLM-AD43
- IS-DLM-AD44
- IS-DLM-AD46
- IS-DLM-AD48
- IS-DLM-AD55
- IS-DLM-AD67
- IS-DLM-AD73
- IS-DLM-AD78
- IS-DLM-BD84
- IS-DLM-BD85
- IS-EXP-70240
- IS-OCC-19103
- IS-OCC-19114
- IS-OCC-19115
- IS-OCC-19116
- IS-OCC-19124
- IS-PIN-KC1005
- IS-PIN-Q1038
- IS-PIN-Q1040
- IS-PIN-S1009
- IS-PIN-S1025
- IS-TAS-11MMHOBBYKNIFE
- IS-TAS-CARTON24SNAPKNIFE
- IS-TAS-HD01
- IS-TAS-JP0102
- IS-TAS-JP0106
- IS-TAS-MG04
- IS-TAS-PV05
- IS-TAS-RETRACTABLEBLADES5
- IS-TAS-RETRACTABLEHOBBYKNIFE
- IS-TAS-TW01

Verification:

- Re-read of the same 43 Railway rows matched the approved cleaned output.
- A second full dry-run scanned 81 products and returned 0 changed products.
- No SKUs remained in the safe cleanup queue.

## Artefact Classification

Deleted temporary artefacts:

- One-off secret rotation and Vercel env update scripts.
- One-off Railway/admin DB connectivity probes.
- One-off source-facts, media parity, stock, homepage, and R2 reconciliation probes.
- Temporary JSON/Markdown reports generated during media/content cleanup and source-media audit passes.
- Accidental scratch file `({sku`.

Promoted permanent tooling:

- `scripts/iron-sprue-content-cleanup.ts` is the retained operational content cleanup tool.
- Root script `iron-sprue:content-cleanup` runs that tool.

Safety hardening:

- The cleanup tool now loads the known local env files when run from the workspace.
- It requires `IRON_SPRUE_ADMIN_DATABASE_URL`.
- It clears generic `DATABASE_URL` before connecting so this Iron Sprue cleanup cannot silently use a non-admin or legacy target.
- It continues to refuse Railway production writes unless `--allow-production-write` is supplied.

## Legacy Test Baseline

The known broad database-suite failures were stale test expectations:

- `seed-data.test.ts` expected mojibake `PokÃ©mon` strings while canonical seed data stores `Pokémon`.
- `product-csv-import.test.ts` mocked mojibake master data, causing valid CSV rows and set/game validation to fail against the current accent-normalised lookup path.

The tests were updated to use the correct canonical text while preserving coverage for valid imports and cross-game set rejection.

## Current Architecture

This soft cleanup preserves the current production architecture:

- Cloudflare Iron Sprue storefront to Railway API to Railway PostgreSQL.
- Vercel Iron Sprue admin to the guarded Railway-backed admin data path.
- R2 as the product media store.

Deferred to the later controlled hard cleanup / namespace migration:

- `@capital-hobby/*` package scope changes.
- GitHub repository slug changes.
- Railway, Cloudflare, and Vercel project/service identifiers.
- Coordinated production env variable renames.
