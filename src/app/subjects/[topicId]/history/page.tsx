"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TopicHistoryEditor } from "@/components/topics/history-editor";
import { Button } from "@/components/ui/button";
import { useTopicStore } from "@/stores/topics";

interface SubjectHistoryPageProps {
  params: {
    topicId: string;
  };
}

const SubjectHistoryPage: React.FC<SubjectHistoryPageProps> = ({ params }) => {
  const router = useRouter();
  const { topics, subjects } = useTopicStore((state) => ({ topics: state.topics, subjects: state.subjects }));

  const topic = React.useMemo(() => topics.find((item) => item.id === params.topicId) ?? null, [topics, params.topicId]);
  const subject = React.useMemo(() => {
    if (!topic) return null;
    return subjects.find((item) => item.id === (topic.subjectId ?? null)) ?? null;
  }, [subjects, topic]);

  const handleClose = React.useCallback(() => {
    router.push("/subjects");
  }, [router]);

  if (!topic) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950/30 px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-white">Topic not found</h1>
          <p className="text-sm text-zinc-400">The topic you tried to edit could not be located.</p>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/subjects">Return to subjects</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950/30 px-4 py-10">
      <div className="mx-auto mb-6 flex w-full max-w-5xl items-center">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-zinc-300 hover:text-white">
          <Link href="/subjects">
            <ArrowLeft className="h-4 w-4" /> Back to subjects
          </Link>
        </Button>
      </div>
      <TopicHistoryEditor mode="page" open topic={topic} subject={subject} onClose={handleClose} />
    </main>
  );
};

export default SubjectHistoryPage;
