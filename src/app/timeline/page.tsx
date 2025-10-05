"use client";

import * as React from "react";
import { TimelinePanel } from "@/components/visualizations/timeline-panel";

export default function TimelinePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Visualise upcoming reviews alongside retention curves to plan your study sessions with confidence.
        </p>
      </header>

      <TimelinePanel />
    </section>
  );
}
