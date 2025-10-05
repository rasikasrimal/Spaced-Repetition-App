"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { TopicCard } from "@/components/dashboard/topic-card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { formatRelativeToNow, nowInTimeZone } from "@/lib/date";

export default function ReviewsPage() {
  const router = useRouter();
  const topics = useTopicStore((state) => state.topics);
  const timezone = useProfileStore((state) => state.profile.timezone) || "Asia/Colombo";
  const [now, setNow] = React.useState(() => nowInTimeZone(timezone));

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(nowInTimeZone(timezone));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [timezone]);

  const dueTopics = React.useMemo(() => {
    const reference = now.getTime();
    return topics
      .filter((topic) => new Date(topic.nextReviewDate).getTime() <= reference)
      .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
  }, [now, topics]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="reviews-header text-3xl font-semibold">Today’s Reviews</h1>
        <p className="reviews-subtext text-sm">
          Focus on the topics that are due right now. Knock them out to keep your streak alive.
        </p>
      </header>

      {dueTopics.length === 0 ? (
        <div className="rounded-3xl border border-inverse/5 bg-inverse/5 p-8 text-center text-sm text-muted-foreground">
          <Clock className="mx-auto mb-3 h-8 w-8 text-accent" />
          You’re all caught up for today. Great work!
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => router.push("/timeline")}>
              View schedule
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-inverse/10 bg-inverse/5 px-4 py-3 text-sm text-muted-foreground">
            <span className="reviews-summary font-medium">{dueTopics.length} topic{dueTopics.length === 1 ? "" : "s"} waiting</span>
            <span className="review-date text-xs">Next up {formatRelativeToNow(dueTopics[0]!.nextReviewDate)}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dueTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onEdit={() => router.push(`/topics/${topic.id}/edit`)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
