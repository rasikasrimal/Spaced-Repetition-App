# Spaced-Repetition-App Wiki Home

Welcome to the Spaced-Repetition-App knowledge base. This guide introduces the app, explains how to get started, and points you to deeper documentation.

## Overview
- **Purpose:** Help learners retain information using spaced-repetition techniques grounded in cognitive science.
- **Audience:** Self-learners, educators, and teams who want a simple workflow for scheduling reviews.
- **Core Concept:** Every topic is grouped under a subject and scheduled based on recall difficulty. Topics you remember well appear less often; the ones you struggle with resurface sooner.

## Key Features
1. **Adaptive Scheduling:** Automatically calculates the next review date based on the quality recorded after each review.
2. **Subject & Topic Management:** Organise material into subjects, keep topics in sync with subject identity (colour, icon, exam date), and backfill history when migrating.
3. **Timeline Analytics:** Explore combined or per-subject forgetting curves with opacity fades, review markers, and labels that surface current retention at the Today line.
4. **Dual Themes:** Toggle between crisp light and deep dark palettes; both are hard-coded for predictable contrast with reinforced navigation/status colours and no shadows.
5. **Offline-Ready Web App:** Built with Next.js and Zustand so you can review from any device without a backend.

## Getting Started
1. **Install & Run Locally**
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000` to start reviewing.
2. **Add a Subject:** Open **Subjects**, create a subject with an icon, colour, and optional exam date.
3. **Capture Topics:** From the dashboard or subject view, add topics with notes and spaced-review intervals; backfill past study via the history editor if needed.
4. **Start Reviewing:** Use the **Reviews** page to clear “Due Today.” Mark each topic as *Again*, *Hard*, *Good*, or *Easy* to train the scheduler.
5. **Inspect Analytics:** Visit **Timeline** to analyse retention, toggle markers/labels, and export snapshots once the dataset grows.

## Study Workflow Tips
- **Daily Reviews:** Aim to clear the “Due Today” list. Consistency beats marathon sessions.
- **Subject Filters:** Use the shared subjects dropdown across Dashboard, Calendar, and Timeline to focus on specific courses.
- **Today Labels:** Enable topic labels in the timeline toolbar to see retention percentages at a glance.
- **Theme Preference:** Switch to light or dark from the header toggle—the choice persists across sessions and light mode now boosts nav/status contrast automatically.

## Advanced Usage
- **History Backfill:** Use the per-topic history editor to log prior study sessions in chronological order and recalculate intervals.
- **Custom Schedulers:** Tweak review behaviour by editing [`src/lib/memory.ts`](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/src/lib/memory.ts) and documenting changes alongside the [forgetting curve notes](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/forgetting-curve.md).
- **Theme Extensions:** Extend [`src/lib/theme-palettes.ts`](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/src/lib/theme-palettes.ts) if you need additional palettes; remember the UI expects flat colours and no shadows.

## Troubleshooting & Support
- **Common Issues:**
  - *Reviews not updating?* Confirm the topic is due today and that the timezone in Settings matches your locale.
  - *Timeline missing markers?* Toggle the “Review Markers” and “Event Dots” controls in the toolbar.
- **Diagnostics:** Run `npm run lint` to catch TypeScript or accessibility issues before opening a bug report.
- **Need Help?** Open an issue on GitHub with reproduction steps, screenshots, and browser/OS details.

## Learn More
- [Architecture Overview](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/architecture.md)
- [Runbook & Operations](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/runbook.md)
- [Test Plan](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/test-plan.md)
- [UI Style Audit](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/ui-style-audit.md)

Happy learning! Stay consistent and let the scheduler do the heavy lifting.
