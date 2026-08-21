# Iron Sprue Polish 3 Manual QA Checklist

Generated: 2026-08-21

Use this checklist after deployment to staging and again immediately before production launch. Keep Stripe in test mode until explicit live cutover approval.

## Customer Journey

- Homepage loads with correct header, service strip, footer and no console errors.
- Catalogue loads, search works and manufacturer/category filters return expected products.
- Aoshima Back to the Future products appear under legitimate Aoshima filtering where published/visible.
- Product detail page shows gallery, brand, title, reference, price, VAT, stock, quantity, wishlist and add-ons.
- Add-on images render and direct Add to Basket adds the correct product.
- Basket quantity changes, removal, subtotal, delivery, VAT and total remain correct.
- Customer details step validates required contact and delivery fields.
- Order Review allows address/contact edits and quantity edits while preserving authoritative totals.
- Secure Payment loads the embedded Stripe form and offers only approved launch payment methods.
- Successful card payment reaches Processing, then Order Confirmed with no customer-facing raw provider state.
- Declined card shows customer-friendly recovery.

## Order Operations

- Confirm paid order appears in Iron Sprue Admin with item images and customer details.
- Dispatch with Royal Mail tracking persists carrier, number and generated URL.
- Dispatch email is received and contains tracking details.
- Receipt/order confirmation, cancellation/refund and dispatch/tracking emails use Iron Sprue sender, logo/wordmark, support URL and copy only; no TCG Hobby branding appears.
- Account order detail exposes dispatched tracking where applicable.
- Paid cancellation/refund creates the Stripe refund, sends customer email and restores stock exactly once.
- A standalone post-fulfilment refund does not restore stock unless the Admin return workflow explicitly marks returned units as restockable.
- Unpaid cancellation does not attempt a fake refund and communicates that no payment was received.
- Return request from customer account creates an Admin-visible request and sends acknowledgement email.
- Return/refund workflow handles restock yes and restock no correctly.
- Manual/offline orders remain recorded as Admin-created sales and do not send a customer receipt unless Admin deliberately uses the resend/send confirmation email control.

## Data Integrity

- Inventory never goes negative during final-unit checkout attempts.
- Failed/abandoned checkout does not permanently consume stock.
- Final inventory reconciliation covers persisted available stock, active reservations, manual/offline sale movements and genuine Admin stock adjustments before launch.
- Historical order rows retain product name, SKU, quantity, unit price, delivery, VAT and total after catalogue edits.
- Discount code use remains server-side and one-use rules cannot be bypassed.
- Test-data cleanup preserves genuine manual/offline sales and genuine inventory adjustments.

## Consent And Analytics

- First visit shows the compact cookie banner.
- Necessary-only prevents GA4/Meta script loading.
- Accept analytics allows GA4/Meta script loading.
- Cookie Preferences can be reopened from footer and Cookie Policy page.
- Purchase event fires once per confirmed order in the same browser.

## Legal And SEO

- About, Terms, Privacy, Cookies, Delivery, Returns and Contact pages render readable Iron Board documents.
- Cookie Policy includes a working Manage Cookie Preferences control.
- `/robots.txt` and `/sitemap.xml` reflect public/protected launch mode correctly.
- Product pages include meaningful page titles/descriptions and social metadata.
- Product images render on confirmation, Account order detail/history, Admin order detail and transactional emails where a real order item image exists.
- Zero-stock products cannot be newly added from product cards, PDPs or add-on cards.
- Product/media/content approval workflow blocks unapproved generated assets or copy from becoming customer-facing.
- Customer-facing order references remain consistent across confirmation, account, Admin, dispatch/tracking, returns, cancellation and refunds.
- Payment-method logos, checkout availability, PDP/Basket reassurance, legal/payment wording and transactional emails describe the same genuinely supported payment methods.

## Production Cutover

- Hosted-environment Admin provisioning must use a documented, secure Admin account creation/reset process and must not depend on a development-only unsafe account.
- Neon migration status is clean before cutover.
- Stripe live keys and webhook secret are populated only in the live Iron Sprue environment.
- Resend production sender/domain is verified.
- R2 public media domain is verified.
- GA4, Meta Pixel, Search Console and Meta domain verification are checked against the deployed domain.
