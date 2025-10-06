# ROUTES

## App Router structure

| Route | File | Purpose | Notes |
| --- | --- | --- | --- |
| `/` | `src/app/(pages)/page.tsx` | Redirects to Today. | Server component that forwards to `/today`. |
| `/today` | `src/app/today/page.tsx` | Prioritised queue of overdue, due, and upcoming topics. | Hosts filters, revise-now actions, and revise metrics. |
| `/dashboard` | `src/app/dashboard/page.tsx` | High-level analytics: streaks, load charts, heatmaps. | Widgets subscribe to topic summaries and profile streaks. |
| `/timeline` | `src/app/timeline/page.tsx` | Retention curves, zoom controls, export actions. | Supports Combined and Per subject views. |
| `/subjects` | `src/app/subjects/page.tsx` | Manage subjects, exam dates, colours, and icons. | Includes expandable history editor. |
| `/subjects/[subjectId]` | `src/app/subjects/[subjectId]/page.tsx` | Subject detail with topic list filtered by owner. | Pre-populates forms with subject metadata. |
| `/topics/new` | `src/app/topics/new/page.tsx` | Multi-step wizard for creating a topic. | Seeded with defaults from the selected subject. |
| `/topics/[id]` | `src/app/topics/[id]/page.tsx` | Topic detail, notes editor, history timeline. | Allows manual backfill and schedule adjustments. |
| `/reviews` | `src/app/reviews/page.tsx` | Table of logged review events. | Supports CSV export and quick skip/reschedule actions. |
| `/calendar` | `src/app/calendar/page.tsx` | Calendar heatmap per subject. | Shares filters with Today and Dashboard. |
| `/settings` | `src/app/settings/page.tsx` | Profile, theme, appearance, and automation toggles. | Houses retention trigger slider and auto-skip controls. |

## Loading & error boundaries

Each route exports optional `loading.tsx` and `error.tsx` files when skeletons or error messaging diverge from the default. Today and Timeline have custom loading states to avoid jarring chart flashes.

## Metadata

Global metadata is defined in `app/layout.tsx`. Specific routes can export `generateMetadata` when a custom title or description is required (e.g., subject detail pages use the subject name as the title).

## Planned additions

- `/ai-help` – AI-assisted explanations for retention dips (roadmap).
- `/templates` – Saved study templates for exam crunch periods (roadmap).
- `/notifications` – Digest of review alerts and upcoming exams (roadmap).

[Back to Docs Index](../DOCS_INDEX.md)
