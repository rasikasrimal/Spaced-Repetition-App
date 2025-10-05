"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cn } from "@/lib/utils";

export interface ToggleProps
  extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> {}

export const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  ToggleProps
>(({ className, ...props }, ref) => {
  return (
    <TogglePrimitive.Root
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-inverse/10 bg-bg/30 px-3 py-2 text-xs font-medium uppercase tracking-wide transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "data-[state=on]:border-accent/40 data-[state=on]:bg-accent/25 data-[state=on]:text-fg",
        "data-[state=off]:text-muted-foreground data-[state=off]:hover:border-inverse/20 data-[state=off]:hover:bg-card/60 data-[state=off]:hover:text-fg",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Toggle.displayName = "Toggle";
