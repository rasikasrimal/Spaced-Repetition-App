"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTopicStore } from "@/stores/topics";
import { TopicCard } from "@/components/dashboard/topic-card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default function ReviewsPage() {
  const router = useRouter();
  const topics = useTopicStore((state) => state.topics);
  const dueTopics = React.useMemo(
    () =>
      topics.filter((topic) => new Date(topic.nextReviewDate).getTime() <= Date.now()),
    [topics]
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-white">Today’s Reviews</h1>
        <p className="text-sm text-zinc-400">
          Focus on the topics that are due right now. Knock them out to keep your streak alive.
        </p>
      </header>

      {dueTopics.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/5 p-8 text-center text-sm text-zinc-300">
          <Clock className="mx-auto mb-3 h-8 w-8 text-accent" />
          You’re all caught up for today. Great work!
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => router.push("/timeline")}>
              View schedule
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dueTopics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} onEdit={() => router.push(/topics//edit)} />
          ))}
        </div>
      )}
    </section>
  );
}
