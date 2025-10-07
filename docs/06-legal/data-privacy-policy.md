# Data Privacy Policy

## Introduction
The Spaced Repetition App is designed as a local-first tool. All personal study data remains on the user’s device unless exported manually. This policy outlines how data is handled and what responsibilities contributors have when modifying data flows.

## Data collection
- The application does not transmit subject, topic, or review data to external servers.
- Optional analytics integrations (if enabled in the future) must be opt-in and documented transparently.
- Support channels may collect user-submitted information through GitHub issues or discussions.

## Data storage
- Data is stored in the browser’s `localStorage` via Zustand persistence.
- Clearing browser data or using private browsing modes may remove stored information.
- Users can export their data as JSON for backup before clearing storage.

## User controls
- Users may delete subjects, topics, and history entries at any time.
- Export functionality allows users to retain copies of their information.
- Reset option clears all local data without contacting external services.

## Third-party services
- No third-party APIs are used by default.
- If optional services (analytics, error tracking) are introduced, document:
  - Data sent (payload structure, frequency)
  - Purpose of collection
  - Opt-in/opt-out mechanisms
  - Links to third-party privacy policies

## Security
- Local storage relies on browser security; encourage users to secure their devices.
- Do not store sensitive personal data beyond study-related content.
- Review dependencies for known vulnerabilities using automated tooling.

## Contributor responsibilities
- Document any change that alters data collection or storage in this policy and release notes.
- Ensure new features respect privacy by default and minimise data exposure.
- Provide migration guidance if data structures change, allowing users to retain control.

## Contact
For privacy questions or concerns, contact maintainers via the channels in `docs/00-overview/communication-plan.md`.

## Policy updates
- Review this policy at least annually or when new data flows are introduced.
- Version changes should be recorded in release notes and communicated to users.
