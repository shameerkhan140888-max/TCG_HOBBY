# Domain Setup

Use this checklist when moving TCG Hobby from local development to the launch domain. Do not connect the domain until the landing page has final visual approval.

## Required Environment

Set these values on the storefront hosting target:

```bash
NEXT_PUBLIC_SITE_URL="https://tcg-hobby.co.uk"
NEXT_PUBLIC_APP_URL="https://tcg-hobby.co.uk"
APP_URL="https://tcg-hobby.co.uk"
TCG_HOBBY_STOREFRONT_MODE="coming-soon"
RESEND_API_KEY="re_..."
SIGNUP_EMAIL_FROM="TCG Hobby <no-reply@tcg-hobby.co.uk>"
SIGNUP_EMAIL_REPLY_TO="info@tcg-hobby.co.uk"
```

Use `TCG_HOBBY_STOREFRONT_MODE="storefront"` when the full storefront should become the public homepage.

## Mailboxes

Create these mailboxes before public launch:

- `launch@tcg-hobby.co.uk` for launch-list monitoring and campaign operations.
- `info@tcg-hobby.co.uk` for public replies and the signup confirmation reply-to address.
- `support@tcg-hobby.co.uk` for post-launch customer support and order/helpdesk routing.

Recommended setup:

1. Add shared inbox access for the launch operator team.
2. Route signup confirmation replies to `info@tcg-hobby.co.uk`.
3. Route launch-list operational monitoring and exports from `MarketingSubscriber` records to `launch@tcg-hobby.co.uk` ownership.
4. Keep `support@tcg-hobby.co.uk` ready but do not publish order-support promises until storefront mode is approved.

## Resend And DNS

1. Add `tcg-hobby.co.uk` as a verified sending domain in Resend.
2. Add the SPF, DKIM, and DMARC records recommended by Resend for the domain.
3. Verify `no-reply@tcg-hobby.co.uk` can send confirmation email.
4. Keep `SIGNUP_EMAIL_FROM` as `TCG Hobby <no-reply@tcg-hobby.co.uk>`.
5. Keep `SIGNUP_EMAIL_REPLY_TO` as `info@tcg-hobby.co.uk`.
6. Confirm unsubscribe links use `https://tcg-hobby.co.uk/unsubscribe?token=...`.

## DNS

1. Point the apex domain to the hosting provider using its recommended A/ALIAS/ANAME record.
2. Point `www` to the same storefront deployment using a CNAME.
3. Configure the hosting provider to redirect the secondary host to the canonical host.
4. Wait for DNS propagation, then confirm HTTPS is active for both apex and `www`.

## Launch Mode

In `coming-soon` mode:

- `/` renders the Coming Soon launch page.
- `/coming-soon` remains available as the canonical launch hub.
- The signup form writes to reusable `MarketingSubscriber` records.
- `robots.txt` allows launch-safe pages and discourages indexing checkout, catalogue, account, collection, deck, buylist, cart, and watchlist routes.
- `sitemap.xml` contains only the launch-safe route set.

In `storefront` mode:

- `/` renders the full storefront homepage.
- `robots.txt` allows the storefront.
- `sitemap.xml` lists the commerce route set.

## Data Handling Notes

- Store consent state and unsubscribe state on the subscriber record.
- Do not export subscriber CSVs to personal devices unless needed for operations.
- Use the built-in unsubscribe route for every marketing email.
- Keep suppression and bounced statuses in place unless there is a clear operational reason to restore a subscriber.
- This checklist is operational guidance, not legal advice.

## Validation

After deployment, verify:

- `https://tcg-hobby.co.uk/` loads the expected mode.
- `https://tcg-hobby.co.uk/coming-soon` accepts subscriber signups.
- Confirmation email sends from `TCG Hobby <no-reply@tcg-hobby.co.uk>`.
- Confirmation email replies route to `info@tcg-hobby.co.uk`.
- `https://tcg-hobby.co.uk/unsubscribe?token=...` safely unsubscribes without exposing an email address.
- `https://tcg-hobby.co.uk/robots.txt` references `https://tcg-hobby.co.uk/sitemap.xml`.
- `https://tcg-hobby.co.uk/sitemap.xml` uses the production domain.
- OpenGraph previews use `/brand/tcg-hobby-horizontal.png`.
- The page source includes Organization, WebSite, and Coming Soon WebPage structured data.
