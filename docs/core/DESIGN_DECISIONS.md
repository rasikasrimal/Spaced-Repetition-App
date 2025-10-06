# DESIGN_DECISIONS

## Local-first architecture

We intentionally avoid a cloud backend so the app works offline, ships without an auth layer, and keeps study data private. All state stays in the browser and rehydrates via Zustand.

## Tab-first navigation

Research sessions showed that learners memorise "Today → Dashboard → Timeline → Subjects" as a linear check-in, with the profile menu handling settings and account actions. The header follows that order and keeps icons visible even on narrow devices. Planned features (AI Help, Templates, Notifications) will live behind secondary menus to avoid crowding the main tabs.

## Flat visual language

- No shadows on major surfaces; depth is communicated with borders and ambient gradients.
- Cards reuse a `card-interactive` utility to animate hover glows while preserving focus outlines.
- Light and dark themes use fixed hexadecimal palettes rather than generated tokens to guarantee consistent rendering offline.

## Timeline emphasis

Learners rely on the timeline to plan revision weeks. Decisions:

- Use mini tables under each subject chart to surface concrete review dates.
- Persist zoom, focus, and filter state through modal transitions so fullscreen study sessions feel stable.
- Provide direct export actions with transparent backgrounds so charts drop cleanly into slides.

## Daily cap enforcement

A strict "one review per topic per day" rule keeps workloads predictable. Attempts to review twice show a toast with the next available time. This guardrail prevents streak chasing and matches the retention model assumptions.

## Settings surface

- Settings exposes automation toggles (auto-skip overdue topics, auto-advance after reviews) with explanatory helper text.
- Retention trigger slider includes real-time copy such as "Reviews before 50% predicted recall".
- Theme, density, and motion controls live together so accessibility adjustments are a single tap away.

## Future direction

- Introduce AI Help overlays that explain why certain topics spike in risk.
- Ship notification digests once the roadmap adds a sync layer.
- Add template timelines for exam crunch to share consistent study plans across cohorts.

[Back to Docs Index](../DOCS_INDEX.md)
