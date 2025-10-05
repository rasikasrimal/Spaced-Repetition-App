# Future Plan

## Overall Vision
- Keep the app clean, educational, and focused on study progress.
- Integrate upcoming features gradually with a focus on usability, consistency, and scalability.

## New Features Roadmap (Implementation Order)

### 1. AI Help (Smart Study Assistant)
**Purpose**
- Provide data-driven learning suggestions using real performance data (retention, subject difficulty, review frequency, and related signals).

**Core Idea**
- Introduce an AI Help area that acts as an educational coach.
- Offer pre-made prompts and a free-form input box for performance-related questions.
- Example prompt: "My marks for Pure Mathematics are around 50%. How can I improve?" The assistant evaluates retention curves, missed topics, and review gaps to generate an action plan.

**Input Guardrails**
- Enforce educational intent with an intent classifier or rule-based filter.
- Reject off-topic inputs (for example, travel directions or AI model questions) and respond with: "This question is not related to your studies. Please use me for your educational progress or exam preparation."

**UI Plan**
- Replace the existing Settings link with a More dropdown that contains AI Help, Settings, Notifications, and Templates.
- Layout: left pane hosts the chat interface; right pane shows a stats summary (retention, reviews per subject) plus optional tabs for "My Questions" and "Suggested Prompts".

**Technical Notes**
- Add an /ai-help route.
- Back the assistant with a fine-tuned local model or API that can access retention, review frequency, missed topics, and subject difficulty.
- Keep responses concise, factual, and actionable.
- Priority: High (immediate engagement boost).

### 2. Notification Panel
**Purpose**
- Alert users to retention drops, overdue reviews, and product announcements.

**Triggers**
- Retention falls below a threshold (for example, 25%).
- Long gaps since the last revision.
- App announcements or developer messages pushed from an admin panel or configuration.

**UI Plan**
- Add a notification bell icon with an unread badge in the navigation bar.
- Clicking opens a right-side panel (Radix Drawer or shadcn Sheet) that lists notification cards with icon, title, message, timestamp, and optional "Mark as read" action.

**Persistence**
- Persist notifications locally with Zustand or IndexedDB; add backend sync later if multi-device support is needed.
- Priority: Medium (ship after AI Help).

### 3. Template Section (Shared Study Blueprints)
**Purpose**
- Allow users to import or share study templates covering subjects, topics, and exam schedules.

**Core Functionality**
- Provide a template library with search and filters (country, exam name, year, university, verification state).
- Display template metadata such as country, exam name, year, level, optional university, verification flag, rating, subject and topic counts, and exam date.
- Support importing templates so users can customise the resulting subjects and topics.

**Verification and Ratings**
- User uploads are unverified by default.
- Admins or trusted contributors can mark templates as verified.
- Users can upvote or rate templates (for example, star ratings).

**UI Plan**
- Create a /templates route.
- Use a sidebar for filter controls and a grid of template cards showing key metadata and an Import button.
- Importing duplicates the dataset into the user account for editing.

**Technical Notes**
- Store templates as JSON (subjects, topics, exam dates).
- Prefer Firestore or Supabase when backend persistence is available.
- Priority: Medium-Low (build after Notification Panel).

## Navigation Bar Optimisation
- Simplify primary navigation to Dashboard | Calendar | Reviews | Timeline | Subjects | More.
- Place AI Help, Templates, Notifications, and Settings inside the More dropdown.
- Consider icon-based navigation for a minimal layout.

## Suggested Implementation Order
1. AI Help – highest impact on engagement and perceived intelligence.
2. Notification Panel – keeps users informed and active.
3. Template System – enables collaboration and scaling.
4. Navigation Bar Optimisation – polish once new features are present.

## Summary of Benefits
- Maintains a clean, scalable navigation structure.
- Delivers focused AI guidance with intent filtering.
- Encourages community-driven study resources through templates.
- Improves engagement via proactive notifications and actionable metrics.
