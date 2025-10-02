"use client";

import * as React from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { useReminderScheduler } from "@/hooks/use-reminder-scheduler";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useReminderScheduler();

  const handleCreateTopic = React.useCallback(() => {
    router.push("/topics/new");
  }, [router]);

  const handleEditTopic = React.useCallback(
    (id: string) => {
      router.push(`/topics/${id}/edit`);
    },
    [router]
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6 lg:px-8">
      <Dashboard onCreateTopic={handleCreateTopic} onEditTopic={handleEditTopic} />
    </main>
  );
}

