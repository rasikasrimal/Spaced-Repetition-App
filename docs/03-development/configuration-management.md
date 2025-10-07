# Configuration Management

## Objectives
- Maintain consistency across environments (local, preview, production).
- Document configuration changes and migrations to prevent drift.
- Provide recoverability when schema updates occur.

## Source control
- All configuration files (e.g., `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`) are versioned in Git.
- Updates require code review and should reference related documentation or issues.

## Application settings
- Primary configuration lives within the codebase. Runtime environment variables are minimal due to local-first design.
- Optional environment variables:
  - `NEXT_PUBLIC_BASE_PATH`
  - `NEXT_PUBLIC_ANALYTICS_ID`
- Document new variables in this file and `docs/05-operations/admin-guide.md`.

## Persistence migrations
- Zustand stores include version numbers to handle shape changes.
- When modifying data structures:
  1. Increment the version in the store definition.
  2. Provide a migration function converting stored state.
  3. Add regression tests if possible or manual QA steps.
  4. Document the change in release notes and this guide.

## Dependency management
- Use `package.json` and `package-lock.json` to lock dependencies.
- Renovate or Dependabot can automate updates; review each update for breaking changes.
- Record major dependency upgrades in the changelog and QA report.

## Build artefacts
- Production builds output to `.next/` and should not be committed.
- For container deployments, produce versioned images tagged with semantic versions.
- Store release artefacts in the deployment platform with retention policies.

## Documentation alignment
- Configuration changes that affect behaviour must be reflected in:
  - `docs/03-development/build-deployment-guide.md`
  - `docs/05-operations/maintenance-plan.md`
  - `docs/06-legal/data-privacy-policy.md` if user data handling changes

## Audit and review
- Quarterly configuration reviews ensure settings match documented expectations.
- Maintain a checklist of critical files (Tailwind config, Next config, lint rules) and verify they align with documented standards.
- Capture review outcomes in the maintenance plan.
