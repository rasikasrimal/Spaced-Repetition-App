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

### UI: Timeline Overlay Button Redesign
- Improved visibility of overlay toggle icons.
- Added consistent hover/active color logic for both themes.
- Balanced stroke weights for all icons.
- Enhanced keyboard focus and tooltips.

### Dashboard UI & Chart Refinements
- Default the dashboard status filter to "Due today" and persist the preference across sessions.
- Unify the filter button group with uppercase primary styling, horizontal scroll, and accessible focus rings.
- Introduced a hoverable review-load chart with lighter grid lines, accent gradients, and responsive tooltips.
- Tidied the search, filters, and chart layout so controls remain on a single row and the clear-filters action uses muted inline text.

### Dashboard Layout Update
- Repositioned the “Progress today” module directly beneath the daily summary cards so completion status appears before filters.
- Added soft divider rules above and below the progress module to separate major dashboard sections.
- Balanced spacing and headings to match surrounding sections in both light and dark themes.

### UI: Dashboard Summary Card Redesign
- Merged “Today’s Tasks” and “Progress Today” into a unified overview card.
- Added icons, emojis, and hover effects for engagement.
- Improved light/dark mode contrast.
- Progress indicator and motivational text are now contextually linked.

### Reviews Page Enhancements
- Fixed the runtime error triggered by the "All" filter by guarding invalid status lookups.
- Limited the “Skip today” shortcut to topics due today while keeping other actions available.
- Retired the review-load preview chart to focus on actionable rows.
- Rebuilt the reviews table with a responsive, GitHub-inspired layout, hoverable rows, and inline expansion for schedule and notes.

### Dark Mode Contrast Improvements
- Brightened core dark-mode text tokens to keep secondary copy legible against slate backgrounds.
- Raised muted and placeholder greys for improved hierarchy without sacrificing comfort.
- Updated status hues so overdue, upcoming, and exam accents clear WCAG contrast targets.
- Confirmed readability across dashboard summaries, tables, and subject cards in low-light themes.

### Timeline Layout Update
- Removed the redundant Next Review toggle along with explicit zoom/reset controls from the toolbar.
- Relocated fullscreen and export actions into the chart overlay for a lighter control surface.
- Added single-select subject chips and multi-select topic toggles so visibility is explicit.
- Clarified toolbar states with icon-only toggles and inline clear filters.
- Reorganised timeline sections to flow from subject selection into topic visibility, focused view, and upcoming checkpoints while dropping the redundant summary chips.

### Timeline UI Refinement
- Simplified the timeline toolbar into compact icon toggles, merging checkpoints and review markers into a shared milestones control and removing redundant theme/label switches.
- Limited the view to a single active subject with focus chips, subject badges, and scrollable filters so other subjects stay hidden until reselected.
- Added hover-aware chart styling with crosshair cursors, curve isolation on click, and lighter grid treatments for clearer comparisons.
- Hardened SVG/PNG exports with sanitized clones, cross-origin safeguards, and user-facing fallbacks when filters taint the canvas.

### Timeline Page Refactor
- Synced the “Subject selected” summary with the active subject chips so the chart stays clear until a subject is chosen.
- Rebranded the focus panel to “Topic focus,” added a back-to-subject control, and isolated topic curves immediately when a topic chip is pressed.
- Reordered the combined view with dividers separating the selector, summary, topic focus, and upcoming checkpoints for a cleaner hierarchy.
