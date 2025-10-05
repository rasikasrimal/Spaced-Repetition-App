"use client";

import * as React from "react";

import { TimelinePanel } from "@/components/visualizations/timeline-panel";
import { useReviewPreferencesStore } from "@/stores/review-preferences";

export default function TimelinePage() {
  const reviewTrigger = useReviewPreferencesStore((state) => state.reviewTrigger);
  const triggerPercent = Math.round(reviewTrigger * 100);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Visualise upcoming reviews alongside retention curves to plan your study sessions with confidence.
        </p>
        <p className="text-xs text-muted-foreground">
          Adaptive scheduler will ping each topic when retention reaches approximately {triggerPercent}%.
        </p>
      </header>

      <TimelinePanel />
    </section>
  );
}
