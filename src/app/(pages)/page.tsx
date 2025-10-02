"use client";

import * as React from "react";
import { TopicForm } from "@/components/forms/topic-form";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { useReminderScheduler } from "@/hooks/use-reminder-scheduler";

export default function HomePage() {
  const [showForm, setShowForm] = React.useState(true);
  useReminderScheduler();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 lg:px-8">
      <motion.section
        layout
        className="flex flex-col gap-6 rounded-3xl border border-white/5 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-8 shadow-2xl"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-accent/20 p-3 text-accent">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white">Spaced Repetition, simplified</h1>
              <p className="max-w-2xl text-sm text-zinc-300">
                Capture topics, craft your review cadence, and keep knowledge fresh with local-first
                storage. Everything stays on your device while reminders and intervals keep you on
                track.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowForm((previous) => !previous)}>
            {showForm ? "Hide form" : "Add new topic"}
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
          {showForm ? <TopicForm /> : null}
          <Dashboard onCreateTopic={() => setShowForm(true)} />
        </div>
      </motion.section>
    </main>
  );
}
