# Admin Product Media and Assisted Content

## Overview

The Admin product editor uses the canonical `Product`, `ProductImage`, and catalogue records shared by the storefront API and mobile application. Managed uploads supplement the legacy URL fields; they do not create a second product or media source.

All `/admin` pages and mutations require a canonical `Session` belonging to an `ADMIN` or `STAFF` user. Publication, archive, catalogue-master-data, supplier, marketing, and subscriber operations remain `ADMIN` only. Ordinary catalogue editing, managed media, inventory, releases, merchandising, and review-draft operations are available to `STAFF`.

## Environment

Server-only variables:

```text
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_BASE_URL=https://media.example.com
OPENAI_API_KEY=...
OPENAI_CONTENT_MODEL=gpt-5-mini
```

`R2_PUBLIC_BASE_URL` is used only to construct public product asset URLs and the storefront image allow-list. Credentials and the OpenAI key are never returned to browsers or mobile clients. The application reports a clear configuration error when an operator invokes a feature without its required variables.

## Production Admin Provisioning and Recovery

The Admin application uses the canonical `User`, `Session`, password hash, and email-ownership fields shared with customer identity. It has no separate credential store. Production seeds do not create an Admin account or password.

### First Admin

1. Register through the production storefront using the owner's controlled business email.
2. Prove email ownership. Until a dedicated registration-verification email exists, request a password-recovery email at `https://tcg-hobby.co.uk/forgot-password`, follow the single-use link, and set the account password. Completion verifies the email and invalidates existing sessions.
3. From an approved server or protected deployment console with production database access, run:

   ```text
   npm run admin:promote -- --email admin@tcg-hobby.co.uk
   ```

4. The command fails if the account is absent or unverified, does not create or print a password, is idempotent, and records a successful role change in `AdminRoleChange`. Actorless bootstrap is allowed only while no `ADMIN` exists.
5. Sign in at `/login` on the deployed Admin origin. The intended production URL is `https://admin.tcg-hobby.co.uk/login`; DNS and deployment must be verified before launch because the repository cannot prove that hostname is live.

### Additional Staff and Administrators

An existing `ADMIN` must authorise later role changes. The target must already exist and have a verified email:

```text
npm run admin:promote -- --email staff@tcg-hobby.co.uk --role STAFF --actor-email admin@tcg-hobby.co.uk
npm run admin:promote -- --email second-admin@tcg-hobby.co.uk --role ADMIN --actor-email admin@tcg-hobby.co.uk
```

`STAFF` can perform ordinary catalogue, inventory, media, merchandising, release, and draft-review operations. Publication, archive, catalogue-master-data, supplier, marketing, subscriber, and permission-sensitive operations remain `ADMIN` only. Every Admin route and mutation enforces its role server-side.

### Password Recovery and Last-Admin Protection

- Select **Forgot password?** at Admin sign-in, or open `https://tcg-hobby.co.uk/forgot-password`.
- The response is deliberately generic. A matching account receives a one-hour, single-use reset link through Resend.
- Tokens are generated cryptographically, stored only as SHA-256 hashes, rate-limited to one request per account per minute, and consumed transactionally. A successful reset invalidates all sessions.
- Configure `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_REPLY_TO`, and the production storefront URL. Recovery email cannot be delivered without Resend configuration.
- Database triggers reject deletion or demotion of the last remaining `ADMIN`, including changes outside application code. Create and verify a second Admin before removing the first.

### Test Fixture Isolation

Authenticated Playwright can opt into the deterministic `e2e-admin@tcghobby.invalid` `STAFF` fixture with `TCG_HOBBY_E2E_ADMIN_FIXTURE=1`. Setup and cleanup refuse `NODE_ENV=production`, require `E2E_DATABASE_URL` to exactly equal the active `DATABASE_URL`, and never run by default. Production seed paths do not reference this fixture.

## Managed Image Workflow

1. Save a new product, then open its edit page.
2. Drop JPEG, PNG, or WebP images into Managed media, or use the file picker.
3. Enter meaningful alt text for every upload.
4. Reorder images, select the primary image, edit alt text, or delete with confirmation.

Uploads are limited to 10 MB and 12,000 pixels per side. The server validates bytes rather than trusting MIME type or filename. Sharp corrects orientation, strips incidental metadata, and creates WebP variants using `fit: inside`; it never crops or stretches the source.

Object keys are generated as:

```text
products/{productId}/{randomAssetId}/main.webp
products/{productId}/{randomAssetId}/thumbnail.webp
```

The main variant is bounded to 2400 x 2400 and the card variant to 800 x 800. The database records dimensions, MIME type, byte size, uploader, storage key, public URLs, deterministic order, and primary state.

If storage fails, no image row is created. If database persistence fails after upload, both objects are deleted. Deletion hides the row before object removal; failed object cleanup creates a `ProductImageCleanup` record for operational retry. Existing external URL rows remain supported under the advanced URL fields and are never removed by managed-media operations.

## Assisted Content Workflow

