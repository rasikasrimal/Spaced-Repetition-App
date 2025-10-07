# Coding Guidelines

## Languages and frameworks
- **TypeScript** – Strict mode enabled; avoid `any` unless type inference is impossible and include comments explaining exceptions.
- **React (Next.js 14)** – Prefer function components and hooks. Use the App Router conventions for layouts and page routes.
- **Tailwind CSS** – Use utility classes consistently; extract components when markup becomes complex or repeated.

## Project structure conventions
- Feature-specific components live in `src/components/{feature}/` with index files exporting public APIs.
- Shared hooks belong in `src/lib/` or `src/components/hooks/` with descriptive names.
- Zustand stores reside in `src/stores/` with selectors exported for reuse.
- Tests mirror the directory structure of the modules they cover.

## Styling
- Follow design tokens defined in `tailwind.config.ts`; avoid inline styles unless dynamic calculations are required.
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`) and ensure accessible labels.
- Keep class lists alphabetised where practical for readability.

## State management
- Use Zustand selectors to prevent unnecessary re-renders.
- Keep store updates immutable; return new objects/arrays when modifying state.
- Persist state using the built-in middleware and provide migrations when schema changes.

## Error handling
- Surface user-facing errors with inline messaging or toasts rather than console logs alone.
- Wrap asynchronous actions with appropriate try/catch blocks and log actionable details.
- Document known limitations in the QA report and release notes.

## Testing expectations
- Write unit or integration tests for new logic-heavy modules.
- Update Playwright smoke tests when UI flows change.
- Run `npm run lint` and relevant test suites before opening a pull request.

## Documentation
- Update the relevant Markdown files in `docs/` when behaviour, architecture, or processes change.
- Provide inline code comments sparingly; prefer self-documenting names and clear function signatures.
- Reference issues or PRs in doc updates to capture rationale.

## Pull request standards
- Keep PRs scoped to a single feature or fix when possible.
- Fill out the PR template with context, testing, and screenshots if UI changes are included.
- Request review from maintainers familiar with the affected area.

## Accessibility
- Ensure focusable elements use keyboard-friendly patterns and ARIA attributes when necessary.
- Validate colour choices against contrast requirements.
- Provide meaningful alt text for icons or decorative imagery as needed.

## Performance
- Avoid heavy computations in render paths; memoise derived data.
- Defer loading of large assets where possible.
- Measure expensive operations using the Performance panel and document optimisation strategies in `docs/dev/PERFORMANCE.md`.
