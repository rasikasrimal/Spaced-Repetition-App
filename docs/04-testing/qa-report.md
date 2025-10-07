# QA Report

## Summary
Latest regression cycle executed prior to release `v1.0.0`. Focus areas included subject/topic CRUD, review scheduling accuracy, timeline interactions, and accessibility.

## Test execution
| Suite | Status | Notes |
| --- | --- | --- |
| Lint (`npm run lint`) | Pass | No warnings after updating components. |
| Playwright smoke (`npm run test:visual`) | Pass | Validated dashboard load, review flow, settings persistence. |
| Manual regression | Pass with notes | Minor cosmetic spacing issue logged as low severity. |
| Accessibility audit | Pass | Achieved WCAG AA; documented colour contrast checks. |

## Findings
| ID | Severity | Description | Status | Owner |
| --- | --- | --- | --- | --- |
| QA-001 | Low | Timeline tooltips overlap on very narrow screens | Open | Design | 
| QA-002 | Medium | Export download lacks filename timestamp | In progress | Engineering |

## Resolved issues
- QA-0005 – Settings slider accessibility label missing → Fixed in PR #215.
- QA-0006 – Review toast lingered beyond expectation → Timeout reduced to 3s.

## Recommendations
- Add automated tests covering history backfill flows.
- Investigate expanding smoke suite to include theme toggle verification.
- Consider capturing screenshot diffs for timeline on dark mode.

## Sign-off
- QA representative: _Pending_
- Product owner: _Pending_

Update this report after each regression cycle. Archive previous versions in release artifacts if desired.