1. Enter product facts in the structured fact editor.
2. Mark only facts supported by owner, supplier, distributor, or manufacturer evidence as Verified and record the source reference.
3. Choose fields and generate a review draft.
4. Review generated fields and missing-fact warnings.
5. Explicitly apply selected fields, discard the draft, or restore prior applied values.
6. Keep the product Draft, move it to Awaiting Review, or let an `ADMIN` publish it through the existing control.

Only canonical identity/classification fields and facts marked `VERIFIED` are sent to the provider. Existing descriptions and supplier prose are excluded from prompts. Supplier/imported text is treated as data, never instructions.

The provider-neutral adapter currently calls the OpenAI Responses API with the environment-selected model, `store: false`, and a strict JSON Schema. It rejects malformed or schema-invalid output. The schema keeps separate values for short description, full description, contents, highlights, specification summary, SEO title, meta description, search tags, suggested slug, image alt text, and missing-fact warnings.

Generation never changes publication state and never writes product content merely because the provider returned successfully. Applying selected fields stores previous values in `ProductContentGeneration` so they can be restored. Suggested slugs are review-only and are not applied automatically. Generation is limited to five requests per staff user per ten minutes.

## Migration and Rollback

Migration `20260721_admin_product_media_content` is additive. It adds optional/defaulted Product and ProductImage metadata plus `ProductFact`, `ProductContentGeneration`, and `ProductImageCleanup`. It does not rewrite existing product copy or image URLs.

Migration `20260722_admin_identity_recovery` is also additive. It adds hashed one-time recovery tokens, Admin role-change audit records, and database triggers protecting the final Admin. Roll back application code first. Removing these tables or triggers is destructive and requires a separately reviewed migration after recovery and audit-retention requirements are satisfied.

Migration `20260722_last_admin_concurrency_guard` serializes last-Admin checks with a transaction-scoped PostgreSQL advisory lock so concurrent demotion or deletion attempts cannot remove every Admin.

Before rollback, export any new facts, generation audits, and managed image metadata. Application rollback is safe while the additive columns remain. Dropping the new tables or columns is destructive and must be handled as a separately approved migration. R2 objects should be retained until database rollback and media recovery are confirmed.

## Operations and Troubleshooting

- **Upload unavailable:** verify all five R2 variables and bucket write/delete permissions.
- **Image displays in Admin but not storefront:** confirm the public base URL is HTTPS, the object is publicly reachable, and rebuild/restart so Next.js reads the configured hostname.
- **Generation unavailable:** verify `OPENAI_API_KEY`, the configured Responses-compatible model, and outbound HTTPS access.
- **No generation allowed:** save at least one verified fact with a source reference.
- **Cleanup pending:** inspect `ProductImageCleanup`, remove the recorded R2 key and thumbnail variant, then remove the pending image row and mark the task complete through an approved operational procedure.
- **Legacy image:** legacy URL rows remain rendered and may be replaced in the advanced URL section. Ordinary saves only replace legacy rows and preserve managed uploads.

## External Setup

A Cloudflare R2 bucket, API credentials, and public/custom asset domain are required before real uploads. An OpenAI project API key is required before generation. No live upload or generation is performed by build or test commands.

### Cloudflare R2 acceptance

1. Configure a development bucket and set `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_BASE_URL` only in the server environment.
2. Sign in to Admin with a test `STAFF` or `ADMIN` account and open the Pitch Black Booster Bundle product.
3. Upload one JPEG, PNG, WebP, or AVIF source and confirm invalid signatures or undecodable files are rejected.
4. Confirm the main and card WebP variants retain the source aspect ratio, metadata is recorded, and neither variant is cropped.
5. Confirm the Admin preview, primary-image selection, ordering, and alt-text edit all persist after reload.
6. Confirm the image renders in the storefront and in the public commerce API projection consumed by mobile.
7. Delete the image, confirm the public record is removed, and complete or inspect any `ProductImageCleanup` task for failed object deletion.

### OpenAI acceptance

1. Configure `OPENAI_API_KEY` and a Responses-compatible `OPENAI_CONTENT_MODEL` in the Admin server environment.
2. Enter only verified facts for the Pitch Black Booster Bundle and request missing product content.
3. Confirm the response passes the strict JSON Schema and reports missing facts instead of inventing them.
4. Apply selected fields only and confirm unrelated manual content remains unchanged.
5. Manually edit one applied field, save the product as `DRAFT` or `AWAITING_REVIEW`, and confirm publication does not change.
6. Confirm the generation audit stores the provider, model, requested fields, warnings, applied fields, and previous values; then exercise rollback.
7. Inspect the server request or controlled test transport to confirm `store: false`, and confirm the API key is absent from browser requests, client bundles, logs, and the Git diff.

### Resend password-recovery acceptance

1. Configure `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_REPLY_TO`, and the production storefront origin in the server environment.
2. Register a non-production test customer, then request recovery at `/forgot-password` and confirm the public response remains generic.
3. Confirm one recovery email arrives with the expected sender, reply-to address, HTTPS reset URL, and an unexpired token.
4. Open the link, set a new password, and confirm the account can sign in while its previous sessions are invalidated.
5. Reuse the same link and confirm it is rejected; also confirm an expired or altered token is rejected.
6. Confirm only the token hash is stored and no email address, reset token, password, or Resend credential appears in logs.
