# Explore

## Route
- **Path**: `/explore`
- **Entry component**: `src/app/explore/index.tsx`
- **Purpose**: discovery surface for community-sourced learning resources.

The page loads with a segmented control that mirrors a sidebar but keeps the layout compact. Tabs animate with accent-tinted hover states and switch the main content region without a full navigation change.

## Sub-features
Each sub-section is rendered inside a rounded card container with gradient-backed feature tiles. Data is currently seeded with illustrative fixtures to communicate intended structure.

### Short Notes
Quick reference summaries intended for rapid review.

| Field | Description |
| --- | --- |
| `id` | Stable identifier for note versioning and sharing. |
| `title` | Headline capturing the core takeaway. |
| `subject` | Subject taxonomy value. |
| `tags` | Array of topical chips displayed as accent badges. |
| `summary` | 1–2 paragraph synthesis shown in cards. |
| `author` | Contributor name. |
| `updatedAt` | Human-readable freshness label. |

### Study Plans
Structured pacing guides that can be imported into a learner’s workspace.

| Field | Description |
| --- | --- |
| `id` | Unique key for plan import/export. |
| `title` | Plan headline. |
| `duration` | Total length communicated in weeks. |
| `milestones` | Ordered list of milestone strings rendered as tags. |
| `summary` | Narrative description of focus and cadence. |
| `contributors` | Count of collaborators who iterated on the plan. |
| `lastImported` | Usage signal exposed as supporting text. |

### Flashcards
Deck metadata optimised for spaced repetition integration.

| Field | Description |
| --- | --- |
| `id` | Deck identifier used when cloning cards. |
| `title` | Deck name. |
| `subject` | Subject taxonomy grouping. |
| `difficulty` | Difficulty badge displayed in the UI. |
| `cards` | Total number of cards. |
| `summary` | Deck description with teaching approach notes. |
| `stats` | Highlighted performance or popularity metric. |

### Study Tips
Research-backed advice to reinforce effective study habits.

| Field | Description |
| --- | --- |
| `id` | Tip identifier. |
| `title` | Micro-headline summarising the advice. |
| `category` | Tag representing the cognitive strategy family. |
| `summary` | Explanation of the tactic and how to apply it. |
| `source` | Citation for transparency and credibility. |

## UX wireframe
- **Header**: accent-stamped breadcrumb (“Explore library”), hero headline, supporting copy.
- **Segmented control**: pill buttons with icon, label, and helper text; active pill is accent-filled and bold.
- **Content panel**: carded container with 24px padding (32px on desktop) that swaps between feature blocks.
- **Cards**: two-column grid on desktop, stacked on mobile; each card lifts (`hover:-translate-y-1`) with gradient shift to communicate interactivity.
- **Spacing**: 48px vertical rhythm separates header, control, and content for breathing room.
