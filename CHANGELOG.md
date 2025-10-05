# Changelog

## [Unreleased]
### Added
- Adaptive review scheduler that recalculates next sessions whenever predicted retention drops below the user-defined trigger.
- Global revision preference slider in Settings with real-time forgetting-curve preview and mode toggle.
- Documentation for the retention model, adaptive UI, and validation strategy, including testing notes and algorithm overview.

### Changed
- Timeline, Subjects, and Reviews pages now surface the active retention trigger to explain upcoming adaptive sessions.
- Topic creation aligns new cards with the global retention threshold automatically.

### UI: Exam Date Badge Improvements
- Fixed poor color contrast for exam-date badge on Reviews page.
- Improved visibility under light/dark themes.
- Standardized exam badge color palette (amber tones).
- Added hover/focus transitions and accessibility attributes.

### Dashboard UI & Chart Refinements
- Default the dashboard status filter to "Due today" and persist the preference across sessions.
- Unify the filter button group with uppercase primary styling, horizontal scroll, and accessible focus rings.
- Introduced a hoverable review-load chart with lighter grid lines, accent gradients, and responsive tooltips.
- Tidied the search, filters, and chart layout so controls remain on a single row and the clear-filters action uses muted inline text.
