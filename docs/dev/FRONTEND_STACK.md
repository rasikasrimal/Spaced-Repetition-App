# FRONTEND_STACK

## Frameworks

- **Next.js 14 (App Router)** – Provides server components, route groups, streaming, and image optimisation.
- **React 18** – Client components use Suspense for charts and skeletons.
- **TypeScript** – Strict typing across stores, hooks, and components.

## Styling

- **Tailwind CSS** – Utility-first classes configured in `tailwind.config.ts` with custom colour tokens and typography presets.
- **Radix UI primitives** – Accessible menus, dialogs, popovers, and tooltips.
- **Framer Motion** – Micro-animations for hover glows and transitions.

## State

- **Zustand** – Lightweight store with persist middleware.
- **Immer** (via Zustand) – Mutates state safely through drafts.

## Data visualisation

- **D3** – Timeline and calendar charts.
- **Recharts** – Dashboard load, streak, and completion widgets.

## Directory map

```
src/
  app/                 # Route segments and layout shells
  components/
    dashboard/
    timeline/
    subjects/
    ui/
  hooks/               # Shared behaviour (auto skip, shortcuts, responsive helpers)
  lib/                 # Utilities (dates, forgetting curve, formatting)
  stores/              # Zustand stores
  types/               # Domain types
  data/                # Demo seeds and fixture payloads
```

## Component conventions

- Components live beside feature folders (`components/dashboard`, `components/timeline`). Shared primitives sit in `components/ui`.
- Use `Client` directives only when interaction requires them (forms, charts, stores).
- Export named components to enable tree shaking.
- Tests target the most critical components in Playwright; use `data-test` attributes to keep selectors stable.

## Build tooling

- `next.config.mjs` – Enables SWC minification, image optimisation, and remote image allowlist.
- `postcss.config.mjs` – Tailwind + autoprefixer pipeline.
- `tsconfig.json` – Path aliases (`@/components`, `@/stores`) and strict compiler flags (`noUncheckedIndexedAccess`).
- `eslint.config.mjs` – Extends Next.js config with custom rules for hooks and accessibility.

## Local scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the development server with hot module reloading. |
| `npm run lint` | Runs ESLint with Next.js rules, TypeScript support, and accessibility checks. |
| `npm run test:visual` | Executes Playwright smoke tests for the core routes. |
| `npm run test:curve` | Validates forgetting-curve calculations. |
| `npm run build` | Builds the production bundle. |

## Recommended extensions

- VS Code Tailwind CSS IntelliSense for class hints and linting.
- ESLint + TypeScript plugins for inline warnings.
- Prettier with the project `.prettierrc` (inherits Next.js defaults).

[Back to Docs Index](../DOCS_INDEX.md)
