# User Manual

## Getting started
1. Visit the deployed application (default: `http://localhost:3000`).
2. Create your first subject from the Subjects page, choosing a colour and icon.
3. Add topics under each subject with optional notes and desired retention threshold.
4. Review the dashboard to see what is due today and upcoming.

## Daily workflow
- **Check dashboard** – Review due topics and streak progress each day.
- **Complete reviews** – Navigate to the Reviews page, open a topic, and log your recall quality. The system updates your schedule instantly.
- **Plan ahead** – Use the Timeline view to understand upcoming load per subject and adjust study plans.
- **Adjust settings** – Visit Settings to change retention threshold, theme, and timezone.

## Managing subjects and topics
- **Edit subject** – Hover or tap the subject row, choose Edit, and update details. Changes reflect across the app.
- **Archive subject** – Use Archive to hide subjects you no longer need; archived items remain accessible via filters.
- **Backfill history** – In a topic detail view, select Edit history to log past study dates. The timeline will recompute retention curves.

## Themes and accessibility
- Toggle light/dark theme using the header control. The app remembers your choice between sessions.
- Keyboard navigation: use `Tab`/`Shift+Tab` to move focus, `Enter`/`Space` to activate controls.
- Screen reader users can rely on descriptive labels and skip links for efficient navigation.

## Data management
- **Export data** – From Settings, choose Export to download a JSON snapshot of your subjects, topics, and review history.
- **Clear data** – Use the Reset option to remove all local data and start fresh.
- **Offline use** – After initial load, the app works without an internet connection. Data remains on the device.

## Troubleshooting
- If the app appears blank, ensure your browser allows local storage and refresh the page.
- Storage quota warnings indicate you are nearing browser limits; export data and prune unused topics.
- For UI glitches, switch themes or resize the window to reset layout. Report persistent issues via GitHub.

## Support
- Consult the FAQ in `docs/core/FAQ.md` for common questions.
- Submit bugs or feature requests through GitHub Issue templates.
- Contact maintainers via the communication channels outlined in `docs/00-overview/communication-plan.md`.
