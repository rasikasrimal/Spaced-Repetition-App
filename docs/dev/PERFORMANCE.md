# PERFORMANCE

## Goals

- Keep initial load under 2.5s on mid-tier devices.
- Maintain <60ms interaction latency for Today queue actions.
- Ensure timeline zoom stays above 45fps on modern laptops.

## Rendering strategies

- Code-split heavy routes (`timeline`, `subjects/[subjectId]`, `topics/[id]`).
- Wrap charts in Suspense with skeleton placeholders to avoid blocking navigation.
- Memoise derived data (e.g., `useMemo` for sorted topics, `useCallback` selectors).
- Use CSS transforms instead of layout-affecting properties for hover states.
- Prefer CSS grid for dashboards to minimise layout thrash when cards resize.

## Data management

- Persisted stores only serialise primitives; large computed arrays (timeline series) are regenerated on demand.
- Auto-skip runs during idle periods with `requestIdleCallback` fallback to prevent jank on load.
- Debounce expensive search/filter operations (Today search uses 150ms debounce).
- Use lazy imports for CSV export helpers so Timeline loads quickly.

## Network & bundle

- Host fonts locally (Inter) to avoid layout shifts.
- Preload icons used on the main navigation.
- Monitor bundle analysis with `ANALYZE=true npm run build` when adding large dependencies.
- Tree-shake icon imports by referencing `lucide-react` components directly.
- Avoid shipping unused chart libraries; D3 and Recharts already cover current needs.

## Timeline optimisation checklist

1. Avoid re-creating D3 scales unless data length or domain changes.
2. Batch DOM writes via `requestAnimationFrame` during drag/zoom.
3. Limit the number of visible subjects before enabling opacity fade.
4. Use `pointer-events: none` on static overlays during animations.
5. Collapse shadow filters when CPU usage spikes; gradients handle depth.

## Monitoring

- Use Chrome Performance profiler on Today and Timeline before each release.
- Track `localStorage` size in Settings; warn when >4MB to prevent persistence failures.
- Observe Playwright trace viewer for slow steps; treat >2s actions as regressions.
- Record Lighthouse performance scores for both themes; aim for ≥90.

## Troubleshooting lag

- If Timeline scroll stutters, verify GPU acceleration is enabled and fall back to `will-change: transform` on the chart canvas.
- Rebuild with `npm run build` to test production bundles; dev mode is intentionally slower.
- Check console for warnings about long tasks triggered by `Intl.DateTimeFormat` in loops—cache formatters when necessary.

[Back to Docs Index](../DOCS_INDEX.md)
