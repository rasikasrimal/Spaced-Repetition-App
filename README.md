# Spaced Repetition App

The Spaced Repetition App is a local-first study companion built with Next.js, Tailwind CSS, and Zustand. It helps learners capture topics, organise them by subject, and keep a personalised review cadence that respects exam cut-offs and daily revise limits.

## Quick links

- [Project description](DESCRIPTION.md)
- [Architecture](docs/architecture.md)
- [Runbook](docs/runbook.md)
- [Test plan](docs/test-plan.md)
- [Security notes](docs/security.md)
- [OpenAPI stewardship](docs/openapi.yaml)
- [UI style audit](docs/ui-style-audit.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## What changed recently

- Centralised subject identity management so topics inherit icon and colour directly from their subject badges across dashboard, calendar dots, and exam markers.
- Refreshed the Reviews page with clearer caught-up messaging, timezone-aware due ordering, and a direct link back to the schedule view.
- Made timezone selection in Settings the source of truth for local-midnight resets and all relative dates.

## Key concepts

- **Subject** – The canonical home for icon, colour, and optional exam date. Editing a subject updates every topic, calendar dot, and timeline marker instantly.
- **Topic** – A single study card with notes, reminder preferences, and spaced intervals. Topics inherit identity from their subject and can be reviewed once per local day.
- **Review** – A logged study event that advances the interval schedule. Early reviews honour the learner’s auto-adjust preference.
- **Calendar dots** – One dot per subject per day in the calendar view, tinted by subject colour with overflow summarised as `+N`.
- **Timeline markers** – Dotted vertical exam indicators in the subject’s colour, visible in exports and toggleable from the toolbar.
- **Revise daily rule** – Each topic can be revised once per local calendar day based on the profile timezone; locked attempts surface “You’ve already revised this today. Available again after midnight.”

## Backfill past study

- Expand a subject on the Subjects page and choose **Edit history** to log previous review dates and qualities.
- The history editor merges duplicate days, replays the forgetting model chronologically, and recalculates the next due date with load smoothing.
- Saving emits a toast (“History saved. Schedule and timeline updated.”) and refreshes the dashboard, calendar, and timeline immediately.

## Per-subject timeline

- Use the **View: Combined • Per subject** switch on the Timeline to render small multiples grouped by subject.
- Zoom, pan, and reset controls remain synchronised across every mini-chart, and exports capture the exact grid layout.
- Exam markers and the Today line respect per-subject filtering so the view matches the combined summary.

## How to zoom

- Drag across the timeline to zoom the time range; hold Shift to include the retention axis.
- Use the Back control or the `-` shortcut to step out, and Reset or `0` to return to the full schedule.
- Keyboard: `+`/`-` adjust zoom, `Z` toggles zoom select, Shift+Arrow keys size a selection, `Enter` applies it, and `Esc` cancels.
- Hold Space to pan with the mouse; right-clicking the chart also steps back one zoom level.
- Touch: pinch to zoom, use a two-finger drag to pan, and tap Reset to restore the full view.

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Testing

Run the lint suite to catch common issues and ensure the Playwright smoke tests still render the UI as expected:

```bash
npm run lint
npm run test:visual
```

`npm run test:visual` launches the bundled Playwright test suite, which validates critical UI flows and ensures the primary dashboard renders without regression.

## Deployment

Build a production bundle and start the optimised server:

```bash
npm run build
npm run start
```

Deployments can be hosted on any platform that supports Next.js 14 (for example, Vercel or a container image). The app persists data in the browser using Zustand's `localStorage` integration, so no external services are required.

## Tech stack

- Next.js 14 (App Router)
- React 18 with TypeScript
- Tailwind CSS with custom tokens
- Zustand for client-side state + persistence
- Radix UI primitives, Lucide icons, and Framer Motion for animation

## Project structure

```
src/
  app/(pages)/page.tsx      # Root page
  app/layout.tsx            # Global layout + fonts
  components/               # UI, forms, dashboard widgets
  stores/topics.ts          # Zustand state + persistence
  lib/                      # Utility helpers and constants
  types/                    # Shared TypeScript types
```

## Data persistence

All topics and categories are stored in the browser via `localStorage`. This keeps the app completely local and private. Clearing browser storage will remove saved topics.
