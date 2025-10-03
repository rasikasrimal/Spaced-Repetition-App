# Spaced Repetition App

A local-first spaced repetition dashboard built with Next.js, Tailwind CSS, and Zustand. Capture learning topics, assign categories, customize review intervals, and keep track of what needs attention each day.

## Features

- Topic composer with notes, icon, color, category, reminder time, and flexible intervals
- Dashboard showing all items due for review today
- Local persistence using Zustand + `localStorage`
- Tailwind-based UI using shadcn-inspired primitives and Lucide icons

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Testing

Run the lint suite to catch common issues and ensure the Playwright smoke tests still render the UI as expected:

```bash
npm run lint
npm run test:visual
```

`npm run test:visual` launches the bundled Playwright test suite, which validates critical UI flows and ensures the primary dashboard renders without regression.

## Deployment

Build a production bundle and start the optimized server:

```bash
npm run build
npm run start
```

Deployments can be hosted on any platform that supports Next.js 14 (for example, Vercel or a container image). The app persists data in the browser using Zustand's `localStorage` integration, so no external services are required.

## Tech stack

- Next.js 14 (App Router)
- React 18 with TypeScript
- Tailwind CSS with custom tokens
- Zustand for client-side state + persistence
- Radix UI primitives, Lucide icons, and Framer Motion for animation

## Project structure

```
src/
  app/(pages)/page.tsx      # Root page
  app/layout.tsx            # Global layout + fonts
  components/               # UI, forms, dashboard widgets
  stores/topics.ts          # Zustand state + persistence
  lib/                      # Utility helpers and constants
  types/                    # Shared TypeScript types
```

## Data persistence

All topics and categories are stored in the browser via `localStorage`. This keeps the app completely local and private. Clearing browser storage will remove saved topics.
