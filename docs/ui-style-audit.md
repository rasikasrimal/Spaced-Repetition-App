# Home Page UI Token Audit

## Typography
- Primary page title (`Stay ahead of your reviews`): `text-3xl font-semibold text-white`
- Section titles (e.g. `Scheduled Reviews`, empty state heading): `text-2xl`/`text-xl` with `font-semibold text-white`
- Body copy: `text-sm` with `text-zinc-300` or `text-zinc-400`, often `leading-relaxed`
- Meta/badge text: `text-xs text-zinc-400`, uppercase for chips when needed

## Colors & Surfaces
- Accent brand: `bg-accent` (`#38bdf8`) with `text-accent-foreground`
- Panels: gradient surface `bg-gradient-to-br from-white/10 via-white/5 to-white/0`
- Secondary surfaces: `bg-white/5`, chips `bg-white/10`, muted backgrounds `bg-muted`
- Borders: `border border-white/5` on primary cards, `border-white/10` for subtle dividers or pills
- Text contrast: titles `text-white`, supporting copy `text-zinc-300`, meta text `text-zinc-400`

## Spacing & Layout
- Page container: `max-w-6xl` with `px-4 md:px-6 lg:px-8`, vertical rhythm via `py-10` and `gap-8`
- Section padding: hero card `p-8`, dashboard/timeline tiles `p-6`
- Grid rhythm: `gap-6` as the baseline, responsive columns like `lg:grid-cols-[minmax(0,360px)_1fr]`, `md:grid-cols-2`, `xl:grid-cols-3`

## Buttons & Controls
- Primary CTA: `Button` default variant (accent fill) with rounded-lg corners
- Secondary actions: `variant="outline"` (`border-border bg-surface hover:bg-muted`)
- Ghost/icon actions: `variant="ghost"` with subtle hover fill
- Form controls: `rounded-lg border border-border bg-card/60 px-3 py-2 text-sm` and accent focus ring

## Card & Panel Treatments
- Containers use `rounded-3xl`, translucent surfaces (`bg-white/5`), soft borders (`border-white/5`), `shadow-lg`–`shadow-2xl`, and `backdrop-blur`
- Empty states: dashed borders `border-dashed border-white/10`, icon tiles `rounded-2xl bg-accent/20`

## Iconography
- Header icons: `rounded-2xl bg-accent/20 p-3 text-accent` with `h-6 w-6`
- Topic avatars: tint containers with inline style ``style={{ backgroundColor: `${color}22` }}``
- Action icons: `h-4 w-4` within ghost buttons, consistent spacing via `gap-2`
