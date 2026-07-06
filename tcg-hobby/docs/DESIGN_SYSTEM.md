# Design System

## Purpose
This document defines the reusable visual system for TCG Hobby. It exists to keep the storefront, admin, and supporting surfaces consistent while preserving a premium commercial feel.

## Component Standards
- Use reusable components for repeated UI patterns.
- Prefer small, composable building blocks over page-specific styling.
- Keep layout components separate from content components.
- Use semantic HTML first, then style.
- Keep visual variants explicit and limited.
- Do not encode page-specific business logic into shared UI.

## Spacing Scale
Use an 8px-based scale:
- `4px` fine detail
- `8px` compact spacing
- `12px` dense content spacing
- `16px` standard spacing
- `20px` relaxed spacing
- `24px` section spacing
- `32px` strong separation
- `40px+` large section breaks

Spacing rules:
- Use consistent horizontal padding across breakpoints.
- Keep cards and panels compact, not airy.
- Avoid uneven margins inside repeated layouts.

## Icon Guidelines
- Use icons for compact actions such as search, account, menu, cart, and close.
- Keep icon sizing consistent across the product.
- Use outline icons for utility actions and filled or badge treatments only for emphasis states.
- Icons should be legible at small sizes.
- Never use icons as decoration without a function.
- Ensure every icon-only control has an accessible label.

## Responsive Breakpoints
- Mobile: `< 768px`
- Tablet: `768px - 1023px`
- Desktop: `>= 1024px`
- Wide desktop: `>= 1280px`

Responsive rules:
- Mobile should prioritize compact navigation and readable stacking.
- Tablet should keep the same structure as desktop when possible, with tighter spacing.
- Desktop should support fuller navigation, richer grids, and more persistent controls.

## Animation Guidelines
- Keep motion subtle, fast, and purposeful.
- Use hover transitions for affordance.
- Use gentle fades and short slide transitions for menus and overlays.
- Avoid bouncy, playful, or attention-grabbing motion.
- Prefer motion that supports orientation, not spectacle.

Recommended motion characteristics:
- Duration: `120ms - 220ms`
- Easing: smooth ease-out for entry, smooth ease-in for exit
- Respect reduced-motion preferences

## Accessibility Standards
- Maintain strong text contrast.
- Preserve visible focus states.
- Support keyboard navigation for all interactive elements.
- Use meaningful ARIA labels for icon-only controls.
- Use semantic landmarks and headings.
- Keep touch targets large enough for mobile use.
- Do not rely on colour alone to communicate state.

## UI Acceptance Criteria
- The UI must feel commercial, deliberate, and trustworthy.
- The UI must not look like a scaffold or placeholder.
- Navigation should be obvious and stable.
- Empty states should feel intentional.
- Loading states should feel polished and calm.
- Controls should be consistent in size, spacing, and tone.
- High-priority actions should stand out clearly.
