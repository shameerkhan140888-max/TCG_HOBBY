# TCG Hobby transactional emails

## Configuration

Set these server-side values in the storefront environment:

```dotenv
RESEND_API_KEY=""
NEXT_PUBLIC_SITE_URL="https://tcg-hobby.co.uk"
TCG_HOBBY_EMAIL_ASSET_BASE_URL="https://www.tcg-hobby.co.uk"
ORDER_EMAIL_FROM="TCG Hobby <no-reply@tcg-hobby.co.uk>"
ORDER_EMAIL_REPLY_TO="support@tcg-hobby.co.uk"
SIGNUP_EMAIL_FROM="TCG Hobby <no-reply@tcg-hobby.co.uk>"
SIGNUP_EMAIL_REPLY_TO="info@tcg-hobby.co.uk"
```

Verify the sending domain in Resend before using the configured sender. These values must never use public client prefixes other than the already-public storefront URL.

The shared email shell uses the PNG logo at `/brand/tcg-hobby-horizontal-dark.png` from `TCG_HOBBY_EMAIL_ASSET_BASE_URL`, falling back to `https://www.tcg-hobby.co.uk`. Use a stable public HTTPS origin only. Do not use localhost, private object URLs, signed URLs or SVG-only logo assets in emails sent to external inboxes.

## Order confirmation

The signed Stripe webhook remains authoritative. The application persists the paid order first, then claims the unique `ORDER_CONFIRMATION` delivery and calls Resend with a stable idempotency key. Provider failure does not reverse payment or inventory finalisation. A later webhook replay can retry a failed or stale delivery.

Stripe's successful-payment receipt is controlled in the Stripe Dashboard. Keep it enabled until the TCG Hobby order email has passed live acceptance. Stripe refund emails should remain enabled until an equivalent TCG Hobby refund notification exists. The application does not change Stripe email settings.

## Local previews

Run the storefront in development and open:

- `/api/dev/email-preview?template=signup`
- `/api/dev/email-preview?template=order`
- `/api/dev/email-preview?template=order&scenario=missing-image`
- `/api/dev/email-preview?template=order&scenario=long-name`
- `/api/dev/email-preview?template=order&scenario=multiple`
- `/api/dev/email-preview?template=order&scenario=guest`

The route returns `404` in production and never sends an email. Review at desktop and approximately 320px mobile width.

## Live acceptance

1. Use Stripe test mode and forward signed webhooks to `/api/stripe/webhook`.
2. Place an order using an owner-controlled address.
3. Confirm the order reaches `PAID` / `SUCCEEDED`.
4. Confirm exactly one branded email arrives with correct products, totals, delivery details, sender and reply-to.
5. Replay the Stripe event and confirm no duplicate email is delivered.
6. Submit a genuinely new mailing-list signup and inspect its branded welcome email.

Do not disable Stripe successful-payment receipts until these checks pass. Never use live Stripe credentials for local acceptance.
