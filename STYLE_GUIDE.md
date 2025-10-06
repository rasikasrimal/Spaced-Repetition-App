# Style Guide

## Interactive Subject & Summary Cards
- Apply the `.card-interactive` utility to subject panels and dashboard summary cards to enable animated gradient surfaces, soft elevation, and pointer-tracked glow.
- Use `style={{ "--card-accent": color }}` when custom subject hues are available so the lighting blends with each subject’s identity.
- Attach the shared mouse-move and mouse-leave handlers from `@/lib/card-motion` to keep the radial glow following the cursor without re-rendering components.
- Preserve rounded 3xl radii and existing border tokens; the new motion layer augments hover states rather than replacing structure.
- Ensure icons and headings inside the card respect the hover accent by relying on the default `.card-interactive` transitions instead of bespoke transforms.
- Verify focus-visible outlines remain legible across light/dark themes after applying the interactive treatment.

## Today Smart Review Grid
- The `/today` route presents a single compact grid that lists the five lowest-retention topics first and grows in batches of five via the “Load more” control.
- Each row should be fully hoverable with a subtle accent gradient, maintain 1px dividers, and expose revise/skip icon actions on the right.
- Retention percentages follow the success/warn/error palette (≥80%, 50–79%, <50%) and include a slim progress bar plus tooltip copy for the next review.
- Difficulty chips default to neutral but switch to success or error hues once the learner tags a topic as Easy or Hard.
- Keyboard navigation (↑/↓ to move, Enter to revise, Esc to blur) must remain intact whenever styling adjustments are made.
