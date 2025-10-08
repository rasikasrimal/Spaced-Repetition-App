# Flutter Conversion Prompt Series

## 🏗️ Phase 1 — App Setup & Core Architecture

### Prompt 1: Flutter Project Setup
**Goal:**  
Initialize the Flutter project with structured feature folders, global theming, and baseline configuration for an offline-first spaced repetition app.

**Context:**  
Lays the groundwork mirroring the web app's overall architecture and shared utilities.

**Prompt for Codex to Use:**  
"Create a new Flutter project named `spaced_repetition_app`, configure `/lib/features/` subdirectories for today, dashboard, timeline, subjects, explore, shared widgets, state, and services. Set up Material 3 themes supporting dark and light modes, define global color constants aligned with the web palette, and initialize route scaffolding placeholders for each feature. Include dependency setup for Riverpod, GoRouter, Hive, hive_flutter, fl_chart, and flutter_local_notifications in `pubspec.yaml`, ensuring offline-first readiness."

**Dependencies:**  
None.

**Output Type:**  
Architecture spec + project scaffolding code.

### Prompt 2: Implement Navigation Bar & Routing
**Goal:**  
Build the bottom tab navigation and routing system replicating the web app's primary navigation.

**Context:**  
Mirrors the Today | Dashboard | Timeline | Subjects | Explore tabs with animated transitions.

**Prompt for Codex to Use:**  
"Implement a `MainShell` widget using `GoRouter` with five routes (`/today`, `/dashboard`, `/timeline`, `/subjects`, `/explore`) and a Material 3 bottom navigation bar reflecting the web labels. Provide animated slide-fade transitions between tabs, persistence of navigation state, and accessibility labels for each destination. Ensure the scaffold supports future profile modal actions and integrates with Riverpod navigation state providers."

**Dependencies:**  
Prompt 1.

**Output Type:**  
Flutter navigation code.

## 📅 Phase 2 — Core Pages

### Prompt 3: Today Tab (Adaptive Review Queue)
**Goal:**  
Recreate the Today page to show the adaptive review queue with revise/skip actions.

**Context:**  
Equivalent to the web `/today` route's review queue and difficulty adjustments.

**Prompt for Codex to Use:**  
"Build a Flutter `TodayPage` widget that fetches up to 5 due topics from the local Hive database via Riverpod providers, displaying cards with topic name, subject badge, retention percentage, difficulty, and action buttons. Implement revise and skip buttons with animations, and show a bottom sheet asking `EASY / NORMAL / HARD` to adjust the spaced repetition schedule (calling the algorithm service). Include a `Load More` action to fetch the next batch of 5 topics and maintain state persistence across navigations."

**Dependencies:**  
Prompts 1, 2, 8, 9, 10.

**Output Type:**  
Flutter widget + logic integration.

### Prompt 4: Dashboard Tab
**Goal:**  
Provide an overview dashboard with retention summaries, streaks, and progress visuals.

**Context:**  
Mirrors the web dashboard combining calendar and review progress.

**Prompt for Codex to Use:**  
"Implement a `DashboardPage` featuring a Material 3 layout with an overall retention average card, per-subject progress bars, and a streak tracker card. Merge a calendar visualization of upcoming reviews and a 'Progress Today' summary using reusable components. Ensure responsiveness for tablets, adapt dark/light theming, and pull data from Riverpod providers backed by Hive storage."

**Dependencies:**  
Prompts 1, 2, 9, 10.

**Output Type:**  
Flutter widget + visualization code.

### Prompt 5: Timeline Tab
**Goal:**  
Render interactive retention curves with pan, zoom, and focus capabilities.

**Context:**  
Equivalent to the web timeline's retention analytics view.

**Prompt for Codex to Use:**  
"Create a `TimelinePage` leveraging `fl_chart` (or Syncfusion alternative) to plot retention curves for each subject. Include combined and per-subject toggles, pan/zoom gestures, tap-to-focus on a single curve, and markers for reviews, exams, and notable events. Support exporting charts to SVG/PNG via platform channels, handle opacity fades for older data, and optimize initial view by loading one subject curve by default."

**Dependencies:**  
Prompts 1, 2, 9, 10.

**Output Type:**  
Flutter chart implementation code.

### Prompt 6: Subjects Tab
**Goal:**  
Manage subjects with icon selection, color configuration, and live previews.

**Context:**  
Reflects the web subjects module for subject CRUD and customization.

