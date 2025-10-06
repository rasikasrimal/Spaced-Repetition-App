# SETTINGS_GUIDE

## Revision strategy

- **Mode toggle** – Choose between Adaptive (default) and Fixed interval. Adaptive mode applies the forgetting-curve scheduler globally. Fixed mode preserves any manual interval lists.
- **Retention trigger slider** – Range 30–80%. Updates reschedule upcoming reviews immediately. Helper copy reads "Reviews before X% predicted recall".
- **Live preview** – Charts predicted decay, draws the trigger line, and lists the next four checkpoints respecting exam caps.
- **Backfill helper** – Provides a link to the subject history editor so learners can adjust past reviews before changing triggers.

## Daily focus

- **Daily review limit** – Sets the cap for the Today queue. Once hit, the queue greys out and surfaces a rest message.
- **Auto-skip overdue** – When enabled, the app rolls overdue topics forward at midnight using risk scoring. The settings panel shows how many were adjusted.
- **Auto-advance** – Automatically loads the next topic after submitting a review if the learner opted in.

## Theme & appearance

- **Theme** – Toggle between Light, Dark, or System. Persisted via `useThemeStore`.
- **Density** – Switches between Cozy and Comfortable table spacing.
- **Motion** – Disable transitions globally for reduced motion accessibility.
- **Timeline defaults** – Configure opacity fade, badge visibility, and smoothing before opening the Timeline page.

## Data tools

- **Export data** – Downloads subjects, topics, and review history as JSON.
- **Import data** – Uploads a JSON export. Validation runs client-side and shows a summary before commit.
- **Reset demo data** – Clears existing progress and reseeds with the demo dataset.
- **Clear everything** – Wipes all local storage keys after double confirmation.

## Planned settings

- **Notification digest** – Configure weekly or daily summary emails once sync support ships.
- **AI tutor voice** – Pick tone and depth for AI Help explanations (roadmap).

[Back to Docs Index](../DOCS_INDEX.md)
