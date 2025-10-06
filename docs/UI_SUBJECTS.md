# Subjects UI

## Subject identity controls

- The creation/edit drawer surfaces curated identity controls for every subject.
- Identity defaults:
  - Icon defaults to `Sparkles` but must be changed explicitly for some workflows.
  - Colour defaults to `hsl(221, 83%, 53%)` (Ocean Blue) to match the fallback subject tone.
- Live preview mirrors the chosen icon, colour, subject name, and exam date in real time.

## Standard colour palette

- Twelve presets span bright, pastel, and dark tones to keep contrast ratios in range.
- Each swatch displays:
  - A label (e.g. Ocean Blue, Coral Pink).
  - The underlying HSL value.
  - A hover tooltip repeating the colour token.
- Selection styling: accent border + subtle elevation; hover adds a short (200 ms) lift.
- Presets pipe through `getTintedSurfaceColor` to ensure preview surfaces stay legible.

## Custom colour input

- The free-form input accepts HEX (`#34A1EB`), RGB (`rgb(34,161,235)`), or HSL (`hsl(221,83%,53%)`).
- Format detection is automatic:
  - `#` prefix → hex, expanded to uppercase 6-digit form.
  - `rgb(` or `hsl(` → sanitised and normalised.
- Invalid entries show an inline `Invalid color format` helper message and do not update state.
- On close, the input resets to the last valid colour.

## Icon picker

- Icons are grouped into categories (Science, Math, Language, History, Technology, Misc).
- A search box filters by label, icon name, or keyword tags in real time.
- Grid layout: 6 columns × ~4 rows; hover scales icons slightly and reveals the tooltip.
- Selected icon gains an accent border, soft shadow, and `aria-pressed="true"` for screen readers.
- Choosing an icon closes the popover immediately.

## Live preview behaviour

- Preview background uses the softened tint of the selected colour; icon chip uses the raw value.
- Text colour auto-adjusts using `getAccessibleTextColor` for contrast on both surfaces.
- Exam line displays `Exam: Not set` until a date is provided.
- Summary list shows:
  - 🎨 Colour token (as entered).
  - ✨ Icon label with the rendered glyph.

## Validation rules

- Subject name is required before submission (client-side check + toast).
- Icon and colour must always resolve to a valid token; defaults provide safe fallbacks.
- Exam date remains optional but is clamped to today or later via the native date input.
