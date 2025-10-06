# UI_STYLE_GUIDE

## Icon buttons

Icon buttons share a unified hierarchy:

- Default: muted foreground text on transparent background.
- Active: accent text colour with 25% accent background tint.
- Stroke weight: 1.5px to maintain crispness on retina and low-density displays.
- Hover/focus: smooth colour transitions at 200ms, focus-visible outline uses accent tone.
- All icons consume tokens from [THEME_GUIDE](./THEME_GUIDE.md) to keep contrast ≥4.5:1.

## Surface overlays

- Card surfaces use the global `--surface-overlay-alpha` token (default 10%).
- Appearance settings preview overlay changes across dashboard cards and dialogs.
- Avoid stacking multiple overlays; use the base card token plus one overlay for clarity.

## Dropdown menus

- Apply the `dropdown-surface` class for popovers, selects, and menus to ensure fully opaque backgrounds.
- Hover states tint backgrounds via `color-mix` while keeping text readable in both themes.
- Do not reintroduce deprecated `translucentg-card` classes; rely on shared tokens for borders, shadows, and hover behaviour.
- Menu items remain 36px tall with `px-3` padding and left-aligned icons.

## Segmented controls

- Buttons share rounded-full pill styling with `gap-1.5` spacing.
- Active option uses accent fill plus `shadow-[0_0_0_1px_var(--accent-color)]` for clarity.
- Provide `aria-pressed` to reflect state for assistive tech.
- Keep copy concise (≤12 characters) to avoid wrapping on mobile.

## Toasts & notifications

- Use Sonner toasts with `richColors` enabled. Success states adopt green gradient, warnings amber, errors red.
- Include explicit verbs (“Review scheduled”, “Import failed”) and, when appropriate, a secondary action button.
- Toasts auto-dismiss after 4 seconds but remain interactive when hovered.

## Microcopy

- Headings use sentence case; avoid trailing punctuation.
- Tooltips should reference the action (“Jump to Today”) rather than repeating the button label verbatim.
- Empty states encourage next steps (“Add your first subject to see streak insights”).

- Maintain 8px spacing between icon and label pairs for clarity.

[Back to Docs Index](../DOCS_INDEX.md)
