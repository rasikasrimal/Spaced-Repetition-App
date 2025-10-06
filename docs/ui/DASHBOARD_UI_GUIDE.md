# DASHBOARD_UI_GUIDE

## Summary module

- Combines motivational copy, upcoming topic context, and daily metrics into a single `dashboard-summary-card`.
- Left column surfaces the Today headline, motivational line, and “Next up” context.
- Right column highlights streak and overall progress percentage for immediate reinforcement.
- CTA buttons (“Start reviews”, “View timeline”) adopt the accent palette with focus-visible outlines.

## Metrics grid

- Four interactive tiles (Due Today, Upcoming, Streak, Progress) present key counts with icons.
- Cards use subtle hover transitions (`bg-card/80`, `shadow-primary/30`) and scale effects on icons.
- Values inherit semantic colour tokens (`text-accent`, `text-success`, `text-warn`).
- Provide `aria-describedby` linking counts to helper copy beneath each tile.

## Progress summary

- Progress message reinforces completion percent with contextual encouragement.
- Linear accent bar animates width changes for responsive feedback.
- Tooltip/title copy explains completion totals (e.g., “0 of 31 topics completed today”).
- When completed, swap the encouragement message for a celebratory success line.

## Filters & search

- Filters sit below the progress card with `gap-3` spacing and scrollable rails on small screens.
- `/` keyboard shortcut focuses the search input; `Esc` clears it.
- Status chips use uppercase labels and maintain accessible contrast in both themes.
- Provide a “Clear filters” text button aligned right.

## Review table

- Table columns: Topic, Subject, Next review, Status, Actions.
- Expand rows using a chevron toggle; detail rows span all columns with muted background.
- Hover states tint rows via `bg-muted/30` and keep text readable.
- Sticky header remains visible while scrolling long lists.

## Responsive behaviour

- Desktop layout uses two columns: left (summary + filters) and right (metrics grid).
- Tablet collapses to a single column with preserved spacing.
- Mobile stacks sections with `gap-4` and keeps nav anchored at the bottom.

## Roadmap additions

- Slot the Notification panel summary above metrics once released.
- Integrate AI Help tips as dismissible callouts beneath the summary card.

[Back to Docs Index](../DOCS_INDEX.md)
