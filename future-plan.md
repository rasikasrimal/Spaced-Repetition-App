# Future Plan

## 🌐 Overall Vision
- Keep the app clean, educational, and centered on study progress.
- Ship new functionality gradually to preserve usability, consistency, and scalability.

## 🚀 Roadmap Overview
The roadmap is ordered to deliver the most user impact first while keeping navigation manageable.

### 1️⃣ AI Help (Smart Study Assistant)
**Purpose**
- Offer data-driven learning suggestions based on real retention, difficulty, and review history.

**Core Idea**
- Introduce an "AI Help" coach experience where learners can select guided prompts or ask custom study questions.
- Example: *"My marks for Pure Mathematics are around 50%. How can I improve?"* → The assistant inspects retention curves, missed topics, and review gaps to recommend actions.

**Strict Input Filtering**
- Enforce educational intent with an intent classifier or rules.
- Reject off-topic queries with the message: *"This question is not related to your studies. Please use me for your educational progress or exam preparation."*

**UI Plan**
- Replace the **Settings** nav link with a **More** dropdown containing: AI Help, Settings, Notifications, Templates.
- `/ai-help` route with a split layout: chat on the left, stats summary on the right, optional tabs for "My Questions" and "Suggested Prompts".

**Technical Notes**
- Backend can call a fine-tuned model or API with access to retention data, review frequency, missed topics, and difficulty indices.
- Responses must remain concise, factual, and actionable.

**Priority**: 🔥 High (deliver first for immediate value).

### 2️⃣ Notification Panel
**Purpose**
- Keep learners aware of retention drops, overdue reviews, and product updates.

**Triggers**
- Retention below threshold (e.g., 25%).
- Long gaps since last revision.
- App announcements or admin messages.

**UI Plan**
- Add a notification bell in the top-right navigation with unread badges.
- Clicking opens a right-side sheet with notification cards (icon, title, text, timestamp, optional "Mark as read").

**Persistence**
- Store notifications locally via Zustand or IndexedDB; sync with backend later for multi-device.

**Priority**: 🟡 Medium (build after AI Help).

### 3️⃣ Templates (Shared Study Blueprints)
**Purpose**
- Allow users to import/share subject/topic templates and exam schedules.

**Core Functionality**
- `/templates` route with search, filters (country, exam, year, university, verified status), and template cards.
- Templates include metadata (country, exam name, year, level, university, verification flag, rating, counts, exam date).
- Users can import templates to clone their structure for customization.

**Verification & Ratings**
- User submissions default to *Unverified*; admins can mark as *Verified*.
- Allow upvotes/ratings similar to repositories.

**Technical Notes**
- Store template JSON (subjects, topics, exam dates) in backend (Firestore/Supabase).

**Priority**: 🟢 Medium-Low (after notifications to avoid UI overload).

## 🧭 Navigation Optimization
- Evolve primary nav to `Dashboard | Calendar | Reviews | Timeline | Subjects | More ▾`.
- Move AI Help, Templates, Notifications, and Settings into **More**, or consider icon-based nav for a modern feel.

## ⚙️ Implementation Order
| Order | Feature | Reason |
| --- | --- | --- |
| 1 | AI Help | Highest visible impact and user engagement |
| 2 | Notification Panel | Sustains activity with timely alerts |
| 3 | Templates | Enables sharing and scale |
| 4 | Navigation Optimization | Final polish once other features land |

## 🧩 Expected Benefits
- Keeps navigation clean and scalable.
- Provides smart guidance with intent-aware AI support.
- Adds collaborative potential via shared templates.
- Improves engagement through notifications and metrics.
- Maintains the app's disciplined, clutter-free design ethos.
