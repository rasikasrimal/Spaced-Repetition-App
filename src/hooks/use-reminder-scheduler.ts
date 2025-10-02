"use client";

import * as React from "react";
import { useTopicStore } from "@/stores/topics";
import { isDueToday } from "@/lib/date";

const hasNotificationSupport = () => typeof window !== "undefined" && "Notification" in window;

export const useReminderScheduler = () => {
  const topics = useTopicStore((state) => state.topics);
  const notifiedTodayRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!hasNotificationSupport()) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  React.useEffect(() => {
    if (!hasNotificationSupport()) return;
    if (Notification.permission !== "granted") return;

    const clearNotified = () => {
      notifiedTodayRef.current.clear();
    };

    const midnightReset = window.setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        clearNotified();
      }
    }, 60_000);

    const interval = window.setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      topics.forEach((topic) => {
        if (!topic.reminderTime) return;
        if (topic.reminderTime !== currentTime) return;
        if (!isDueToday(topic.nextReviewDate)) return;

        const key = `${topic.id}-${now.toDateString()}`;
        if (notifiedTodayRef.current.has(key)) return;

        notifiedTodayRef.current.add(key);
        new Notification(`Review ${topic.title}`, {
          body: `It\'s time to revisit ${topic.title}.`,
          tag: topic.id
        });
      });
    }, 60_000);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(midnightReset);
    };
  }, [topics]);
};
