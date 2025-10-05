# Test Plan

This document outlines the lightweight testing strategy for the Spaced Repetition App.

## Testing scope

- **Critical UI flows**: Creating topics, updating intervals, marking reviews, and verifying dashboard metrics.
- **State integrity**: Ensuring persisted data rehydrates correctly across reloads.
- **Visual regressions**: Guarding against major layout or interaction regressions in the dashboard.

## Test types

| Type | Tooling | Coverage |
| --- | --- | --- |
| Static analysis | `npm run lint` (ESLint + TypeScript) | Catches TypeScript errors, accessibility issues, and common React mistakes. |
| End-to-end smoke | `npm run test:visual` (Playwright) | Launches the app, seeds sample data, and verifies that the dashboard renders with expected counts and controls. |
| Manual exploratory | Browser session against `npm run dev` | Used before releases to validate new features, keyboard shortcuts, and responsive behavior. |

## Scenario tables

| Scenario | Steps | Acceptance criteria |
| --- | --- | --- |
| Revise daily rule | Mark a topic as revised via Dashboard → attempt "Revise" again before midnight | Second attempt is blocked with tooltip “You’ve already revised this today. Available again after midnight.” |
| Search UX | Use `/` shortcut to focus dashboard search, type query, clear with `Esc` | Search field gains focus, results filter live, and clearing returns the full list without layout shift. |
| Subjects filter persistence | Toggle subjects in dashboard dropdown → navigate to Calendar and Timeline | Selected subjects remain active across views and legend reflects the same subset. |
| Calendar dots & exam chip | Apply subject filter, inspect month grid for multi-subject days, open a future day sheet | Dots display one per subject colour, overflow shows `+N` with tooltip list, future days display “Scheduled for this day,” today enables Revise. |
| Timeline zoom/pan/reset | Zoom in with controls, drag to pan, use Reset button, export PNG | Zooming clamps to minimum span, panning stays within domain, Reset returns to full range, export matches on-screen view including dotted exam markers when enabled. |
| Theme toggle persistence | Switch between light and dark from the header toggle, reload the page | Selected theme applies immediately across dashboard, calendar, and timeline; reload restores the last choice without flashes. |
| Progress today updates | Complete reviews until 100% | Progress band shows `{completed}/{total} reviews completed • {X}% complete` message and success state “Great work! You’ve completed today’s reviews.” |
| Backfill history accuracy | Subjects → expand subject → open Edit history → add Easy, Easy, Hard entries over the last month | Intervals extend after successive easies, shorten after the hard, and next due date matches the replayed schedule. |
| Duplicate merge prompt | Subjects → Edit history → add the same date twice | Merge warning appears and saving keeps a single entry with the highest quality. |
| Timeline per-subject view | Timeline → switch to Per subject → zoom and export | Mini-charts share axes, zoom/pan/reset apply to all, and export matches the on-screen grid. |

## Timeline zoom acceptance criteria

- Drag-to-zoom focuses on the time axis by default and enables rectangular X+Y zoom when Shift is held.
- Undo/Back steps through the zoom stack and Reset returns to the exact default domain.
- Pan respects data bounds and stays smooth when dragging with the mouse, trackpad, or touch.
- The X-axis uses date-only ticks and adapts density to the current zoom range.
- Exam markers and the Today line remain aligned at all zoom levels and appear in exports.
- Hover tooltips remain disabled so the inline topic labels near Today stay the sole annotation.
- Keyboard and touch affordances (shortcuts, pinch, two-finger pan) provide complete parity with pointer interactions.

## Timeline zoom QA checklist

- Dragging a selection narrower than roughly 10px does not trigger a zoom.
- Dragging across a multi-day span snaps to that range and updates axis ticks accordingly.
- Holding Shift while dragging resizes the retention scale along with the time window.
- Performing several zooms in a row allows Back to unwind the stack and Reset to restore the full timeline.
- Exporting to SVG or PNG after zooming preserves the visible range, markers, and axis formatting.
- Exam markers and the Today indicator stay locked to the correct dates across pans and zooms.
- Keyboard: press Z to toggle zoom mode, use Shift+Arrow keys to size the band, Enter to apply, and 0 to reset.
- Touch: pinch adjusts zoom, two-finger drag pans, and the on-screen Reset button restores the default domain.

## Execution cadence

- **Continuous Integration**: Run `npm run lint` and `npm run test:visual` on every pull request.
- **Release validation**: Perform a manual exploratory pass before tagging a release or pushing to production.
- **Post-deployment**: If an incident occurs, re-run the Playwright suite locally to confirm the fix.

## Environments

- **Local development**: `npm run dev` (Next.js dev server)
- **Preview/staging**: Optional Vercel preview deployment per pull request.
- **Production**: Static hosting or `npm run start` on a Node.js server.

## Test data management

- Playwright tests bootstrap their own data using the Zustand store helpers. No external fixtures are required.
- Manual testing can import/export data by copying the serialized JSON from `localStorage.getItem("spaced-repetition-store")`.

## Ownership

- The engineering team maintains automated tests. Contributors must update or extend Playwright specs when changing primary flows.
