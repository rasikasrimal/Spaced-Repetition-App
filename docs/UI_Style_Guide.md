# UI Style Guide

## Underline navigation
- Component: `NavigationBar` (`src/components/layout/navigation-bar.tsx`).
- Behaviour: accent-coloured bar slides beneath the active item using transform transitions (`transition-[width,transform,opacity] duration-300 ease-out`).
- Tabs use `px-3 py-3` padding with rounded-lg hit areas and subtle accent-tinted background on hover.
- Icons (`lucide-react`, 16px) scale to 110% and shift up `0.5` units on hover for motion feedback.
- Active state: bold text (`font-semibold`), `text-accent`, and persistent accent background wash.
- Focus: 2px accent ring with offset to preserve accessibility.

## Cards & gradients
- Feature cards (Explore) apply `bg-gradient-to-br from-accent/10 via-transparent to-transparent` and animate to `from-accent/20 via-accent/10` on hover.
- Cards lift slightly with `hover:-translate-y-1` to communicate interactivity without heavy shadows.

## Surfaces & spacing
- Header surfaces use `bg-card/80` with `backdrop-blur` and `border-muted/40` for a flat, GitHub-inspired aesthetic.
- Section containers leverage 24px padding on mobile (`p-6`) and 40px on desktop (`md:p-10`).
- Vertical rhythm on Explore: 48px spacing between header, segmented control, and content (`space-y-12`).

## Responsive navigation
- Desktop: centered underline tabs, fixed header.
- Mobile: hamburger popover with pill links reusing accent hover states.
- Theme toggle surfaces both in the header (quick access) and profile menu (requirements parity).
