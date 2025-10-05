# UI Guidelines

## Adaptive Review Preview UI

- **Slider styling** – Use the native range input with `accent-accent` to stay on-brand. Label and helper text should remain in the muted foreground palette for readability.
- **Mode pill buttons** – Display the Adaptive/Fixed toggle as a rounded pill group. Highlight the active mode with the accent background and inverse text.
- **Preview card** – Render the forgetting curve as an SVG line inside a rounded card. Include a dashed horizontal line for the trigger threshold and annotate the next checkpoint with an accent dot.
- **Cadence list** – Limit to four projected reviews to avoid scroll overflow. Each entry should use compact chips with the review index on the left and formatted date on the right.
- **Empty states** – When fixed mode is active or no adaptive checkpoints exist before the exam, show a dashed card explaining the state instead of an empty chart.
