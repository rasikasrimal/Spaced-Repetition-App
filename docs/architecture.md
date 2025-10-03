# Architecture Overview

## System context

The Spaced Repetition App is a local-first Next.js 14 application. All data is stored in the browser via Zustand's `localStorage` persistence, so the runtime consists solely of the Next.js server (during development) or static assets served by a CDN or Node.js server in production.

```
┌───────────┐        ┌────────────────────────┐
│  Browser  │  HTTP  │  Next.js app (App Dir) │
│ (React UI)├────────►│  Components & Routes   │
└─────┬─────┘        └──────────┬────────────┘
      │ localStorage            │ Zustand store
      │                         ▼
      └─────────────── Persisted topic state ──▶
```

## Key modules

- **App Router (`src/app`)** – Hosts the landing dashboard and layout. Because the app is purely client-side, the primary entry point is `src/app/(pages)/page.tsx`.
- **UI components (`src/components`)** – Presentational and form components that render topic cards, subject summaries, and controls for adjusting review intervals.
- **State management (`src/stores/topics.ts`)** – A persisted Zustand store that encapsulates topics, subjects, and review metrics. It owns all mutations and enforces constraints (e.g., unique subject names, interval recalculation, exam date clamping).
- **Selectors (`src/selectors`)** – Derive computed values from the store, such as dashboard summaries, to keep components lightweight.
- **Lib utilities (`src/lib`)** – Date utilities, feature flags, and helper logic used across the app.

## Data flow

1. User interactions in the dashboard dispatch actions to the Zustand store (`useTopicStore`).
2. Store mutations update in-memory state, recalculate intervals, and append timeline events.
3. Persist middleware serializes the store into `localStorage` under the `spaced-repetition-store` key.
4. Components subscribe to slices of state and rerender automatically when the store changes.

## Deployment considerations

- The project targets modern evergreen browsers; no SSR-only APIs are used.
- Local persistence means deployments do not require a backing database, but users will lose data when clearing browser storage or switching devices.
- Feature flags in `src/lib/feature-flags.ts` can toggle experimental behaviors without code changes elsewhere.
