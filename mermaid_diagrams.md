# Mermaid Diagrams Overview

This document aggregates all Mermaid diagrams found in the documentation. Each diagram is grouped by source file with a brief contextual title.


---

## Source: `README.md`

### System Context

*Description*: Mermaid diagram extracted from README.md, diagram #1.

```mermaid
flowchart LR
  User((Learner)) -->|HTTP| App[Next.js Runtime]
  App -->|Render| UI[React Components]
  UI -->|Actions| Stores[Zustand Stores]
  Stores -->|Persist| Storage[(localStorage)]
  Stores -->|Selectors| UI
  subgraph Browser
    UI
    Stores
    Storage
  end
```

### Review Flow

*Description*: Mermaid diagram extracted from README.md, diagram #2.

```mermaid
sequenceDiagram
  participant L as Learner
  participant T as Today Queue
  participant S as Topic Store
  participant V as Visualizations

  L->>T: Start review
  T->>S: markReviewed(topicId, quality)
  S-->>S: Update stability & next review
  S-->>V: Broadcast updated topics
  V-->>L: Refresh dashboard, timeline, calendar
```


---

## Source: `SpacedRepetitionApp_Documentation.md`

### Diagram 1

*Description*: Mermaid diagram extracted from SpacedRepetitionApp_Documentation.md, diagram #1.

```mermaid
flowchart LR
  TS["Zustand Topics Store"]
  PF["Timeline Preferences"]
  PR["Profile Store"]
  M["buildTimelineSeries()"]
  C["TimelineChart (Recharts + D3)"]
  TT["Tooltip"]
  EX["Exporter"]
  MT["Subject Revision Tables"]

  TS --> M
  PF --> M
  PR --> M

  M --> C
  C --> TT
  C --> EX
  C --> MT
```

### Diagram 1

*Description*: Mermaid diagram extracted from SpacedRepetitionApp_Documentation.md, diagram #2.

```mermaid
flowchart LR
  TS["Zustand Topics Store"]
  PF["Timeline Preferences"]
  PR["Profile Store"]
  M["buildTimelineSeries()"]
  C["TimelineChart (Recharts + D3)"]
  TT["Tooltip"]
  EX["Exporter"]
  MT["Subject Revision Tables"]

  TS --> M
  PF --> M
  PR --> M

  M --> C
  C --> TT
  C --> EX
  C --> MT
```

### System Architecture

*Description*: Mermaid diagram extracted from SpacedRepetitionApp_Documentation.md, diagram #3.

```mermaid
flowchart LR
  subgraph Client
    UI[Next.js + React UI]
    State[Zustand Stores]
    Persistence[(localStorage)]
    Charts[Recharts / D3 Components]
  end
  UI --> State
  State --> Persistence
  State --> Charts
  Charts --> UI
```

### Review Scheduling Data Flow

*Description*: Mermaid diagram extracted from SpacedRepetitionApp_Documentation.md, diagram #4.

```mermaid
flowchart LR
  TopicEvent["Review Event"]
  Scheduler["updateStability & computeInterval"]
  Queue["Update nextReview"]
  Stores["Persist store snapshot"]
  UI["Refresh Today/Dashboard/Timeline"]

  TopicEvent --> Scheduler --> Queue --> Stores --> UI
```

### Navigation Sitemap

*Description*: Mermaid diagram extracted from SpacedRepetitionApp_Documentation.md, diagram #5.

```mermaid
flowchart TB
  Today --> TodayQueue[Review Queue]
  Today --> TodayHistory[Recent Actions]
  Dashboard --> DashCalendar[Calendar Heatmap]
  Dashboard --> DashStreaks[Streak Tracker]
  Timeline --> TimelineChart[Retention Chart]
  Timeline --> TimelineExport[Export Panel]
  Subjects --> SubjectList[List + CRUD]
  Subjects --> SubjectDetail[History Editor]
  Explore --> ExploreNotes[Short Notes]
  Explore --> ExplorePlans[Study Plans]
  Explore --> ExploreFlashcards[Flashcards]
  Explore --> ExploreTips[Study Tips]
```

### Example UI Wireframe Layout

*Description*: Mermaid diagram extracted from SpacedRepetitionApp_Documentation.md, diagram #6.

```mermaid
graph TD
  A[Header: Nav Tabs + Theme Toggle]
  A --> B[Today Content]
  B --> C[Topic Card Grid]
  B --> D[Review Outcome Modal]
  A --> E[Dashboard Content]
  E --> F[Retention Tiles]
  E --> G[Calendar + Streak Combo]
  A --> H[Timeline Content]
  H --> I[Interactive Chart]
  H --> J[Subject Filter Rail]
```


---

## Source: `docs/core/ALGORITHMS_FORGETTING_CURVE.md`

