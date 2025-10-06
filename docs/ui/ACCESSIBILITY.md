# ACCESSIBILITY

## Principles

- Meet WCAG 2.1 AA contrast across themes.
- Preserve keyboard access for every interactive element.
- Honour reduced motion preferences.

## Keyboard navigation

- Global skip link jumps to the main content at the top of each page.
- Navigation bar links are reachable via Tab order and expose visible focus rings.
- Active nav links set `aria-current="page"` and mirror the underline highlight for screen readers via the select label on mobile.
- Today list supports `ArrowUp`/`ArrowDown`, `Enter` to open a topic, and `Shift+Enter` to mark complete when the row is focused.
- Timeline zoom stack supports keyboard: `Z` toggles selection mode, `+` / `-` adjust zoom, `0` resets.

## Focus management

- Dialogs (`Dialog` from Radix) trap focus and restore it on close.
- Toasts announce via `aria-live="polite"`.
- Auto-advancing to the next topic moves focus to the next card header without scrolling unexpectedly.
- Mobile UnderlineNav select preserves focus after route changes by delegating navigation through `next/navigation`.

## Screen reader copy

- Today cards include `aria-describedby` for retention percentage and due status.
- Timeline chart includes an off-screen summary of subjects displayed and the next review count.
- Dashboard metrics expose `aria-label` text (e.g., "Due today: 12 topics") for icon-only buttons.

## Color & contrast

- Use shared tokens from [THEME_GUIDE](./THEME_GUIDE.md) to keep ratios ≥4.5:1.
- Status chips rely on text + icon combinations so colour blindness does not hide meaning.
- Charts use patterned backgrounds for risk zones to avoid relying solely on colour.

## Reduced motion

- `useAppearanceStore` exposes a toggle to disable transitions. Components check `transitions` before animating.
- Timeline pans/zooms fall back to instant scale changes when motion is disabled.

## Testing checklist

- Run `npm run lint` (includes `eslint-plugin-jsx-a11y`).
- Validate focus order manually on Today, Timeline, and Subjects.
- Use Axe DevTools or Lighthouse to check colour contrast in both themes.


## Testing cadence

- Include accessibility checks in the release checklist and document findings in PR descriptions.
- Run screen reader smoke tests with VoiceOver (macOS) and NVDA (Windows) when making major UI changes.
- Use Storybook a11y addon (planned) to automate per-component verification once the component library is extracted.

[Back to Docs Index](../DOCS_INDEX.md)
