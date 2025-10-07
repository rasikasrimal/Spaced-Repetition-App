# Software Requirements Specification (SRS)

## 1. Introduction
### 1.1 Purpose
This SRS captures functional and non-functional requirements for the Spaced Repetition App. It provides a shared reference for engineering, design, and QA teams as they plan releases, develop features, and assess scope changes.

### 1.2 Intended audience
- Product owner and roadmap stakeholders
- Engineering and design contributors
- QA and documentation teams
- External collaborators assessing integration feasibility

### 1.3 Scope
The application is a browser-based study companion that schedules topic reviews using a forgetting-curve algorithm. It stores all data locally, supports light/dark themes, and offers dashboards, timelines, and review screens tailored to the learner's study plan.

### 1.4 Definitions
- **Subject** – A container for topics with shared colour, icon, and optional exam date.
- **Topic** – A study item with notes and review schedule metadata.
- **Review** – A logged study event that recalculates the next due date.
- **Retention trigger** – Target confidence percentage that determines when a topic becomes due.

### 1.5 References
- `docs/core/ALGORITHMS_FORGETTING_CURVE.md`
- `docs/core/DATA_MODEL.md`
- `docs/ui/UI_GUIDELINES.md`
- `docs/dev/TESTING.md`

## 2. Overall description
### 2.1 Product perspective
The app is a standalone web experience built with Next.js 14 using the App Router. It relies on browser storage (Zustand + localStorage) and does not require a backend service. All logic executes client-side and updates the UI in real time.

### 2.2 Product functions
- Create, edit, archive, and delete subjects.
- Create, edit, review, and delete topics belonging to subjects.
- Display dashboards summarising due topics, streaks, and exam countdowns.
- Render a timeline with forgetting-curve visualisations and filters.
- Provide review workflows with spaced repetition intervals and skip options.
- Offer theme toggles, settings, and profile preferences.

### 2.3 User characteristics
Primary users are students or lifelong learners who prefer structured revision schedules. They expect an intuitive interface, accessible navigation, and the ability to study offline. Secondary users include maintainers who manage releases and documentation.

### 2.4 Constraints
- Offline-first design prohibits reliance on remote APIs or databases.
- Browser local storage size limits apply (approx. 5–10 MB depending on browser).
- Accessibility requirements mandate WCAG AA colour contrast and keyboard navigability.
- CI/CD must complete within the limits defined by GitHub Actions workflow timeouts.

### 2.5 Assumptions and dependencies
- Users run the app in modern browsers (Chrome, Firefox, Safari, Edge).
- Device memory and CPU are sufficient to render charts and animations smoothly.
- Users understand basic CRUD operations for managing subjects and topics.

## 3. Functional requirements
### 3.1 Subject management
1. The system shall allow users to create subjects with a name, colour, and icon.
2. The system shall optionally store an exam date per subject and display countdowns.
3. The system shall enable editing and deleting subjects, updating associated topics instantly.
4. The system shall show per-subject dashboards summarising upcoming workload.

### 3.2 Topic management
1. The system shall allow users to add topics to a subject with notes and review preferences.
2. The system shall store review history per topic and display it in the timeline.
3. The system shall prevent multiple reviews of the same topic within a calendar day.
4. The system shall allow manual history backfill while preserving chronological order.

### 3.3 Review scheduling
1. The system shall calculate spaced repetition intervals using the configured forgetting-curve algorithm.
2. The system shall display the predicted retention percentage per topic.
3. The system shall mark topics as due when retention falls below the configured threshold.
4. The system shall provide skip options with explanatory messaging when a topic is not due.

### 3.4 Dashboard and timeline
1. The system shall render a dashboard summarising due today, upcoming, and completed topics.
2. The system shall provide filters for subjects, difficulty, and date ranges.
3. The system shall render timelines with zoom, pan, and fullscreen capabilities.
4. The system shall surface per-subject revision tables and hoverable retention badges.

### 3.5 Settings and preferences
1. The system shall persist theme selection between sessions.
2. The system shall allow retention threshold adjustments in settings.
3. The system shall store timezone preferences for accurate daily reset logic.

## 4. Non-functional requirements
### 4.1 Performance
- Initial page load shall complete in under 2 seconds on a mid-range laptop with cached assets.
- Timeline interactions shall maintain 60 FPS on modern browsers during panning and zooming.

### 4.2 Reliability
- Data integrity must be preserved across page reloads by syncing Zustand state with localStorage.
- The system shall gracefully handle storage quota errors by notifying the user.

### 4.3 Usability
- All interactive elements shall have visible focus states.
- Colour contrast shall meet WCAG AA for text and UI components in both themes.
- Tooltips and helper text shall clarify complex scheduling concepts.

### 4.4 Security
- The app shall avoid transmitting personal data to remote servers.
- Dependencies shall be scanned through CI pipelines to detect vulnerabilities.

### 4.5 Maintainability
- Code shall follow the guidelines in `docs/dev/STYLE_GUIDE.md`.
- TypeScript strict mode must remain enabled; new code shall not introduce `any` types without justification.
- Documentation updates accompany feature changes.

## 5. Acceptance criteria
- All functional requirements are implemented and verified by automated and manual tests.
- Accessibility audits confirm WCAG AA compliance for target workflows.
- Release notes summarise shipped features and known limitations.

## 6. Future enhancements
- Optional cloud sync to share data across devices.
- Shared study plans or collaborative subject libraries.
- Mobile app wrappers for iOS/Android using the web codebase.
