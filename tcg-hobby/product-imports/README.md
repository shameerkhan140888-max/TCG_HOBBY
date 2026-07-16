# Product Imports

This folder contains manually approved product import packages.

Each product uses:

```text
product-imports/{game}/{product-slug}/
├── product.json
├── media.json
└── images/
    ├── 01-primary.webp
    ├── 02-gallery-name.webp
    └── ...
```

Run from the repository root:

```bash
npm run product:validate -- --path product-imports/pokemon/example-product
npm run product:dry-run -- --path product-imports/pokemon/example-product
npm run product:import -- --path product-imports/pokemon/example-product
npm run product:import:all
```

Products should normally import as `DRAFT`, then be reviewed and published through Admin.
Use `PUBLISHED` only for products that have already completed review. Most imports should remain `DRAFT`, `AWAITING_REVIEW` or `READY_TO_PUBLISH` until Admin publishes them.

Images must be business-owner supplied, TCG Hobby photography, authorised distributor media or authorised manufacturer retailer media. The importer does not scrape websites or invent product details.
