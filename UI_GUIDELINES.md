# UI Guidelines

## Adaptive Review Preview UI

- **Slider styling** – Use the native range input with `accent-accent` to stay on-brand. Label and helper text should remain in the muted foreground palette for readability.
- **Mode pill buttons** – Display the Adaptive/Fixed toggle as a rounded pill group. Highlight the active mode with the accent background and inverse text.
- **Preview card** – Render the forgetting curve as an SVG line inside a rounded card. Include a dashed horizontal line for the trigger threshold and annotate the next checkpoint with an accent dot.
- **Cadence list** – Limit to four projected reviews to avoid scroll overflow. Each entry should use compact chips with the review index on the left and formatted date on the right.
- **Empty states** – When fixed mode is active or no adaptive checkpoints exist before the exam, show a dashed card explaining the state instead of an empty chart.

## Dark Mode Text Hierarchy

- **Primary copy** – Default body text and headings should use `text-fg` which resolves to `#eaeaea` in dark mode.
- **Secondary copy** – Supporting paragraphs, metadata rows, and helper labels should apply `text-muted-foreground` (`#d4d4d8`) so they remain readable without overpowering headlines.
- **Muted details** – Captions, microcopy, and icon hints can drop to `text-muted-foreground/80` (`rgba(212, 212, 216, 0.8)`) to establish hierarchy while retaining ≥4.5:1 contrast.
- **Placeholders & disabled** – Inputs and controls should use `::placeholder { color: #9ca3af; }` and disabled text around `#9ca3af` to avoid disappearing on the `#0f1115` background.
- **Status accents** – Overdue, upcoming, and exam indicators must keep the bright rose/sky/amber palettes so alert colours are still distinguishable against dark surfaces.

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

## Dashboard Section Order

- **Sequence** – Arrange the dashboard as: header + hero copy, daily metric cards, Next Up messaging, streak/due summary, Progress today, then the search, filters, and topic table.
- **Dividers** – Place `border-t border-border/60` dividers immediately above and below the Progress today card to separate it from adjacent content without introducing heavy shadows.
- **Spacing** – Maintain roughly `gap-10` between primary blocks and `space-y-6` within the divider stack so the layout breathes on both mobile and desktop breakpoints.
- **Typography** – Reuse the standard section heading scale (`text-2xl font-semibold`) for the Progress today title, while keeping supporting copy in the muted foreground palette.
- **Positive accents** – Style completion percentages and motivational copy with `text-success` (or equivalent positive tone) to reinforce achievement across themes.

## Timeline Toolbar Rules

- **Icon toggles** – Render timeline overlays (exam markers, milestones, event dots, opacity fade, topic labels) as icon-only `Toggle` controls sized `h-9 w-9`, centred, and wrapped in a scrollable chip rail.
- **Milestones combo** – Merge checkpoints and review markers into a single “Milestones” control that flips both `showCheckpoints` and `showReviewMarkers` together.
- **Subject focus** – Show only one subject’s data at a time. Below the chart, expose subject chips that behave as mutually exclusive toggles and default to the first available subject.
- **Curve isolation** – Clicking a curve should dim other series, apply a drop-shadow highlight, and re-show everything when the background is clicked or Escape is pressed. Hover states use thicker strokes and pointer cursors.
- **Clear filters text** – The clear-categories action is plain text (`text-xs text-muted-foreground hover:underline`) aligned to the right of the toolbar.
- **Export guardrails** – PNG exports must sanitise cloned SVGs, set `image.crossOrigin = "anonymous"`, and toast an error (“Export failed…”) when the browser blocks `toDataURL`.
- **Hover affordances** – Charts live inside `rounded-3xl border border-inverse/10 bg-muted/30` containers so grid lines and curves brighten slightly on hover while keeping crosshair cursors.

## Reviews Table Design

- **Column order** – Topic, Subject, Next review, Status, Actions. Keep headers uppercase, `text-xs`, and left-aligned except for the Actions column, which should align right.
- **Row behaviour** – Apply `cursor-pointer hover:bg-muted/30` to each `<tr>` so the entire row signals interactivity. Toggle expansion with Enter/Space when the row has focus and rotate the chevron indicator accordingly.
- **Expanded details** – Render the schedule and notes summary inside a single detail row spanning all columns (`colSpan={5}`) with a muted background and 12–16px padding.
- **Skip logic** – Only show the “Skip today” action for topics whose status is `due-today`. Upcoming topics should expose edit/delete without a skip affordance.
- **Visual language** – Use flat borders (`border-border/50`), light neutral backgrounds, and compact `px-4 py-3` cell padding to mimic GitHub tables. Status badges reuse the shared `status-chip` palette.
- **Responsive handling** – Wrap the table in `overflow-x-auto` for small screens and surface condensed metadata (subject, next review, status) beneath the topic title with `md:hidden` helpers.
