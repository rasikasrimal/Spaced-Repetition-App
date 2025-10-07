# Project Charter

## Project overview
The Spaced Repetition App is a local-first study companion that helps learners capture topics, organise them by subject, and revisit material at optimal intervals. It delivers an adaptive review cadence powered by a forgetting-curve model while keeping data fully within the browser for privacy and reliability. The app is implemented with Next.js 14, React, Tailwind CSS, and Zustand, and ships with a flat, high-contrast design suitable for long study sessions.

## Vision and goals
- **Personalised learning** – Maintain subject- and topic-specific schedules that update instantly after every review so learners never lose momentum.
- **Offline-first reliability** – Provide a predictable experience without external services by persisting data locally and optimising for quick loads.
- **Accessible interface** – Offer a polished UI with light and dark themes, strong focus states, and responsive layouts that work on common study devices.
- **Maintainable product** – Document architecture, testing, and operational procedures to support community contributions and long-term stewardship.

## Scope
### In scope
- Subject and topic management, including icons, colours, and optional exam dates.
- Adaptive review scheduling with configurable retention targets and history backfill.
- Dashboard, timeline, and reviews views that surface current and upcoming workload.
- Local storage persistence, export options, and theming controls.

### Out of scope
- Cloud sync or multi-device account management.
- Real-time collaboration features.
- Mobile-native applications (mobile web layouts are supported instead).
- Paid subscription mechanics or gated premium features.

## Success metrics
- Learners can register and complete at least one full review cycle (initial study plus subsequent reviews) without guidance.
- 100% lighthouse accessibility score on key pages in both light and dark themes.
- Automated linting, unit tests, and Playwright smoke tests run green on every main-branch commit.
- Mean time to resolve documented issues remains under five business days.

## Stakeholders
- **Product owner** – Defines feature priorities, roadmap, and release cadence.
- **Technical lead** – Oversees architecture decisions, code quality, and review process.
- **Design lead** – Maintains the design system, theme palettes, and accessibility guardrails.
- **Contributors** – Community members proposing enhancements or fixes through pull requests.
- **Learners** – End users relying on the app to plan revision schedules.

## Constraints and assumptions
- The app must function entirely offline after the initial load and cannot rely on server persistence.
- Browser storage is the system of record; data resets if local storage is cleared.
- Only modern evergreen browsers are officially supported (Chrome, Firefox, Safari, Edge).
- Contribution workflow is based on GitHub pull requests and the documented code review guidelines.

## Deliverables
- Production-ready Next.js application with adaptive scheduling features.
- Comprehensive documentation set covering requirements, design, development, operations, and legal considerations.
- Automated quality gates (lint, tests, Playwright smoke run) integrated with CI.
- Release notes and user-facing guidance for every major update.

## Approval
This charter is approved when the product owner, technical lead, and design lead agree on scope, priorities, and resource allocation for the next major release cycle. Updates are versioned alongside the roadmap in `docs/core/ROADMAP.md`.
