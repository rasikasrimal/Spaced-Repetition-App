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
        "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2 text-xs font-medium uppercase tracking-wide transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "data-[state=on]:border-accent/40 data-[state=on]:bg-accent/25 data-[state=on]:text-white",
        "data-[state=off]:text-zinc-300 data-[state=off]:hover:border-white/20 data-[state=off]:hover:bg-slate-900/60 data-[state=off]:hover:text-white",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Toggle.displayName = "Toggle";
