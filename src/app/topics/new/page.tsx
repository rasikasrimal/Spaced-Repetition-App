"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopicForm } from "@/components/forms/topic-form";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function NewTopicPage() {
  const router = useRouter();

  const handleComplete = React.useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-12 md:px-6 lg:px-8">
      <header className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-4 w-4" /> New learning track
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-fg md:text-4xl">Create a new topic</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Follow the guided steps to set up reminders, review intervals, and notes so your future self always knows what to study next.
              </p>
            </div>
          </div>
          <Button variant="ghost" className="rounded-2xl text-muted-foreground hover:text-fg" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
          </Button>
        </div>
      </header>

      <TopicForm onSubmitComplete={handleComplete} />
    </main>
  );
}


