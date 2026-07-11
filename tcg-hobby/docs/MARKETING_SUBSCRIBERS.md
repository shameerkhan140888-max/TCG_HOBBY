# Marketing Subscribers

TCG Hobby uses a reusable `MarketingSubscriber` record for launch signups, newsletters, product updates, preorder interest, and future campaign audiences.

## Public Signup Flow

- The Coming Soon page writes to `MarketingSubscriber`.
- Source is `coming-soon-page`.
- The `launch` tag is always applied.
- The `newsletter` tag is applied only when the visitor ticks the marketing consent checkbox.
- Email is required.
- First name is optional.
- The consent checkbox is optional and must not be preselected.
- Duplicate signups update the existing subscriber instead of creating another row.
- Confirmation email is attempted once per subscriber and tracked on the subscriber record.

## Campaign Eligibility

Use the shared eligibility rule from the database package:

- `marketingConsent` is `true`.
- `status` is `ACTIVE`.
- `unsubscribedAt` is empty.
- `bouncedAt` is empty.
- `suppressedAt` is empty.

Do not hand-roll campaign audience rules in app code.

## Tags

Initial reusable tags:

- `launch`
- `newsletter`
- `pokemon`
- `magic-the-gathering`
- `lorcana`
- `one-piece`
- `yugioh`
- `flesh-and-blood`
- `vip`
- `customer`
- `preorder`
- `restock-alert`

Tags are relational records, not comma-separated strings on the subscriber.

## Resend

Required environment variables:

```bash
RESEND_API_KEY="re_..."
SIGNUP_EMAIL_FROM="TCG Hobby <no-reply@tcg-hobby.co.uk>"
SIGNUP_EMAIL_REPLY_TO="info@tcg-hobby.co.uk"
NEXT_PUBLIC_SITE_URL="https://tcg-hobby.co.uk"
```

Before production sending:

1. Verify `tcg-hobby.co.uk` in Resend.
2. Add the SPF, DKIM, and DMARC records Resend provides.
3. Send a test confirmation email to a controlled mailbox.
4. Confirm the unsubscribe link points to `https://tcg-hobby.co.uk/unsubscribe?token=...`.

## Admin

Admin marketing tools are available under:

- `/admin/marketing/subscribers`
- `/admin/marketing/campaigns`

Subscriber admin supports dashboard counts, list filtering, detail review, status changes, tag changes, and CSV export.

Campaign admin currently supports draft creation only. Bulk sending is intentionally not implemented in this work package.

## Operational Notes

- Use `UNSUBSCRIBED` for user opt-outs.
- Use `BOUNCED` for delivery failures when the mailbox cannot receive email.
- Use `SUPPRESSED` for manual operational suppression.
- Do not restore bounced or suppressed subscribers without a clear operational reason.
- This document is implementation guidance, not legal advice.
