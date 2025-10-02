"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { IconPreview } from "@/components/icon-preview";
import { Button } from "@/components/ui/button";
import { useTopicStore } from "@/stores/topics";
import { formatDate, formatTime, isDueToday } from "@/lib/date";
import { cn } from "@/lib/utils";

interface TopicCardProps {
  id: string;
  title: string;
  notes: string;
  categoryLabel: string;
  color: string;
  icon: string;
  nextReviewDate: string;
  reminderTime: string | null;
  intervals: number[];
  currentIntervalIndex: number;
}

export const TopicCard: React.FC<TopicCardProps> = ({
  id,
  title,
  notes,
  categoryLabel,
  color,
  icon,
  nextReviewDate,
  reminderTime,
  intervals,
  currentIntervalIndex
}) => {
  const markReviewed = useTopicStore((state) => state.markReviewed);
  const deleteTopic = useTopicStore((state) => state.deleteTopic);
  const due = isDueToday(nextReviewDate);
  const totalIntervals = Math.max(intervals.length, 1);
  const progress = Math.round(((Math.min(currentIntervalIndex, totalIntervals - 1) + 1) / totalIntervals) * 100);

  return (
    <motion.article
      layout
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group flex h-full flex-col justify-between rounded-3xl border border-white/5 bg-white/5 p-5 shadow-lg backdrop-blur"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}22` }}>
              <IconPreview name={icon} className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-xs uppercase tracking-wide text-zinc-400">{categoryLabel}</p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              due ? "bg-accent text-accent-foreground" : "bg-muted text-zinc-300"
            )}
          >
            {due ? "Due today" : `Due ${formatDate(nextReviewDate)}`}
          </span>
        </div>
        {notes ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-zinc-200/90">{notes}</p>
        ) : (
          <p className="text-sm text-zinc-400">No notes yet</p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Reminder</span>
          <span>{formatTime(reminderTime)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Interval</span>
          <span>
            {intervals[currentIntervalIndex]} day{intervals[currentIntervalIndex] === 1 ? "" : "s"}
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            className="flex-1"
            onClick={() => markReviewed(id)}
            disabled={!due}
          >
            {due ? "Mark Reviewed" : "Scheduled"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => deleteTopic(id)}>
            Delete
          </Button>
        </div>
      </div>
    </motion.article>
  );
};
