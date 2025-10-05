# UI Guidelines

## Adaptive Review Preview UI

- **Slider styling** – Use the native range input with `accent-accent` to stay on-brand. Label and helper text should remain in the muted foreground palette for readability.
- **Mode pill buttons** – Display the Adaptive/Fixed toggle as a rounded pill group. Highlight the active mode with the accent background and inverse text.
- **Preview card** – Render the forgetting curve as an SVG line inside a rounded card. Include a dashed horizontal line for the trigger threshold and annotate the next checkpoint with an accent dot.
- **Cadence list** – Limit to four projected reviews to avoid scroll overflow. Each entry should use compact chips with the review index on the left and formatted date on the right.
- **Empty states** – When fixed mode is active or no adaptive checkpoints exist before the exam, show a dashed card explaining the state instead of an empty chart.

## Exam Date Badge Design

- **Light mode** – Use `bg-amber-100`, `text-amber-700`, and `border-amber-300` for the badge container and copy.
- **Dark mode** – Switch to `bg-amber-900/40`, `text-amber-300`, and `border-amber-700/60` to retain contrast on dark surfaces.
- **Hover** – Transition to `bg-amber-200` in light mode and `bg-amber-800/60` in dark mode while keeping border colors intact.
- **Icon color** – Icons must set `stroke="currentColor"` (default for Lucide) so the glyph matches the surrounding text tone.
- **Accessibility** – Maintain at least a 4.5:1 contrast ratio between foreground and background in every theme.

## Dashboard Filters & Chart Interactions

- **Status filter rail** – Wrap the chip group in `flex gap-2 whitespace-nowrap overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory` so the buttons stay on a single line and scroll on small screens.
- **Active state** – Apply `bg-primary/10 text-primary border-primary font-semibold hover:bg-primary/15 focus-visible:ring-primary/50` to the selected status chip.
- **Inactive state** – Use `border-transparent text-muted-foreground hover:bg-accent/20 hover:text-fg` while keeping uppercase labels and `tracking-wide` letter spacing.
- **Clear filters control** – Render as muted inline text (`text-xs text-muted-foreground hover:underline`) aligned to the right, without a pill or border.
- **Review load chart** – Place the preview inside a `bg-muted/30` container with `cursor-crosshair`; draw the area with an accent gradient, keep grid lines at 60% opacity, and bump stroke width plus drop-shadow on hover.
- **Tooltip motion** – Fade tooltips in/out with `transition-opacity duration-150` and keep copy within the card palette so it remains legible in both themes.
- **Accessibility** – Ensure the active chip and tooltip text both exceed a 4.5:1 contrast ratio against their backgrounds and the chart summary announces the due-now count via `sr-only` text.
