# Dashboard UI Guide

## Dashboard Summary
- Combines motivational copy, upcoming topic context, and daily metrics into a single `dashboard-summary-card`.
- Left column surfaces the 🗓️ Today’s Tasks heading, 💡 motivational line, and “Next up” context.
- Right column highlights streak and overall progress percentage for immediate reinforcement.

## Metrics Grid
- Four interactive tiles (Due Today, Upcoming, Streak, Progress) present key counts with icons.
- Cards use subtle hover transitions (bg-card/80, shadow-primary/30) and scale effects on icons.
- Values inherit semantic color tokens (`status-text` classes, `text-accent`, `text-success`) for theme-safe contrast.

## Progress Summary
- 📈 Progress message reinforces completion percent with contextual encouragement.
- Linear accent bar animates width changes for responsive feedback.
- Tooltip/title copy explains completion totals (e.g., “0 of 31 topics completed today”).

## Responsiveness
- Desktop layout uses two columns: left (motivation + context) and right (streak/progress overview).
- Mobile stacks sections with `gap-4` spacing while preserving hover/focus affordances.
- Metric cards remain touch-friendly with generous padding and rounded corners.
