"use client";

import * as React from "react";
import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[88rem] flex-col gap-6 px-4 py-10 md:px-6 lg:px-8">
      <CalendarView />
    </main>
  );
}
