"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type TimelinePreferencesState = {
  showOpacityFade: boolean;
  showReviewMarkers: boolean;
  setShowOpacityFade: (value: boolean) => void;
  setShowReviewMarkers: (value: boolean) => void;
};

export const useTimelinePreferencesStore = create<TimelinePreferencesState>()(
  persist(
    (set) => ({
      showOpacityFade: true,
      showReviewMarkers: false,
      setShowOpacityFade: (value) => set({ showOpacityFade: value }),
      setShowReviewMarkers: (value) => set({ showReviewMarkers: value })
    }),
    {
      name: "timeline-preferences",
      version: 1
    }
  )
);
