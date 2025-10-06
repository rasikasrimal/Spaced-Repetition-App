# UI Style Guide

## Icon Buttons

Icon buttons now use unified visual hierarchy:
- Muted default -> colored active
- 1.5px stroke weight
- 25% background tint on activation
- Smooth color transitions on hover and focus
- Ensure colors use theme tokens to maintain accessibility contrast >= 4.5:1.
- Accent glow reinforces active states while keeping edges smooth.

## Surface Overlays

- Card-based surfaces use the global --surface-overlay-alpha token (default 10%).
- Update the Appearance setting to preview different opacity levels across the UI.

## Dropdown Menus

- Use the shared dropdown-surface class for popovers, selects, and menus to ensure fully opaque backgrounds.
- Hover states tint the background via color-mix and should retain clear text contrast in both themes.
- Avoid re-adding translucent g-card/xx classes; rely on the theme tokens for border, shadow, and hover behavior.
