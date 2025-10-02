"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { IconPreview } from "@/components/icon-preview";
import { Button } from "@/components/ui/button";
import { useTopicStore } from "@/stores/topics";
import { formatDate, formatTime, isDueToday } from "@/lib/date";
import { cn } from "@/lib/utils";
import { PenLine } from "lucide-react";

interface TopicCardProps {
  id: string;
  title: string;
  notes: string;
  categoryLabel: string | null;
  color: string;
  icon: string;
  nextReviewDate: string;
  reminderTime: string | null;
  intervals: number[];
  intervalIndex: number;
  onEdit: () => void;
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
  intervalIndex,
  onEdit
}) => {
  const markReviewed = useTopicStore((state) => state.markReviewed);
  const deleteTopic = useTopicStore((state) => state.deleteTopic);
  const [marking, setMarking] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const due = isDueToday(nextReviewDate);
  const totalIntervals = Math.max(intervals.length, 1);
  const currentInterval =
    intervals[Math.min(intervalIndex, totalIntervals - 1)] ?? intervals[intervals.length - 1] ?? 1;
  const progress = Math.round(((Math.min(intervalIndex, totalIntervals - 1) + 1) / totalIntervals) * 100);

  return (
    <motion.article
      layout
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group flex h-full flex-col justify-between rounded-3xl border border-white/5 bg-white/5 p-5 shadow-lg backdrop-blur"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${color}22` }}
            >
              <IconPreview name={icon} className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {categoryLabel ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-zinc-200">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {categoryLabel}
                </span>
              ) : null}
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
            {currentInterval} day{currentInterval === 1 ? "" : "s"}
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            className="flex-1"
            onClick={async () => {
              try {
                setMarking(true);
                await markReviewed(id);
              } finally {
                setMarking(false);
              }
            }}
            disabled={!due || marking}
          >
            {due ? (marking ? "Updating…" : "Mark Reviewed") : "Scheduled"}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" onClick={onEdit}>
              <PenLine className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                try {
                  setRemoving(true);
                  await deleteTopic(id);
                } finally {
                  setRemoving(false);
                }
              }}
              disabled={removing}
            >
              {removing ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
