# Risk Management Plan

## Approach
Risks are captured during discovery, refinement, and testing. Each entry is prioritised using probability and impact scores. Mitigations are incorporated into sprint planning, and high-severity risks are reviewed weekly with stakeholders.

## Risk register
| ID | Description | Probability | Impact | Category | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Local storage quota exceeded for heavy users | Medium | High | Technical | Warn user before reaching limits, provide export guidance, explore compression | Engineering lead |
| R2 | Accessibility regressions in new UI components | Medium | High | UX | Maintain automated accessibility linting, include design reviews, run manual audits in both themes | Design lead |
| R3 | Algorithm changes degrade retention accuracy | Low | High | Product | Validate adjustments against test datasets, provide feature flags, document in release notes | Product owner |
| R4 | CI pipeline failures delay releases | Medium | Medium | Process | Keep dependencies updated, parallelise tests, monitor workflow runtime | Technical lead |
| R5 | Documentation drift reduces contributor effectiveness | Medium | Medium | Process | Institute documentation review checklist in PR template, schedule quarterly audits | Documentation maintainer |
| R6 | Browser updates break local storage persistence | Low | High | Technical | Monitor browser release notes, maintain fallback export/import mechanism, add automated smoke tests | Engineering lead |
| R7 | Loss of design assets or version confusion | Low | Medium | UX | Store canonical assets in `assets/` repo folder with version tags, maintain change log in maintenance plan | Design lead |
| R8 | Knowledge silo if key maintainer unavailable | Medium | Medium | Team | Encourage shared ownership, rotate on-call duties, document runbooks | Technical lead |

## Monitoring
- Review risk register during weekly status call; update probability/impact as needed.
- Track mitigation tasks in the project board and assign owners.
- Highlight any risks reaching High/High severity in release readiness meetings.

## Contingency planning
- Document incident response steps in `docs/dev/RUNBOOK.md`.
- For data-related incidents, prepare communication templates and emphasise export availability.
- If a release must be rolled back, follow the rollback plan in `docs/03-development/build-deployment-guide.md` and update release notes.

## Reporting
- Summaries of risk changes are included in the QA report and release notes when relevant.
- Major risk resolutions or new threats trigger updates in the changelog or blog post to inform users.
