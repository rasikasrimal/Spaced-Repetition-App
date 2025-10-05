"use client";

import * as React from "react";
import { CalendarClock, CalendarDays, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatusBadgeType = "exam" | "upcoming" | "overdue";

interface StatusBadgeConfig {
  className: string;
  icon: LucideIcon;
  getAriaLabel?: (label: string, date?: string) => string;
}

const baseBadgeClass =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const statusConfig: Record<StatusBadgeType, StatusBadgeConfig> = {
  exam: {
    className:
      "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 focus-visible:ring-amber-400/60 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/60 dark:hover:bg-amber-800/60", 
    icon: CalendarClock,
    getAriaLabel: (label, date) => (date ? `Exam date: ${label}` : `Exam status: ${label}`)
  },
  upcoming: {
    className:
      "bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200 focus-visible:ring-sky-400/60 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700/60 dark:hover:bg-sky-800/60",
    icon: CalendarDays,
    getAriaLabel: (label) => `Upcoming status: ${label}`
  },
  overdue: {
    className:
      "bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200 focus-visible:ring-rose-400/60 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700/60 dark:hover:bg-rose-800/60",
    icon: AlertTriangle,
    getAriaLabel: (label) => `Overdue status: ${label}`
  }
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: StatusBadgeType;
  label: string;
  date?: string;
  icon?: LucideIcon;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge(
  props,
  ref
) {
  const {
    type,
    label,
    date,
    icon: IconOverride,
    className,
    role,
    tabIndex,
    ["aria-label"]: ariaLabelProp,
    ...rest
  } = props;

  const config = statusConfig[type];
  const Icon = IconOverride ?? config.icon;
  const ariaLabel = ariaLabelProp ?? config.getAriaLabel?.(label, date) ?? label;

  return (
    <span
      {...rest}
      ref={ref}
      role={role ?? "status"}
      aria-label={ariaLabel}
      aria-live="polite"
      tabIndex={tabIndex ?? 0}
      className={cn(baseBadgeClass, config.className, className)}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  );
});
