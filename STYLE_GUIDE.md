# Style Guide

## Interactive Subject & Summary Cards
- Apply the `.card-interactive` utility to subject panels and dashboard summary cards to enable animated gradient surfaces, soft elevation, and pointer-tracked glow.
- Use `style={{ "--card-accent": color }}` when custom subject hues are available so the lighting blends with each subject’s identity.
- Attach the shared mouse-move and mouse-leave handlers from `@/lib/card-motion` to keep the radial glow following the cursor without re-rendering components.
- Preserve rounded 3xl radii and existing border tokens; the new motion layer augments hover states rather than replacing structure.
- Ensure icons and headings inside the card respect the hover accent by relying on the default `.card-interactive` transitions instead of bespoke transforms.
- Verify focus-visible outlines remain legible across light/dark themes after applying the interactive treatment.
