# TESTING

## Scope

- Critical UI flows: create/edit topics, mark reviews, adjust history, export charts.
- State integrity: persistence across reloads, auto-skip at midnight, retention trigger updates.
- Visual regressions: timeline, dashboard metrics, and navigation consistency.

## Tooling

| Type | Command | Notes |
| --- | --- | --- |
| Static analysis | `npm run lint` | ESLint + TypeScript with `eslint-plugin-jsx-a11y`. |
| Curve unit tests | `npm run test:curve` | Validates forgetting-curve maths in `src/lib/forgetting-curve.ts`. |
| Playwright smoke | `npm run test:visual` | Boots demo data, runs through Today, Dashboard, Timeline, Subjects, Settings. |
| Manual exploratory | `npm run dev` | Keyboard shortcuts, responsive layout, import/export, accessibility sweeps. |

## Core scenarios

| Scenario | Steps | Expected |
| --- | --- | --- |
| Revise daily guard | Review a topic via Today, attempt again before midnight. | Second attempt blocked with toast “Available again after midnight.” |
| History replay | Subjects → open **Edit history** → add Easy/Easy/Hard spread over a week. | Next review recalculates, stability log shows growth then penalty. |
| Timeline zoom | Zoom with drag, Back out, Reset, export PNG. | Zoom stack works, export matches visible range including markers. |
| Theme persistence | Toggle dark/light via header, reload. | Theme remains consistent without flash of incorrect theme. |
| Auto-skip summary | Enable auto-skip, advance clock, reload. | Banner summarises how many topics were rescheduled. |
| Import validation | Settings → Import data → load malformed JSON. | Modal reports validation errors, nothing persists. |
| Keyboard access | Use `/` shortcut on Dashboard, Tab through nav, operate Timeline with keyboard. | All commands respond, focus outlines visible. |

## Regression checklist

1. Run `npm run lint`.
2. Execute `npm run test:curve` and `npm run test:visual`.
3. Manually verify Today, Timeline, Subjects on mobile width (375px) and desktop (1280px).
4. Export Timeline PNG and CSV reviews; confirm downloads succeed.
5. Toggle themes and density, confirm settings persist.

## Release flow

- Feature branches must include updated/added tests when altering store logic or UI flows.
- Before release, run all commands above plus a manual accessibility sweep using Axe or Lighthouse.
- After deployment, monitor the Settings auto-skip banner and timeline export for anomalies.

[Back to Docs Index](../DOCS_INDEX.md)