### Diagram 1

*Description*: Mermaid diagram extracted from docs/core/ALGORITHMS_FORGETTING_CURVE.md, diagram #1.

```mermaid
flowchart LR
  TopicEvent["Review Event"]
  Scheduler["updateStability & computeInterval"]
  Queue["Update nextReview"]
  Stores["Persist store snapshot"]
  UI["Refresh Today/Dashboard/Timeline"]

  TopicEvent --> Scheduler --> Queue --> Stores --> UI
```

### History replay

*Description*: Mermaid diagram extracted from docs/core/ALGORITHMS_FORGETTING_CURVE.md, diagram #2.

```mermaid
sequenceDiagram
  participant H as History Editor
  participant M as Memory Model
  participant S as Scheduler
  H->>M: Send (date, quality)
  M-->>M: Update stability & retrievability
  M->>S: Provide next interval
  S-->>H: Persist nextReviewAt
```


---

## Source: `docs/forgetting-curve.md`

### Diagram 1

*Description*: Mermaid diagram extracted from docs/forgetting-curve.md, diagram #1.

```mermaid
flowchart TD
  A["After review -> update stability S"] -->|"Compute Delta = -S ln(R*)"| C{"Exam date set?"}
  C -->|Yes| D["Clamp next review <= exam"]
  C -->|No| E["Use computed interval"]
  D --> F["Load smoothing (shift +/-1-2 days if heavy)"]
  E --> F
  F --> G["Persist next_review_at, redraw timeline"]
```

### Diagram 2

*Description*: Mermaid diagram extracted from docs/forgetting-curve.md, diagram #2.

```mermaid
sequenceDiagram
  participant U as User
  participant T as Topic
  participant M as Memory Model
  U->>T: Review at t0 (quality q0)
  T->>M: Update S -> S0
  M-->>T: Next interval Δ0 = -S0*ln(R*)
  Note over T: Plot R0(t)=exp(-t/S0) for t∈[t0, t1)
  U->>T: Review at t1 (quality q1)
  T->>M: Update S -> S1
  M-->>T: Next interval Δ1 = -S1*ln(R*)
  Note over T: Draw stitch at t1, then R1(t)=exp(-t/S1) for t≥t1
```

### Interval growth sanity

*Description*: Mermaid diagram extracted from docs/forgetting-curve.md, diagram #3.

```mermaid
graph LR
  I0["Interval t1"]
  I1["Interval t2"]
  I2["Interval t3"]

  I0 --> I1 --> I2

  NoteI2["Correct recalls ⇒ S↑ ⇒ Δ↑ ⇒ t2 > t1 > t0 on average"]
  I2 --- NoteI2

```

### Daily state machine

*Description*: Mermaid diagram extracted from docs/forgetting-curve.md, diagram #4.

```mermaid
stateDiagram-v2
  [*] --> AvailableToday
  AvailableToday --> Completed: Revise (once per local day)
  AvailableToday --> Skipped: "Skip today"
  AvailableToday --> Skipped: Auto-skip at local midnight
  Completed --> [*]
  Skipped --> [*]
```


---

## Source: `docs/core/ARCHITECTURE.md`

### System context

*Description*: Mermaid diagram extracted from docs/core/ARCHITECTURE.md, diagram #1.

```mermaid
flowchart LR
  User((Learner)) -->|HTTP| App[Next.js runtime]
  App -->|React tree| UI[Components]
  UI -->|Actions| Stores[Zustand stores]
  Stores -->|Persist| LocalStorage[(localStorage)]
  Stores -->|Selectors| UI
  subgraph Browser
    UI
    Stores
    LocalStorage
  end
```

### Page shell

*Description*: Mermaid diagram extracted from docs/core/ARCHITECTURE.md, diagram #2.

```mermaid
flowchart LR
  Layout[app/layout.tsx]
  Layout --> Header
  Layout --> Providers
  Header --> Navigation
  Providers --> ThemeProvider
  Providers --> StoreHydrator
  Navigation -->|Tab change| Page((Page segment))
```

### Interaction loop

*Description*: Mermaid diagram extracted from docs/core/ARCHITECTURE.md, diagram #3.

```mermaid
sequenceDiagram
  participant U as Learner
  participant T as Today Tab
  participant S as Topic Store
  participant TL as Timeline
  participant DB as Dashboard Metrics

  U->>T: Click "Review"
  T->>S: markReviewed(topicId, options)
  S-->>S: Validate daily lock, update stability, log event
  S-->>TL: Emit store update
  S-->>DB: Emit store update
  TL-->>U: Refresh curve & badges
  DB-->>U: Refresh streak + due counts
```


---

## Source: `docs/core/DATA_MODEL.md`

