# Social Media Integration

Work Package 2D adds approved global social media integration for the storefront.

## Approved Platforms

The approved launch platforms are:

- Facebook
- Instagram
- TikTok

X, YouTube, Discord and Threads are future candidates but are not implemented in WP2D.

## Configuration

Set public HTTPS URLs through environment variables:

- `NEXT_PUBLIC_FACEBOOK_URL`
- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_TIKTOK_URL`

Only valid `https://` URLs are rendered. Invalid, missing or non-HTTPS values are ignored.

## Component

The reusable component is:

`apps/storefront/components/social-links.tsx`

It accepts:

- `links`
- `compact`
- `className`

The component renders nothing when no links are configured.

## Footer Integration

The storefront footer calls `getSiteSocialLinks()` and renders `SocialLinks` near the brand/about information.

Social links are not rendered in Admin.

Placeholder social copy is not displayed.

## Homepage Integration

The production homepage includes a compact “Follow TCG Hobby” section when at least one approved social URL is configured.

The section encourages customers to follow for:

- new releases
- restocks
- product announcements
- special offers

It does not embed feeds, videos or third-party tracking widgets.

## Accessibility

Each social link includes an accessible label in the form:

`Follow TCG Hobby on {Platform}`

Icons/marks are decorative. The accessible name comes from the link label.

Links are keyboard accessible and use visible focus styles.

## Security

Social links open in a new tab and use:

`rel="noopener noreferrer"`

This prevents the opened page from accessing the storefront window context.

## Future Platforms

To add a future platform:

1. Add a new typed label to `SiteSocialLink`.
2. Read and validate the matching environment variable in `getSiteSocialLinks`.
3. Add the platform mark in `SocialLinks`.
4. Add tests for rendering, accessibility and invalid URL handling.

Do not add placeholder links.
