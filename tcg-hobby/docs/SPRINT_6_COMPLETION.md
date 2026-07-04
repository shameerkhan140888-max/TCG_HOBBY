# Sprint 6 Completion Notes

Sprint 6 turns the admin shell into the first operational control center for TCG Hobby.

## What Shipped

- Admin dashboard metrics for products, inventory, suppliers, categories, orders, and customers.
- Product management routes for listing, creating, editing, archiving, publishing, and unpublishing products.
- Inventory management with stock visibility, manual adjustments, and adjustment history.
- Supplier management with contact, address, preferred status, notes, and product relationships.
- Read-only order management with search and order detail views.
- Shared admin UI primitives for tables, metric cards, search, headers, status badges, and empty states.
- Repository and service coverage for slug generation, margin calculations, stock adjustment, product listing, inventory calculations, and supplier lookup.

## Admin Architecture

- Pages stay thin and defer business logic to `packages/database` repository functions and `apps/admin/lib` server actions.
- Admin forms use shared state objects and server-side mutation handlers.
- Product, inventory, supplier, and order screens read the same domain helpers used by the rest of the platform, which keeps the admin view aligned with storefront reality.

## Inventory Philosophy

- Stock is treated as an operational number, not a pricing signal.
- Current stock, reserved stock, available stock, and reorder point are all visible.
- Manual adjustments require a reason and are recorded as history.
- Multi-warehouse, barcode scanning, and automation are intentionally deferred.

## Supplier Relationships

- Suppliers hold contact and address details plus preferred-supplier flags.
- Product supply is modeled as a first-class relationship so one product can be linked to a supplier record now and expanded later.
- Internal notes are kept inside the admin surface only.

## Future Media Strategy

- Product images are represented through an abstraction that can later point to uploads, galleries, and CDN-backed media.
- The sprint uses placeholder media references only.
- Cloud storage and asset pipelines are intentionally left for a later sprint.

## Local Runbook

```bash
docker compose up -d
npm run db:generate
npm run db:seed
npm run dev -w @tcg-hobby/admin
```

Then open:

- `http://localhost:3001/admin`
- `http://localhost:3001/admin/products`
- `http://localhost:3001/admin/inventory`
- `http://localhost:3001/admin/suppliers`
- `http://localhost:3001/admin/orders`

## Known Limitations

- No buylist, pricing engine, barcode scanning, or multi-warehouse support.
- No admin editing for orders yet.
- No cloud media upload pipeline yet.
- No wholesale workflows yet.
