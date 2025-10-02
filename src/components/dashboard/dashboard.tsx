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
}

export const Dashboard: React.FC<DashboardProps> = ({ onCreateTopic }) => {
  const topics = useTopicStore((state) => state.topics);
  const dueTopics = React.useMemo(
    () => topics.filter((topic) => new Date(topic.nextReviewDate) <= new Date()),
    [topics]
  );

  return (
    <section className="flex h-full flex-col gap-6">
      <header className="flex flex-col gap-3">
        <motion.h1
          layoutId="title"
          className="text-2xl font-semibold text-white"
        >
          Today&apos;s Reviews
        </motion.h1>
        <p className="text-sm text-zinc-400">
          Keep your streak alive by reviewing topics scheduled for today. Marking a card as reviewed
          will automatically plan the next session based on your interval strategy.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Due today
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/5 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-muted" />
            Scheduled
          </span>
        </div>
      </header>

      {topics.length === 0 ? (
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
            {dueTopics.length > 0 ? (
              dueTopics.map((topic) => <TopicCard key={topic.id} {...topic} />)
            ) : (
              <div className="col-span-full rounded-3xl border border-white/5 bg-white/5 p-6 text-center text-sm text-zinc-400">
                Nothing due right now. Kick things off by scheduling a new topic or review
                upcoming cards ahead of time.
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </section>
  );
};