### Entities

*Description*: Mermaid diagram extracted from docs/core/DATA_MODEL.md, diagram #1.

```mermaid
classDiagram
  class Subject {
    +string id
    +string name
    +string color
    +string icon
    +string? examDate
    +number? difficultyModifier
    +string createdAt
    +string updatedAt
  }
  class Topic {
    +string id
    +string title
    +string notes
    +string? subjectId
    +string subjectLabel
    +string? color
    +string? icon
    +string? reminderTime
    +number[] intervals
    +number intervalIndex
    +string nextReviewDate
    +string? lastReviewedAt
    +number stability
    +number retrievabilityTarget
    +number reviewsCount
    +TopicEvent[] events
    +string? reviseNowLastUsedAt
  }
  class TopicEvent {
    +string id
    +string topicId
    +"started"|"reviewed"|"skipped" type
    +string at
    +number? intervalDays
    +string? notes
    +ReviewKind? reviewKind
    +ReviewQuality? reviewQuality
    +number? resultingStability
    +number? targetRetrievability
    +string? nextReviewAt
  }
  class SubjectSummary {
    +string subjectId
    +number topicsCount
    +number upcomingReviewsCount
    +string? nextReviewAt
    +string updatedAt
  }
  Subject "1" --> "*" Topic : assigns
  Topic "1" --> "*" TopicEvent : records
  Subject "1" --> "*" SubjectSummary : aggregates
```


---

## Source: `docs/ui/NAVIGATION.md`

### Header layout

*Description*: Mermaid diagram extracted from docs/ui/NAVIGATION.md, diagram #1.

```mermaid
graph LR
  Brand[Logo + wordmark] --- Tabs[Desktop nav]
  Tabs --- CTA["Study Today" button]
  CTA --- Theme[Theme toggle]
  Theme --- Profile[Profile menu]
  Tabs -.-> MobileNav
```


---

## Source: `docs/ui/UI_STYLE_AUDIT.md`

### Layout Shell Overview

*Description*: Mermaid diagram extracted from docs/ui/UI_STYLE_AUDIT.md, diagram #1.

```mermaid
graph TD
  A[Top navigation shell<br/>max width 90rem] --> B[Responsive main container<br/>px-4 → px-10]
  B --> C[Personalized review plan header]
  B --> D[Topics toolbar • Add topic • filters • search]
  D --> E[Topics table\nTopic • Subject • Next review • Status • Actions]
  B --> F[Progress today band • full width]
```

### Dashboard toolbar interactions

*Description*: Mermaid diagram extracted from docs/ui/UI_STYLE_AUDIT.md, diagram #2.

```mermaid
flowchart LR
  Search[/Search input<br>sessionStorage key dashboard-topic-search/] -- debounce 150ms --> Filter[Apply text filter]
  Filter --> Persist{Persist UI state}
  Status[Status chips<br>sessionStorage key dashboard-status-filter] --> Persist
  Subjects[Subjects menu<br>localStorage key dashboard-subject-filter] --> Persist
  Sort[Sort popover<br>sessionStorage key dashboard-topic-sort] --> Persist
  Persist --> TopicList[Topic table rows<br>Topic • Subject • Next review • Status • Actions]
  TopicList --> Summary[Results summary<br>Showing n of m topics]
  Summary --> ClearFilters[Clear filters pill]

```

### Calendar legend & day sheet

*Description*: Mermaid diagram extracted from docs/ui/UI_STYLE_AUDIT.md, diagram #3.

```mermaid
flowchart LR
  StoredFilter[Subjects dropdown<br/>localStorage key `dashboard-subject-filter`] --> CalendarGrid[Month grid<br/>subject-colored dots]
  StoredFilter --> DaySheet[Day sheet<br/>grouped by subject]
  ExamDates[Subject exam dates] --> CalendarGrid
  CalendarGrid --> Overflow[+N overflow badge<br/>tooltip lists all subjects]
  CalendarGrid --> Legend[Inline legend chips]
  DaySheet --> ReviseGate[Revise today only<br/>locks after local midnight]
```

### Timeline zoom, pan, and export

*Description*: Mermaid diagram extracted from docs/ui/UI_STYLE_AUDIT.md, diagram #4.

```mermaid
flowchart LR
  ZoomControls[Zoom buttons ±<br/>scroll / drag interactions] --> Domain[Active timeline domain]
  ResetButton[Reset button<br/>double-click canvas] --> Domain
  Domain --> TimelineChart[Timeline chart<br/>date-only axis]
  Domain --> ExamMarkers[Exam marker toggle<br/>dotted subject lines]
  TimelineChart --> Exports[Export SVG/PNG<br/>cloned current viewport]
  TimelineChart --> Screenreaders[SR hints<br/>pan & zoom instructions]
```