**Prompt for Codex to Use:**  
"Implement a `SubjectsPage` with list and detail views for subjects stored in Hive. Include forms to add/edit/delete subjects, an icon picker using Lucide-inspired icon set for Flutter, a single-color picker supporting hex/RGB input, and a live preview card showing gradients, shadows, and icon animation. Respect exam date constraints for scheduling limits and sync changes via Riverpod providers."

**Dependencies:**  
Prompts 1, 2, 9, 10.

**Output Type:**  
Flutter CRUD UI code.

### Prompt 7: Explore Tab
**Goal:**  
Provide shared resources including notes, study plans, flashcards, and tips.

**Context:**  
Matches the web explore module with multiple subsections.

**Prompt for Codex to Use:**  
"Create an `ExplorePage` with tabbed subsections for Short Notes, Study Plans, Flashcards, and Study Tips. Implement paginated grids/cards for each subsection, support markdown rendering for notes, JSON import/export for study plans, and quick-launch study mode for flashcards. Include sample dataset seeding for mock UI states and ensure offline access via Hive."

**Dependencies:**  
Prompts 1, 2, 9, 10.

**Output Type:**  
Flutter multi-section UI code.

## ⚙️ Phase 3 — Logic & Persistence

### Prompt 8: Implement Spaced Repetition Algorithm
**Goal:**  
Translate the adaptive review scheduling logic into Flutter services.

**Context:**  
Mirrors the web app's forgetting curve-based review scheduler.

**Prompt for Codex to Use:**  
"Develop a `SpacedRepetitionService` in Dart that models the forgetting curve with adjustable decay constants. Allow configuration of user retention thresholds, reset retention to 100% after reviews, and extend intervals based on EASY/NORMAL/HARD responses. Provide methods to compute next review date, update topic retention, and emit analytics data for charts. Ensure test coverage with unit tests verifying scheduling accuracy."

**Dependencies:**  
Prompts 1, 9, 10.

**Output Type:**  
Dart service + tests.

### Prompt 9: Local Database Layer
**Goal:**  
Persist subjects, topics, reviews, flashcards, and study plans offline.

**Context:**  
Supports offline-first architecture analogous to the web data layer.

**Prompt for Codex to Use:**  
"Configure Hive boxes and adapters for Subject, Topic, Review, Flashcard, StudyPlan, and ShortNote models. Implement migration-safe initialization, lazy boxes for large datasets, and helper methods for queries like 'due today'. Seed sample data for development and ensure encryption keys are handled securely for local storage."

**Dependencies:**  
Prompt 1.

**Output Type:**  
Persistence layer code.

### Prompt 10: State Management
**Goal:**  
Set up Riverpod providers orchestrating app state across modules.

**Context:**  
Aligns with the web app's state and data flow patterns.

**Prompt for Codex to Use:**  
"Implement Riverpod providers for subjects, topics, reviews, flashcards, study plans, and retention analytics. Include asynchronous notifiers that listen to Hive changes, expose computed selectors (e.g., per-subject retention averages), and coordinate with the `SpacedRepetitionService`. Provide unit tests for core providers and ensure providers handle app lifecycle for persistence."

**Dependencies:**  
Prompts 1, 9.

**Output Type:**  
State management code + tests.

## 💬 Phase 4 — Enhancements

### Prompt 11: Animations & Micro-Interactions
**Goal:**  
Add delightful micro-interactions consistent with the web experience.

**Context:**  
Corresponds to hover gradients, button feedback, and chart transitions from the web UI.

**Prompt for Codex to Use:**  
"Introduce a centralized animations utility applying gradient highlights on cards, press-scale feedback on buttons, and animated transitions for charts and navigation underlines. Ensure animations respect accessibility (reduced motion settings) and are reusable across Today, Dashboard, and Subjects pages."

**Dependencies:**  
Prompts 1–7, 10.

**Output Type:**  
Animations utility code.

### Prompt 12: Settings & Profile Dropdown
**Goal:**  
Implement a profile modal housing settings and theme toggles.

**Context:**  
Adapts the web profile dropdown into a mobile-friendly modal.

**Prompt for Codex to Use:**  
"Create a `ProfileModal` accessible from the navigation shell that includes theme toggles, retention threshold slider, account placeholders, and quick links to notifications and sync settings. Use Material 3 bottom sheet styling and ensure state persists via Riverpod."

**Dependencies:**  
Prompts 1, 2, 10.

**Output Type:**  
Flutter modal UI code.

### Prompt 13: Notifications
**Goal:**  
Schedule local notifications for due topics.

**Context:**  
Extends web reminders into mobile device notifications.

**Prompt for Codex to Use:**  
"Integrate `flutter_local_notifications` to schedule daily reminders for 'Due Today' topics. Provide Riverpod-driven scheduling logic that respects user preferences, handles time zones, and clears notifications when topics are completed."

