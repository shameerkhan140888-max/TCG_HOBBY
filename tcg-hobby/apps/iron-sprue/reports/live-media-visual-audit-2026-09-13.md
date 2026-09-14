# Iron Sprue Live Media Visual Audit

Generated: 2026-09-13T22:42:58.518Z

Live API: https://considerate-unity-production-b734.up.railway.app
Storefront renderer checked: https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev

## Scope

- Live displayed product-card images from the Railway catalogue API.
- Approved Image 2 / `catalogue-primary` rows.
- Approved workshop photography rows.
- Approved manufacturer-original rows that are eligible for gallery display or fallback.
- Burj Khalifa / `IS-CUB-MC133H` called out separately because the live page shows a narrow Image 2 and a drawer-like manufacturer image.

## Summary

| Metric | Value |
| --- | --- |
| Products in local audit database | 81 |
| Live catalogue products returned | 59 |
| Displayed products audited | 59 |
| Live primary Image 2 cards | 52 |
| Live primary manufacturer-original cards | 2 |
| Live gallery Image 2 entries | 52 |
| Live gallery workshop entries | 47 |
| Live gallery manufacturer-original entries | 54 |
| Primary card images with flags | 28 |
| Severe card letterboxing | 1 |
| Visible card letterboxing | 21 |
| Low-resolution primary images | 2 |
| Cards using manufacturer-original as primary | 2 |

## Display Rules Confirmed

- Product cards use the live catalogue primary image inside a white frame with `object-fit: contain` and an aspect ratio of `1 / 0.88`.
- Product detail galleries use a square white frame with `object-fit: contain`.
- Tall, narrow Image 2 sources therefore render as small/narrow objects with large white space. They are not cropped into a fuller product image by the storefront.
- The live catalogue should prefer an approved primary `catalogue-primary` Image 2. Approved manufacturer-original media can still appear in the gallery, and can become the card primary where the single-source fallback permits it.
- The live source of truth for this report is the Railway API. The local `.env.local` database available to this task did not contain the full 59-product live published set, so database approval-state counts are shown separately and not treated as the live catalogue count.

## Highest Priority Card Image Flags

| SKU | Product | Primary role | Dimensions | Card fill | Gallery fill | Flags |
| --- | --- | --- | --- | --- | --- | --- |
| IS-TAS-11MMHOBBYKNIFE | 11mm Hobby Knife | manufacturer-original | 345x1000 | 30% | 35% | low-source-resolution, severe-card-letterboxing, severe-gallery-letterboxing, portrait/tall-source |
| IS-PIN-S1025 | 3D Jigsaw Vase - Magpies on a Plum Tree | catalogue-primary | 1024x1536 | 59% | 67% | visible-card-letterboxing |
| IS-CUB-MC133H | Burj Khalifa | catalogue-primary | 1024x1536 | 59% | 67% | visible-card-letterboxing |
| IS-PIN-Q1035 | Jigsaw Screen - Famous Architectures | catalogue-primary | 1732x908 | 60% | 52% | heavy-source-file, visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-PIN-Q1061 | Jigsaw Screen - Le Papillon et la Fleur | catalogue-primary | 1731x908 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-AOS-06437 | Back to the Future Part II | catalogue-primary | 1731x909 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-CUB-MC139H | Chateau de Chenonceau | catalogue-primary | 1731x909 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-AOS-06290 | Honda Motocompo | catalogue-primary | 1731x909 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-PIN-Q1037 | Jigsaw Lantern - Famous Architecture | catalogue-primary | 1730x909 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-CUB-OM3603 | Magic Box  Underwater World | catalogue-primary | 1731x909 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-CUB-C114H | St Patrick's Cathedral | catalogue-primary | 1731x909 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-CUB-MC092H | St Peter's Basilica | catalogue-primary | 1730x909 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-AOS-05778 | Suzuki Jimny Blue | catalogue-primary | 1731x909 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing, wide-source |
| IS-AOS-06347 | Lamborghini Aventador Red | catalogue-primary | 1729x910 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing |
| IS-AOS-06438 | Back to the Future Part III | catalogue-primary | 1729x910 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing |
| IS-AOS-06349 | Lamborghini Aventador Blue | catalogue-primary | 1729x910 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing |
| IS-AOS-06459 | Toyota GR86 Spark Red | catalogue-primary | 1728x910 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing |
| IS-AOS-06460 | Toyota GR86 White Pearl | catalogue-primary | 1728x910 | 60% | 53% | visible-card-letterboxing, visible-gallery-letterboxing |

## Burj Khalifa Focus

| Field | Value |
| --- | --- |
| SKU | IS-CUB-MC133H |
| Slug | cubicfun-mc133h-burj-khalifa |
| Title | Burj Khalifa |
| Live card image role | catalogue-primary |
| Live card image dimensions | 1024x1536 |
| Live card fill | 59% |
| Primary flags | visible-card-letterboxing |

### Burj Approved Gallery Assets

| Role | Dimensions | Card fill | Gallery fill | Storage key | Flags |
| --- | --- | --- | --- | --- | --- |
| catalogue-primary | 1024x1536 | 59% | 67% | n/a | visible-card-letterboxing |
| workshop-photography | 1536x1024 | 76% | 67% | n/a | none |
| manufacturer-original | 259x259 | 88% | 100% | n/a | low-source-resolution |

Burj diagnosis: the Image 2 row is a portrait/tall source, so the current `object-fit: contain` treatment shows the tower as a narrow object rather than filling the frame. The drawer/chest visual is present as an approved manufacturer-original gallery asset for this SKU; because manufacturer originals are included after workshop assets, it is being displayed on the product gallery even though it does not visually match Burj Khalifa.

## Contact Sheets

- Live card image flags: C:\Users\Shameer\Documents\Codex\2026-07-02\you-are-the-lead-software-engineer\tcg-hobby\apps\iron-sprue\reports\live-card-image-contact-sheet-2026-09-13.png
- Burj Khalifa approved gallery assets: C:\Users\Shameer\Documents\Codex\2026-07-02\you-are-the-lead-software-engineer\tcg-hobby\apps\iron-sprue\reports\burj-khalifa-media-contact-sheet-2026-09-13.png

## Audit Data

Full JSON: C:\Users\Shameer\Documents\Codex\2026-07-02\you-are-the-lead-software-engineer\tcg-hobby\apps\iron-sprue\data\live-media-visual-audit-2026-09-13.json

## Recommended Remediation Queue

1. Replace or reprocess severe portrait Image 2 assets into a consistent canvas before approval/publication, especially Burj Khalifa.
2. Quarantine manufacturer-original images that are packaging/source references or mismatched source media from public galleries unless explicitly approved as customer-facing.
3. For Burj Khalifa, remove or reject the drawer/chest manufacturer-original row and upload the correct manufacturer source/package image.
4. Add a publication/admin warning for card fill below 70% and a blocking warning below 55% for Image 2 approvals.
