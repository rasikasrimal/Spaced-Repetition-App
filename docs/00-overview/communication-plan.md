# Communication Plan

## Objectives
- Keep stakeholders aligned on roadmap progress, risks, and upcoming releases.
- Provide contributors with clear channels for questions, reviews, and support.
- Capture decisions and document changes to ensure shared understanding.

## Stakeholder matrix
| Stakeholder | Role | Information needs | Preferred channel |
| --- | --- | --- | --- |
| Product owner | Prioritises backlog and approves releases | Weekly status, risk updates, metrics | Weekly call, project board |
| Technical lead | Oversees architecture and quality gates | Daily progress, blockers, CI status | Slack/Teams, GitHub issues |
| Design lead | Maintains UI direction and accessibility | Upcoming UI work, design reviews | Design stand-up, Figma comments |
| Contributors | Implement features and fixes | Task assignments, review feedback, style guidance | GitHub issues/PRs, async chat |
| Learners | End users | Release announcements, user tips | Docs site, changelog |

## Cadence
- **Daily (async)** – Stand-up updates posted in the project channel highlighting accomplishments, plans, and blockers.
- **Weekly** – 30-minute status call reviewing milestone burn-down, testing status, and risks. Meeting notes added to `/docs/summary.json` metadata and linked from the project board.
- **Release window** – Dedicated thread per release candidate covering QA status, outstanding issues, and go/no-go decisions.
- **Quarterly** – Roadmap review with product, technical, and design leads to assess strategy and adjust priorities.

## Channels
- **Project board** – GitHub Projects board tracking roadmap items, sprint backlog, and bug triage.
- **Issue tracker** – GitHub Issues with templates in `.github/ISSUE_TEMPLATE/` for bugs, features, and general feedback.
- **Pull requests** – Code review and discussion via GitHub PRs using the standard template.
- **Design workspace** – Shared Figma file referenced in `assets/wireframes/` for prototypes and UI explorations.
- **Documentation** – Authoritative references in the `docs/` hierarchy and root Markdown files.
- **Async chat** – Slack or Teams channel for quick questions, incident coordination, and pairing requests.

## Meeting structure
### Weekly status call
- Agenda: progress updates, metric review, risk discussion, decisions needed.
- Attendees: product owner, technical lead, design lead, invited contributors.
- Outcomes: updated action items, confirmation of scope or timeline adjustments.

### Release readiness review
- Agenda: demo features, review QA findings, confirm documentation updates, run deployment checklist.
- Attendees: product owner, technical lead, QA rep, release manager.
- Outcomes: go/no-go decision, assigned follow-up actions, published release notes draft.

### Retrospective (post-release)
- Agenda: review successes, identify pain points, decide on process improvements.
- Attendees: entire project team.
- Outcomes: actionable improvement items captured in backlog.

## Documentation of decisions
- Summarise key decisions in the relevant Markdown documents (e.g., architecture updates, SRS revisions).
- Link GitHub discussion threads or PRs when decisions stem from code reviews.
- Maintain a changelog of process adjustments in `docs/05-operations/maintenance-plan.md`.

## Escalation path
1. Attempt resolution asynchronously in the project chat or issue thread.
2. Escalate to technical lead for engineering blockers or design lead for UX conflicts.
3. If unresolved, schedule an ad-hoc meeting with the product owner to re-evaluate scope or timeline.
4. For critical incidents impacting releases, trigger the incident response checklist in `docs/dev/RUNBOOK.md`.
