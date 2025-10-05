"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { TopicForm } from "@/components/forms/topic-form";
import { Button } from "@/components/ui/button";
import { PenSquare, ArrowLeft } from "lucide-react";
import { useTopicStore } from "@/stores/topics";

export default function EditTopicPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const topicId = params?.id ?? "";

  const topic = useTopicStore(
    React.useCallback((state) => state.topics.find((item) => item.id === topicId), [topicId])
  );

  const handleComplete = React.useCallback(() => {
    router.push("/");
  }, [router]);

  if (!topic) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-12 md:px-6 lg:px-8">
        <div className="rounded-3xl border border-inverse/5 bg-card/60 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-fg">Topic unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t find that topic. It might have been removed or hasn&apos;t been created yet.
          </p>
          <Button className="mt-6 rounded-2xl" onClick={() => router.push("/")}>
            Back to dashboard
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-12 md:px-6 lg:px-8">
      <header className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
              <PenSquare className="h-4 w-4" /> Editing topic
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-fg md:text-4xl">{topic.title}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Adjust reminders, intervals, and notes. Your progress history stays intact.
              </p>
            </div>
          </div>
          <Button variant="ghost" className="rounded-2xl text-muted-foreground hover:text-fg" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
          </Button>
        </div>
      </header>

      <TopicForm topicId={topicId} onSubmitComplete={handleComplete} />
    </main>
  );
}


