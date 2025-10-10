"use client";

import * as React from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { useReminderScheduler } from "@/hooks/use-reminder-scheduler";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
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

  return <Dashboard onCreateTopic={handleCreateTopic} onEditTopic={handleEditTopic} />;
}
