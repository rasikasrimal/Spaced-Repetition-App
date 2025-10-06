# FAQ

## Why is everything stored locally?

The app is designed for privacy-first study sessions. Persisting to `localStorage` keeps data on the learner’s device and allows offline access without sign-in. Import/export tools enable backups when needed.

## How does the app decide what I should study today?

Today sorts topics by a risk score that blends predicted forgetting, overdue penalties, exam urgency, and difficulty modifiers. Scores come from the forgetting-curve utilities described in [ALGORITHMS_FORGETTING_CURVE](./ALGORITHMS_FORGETTING_CURVE.md).

## What happens if I miss a review?

Overdue topics trigger auto-skip (if enabled) to prevent overwhelming backlogs. The scheduler rolls the topic forward using the retention trigger and logs the adjustment in the Today banner.

## Can I use the app across devices?

Not yet. A sync layer is planned alongside the notification and template roadmap items. For now, export your data from Settings and import it on another machine when needed.

## How do I reset the demo data?

Open Settings → Data tools → **Reset demo data**. This clears your subjects/topics and reseeds the original demo set. Use **Clear everything** to wipe all stores.

## Where can I see upcoming reviews for a specific subject?

Visit Timeline, switch to **Per subject**, and choose the subject chip. Mini tables below the chart list all reviews with hoverable dates. The Subjects page also summarises next review dates.

## What is the daily review limit?

Settings includes a slider to cap how many cards appear in Today. When the limit is reached, the queue locks with a rest message. Adjust the limit anytime to match your schedule.

## How will AI Help work?

AI Help will live in a dedicated `/ai-help` route with guided prompts. It will analyse retention, streaks, and exam dates to recommend study plans while filtering out non-educational queries.

[Back to Docs Index](../DOCS_INDEX.md)
