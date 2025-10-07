# System Architecture

## Overview
The Spaced Repetition App is a client-side Next.js 14 application using the App Router. It delivers a local-first experience with state management powered by Zustand and persistence via `localStorage`. The architecture emphasises predictable rendering, accessible UI primitives, and robust documentation.

## High-level components
- **Next.js App Router** – Handles routing, layout composition, and server-rendered entry points.
- **React components** – Encapsulate UI logic for dashboard widgets, review flows, and subject/topic forms.
- **Zustand stores** – Manage subjects, topics, retention settings, and timeline selections with persistence middleware.
- **Utility layer** – Shared helpers in `src/lib/` providing date math, forgetting-curve calculations, and formatting.
- **Styling** – Tailwind CSS classes with custom configuration in `tailwind.config.ts` and theme-specific palettes.
- **Testing harness** – Playwright, unit tests, and linting orchestrated via npm scripts and GitHub Actions.

## Data flow
1. User actions (create subject, log review, change settings) dispatch updates to Zustand stores.
2. Stores apply business rules (e.g., retention calculations) and synchronise snapshots to `localStorage`.
3. React components subscribe to relevant slices, triggering re-renders with updated data.
4. Derived metrics (due counts, streaks, timeline curves) are recomputed on the fly using memoised selectors.
5. Visualisations render via reusable chart components configured for accessibility and keyboard control.

## Module boundaries
- `src/app/` – Route segments and layout definitions; minimal business logic.
- `src/components/` – Presentational and container components, grouped by feature.
- `src/stores/` – Zustand store definitions and persistence wiring.
- `src/lib/` – Pure utilities for scheduling math, formatting, and constants.
- `src/types/` – Shared TypeScript interfaces and enums.

## Integration with documentation
Architecture updates are recorded here and mirrored in `docs/core/ARCHITECTURE.md`. This document summarises the current state for stakeholders needing a concise overview, whereas the core docs provide deep dives and diagrams.

## Quality considerations
- Components avoid blocking asynchronous operations by using suspense-friendly patterns when necessary.
- Hooks encapsulate data access and derived state to prevent duplicated logic.
- Strict TypeScript configuration catches potential runtime issues early.
- Accessibility is enforced through semantic markup, ARIA attributes, and focus management.

## Future evolution
- Potential introduction of service workers for offline caching beyond local storage.
- Optional API routes for import/export or integration with third-party study tools.
- Modularisation of charts into a shared library for reuse across other apps.
