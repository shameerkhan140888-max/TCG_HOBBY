# Domain Setup

Use this checklist when moving TCG Hobby from local development to the launch domain.

## Required Environment

Set these values on the storefront hosting target:

```bash
NEXT_PUBLIC_SITE_URL="https://tcghobby.co.uk"
NEXT_PUBLIC_APP_URL="https://tcghobby.co.uk"
APP_URL="https://tcghobby.co.uk"
TCG_HOBBY_STOREFRONT_MODE="coming-soon"
```

Use `TCG_HOBBY_STOREFRONT_MODE="storefront"` when the full storefront should become the public homepage.

## Mailboxes

Create these mailboxes before public launch:

- `launch@tcg-hobby.co.uk` for launch list monitoring, launch campaign replies, and early-access enquiries.
- `hello@tcg-hobby.co.uk` for general public enquiries from the holding page.
- `support@tcg-hobby.co.uk` for post-launch customer support and order/helpdesk routing.

Recommended setup:

1. Enable SPF, DKIM, and DMARC for `tcg-hobby.co.uk` before sending any launch email.
2. Add mailbox aliases or shared inbox access for the launch operator team.
3. Route holding-page contact copy to `hello@tcg-hobby.co.uk`.
4. Route launch-list export or email-provider sync from `LaunchSignup` records to `launch@tcg-hobby.co.uk` ownership.
5. Keep `support@tcg-hobby.co.uk` ready but do not publish order-support promises until storefront mode is approved.

## DNS

1. Point the apex domain to the hosting provider using its recommended A/ALIAS/ANAME record.
2. Point `www` to the same storefront deployment using a CNAME.
3. Configure the hosting provider to redirect the secondary host to the canonical host.
4. Wait for DNS propagation, then confirm HTTPS is active for both apex and `www`.

## Launch Mode

In `coming-soon` mode:

- `/` renders the Coming Soon launch page.
- `/coming-soon` remains available as the canonical launch hub.
- `robots.txt` allows launch/support pages and discourages indexing checkout, catalogue, account, collection, deck, buylist, cart, and watchlist routes.
- `sitemap.xml` contains only the launch-safe route set.

In `storefront` mode:

- `/` renders the full storefront homepage.
- `robots.txt` allows the storefront.
- `sitemap.xml` lists the commerce route set.

## Validation

After deployment, verify:

- `https://tcghobby.co.uk/` loads the expected mode.
- `https://tcghobby.co.uk/coming-soon` accepts launch email signups.
- `https://tcghobby.co.uk/robots.txt` references `https://tcghobby.co.uk/sitemap.xml`.
- `https://tcghobby.co.uk/sitemap.xml` uses the production domain.
- OpenGraph previews use `/brand/tcg-hobby-horizontal.png`.
- The page source includes Organization, WebSite, and Coming Soon WebPage structured data.
