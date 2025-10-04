# Spaced-Repetition-App Wiki Home

Welcome to the Spaced-Repetition-App knowledge base. This guide introduces the app, explains how to get started, and points you to deeper documentation.

## Overview
- **Purpose:** Help learners retain information using spaced-repetition techniques grounded in cognitive science.
- **Audience:** Self-learners, educators, and teams who want a simple workflow for scheduling reviews.
- **Core Concept:** Every flashcard is scheduled based on recall difficulty. Cards you remember well appear less often; the ones you struggle with resurface sooner.

## Key Features
1. **Adaptive Scheduling:** Automatically calculates the next review date based on user feedback after each prompt.
2. **Deck Management:** Organize material into decks and tags, import/export using JSON or CSV, and keep track of mastery per topic.
3. **Session Insights:** Visual dashboards display streaks, upcoming workload, and retention trends.
4. **Offline-Ready Web App:** Built with Next.js and a modern UI so you can review from any device.
5. **Integrations:** REST API and webhooks to sync with note-taking tools or LMS platforms.

## Getting Started
1. **Install & Run Locally**
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000` to start reviewing.
2. **Create a Deck:** Use the “New Deck” button, give it a title, and add cards with fronts/backs or cloze deletions.
3. **Start a Session:** Click “Study” to enter review mode. Rate each card (e.g., *Again*, *Hard*, *Good*, *Easy*) to train the scheduler.
4. **Review Analytics:** Head to the Insights page after a few sessions to monitor retention and workload forecasts.

## Study Workflow Tips
- **Daily Reviews:** Aim to clear the “Due Today” list. Consistency beats marathon sessions.
- **Tag Challenges:** Use tags to isolate tricky topics for focused drills.
- **Leverage Hints:** Add mnemonic notes or media attachments to reinforce memory.
- **Feedback Loop:** Adjust card fields and hints when you consistently mark a card as *Hard* or *Again*.

## Advanced Usage
- **Bulk Imports:** Prepare CSV files with headers `deck,front,back,hint` and import via the Decks page.
- **API Access:** Authenticate with an API token (see the [security guidelines](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/security.md)) and use the `/reviews` endpoints to automate scheduling.
- **Custom Schedulers:** Tweak review behavior by editing [`use-reminder-scheduler.ts`](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/src/hooks/use-reminder-scheduler.ts) and documenting changes alongside the [forgetting curve notes](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/forgetting-curve.md).

## Troubleshooting & Support
- **Common Issues:**
  - *Reviews not updating?* Ensure your network connection is stable and check the browser console for API errors.
  - *Imports failing?* Validate CSV encoding (UTF-8) and confirm required headers.
- **Diagnostics:** Run `npm run lint` to catch TypeScript or accessibility issues before opening a bug report.
- **Need Help?** Open an issue on GitHub with reproduction steps, screenshots, and browser/OS details.

## Learn More
- [Architecture Overview](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/architecture.md)
- [Runbook & Operations](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/runbook.md)
- [Test Plan](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/test-plan.md)
- [UI Style Audit](https://github.com/rasikasrimal/Spaced-Repetition-App/blob/main/docs/ui-style-audit.md)

Happy learning! Stay consistent and let the scheduler do the heavy lifting.
