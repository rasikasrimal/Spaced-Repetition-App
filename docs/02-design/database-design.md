# Data Model and Persistence Design

## Overview
The application uses browser-based storage through Zustand's `persist` middleware backed by `localStorage`. Data structures are serialised JSON objects keyed by store namespace. Despite the absence of a remote database, the model mirrors typical relational concepts for clarity and potential future sync features.

## Entities
### Subject
| Field | Type | Description |
| --- | --- | --- |
| `id` | string (UUID) | Unique identifier for the subject. |
| `name` | string | Display name shown throughout the UI. |
| `icon` | string | Identifier for the Lucide icon used in the UI. |
| `color` | string | Hex or Tailwind colour token representing the subject. |
| `examDate` | string \| null | ISO date string for optional exam countdown. |
| `createdAt` | string | ISO timestamp of creation. |
| `updatedAt` | string | ISO timestamp of latest modification. |

### Topic
| Field | Type | Description |
| --- | --- | --- |
| `id` | string (UUID) | Unique identifier for the topic. |
| `subjectId` | string | Foreign key referencing `Subject.id`. |
| `title` | string | Topic title displayed in lists and timeline. |
| `notes` | string | Markdown-compatible notes entered by the learner. |
| `status` | enum (`active`, `archived`) | Controls visibility in dashboards. |
| `history` | ReviewEvent[] | Ordered array of review entries. |
| `createdAt` | string | ISO timestamp of creation. |
| `updatedAt` | string | ISO timestamp of latest modification. |

### ReviewEvent
| Field | Type | Description |
| --- | --- | --- |
| `date` | string | ISO date/time when the review occurred. |
| `quality` | number | Learner-reported score impacting the forgetting curve. |
| `interval` | number | Days until the next scheduled review. |
| `retention` | number | Predicted retention percentage post-review. |

### Settings
| Field | Type | Description |
| --- | --- | --- |
| `retentionThreshold` | number | Percentage threshold marking topics as due. |
| `theme` | enum (`light`, `dark`, `system`) | UI theme preference persisted between sessions. |
| `timezone` | string | IANA timezone used for daily reset calculations. |

## Relationships
- One `Subject` has many `Topic` records.
- Each `Topic` has many `ReviewEvent` entries ordered chronologically.
- Settings apply globally per user/device.

## Persistence keys
- `sr-subjects` – Serialised array of subjects.
- `sr-topics` – Serialised array of topics with embedded review history.
- `sr-settings` – Global preferences.
- `sr-ui-state` – Optional UI view state (filters, timeline selections).

## Data integrity strategies
- Updates to subjects cascade to topics by updating derived fields (colour, icon) on render rather than duplication.
- Review history merges deduplicate same-day entries to maintain a single record per day.
- Persistence middleware versioning allows migrations when data structures evolve; transformations are documented alongside release notes.

## Migration approach
When schema changes occur:
1. Increment the persistence version in the store configuration.
2. Provide a migration function that transforms existing state to the new shape.
3. Document migration steps in `docs/03-development/configuration-management.md` and release notes.
4. Add regression tests for legacy snapshots when possible.

## Future considerations
- Evaluate IndexedDB for larger datasets or attachments.
- Provide optional encrypted exports for cross-device transfer.
- Expose a JSON schema to support third-party integrations.
