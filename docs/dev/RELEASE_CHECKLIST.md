# RELEASE_CHECKLIST

## Pre-release

1. Update `CHANGELOG.md` and `README.md` quick links if new docs or routes were added.
2. Verify package versions: run `npm install` and check for security advisories (`npm audit`).
3. Execute `npm run lint`, `npm run test:curve`, and `npm run test:visual`.
4. Manually verify Today, Timeline, Subjects, and Settings on mobile (375px), tablet (768px), and desktop (1280px).
5. Export Timeline PNG + CSV reviews to confirm downloads function.
6. Toggle themes, density, and motion preferences; ensure persistence across reloads.
7. Validate accessibility using Axe DevTools in both themes and confirm keyboard-only flows succeed.
8. Capture updated screenshots (Today hero, Timeline, Settings) for release notes.

## Packaging

- Run `npm run build` to produce the production bundle.
- Inspect `.next/` output size; investigate if gzipped assets exceed 5 MB.
- Run `npm run start` locally and smoke test key routes.
- Back up `summary.json` or docs index if automation depends on it.

## Deployment

- Deploy to Vercel preview or target hosting provider.
- Smoke test the preview URL using the release build; ensure `NODE_ENV=production`.
- Confirm environment variables (`NEXT_PUBLIC_` flags) match production defaults.
- Double-check analytics or error reporting toggles if present.

## Post-release

- Publish release notes summarising major UI and algorithm updates.
- Monitor browser console and network tab for errors, especially persistence warnings.
- Review Settings auto-skip banner and Today queue for anomalies on first load.
- Invite at least one teammate to run a quick exploratory pass.
- Archive the previous release’s screenshots and docs snapshot.

## Rollback plan

- Keep the previous build available (Vercel preview or static export) for immediate rollback.
- Document rollback steps in the incident log if a release is reverted.
- Notify learners via in-app banner or change log if significant regressions occur.

[Back to Docs Index](../DOCS_INDEX.md)
