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
