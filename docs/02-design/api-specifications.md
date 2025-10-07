# API Specifications

## Overview
The current application operates entirely client-side and does not rely on remote APIs. This specification captures existing internal interfaces and outlines how future service endpoints would integrate should cloud sync or sharing features be introduced.

## Internal interfaces
### Persistence hooks
- `useSubjectsStore()` – Zustand hook returning CRUD actions for subjects and derived selectors (counts, exam countdowns).
- `useTopicsStore()` – Provides topic CRUD, review logging, and forgetting-curve calculations.
- `useSettingsStore()` – Exposes retention thresholds, theme preferences, and timezone settings.

### Utility modules
- `calculateNextReview(history, retentionThreshold)` – Returns the next due date and predicted retention.
- `mergeHistoryEntries(existing, newEntry)` – Ensures chronological order and deduplication.
- `formatTimelineData(topics)` – Shapes timeline inputs for charts and tables.

## Hypothetical REST API (future consideration)
If remote sync is introduced, the following endpoints illustrate the direction:

### Authentication
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Obtain session token using email + password or OAuth provider. |
| POST | `/api/auth/logout` | Invalidate active session. |

### Subjects
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/subjects` | Retrieve all subjects for the authenticated user. |
| POST | `/api/subjects` | Create a new subject. |
| PATCH | `/api/subjects/{id}` | Update subject metadata. |
| DELETE | `/api/subjects/{id}` | Archive or delete a subject (with cascade rules). |

### Topics
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/topics` | Retrieve topics, optionally filtered by subject or status. |
| POST | `/api/subjects/{id}/topics` | Create a topic within a subject. |
| PATCH | `/api/topics/{id}` | Update topic details or retention settings. |
| DELETE | `/api/topics/{id}` | Archive or delete a topic. |

### Reviews
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/topics/{id}/reviews` | Append a review event and recalculate schedule. |
| GET | `/api/topics/{id}/reviews` | Fetch review history for export. |

### Settings
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/settings` | Retrieve user preferences. |
| PATCH | `/api/settings` | Update theme, retention, or timezone preferences. |

## Data formats
All endpoints use JSON payloads following the structures defined in `docs/02-design/database-design.md`. Responses include metadata for pagination where applicable.

## Error handling
- HTTP 400 – Validation errors with field-level messages.
- HTTP 401 – Authentication required.
- HTTP 403 – Action not permitted (e.g., accessing another user's subjects).
- HTTP 404 – Resource not found.
- HTTP 429 – Rate limit exceeded; responses include `Retry-After` header.
- HTTP 500 – Unexpected server error; log entry created and surfaced to monitoring tools.

## Security considerations
- All endpoints require HTTPS.
- Tokens stored in HTTP-only cookies or secure storage.
- Rate limiting and anomaly detection guard against abuse.
- Audit logs maintained per subject/topic mutation for enterprise deployments.

## Versioning
- Prefix future API routes with `/api/v1/` to support breaking changes.
- Document changes in release notes and update client adapters accordingly.

## Integration guidance
- Provide TypeScript SDK or generated client for remote APIs.
- Maintain parity tests comparing local persistence behaviour with server responses.
- Update this specification whenever new endpoints or internal interfaces are introduced.
