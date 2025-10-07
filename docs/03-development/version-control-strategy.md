# Version Control Strategy

## Repository model
- Hosted on GitHub with default branch `main`.
- Contributors fork or create feature branches from `main`.
- Pull requests require at least one maintainer review before merge.

## Branching conventions
- `main` – Always releasable; protected by required status checks (`npm run lint`, tests, Playwright smoke).
- `feature/{short-description}` – Feature work or enhancements.
- `fix/{issue-number}` – Bug fixes tied to GitHub issues.
- `docs/{topic}` – Documentation-only updates.
- `chore/{task}` – Tooling or dependency maintenance.

## Commit style
- Use imperative mood in commit messages (e.g., “Add timeline hover states”).
- Reference issues in commit body when applicable (`Refs #123`).
- Group related changes into logical commits; avoid mixing unrelated updates.

## Pull request workflow
1. Create a branch from `main`.
2. Implement changes and update tests/documentation.
3. Run required checks locally (`npm run lint`, relevant tests).
4. Open PR using `.github/PULL_REQUEST_TEMPLATE.md`; include screenshots for UI changes.
5. Address review feedback promptly; squash or rebase as needed.
6. Maintainer merges via squash-and-merge to keep history linear.

## Release tagging
- Each production release tags `main` with semantic versioning `vX.Y.Z`.
- Tag creation triggers release notes update in `docs/05-operations/release-notes.md` and `CHANGELOG.md`.
- Hotfixes increment patch version and document scope clearly.

## Issue tracking integration
- Use issue templates for bugs, features, and general questions.
- Link PRs to issues using GitHub keywords (`Fixes #123`).
- Close stale issues after 30 days of inactivity with automated reminders.

## Code review expectations
- Reviewers focus on correctness, readability, test coverage, and adherence to guidelines.
- Authors respond to every comment and summarise follow-up actions.
- Approval requires passing status checks and at least one reviewer sign-off.

## Documentation
- Update this document when branching or review policies change.
- Reflect automation updates (e.g., new required checks) in `.github/workflows/ci-cd.yml` and release notes.
