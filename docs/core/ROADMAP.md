# ROADMAP

## Vision

Deliver a focused, educational workspace that helps learners prioritise daily reviews while planning long-term study arcs. New capabilities should arrive gradually to preserve clarity and reinforce the Today → Dashboard → Timeline flow.

## Upcoming milestones

| Quarter | Initiative | Highlights | Status |
| --- | --- | --- | --- |
| Q2 | AI Help (Smart Study Assistant) | `/ai-help` conversational coach with suggested prompts, retention-aware advice, educational intent filter. | Discovery |
| Q3 | Notification panel | Bell icon with unread badge, right-side sheet for alerts, local persistence with future sync hooks. | Planned |
| Q3 | Template library | `/templates` browse + import, metadata filters (country, exam, year), verified badges. | Planned |
| Q4 | Navigation refresh | Introduce **More** dropdown to house AI Help, Templates, Notifications, Settings without crowding tabs. | Planned |

## AI Help scope

- Split layout: chat composer left, stats summary right (retention, streaks, risk spikes).
- Guardrails: educational intent classifier, reject off-topic queries politely.
- Prompts: curated suggestions ("Help me prepare for Chemistry in 2 weeks"), plus history of custom questions.
- Output: concise action plans that reference timeline data, overdue topics, and difficulty modifiers.

## Notifications scope

- Triggered by retention dropping below thresholds, long gaps since last review, or admin updates.
- Card layout with icon, title, copy, timestamp, optional action buttons.
- Persistence via Zustand today; prepare backend sync for multi-device later.

## Templates scope

- Allow importing JSON bundles of subjects/topics/exams.
- Provide filters for geography, exam board, level, and verification state.
- Support ratings/upvotes; highlight verified templates.

## Research backlog

- AI tutor voice customisation (tone, level of detail).
- Study streak reminders delivered via push/email once sync exists.
- Shared cohorts for classrooms (subject templates + group analytics).

[Back to Docs Index](../DOCS_INDEX.md)
