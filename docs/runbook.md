# Runbook

This runbook helps troubleshoot common production issues. Because the app is local-first, "production" usually means a static deployment (e.g., Vercel) that serves the compiled Next.js bundle.

## Service overview

- **App**: Next.js single-page experience served from `npm run start` or a static hosting provider.
- **State**: User data is persisted in `localStorage` under the `spaced-repetition-store` key.

## Monitoring checklist

- Confirm that the deployment loads without console errors in the browser DevTools.
- Verify that `localStorage.getItem("spaced-repetition-store")` returns data after creating a topic.
- Check that the "Review Today" count updates when marking a topic as reviewed.
- Run the modal overlay checklist: open Quick Revision, confirmation dialogs, and dropdowns to ensure no clipping or scroll lock regressions.
- Toggle the Subjects dropdown on Dashboard, Calendar, and Timeline to confirm the shared filter stays in sync.

## Common incidents

### The dashboard renders blank

1. Open the browser console and look for hydration or JavaScript errors.
2. Clear `localStorage` for the origin to remove corrupted state.
3. If the issue persists, redeploy using the latest `main` build and re-run Playwright smoke tests locally (`npm run test:visual`).

### Topics fail to persist between refreshes

1. Verify the site is served over HTTPS or `localhost` so the browser allows storage.
2. Check browser privacy settings or extensions that might block `localStorage`.
3. Ensure the `persist` configuration in `src/stores/topics.ts` still uses the `localStorage` storage adapter.

### Hydration mismatch warnings appear

1. Inspect the console output—Next.js will flag the specific component.
2. Confirm affected components are wrapped in `"use client";` when they depend on browser APIs.
3. Check that any date or random ID generation happens inside `useEffect` or is guarded with `useIsomorphicLayoutEffect`.
4. Re-run `npm run lint` to catch accidental server-only usage of client hooks.

### Review intervals look incorrect

1. Confirm the subject's exam date is set correctly in the UI.
2. Inspect `src/lib/date.ts` to ensure the interval calculation helpers have not been modified unexpectedly.
3. Use the "Skip" control on a topic to reschedule evenly and observe whether the new schedule matches expectations.

### Timezone sanity checks

1. Open Settings and confirm the timezone field matches the learner's expectation.
2. Visit the dashboard and confirm the Progress Today band resets at local midnight (compare timestamps in dev tools if needed).
3. Use the Reviews view—due ordering should align with the selected timezone.

### Calendar dots or exam markers missing

1. Confirm each subject has a colour and (optionally) an exam date in `/subjects`.
2. On `/calendar`, hover a day with `+N` overflow to ensure tooltips list each subject; verify dots adopt the subject colour.
3. On `/timeline`, toggle "Exam markers"—dotted lines should appear for subjects with exam dates and match the legend tint.
4. Use the export controls to ensure the markers are present in SVG/PNG output.

## Deployment rollback

Revert to the previous deployment by re-running `npm run build` from the last known-good commit and redeploying. Because the app is static, rollbacks are typically instantaneous once the hosting provider switches the active build.

## Escalation

- **Primary**: Front-end developer responsible for the latest release.
- **Secondary**: Project maintainer listed in `package.json` (update as needed).
