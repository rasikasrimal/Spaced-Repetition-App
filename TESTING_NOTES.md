# Testing Notes

## Adaptive scheduler coverage

- **Unit tests** – Extend `tests/forgetting-curve.test.ts` to cover interval generation across multiple triggers (30%, 50%, 70%). Ensure that higher triggers result in shorter intervals and that the floor is respected.
- **Scheduler projection** – Add tests for `projectAdaptiveSchedule` verifying that review dates stop at the exam boundary and that stability growth applies α/β adjustments.
- **Integration checks** – After changing the trigger slider, confirm that:
  - Topics immediately update their `nextReviewDate` and `retrievabilityTarget` values in the store.
  - Timeline, Subjects, and Reviews pages reflect the new trigger string in their headers.
  - The Settings preview chart re-renders with the new trigger line.
- **Manual QA** – Toggle between Adaptive and Fixed modes to verify that slider enablement and explanatory states behave as expected.
- **Regression suite** – Run `npm run lint` and `npm run test:curve` to ensure code quality and mathematical helpers remain stable.

## Exam badge contrast

- **Theme coverage** – Verify the badge copy and icon remain legible on both light and dark backgrounds.
- **Interaction states** – Confirm hover and keyboard focus states transition the background tint without harming contrast.
- **Cross-page parity** – Ensure the same badge styling renders on `/subjects` and `/reviews` without divergence.

## Reviews table interactions

- **Filter stability** – Click through All, Overdue, Due today, and Upcoming to ensure no runtime errors occur and the badge copy updates accordingly.
- **Skip action guard** – Confirm the “Skip today” button renders only for rows whose status is `due-today`; upcoming topics should not expose the control.
- **Expansion details** – Toggle a row open and verify that schedule metadata (intervals, last reviewed, exam countdown) and notes render within the detail panel.
- **Responsive layout** – Resize the viewport to mobile widths to confirm the table scrolls horizontally, the condensed metadata appears under the topic title, and action buttons remain usable.

## Dark mode contrast

- **Global scan** – Enable dark mode and review dashboard summaries, subject cards, and reviews tables to ensure secondary copy (`text-muted-foreground`) stays legible.
- **Placeholder sweep** – Focus each major search/input field to confirm placeholder text resolves to the brighter slate tone instead of fading out.
- **Status chips** – Inspect overdue, upcoming, and exam badges on dark backgrounds for ≥4.5:1 contrast between text and pill fill.
- **Assistive text** – Check captions, tooltips, and muted helper text for readable hierarchy without dipping below AA contrast ratios.
