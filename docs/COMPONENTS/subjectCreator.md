# Subject Creator Component

## Overview

The subject creator drawer lives on `/subjects` and shares logic with the inline edit experience. It orchestrates subject identity (name, icon, colour) plus optional exam metadata.

## State shape

```ts
{
  name: string;
  examDate: string;
  color: string; // hex | hsl | rgb
  icon: string;  // lucide icon name
}
```

- Defaults come from `FALLBACK_SUBJECT_COLOR` and the `Sparkles` icon.
- Edit mode hydrates state from the selected subject and preserves previous values until saved or cancelled.

## Event flow

- `IconPicker` popover closes immediately on selection (`setOpen(false)`), writing the icon name to state.
- `ColorPicker` updates state when a preset is clicked or when the custom input validates.
- Submission handlers guard the required `name` field and toast on error/success.
- Cancelling restore scroll/body overflow and resets the draft via `resetForm()`.

## Live preview logic

- `SubjectIdentityPreview` renders the visual summary for both creation and editing flows.
- Preview uses:
  - `getTintedSurfaceColor(color)` to soften the card background.
  - `getAccessibleTextColor` for both the background and the icon chip.
  - `ICON_LIBRARY` metadata to show a friendly icon label.
- Exam line prints `Exam: Not set` unless a valid ISO date string is present.
- Preview text updates in real time as form state changes (controlled components).

## Validation & fallbacks

- Custom colour input relies on `sanitizeColorInput` to normalise values and reject bad formats.
- Icon search filters use keywords + label comparisons to support broad queries.
- Missing icon/colour values never reach the store because the pickers enforce defaults.
- On edit save, `updateSubject` receives the draft payload and applies it to all linked topics.

## Schema alignment

- Subject model exposes `icon: string` and `color: string` (already present in `src/types/topic.ts`).
- Downstream consumers should treat the colour as an opaque CSS-compatible string; use helper utilities when contrast adjustments are needed.
