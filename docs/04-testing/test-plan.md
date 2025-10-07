# Test Plan

## Objectives
- Validate that core spaced repetition workflows function as expected.
- Ensure accessibility, performance, and offline requirements are met.
- Provide confidence for releases through automated and manual testing.

## Scope
### In scope
- Subject and topic CRUD operations.
- Review scheduling and timeline visualisations.
- Theme toggle, settings, and retention configuration.
- Data persistence across reloads.

### Out of scope
- Third-party integrations (none currently).
- Backend services (application is client-only).

## Test levels
- **Unit tests** – Cover utility functions, forgetting-curve calculations, and store selectors.
- **Integration tests** – Validate component interactions (forms, timeline charts).
- **End-to-end tests** – Playwright smoke suite verifying navigation, review flow, and settings persistence.
- **Accessibility checks** – Automated lint rules plus manual audits using browser tooling.

## Test environments
- Local development machines (macOS, Windows, Linux).
- CI pipeline via GitHub Actions using headless Chromium.
- Optional staging deployment mirroring production configuration.

## Test schedule
- Automated tests run on every pull request and `main` commit.
- Manual regression run before each release focusing on top workflows.
- Accessibility spot checks performed at least once per release cycle.

## Entry criteria
- Features implemented and merged into the release branch.
- Documentation and acceptance criteria finalised.
- Test cases updated to reflect new behaviour.

## Exit criteria
- All automated tests pass.
- No open high-severity bugs; medium severity issues have mitigation plans.
- QA report updated with results and outstanding risks.
- Product owner approves release readiness.

## Roles and responsibilities
- **Engineering** – Maintain automated tests, fix defects, update documentation.
- **QA contributors** – Execute manual test cases, record findings, verify bug fixes.
- **Product owner** – Reviews test summary and confirms release.

## Tools
- npm scripts: `npm run lint`, `npm run test:visual` (Playwright).
- Browser dev tools for performance and accessibility audits.
- GitHub Issues for defect tracking.

## Risk and mitigation
- Limited automated coverage for new features → Expand unit tests and add targeted Playwright scenarios.
- Flaky headless tests → Run retries in CI and investigate failures promptly.
- Documentation drift → Sync updates between test cases, QA report, and release notes.
