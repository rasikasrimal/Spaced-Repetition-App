# Accessibility Notes – Subject Identity Controls

## Keyboard navigation

- Popover triggers (`IconPicker`, `ColorPicker`) are reachable via Tab and expose visible focus rings.
- Within the colour palette, Tab enters the grid and arrow keys follow native focus order across swatches.
- Each swatch is a `button` element with `title` plus text label; screen readers announce the colour name and value.
- Icon grid buttons expose `aria-label="Select {label}"` and toggle `aria-pressed` to convey the current selection.
- Searching in the icon picker focuses the input automatically and the filtered results remain in the same tab sequence.

## Visual affordances

- Hover states use 150–200 ms `ease-in-out` transitions and mild translation to communicate interactivity.
- Selected colours/icons receive accent borders and elevation; contrast meets or exceeds 4.5:1 thanks to auto text colour switching.

## Assistive feedback

- Invalid colour input renders an inline error message while keeping focus in the field.
- Closing a popover resets temporary state so screen reader users do not encounter stale values on the next open.
- Live preview updates synchronously with form changes, ensuring users with cognitive impairments can verify selections immediately.
