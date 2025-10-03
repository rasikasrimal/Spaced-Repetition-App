"use client";

import * as React from "react";
import { nextStartOfDayInTimeZone, nowInTimeZone } from "@/lib/date";

export function useZonedNow(timeZone: string): Date {
  const [zonedNow, setZonedNow] = React.useState<Date>(() => nowInTimeZone(timeZone));

  React.useEffect(() => {
    let timer: number | undefined;

    const syncNow = () => setZonedNow(nowInTimeZone(timeZone));

    const scheduleRefresh = () => {
      const current = nowInTimeZone(timeZone);
      const nextMidnight = nextStartOfDayInTimeZone(timeZone, current);
      const delay = Math.max(60_000, nextMidnight.getTime() - current.getTime() + 1_000);
      timer = window.setTimeout(() => {
        syncNow();
        scheduleRefresh();
      }, delay);
    };

    syncNow();
    scheduleRefresh();

    const handleVisibility = () => {
      if (!document.hidden) {
        syncNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (typeof timer !== "undefined") {
        window.clearTimeout(timer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [timeZone]);

  return zonedNow;
}
