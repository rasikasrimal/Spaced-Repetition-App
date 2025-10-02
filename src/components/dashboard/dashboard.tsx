"use client";

import * as React from "react";
import { useTopicStore } from "@/stores/topics";
import { TopicCard } from "@/components/dashboard/topic-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { IconPreview } from "@/components/icon-preview";

interface DashboardProps {
  onCreateTopic: () => void;
  onEditTopic: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onCreateTopic, onEditTopic }) => {
  const topics = useTopicStore((state) => state.topics);

  const { sortedTopics, dueCount } = React.useMemo(() => {
    const sorted = [...topics].sort(
      (a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
    );
    const now = Date.now();
    const due = sorted.filter((topic) => new Date(topic.nextReviewDate).getTime() <= now).length;
    return { sortedTopics: sorted, dueCount: due };
  }, [topics]);

  const upcomingCount = Math.max(sortedTopics.length - dueCount, 0);

  return (
    <section className="flex h-full flex-col gap-6">
      <header className="flex flex-col gap-3">
        <motion.h1 layoutId="title" className="text-2xl font-semibold text-white">
          Scheduled Reviews
        </motion.h1>
        <p className="text-sm text-zinc-400">
          Everything you have queued up is listed below, sorted by the next review date so the most
          urgent topics stay at the top of your list.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Due now ({dueCount})
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/5 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-muted" />
            Upcoming ({upcomingCount})
          </span>
        </div>
      </header>

      {sortedTopics.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <div className="max-w-sm space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-accent">
              <IconPreview name="Sparkles" className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-white">Create your first topic</h2>
            <p className="text-sm text-zinc-400">
              Add notes, icons, intervals, and reminders to stay on top of the subjects that matter
              most to you.
            </p>
            <Button onClick={onCreateTopic} className="gap-2">
              <Plus className="h-4 w-4" />
              New topic
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
            {dueCount === 0 ? (
              <div className="col-span-full rounded-3xl border border-white/5 bg-white/5 p-6 text-center text-sm text-zinc-400">
                You&apos;re all caught up. Upcoming reviews are scheduled below in chronological order.
              </div>
            ) : null}
            {sortedTopics.map((topic) => (
              <TopicCard key={topic.id} {...topic} onEdit={() => onEditTopic(topic.id)} />
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
};
