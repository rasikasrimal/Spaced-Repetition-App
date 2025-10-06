# Navigation Bar

## Primary tabs
| Label | Icon | Path | Purpose |
| --- | --- | --- | --- |
| Today | `CalendarCheck` | `/today` | Focus on the next reviews and urgent tasks. |
| Dashboard | `LayoutDashboard` | `/dashboard` | Aggregate trends, streaks, and backlog metrics. |
| Timeline | `LineChart` | `/timeline` | Visualise retention and spaced review cadence over time. |
| Subjects | `BookOpen` | `/subjects` | Manage subjects, topics, and scheduling preferences. |
| Explore | `Compass` | `/explore` | Discover community notes, plans, flashcards, and study tips. |

The navigation adopts a GitHub-style underline indicator that animates between active tabs. Tabs are bolded and tinted with the accent colour when active, and icons scale subtly on hover.

## Responsive behaviour
- ≥768px: tabs render in a centered underline navigation with a sliding accent bar (`NavigationBar` component).
- <768px: tabs collapse into a hamburger-triggered popover list with the same active state styling.
- The navigation header remains fixed with `backdrop-blur` and a muted bottom border for a flat, minimal surface.

## Profile dropdown
The right-side profile menu consolidates actions that previously lived in the navbar:
- **Settings** – opens `/settings`.
- **View profile** – quick link to the dashboard profile overview.
- **Theme toggle** – switches between light and dark themes.
- **Logout** – signs the user out (wired when auth is enabled).

Settings is intentionally removed from the primary tab row so that the Explore destination can occupy a top-level slot without increasing clutter.
