# THEME_GUIDE

## Palette

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `bg` | `#F8FAFC` | `#0F1115` | Page background. |
| `card` | `#FFFFFF` | `#111827` | Cards, modals, navigation surfaces. |
| `border` | `#E2E8F0` | `rgba(148, 163, 184, 0.45)` | Dividers and outlines. |
| `accent` | `#2563EB` | `#60A5FA` | Primary buttons, active nav states. |
| `success` | `#15803D` | `#4ADE80` | Completion metrics, streak badges. |
| `warn` | `#B45309` | `#FBBF24` | Exam alerts, low retention warnings. |
| `error` | `#B91C1C` | `#F87171` | Blocked actions, overdue counts. |

## Exam status palette

- Light background: `#FEF3C7`
- Light text: `#92400E`
- Dark background: `rgba(146, 64, 14, 0.4)`
- Dark text: `#FCD34D`
- Borders match `#FCD34D` (light) and `rgba(180, 83, 9, 0.6)` (dark)

## Typography

- Base font: Inter.
- Headings use `text-fg` with 1.25 line-height.
- Secondary copy uses `text-muted-foreground` (light `#475569`, dark `#D4D4D8`).

## Motion & transitions

- Hover transitions run at 200ms with `ease-out` to keep the flat aesthetic smooth.
- Theme toggle animates the background tint using `transform` instead of opacity to avoid layout shift.
- `useAppearanceStore` allows disabling transitions globally for reduced motion preferences.

## Focus & accessibility

- Focus outlines: 2px accent border with 4px radius offset.
- Contrast ratios meet WCAG AA (≥4.5:1) across text and icon pairs.
- High-contrast mode toggles ensure nav icons remain legible in both palettes.

## Implementation notes

- Light/dark theme is toggled by adding `class="light"` or `class="dark"` to `<body>` via `ThemeManager`.
- Avoid relying on CSS variables for runtime palette swaps; use Tailwind colour utilities bound to theme classes.
- When adding new surfaces, reuse existing `bg-*`, `border-*`, and `text-*` tokens to maintain parity between themes.
- UnderlineNav underlines and hover tints reference `--accent-color` so the 2px bar and background wash adapt seamlessly between light and dark palettes.

[Back to Docs Index](../DOCS_INDEX.md)