**Dependencies:**  
Prompts 1, 9, 10.

**Output Type:**  
Notification service code.

### Prompt 14: Sync & Cloud Backup
**Goal:**  
Prepare for future cloud synchronization.

**Context:**  
Placeholder for cross-device sync analogous to planned web enhancements.

**Prompt for Codex to Use:**  
"Outline interfaces and placeholder implementations for syncing Hive data with a future backend (e.g., Firebase). Include DTOs, serialization hooks, and dependency inversion so services can be swapped when the backend is ready."

**Dependencies:**  
Prompts 1, 9, 10.

**Output Type:**  
Architecture spec + placeholder code.

## 📊 Phase 5 — Visual Polish

### Prompt 15: Consistent UI Design System
**Goal:**  
Define reusable design tokens and components.

**Context:**  
Ensures cohesive UI akin to the web design system.

**Prompt for Codex to Use:**  
"Establish a design system module with typography scales, color tokens, spacing constants, and reusable widgets (`AppCard`, `AppButton`, `AppBadge`, etc.). Ensure components adapt to Material 3 guidelines, support dark/light themes, and are used across all feature pages."

**Dependencies:**  
Prompts 1–7.

**Output Type:**  
Design system code.

### Prompt 16: Responsive Layout & Tablet Optimization
**Goal:**  
Optimize layouts for tablets and orientation changes.

**Context:**  
Parallels the responsive behavior expected from the web version.

**Prompt for Codex to Use:**  
"Implement responsive layout helpers handling breakpoints for phones and tablets. Update key pages (Today, Dashboard, Timeline, Subjects, Explore) to use adaptive grids, split views, and orientation-aware spacing while preserving accessibility."

**Dependencies:**  
Prompts 1–7, 15.

**Output Type:**  
Responsive layout code.

## 🧩 Phase 6 — Documentation

### Prompt 17: Generate App Architecture Diagram
**Goal:**  
Produce diagrams illustrating app structure and data flow.

**Context:**  
Documents architecture similar to the web documentation's diagrams.

**Prompt for Codex to Use:**  
"Use Mermaid syntax to create diagrams showing navigation hierarchy, Riverpod state flow, Hive persistence layers, and integration with services (notifications, sync). Provide export instructions for including diagrams in project documentation."

**Dependencies:**  
Prompts 1–16.

**Output Type:**  
Documentation diagrams.

### Prompt 18: Write README_Mobile.md
**Goal:**  
Document the Flutter project setup, modules, and usage.

**Context:**  
Companion documentation to the web version for mobile teams.

**Prompt for Codex to Use:**  
"Compose `README_Mobile.md` summarizing project goals, folder structure, setup steps, feature overviews, and testing commands. Include references to prompts, design system usage, and future enhancements."

**Dependencies:**  
Prompts 1–17.

**Output Type:**  
Markdown documentation.

---

| Prompt # | Feature | Output Type | Depends On |
|----------|---------|-------------|------------|
| 1 | Flutter Project Setup | Architecture spec + project scaffolding code | — |
| 2 | Navigation Bar & Routing | Flutter navigation code | 1 |
| 3 | Today Tab | Flutter widget + logic integration | 1, 2, 8, 9, 10 |
| 4 | Dashboard Tab | Flutter widget + visualization code | 1, 2, 9, 10 |
| 5 | Timeline Tab | Flutter chart implementation code | 1, 2, 9, 10 |
| 6 | Subjects Tab | Flutter CRUD UI code | 1, 2, 9, 10 |
| 7 | Explore Tab | Flutter multi-section UI code | 1, 2, 9, 10 |
| 8 | Spaced Repetition Algorithm | Dart service + tests | 1, 9, 10 |
| 9 | Local Database Layer | Persistence layer code | 1 |
| 10 | State Management | State management code + tests | 1, 9 |
| 11 | Animations & Micro-Interactions | Animations utility code | 1–7, 10 |
| 12 | Settings & Profile Dropdown | Flutter modal UI code | 1, 2, 10 |
| 13 | Notifications | Notification service code | 1, 9, 10 |
| 14 | Sync & Cloud Backup | Architecture spec + placeholder code | 1, 9, 10 |
| 15 | Consistent UI Design System | Design system code | 1–7 |
| 16 | Responsive Layout & Tablet Optimization | Responsive layout code | 1–7, 15 |
| 17 | App Architecture Diagram | Documentation diagrams | 1–16 |
| 18 | README_Mobile.md | Markdown documentation | 1–17 |
