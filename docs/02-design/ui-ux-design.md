# UI/UX Design Summary

## Design principles
- **Clarity first** – Prioritise typography, spacing, and iconography that support quick scanning and comprehension.
- **Accessible colour** – Maintain WCAG AA contrast ratios in light and dark themes using the curated palettes documented in `docs/ui/THEME_GUIDE.md`.
- **Flat aesthetic** – Avoid heavy shadows; use crisp borders and subtle gradients on charts to align with the brand.
- **Responsive layouts** – Ensure experiences adapt from small laptop screens to large desktops with consistent interactions.
- **Predictable motion** – Apply lightweight Framer Motion transitions to reinforce hierarchy without causing distraction.

## Key screens
### Dashboard
- Displays today’s due topics, upcoming schedule, and streak metrics.
- Includes subject filters, timeline preview, and theme toggle access.
- Uses cards with consistent padding and border radius; primary actions anchored to the bottom right on wide layouts.

### Reviews workspace
- Presents a focused card highlighting topic details, past performance, and the next scheduled review.
- Provides review quality buttons with descriptive tooltips and keyboard shortcuts.
- Enforces the “one review per topic per day” rule with inline messaging.

### Timeline
- Offers combined and per-subject views with zoom, pan, and fullscreen controls.
- Overlays exam markers, today line, and retention curves.
- Includes hover interactions that surface exact review dates and predicted retention.

### Subjects and Topics management
- Subject list uses badges for exam countdown and review load.
- Topic editor supports Markdown notes and history backfill modal.
- Colour pickers and icon selectors feature keyboard-friendly focus rings.

## Navigation
- Primary navigation sits in the left rail on desktop and collapses into a top bar on narrow viewports.
- Breadcrumbs or page headers clarify context for deeper routes.
- Quick actions (add subject/topic) are accessible via header buttons or keyboard shortcuts.

## Accessibility checklist
- All form elements have associated labels or `aria-label` attributes.
- Focus order follows visual layout; skip links allow jumping to main content.
- Dark mode uses light text on deep slate backgrounds with minimum contrast ratio of 4.5:1.
- Charts provide text equivalents summarising key metrics for screen reader users.

## Design assets
- Wireframes stored in `assets/wireframes/` provide baseline layouts for dashboard and timeline.
- Diagram exports in `assets/diagrams/` illustrate data flows and component interactions.
- Reference imagery in `assets/references/` captures palette inspiration and iconography.

## Review process
- Design changes require review from the design lead for accessibility and consistency.
- Significant UI updates trigger documentation refresh in `docs/ui` and screenshot updates for release notes.
- UI polish tasks are grouped with QA to verify focus states, keyboard navigation, and responsive behaviour.

## Future enhancements
- Expand motion guidelines to include micro-interactions for review success states.
- Explore a high-contrast theme variant tailored to low-vision users.
- Evaluate dynamic layout presets for large study libraries (e.g., table vs. board views).
