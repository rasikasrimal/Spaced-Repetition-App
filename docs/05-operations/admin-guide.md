# Admin Guide

## Purpose
This guide supports maintainers responsible for deployments, monitoring, and user support.

## Access and roles
- **Maintainers** – Manage releases, triage issues, and oversee documentation.
- **Contributors** – Submit changes via pull requests; require maintainer approval to deploy.
- **Support contacts** – Respond to user inquiries routed through GitHub or communication channels.

## Routine tasks
- Review GitHub notifications daily for issues and PRs.
- Monitor CI pipeline status; resolve failing builds promptly.
- Update documentation when features or processes change.
- Track release readiness using the project board and QA report.

## Deployment responsibilities
- Follow the Build and Deployment Guide for each release.
- Ensure required checks pass before promoting to production.
- Announce releases in project communication channels with link to release notes.

## Incident response
1. Confirm the issue and gather context (browser, user actions, console output).
2. Check recent deployments and commits for potential regressions.
3. Reproduce locally; if confirmed, create a bug report entry and GitHub issue.
4. Decide on remediation: hotfix, rollback, or workaround communication.
5. Document incident summary and actions in `docs/04-testing/qa-report.md` and maintenance plan.

## User support workflow
- Encourage users to submit issues via the templates provided.
- For data concerns, remind users that information is stored locally and provide export instructions.
- Maintain a FAQ entry for recurring questions and update documentation accordingly.

## Access management
- Limit repository admin rights to trusted maintainers.
- Rotate access credentials for deployment platforms quarterly.
- Remove access when contributors exit the project.

## Tooling overview
- GitHub Actions for CI/CD.
- Playwright for automated smoke tests.
- Optional analytics (if enabled) for usage insights; ensure compliance with privacy policy.

## Reporting
- Compile monthly summaries of open/closed issues, release cadence, and community contributions.
- Share status updates during weekly meetings and capture follow-up tasks.

## Continuous improvement
- Hold retrospectives after significant releases or incidents.
- Track action items in the project board and review progress weekly.
- Update this guide as responsibilities evolve.
