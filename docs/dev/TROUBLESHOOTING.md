# TROUBLESHOOTING

## Timeline shows blank chart

- Confirm `localStorage` contains `spaced-repetition-store`; import demo data if empty.
- Check browser console for hydration warnings; rerun `npm run dev` to clear stale builds.
- Disable reduced motion and reload—older browsers occasionally miss the initial animation tick.

## Today queue stuck at zero

- Verify the daily limit slider in Settings. If set to 0, raise it to at least 5.
- Ensure auto-skip is not rescheduling everything into the future; read the banner for the latest adjustments.
- Clear filters (status, subject, difficulty) from the Today filter rail.

## Theme toggles but flashes the wrong palette

- Remove duplicate theme classes on `<body>` by clearing cached HTML (Ctrl+Shift+R).
- Make sure the browser allows `localStorage`; private browsing may block persistence.
- Confirm `ThemeManager` renders by checking the console for initialization logs.

## Import fails silently

- Check JSON formatting; the importer expects `{ subjects: [], topics: [], reviews: [] }` keys.
- Use the preview diff before committing; the dialog lists validation errors in red.
- Large files (>4 MB) may exceed storage limits—split exports by subject.

## Playwright cannot find selectors

- Update fixtures to match renamed components or data-testids.
- Run `npm run test:visual -- --headed` to observe the flow.
- Clear Playwright cache (`npx playwright test --clear-cache`).

## Reset actions did not clear data

- `Reset demo data` reseeds subjects/topics. Use `Clear everything` to wipe all stores.
- If state persists after clearing, open DevTools → Application → Storage and remove keys manually.


## Timeline export corrupted

- Ensure the browser allows canvas downloads; Safari private mode blocks them.
- Disable third-party extensions that modify download blobs.
- If PNGs appear blank, toggle the opacity fade off before exporting.

## State fails to persist after refresh

- Check the Application tab in DevTools to confirm `localStorage` writes are succeeding.
- Some privacy extensions block `localStorage`. Add an allowlist entry for localhost during development.
- As a fallback, copy the JSON export and reimport once storage is restored.

[Back to Docs Index](../DOCS_INDEX.md)
