# Routing

## Global shell
- **App shell**: `src/components/layout/app-shell.tsx` wraps pages with `NavigationBar` and shared layout.
- **Navigation bar**: `src/components/layout/navigation-bar.tsx` owns top-level routes and the animated underline indicator.
- **Profile menu**: `src/components/layout/profile-menu.tsx` now houses links to Settings, View profile, theme toggle, and logout.

## Primary routes
| Path | Component | Notes |
| --- | --- | --- |
| `/today` | `src/app/today/page.tsx` | Landing route, also accessible from Study Today CTA in header. |
| `/dashboard` | `src/app/dashboard/page.tsx` | Dashboard overview and profile destination from the menu. |
| `/timeline` | `src/app/timeline/page.tsx` | Retention visualisations. |
| `/subjects` | `src/app/subjects/page.tsx` | Subject and topic management. |
| `/explore` | `src/app/explore/page.tsx` | Segmented discovery experience for community resources. |
| `/settings` | `src/app/settings/page.tsx` | Accessed via profile dropdown. |

## Explore route structure
- Entry point `ExplorePage` (`src/app/explore/index.tsx`) controls the segmented navigation state.
- Sub-components:
  - `ShortNotes` – `src/app/explore/ShortNotes.tsx`
  - `StudyPlans` – `src/app/explore/StudyPlans.tsx`
  - `Flashcards` – `src/app/explore/Flashcards.tsx`
  - `StudyTips` – `src/app/explore/StudyTips.tsx`
- Route leverages client-side state to swap sections without affecting browser history.

## Mobile navigation
- Hamburger popover uses the same `navItems` definitions to keep route parity on small screens.
- Active state is determined with `usePathname`, matching nested segments (`/explore/*`).
