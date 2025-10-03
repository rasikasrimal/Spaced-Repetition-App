"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { getDayKeyInTimeZone, nowInTimeZone } from "@/lib/date";

export const useAutoSkipOverdue = () => {
  const autoSkip = useTopicStore((state) => state.autoSkipOverdueTopics);
  const timezone = useProfileStore((state) => state.profile.timezone) || "Asia/Colombo";

  React.useEffect(() => {
    let lastKey = getDayKeyInTimeZone(new Date(), timezone);

    const interval = window.setInterval(() => {
      const zonedNow = nowInTimeZone(timezone);
      const currentKey = getDayKeyInTimeZone(zonedNow, timezone);
      if (currentKey === lastKey) {
        return;
      }
      lastKey = currentKey;
      const results = autoSkip(timezone);
      if (results.length > 0) {
        const count = results.length;
        toast.info("Daily roll-over", {
          description:
            count === 1
              ? "We nudged one unfinished review into your upcoming plan."
              : `We nudged ${count} unfinished reviews into your upcoming plan.`,
          duration: 6000
        });
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [autoSkip, timezone]);
};
