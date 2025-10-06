# Theme Guide Supplement

## Subject palette reference

| Name            | Value               | Notes |
|-----------------|---------------------|-------|
| Ocean Blue      | hsl(221, 83%, 53%)  | Default fallback subject tone. |
| Emerald Green   | hsl(152, 67%, 45%)  | High-contrast green for science/biology sets. |
| Sunset Orange   | hsl(20, 90%, 55%)   | Warm alert tone for urgent subjects. |
| Golden Yellow   | hsl(45, 95%, 58%)   | Works with dark icons; ensure text flips to dark mode. |
| Violet Dream    | hsl(268, 75%, 60%)  | Accent for creative/language topics. |
| Coral Pink      | hsl(350, 85%, 65%)  | Bright pastel with strong contrast on dark UI. |
| Sky Cyan        | hsl(190, 90%, 55%)  | Vibrant cool tone; avoids clashing with Ocean Blue. |
| Slate Gray      | hsl(210, 10%, 45%)  | Neutral option for understated subjects. |
| Forest Green    | hsl(130, 45%, 38%)  | Rich tone for ecology/history pairings. |
| Charcoal        | hsl(0, 0%, 20%)     | Dark identity; preview auto-switches to light text. |
| Lavender Fog    | hsl(270, 45%, 72%)  | Soft pastel; ensure adjacent chips use darker borders. |
| Midnight Indigo | hsl(231, 53%, 32%)  | Deep study tone suitable for long-form topics. |

## Usage tips

- The preview system automatically softens backgrounds via `getTintedSurfaceColor` to avoid overpowering the UI.
- When designing new surfaces, read `getAccessibleTextColor` to choose between dark (`#0f172a`) or light (`#ffffff`) text.
- Preserve contrast by pairing darker colours with lighter icon chips (and vice versa).
- All palette values map cleanly to CSS colour inputs (`hsl(...)` strings) and can be stored directly in the subject schema.