---

## Source: `docs/core/STATE_MANAGEMENT.md`

### Event timeline

*Description*: Mermaid diagram extracted from docs/core/STATE_MANAGEMENT.md, diagram #1.

```mermaid
sequenceDiagram
  participant C as Component
  participant A as Action
  participant P as Persist middleware
  participant L as localStorage
  participant S as Subscriber
  C->>A: invoke()
  A-->>A: mutate draft
  A->>P: enqueue write
  P->>L: JSON.stringify(state)
  P-->>S: notify subscribers
  S-->>C: rerender slice
```


---

## Source: `docs/core/THESIS.md`

### 3.1 Overview

*Description*: Mermaid diagram extracted from docs/core/THESIS.md, diagram #1.

```mermaid
%% Figure 3.1: UML component diagram
graph TD
  subgraph ClientApp
    AppRouter[Next.js App Router]
    Dashboard[Dashboard Layout]
    TimelinePanel[Timeline Panel Module]
    ReviewEngine[Review Engine]
    Exporter[Data Export Utilities]
  end
  subgraph State
    Store[Zustand Store]
    Persistence[Local IndexedDB Adapter]
  end
  subgraph Services
    Analytics[Timeline Analytics]
    Scheduler[Adaptive Scheduler]
  end
  AppRouter --> Dashboard
  Dashboard --> TimelinePanel
  TimelinePanel --> Analytics
  TimelinePanel --> Store
  ReviewEngine --> Scheduler
  Scheduler --> Store
  Store --> Persistence
  Exporter --> Store
  Dashboard --> ReviewEngine
```

### 3.2 Data Flow

*Description*: Mermaid diagram extracted from docs/core/THESIS.md, diagram #2.

```mermaid
%% Figure 3.2: Data flow diagram
graph LR
  User[User Actions]
  UI[Next.js Components]
  Actions[Zustand Actions]
  Store[(Zustand Store)]
  Serializer[Persistence Middleware]
  IndexedDB[(IndexedDB/Filesystem)]
  User --> UI --> Actions --> Store --> Serializer --> IndexedDB
  IndexedDB --> Serializer --> Store
```

### 3.3 Review Scheduling Workflow

*Description*: Mermaid diagram extracted from docs/core/THESIS.md, diagram #3.

```mermaid
%% Figure 3.3: Sequence diagram for scheduling
sequenceDiagram
  participant U as User
  participant TP as Timeline Panel
  participant RS as Review Scheduler
  participant ST as Zustand Store
  participant PR as Persistence Layer
  U->>TP: Select due card
  TP->>RS: Request schedule update(feedback)
  RS->>ST: Read item state
  RS->>RS: Compute new interval
  RS->>ST: Write updated schedule
  ST->>PR: Persist snapshot
  TP->>U: Render updated timeline
```

### 3.4 Timeline Interaction States

*Description*: Mermaid diagram extracted from docs/core/THESIS.md, diagram #4.

```mermaid
%% Figure 3.4: Zoom state machine
stateDiagram-v2
  [*] --> Idle
  Idle --> Hovering : pointer enters timeline
  Hovering --> DragSelecting : mousedown + drag
  DragSelecting --> Zoomed : mouseup
  Zoomed --> Hovering : reset zoom
  Hovering --> KeyboardZoom : keypress +/-
  KeyboardZoom --> Zoomed
  Zoomed --> Inspecting : focus event on marker
  Inspecting --> Zoomed : blur event
```

### 3.5 Timeline Intelligence

*Description*: Mermaid diagram extracted from docs/core/THESIS.md, diagram #5.

```mermaid
graph LR
    title["Retention Projection with Exam Markers"]

    A0["Day 0: Retention 0.95"]
    A7["Day 7: Retention 0.85"]
    A14["Day 14: Retention 0.72 (Exam)"]
    A21["Day 21: Retention 0.61 (Zoom + Exam)"]
    A28["Day 28: Retention 0.52 (Zoom)"]
    A35["Day 35: Retention 0.44"]
    A42["Day 42: Retention 0.38 (Exam)"]
    A49["Day 49: Retention 0.33"]

    A0 --> A7 --> A14 --> A21 --> A28 --> A35 --> A42 --> A49
```


---

## Source: `docs/core/TIMELINE.md`

### Render pipeline

*Description*: Mermaid diagram extracted from docs/core/TIMELINE.md, diagram #1.

```mermaid
flowchart LR
  Store[Topic store] --> Mapper[buildTimelineSeries]
  Preferences --> Mapper
  Profile --> Mapper
  Mapper --> Chart[TimelineChart]
  Chart --> Tooltip
  Chart --> MiniTables[Subject revision tables]
  Chart --> Exporter
```
