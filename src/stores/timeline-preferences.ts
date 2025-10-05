"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type TimelinePreferencesState = {
  showOpacityGradient: boolean;
  showReviewMarkers: boolean;
  showEventDots: boolean;
  setShowOpacityGradient: (value: boolean) => void;
  setShowReviewMarkers: (value: boolean) => void;
  setShowEventDots: (value: boolean) => void;
};

export const useTimelinePreferencesStore = create<TimelinePreferencesState>()(
  persist(
    (set) => ({
      showOpacityGradient: true,
      showReviewMarkers: false,
      showEventDots: true,
      setShowOpacityGradient: (value) => set({ showOpacityGradient: value }),
      setShowReviewMarkers: (value) => set({ showReviewMarkers: value }),
      setShowEventDots: (value) => set({ showEventDots: value })
    }),
    {
      name: "timeline-preferences",
      version: 2,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as TimelinePreferencesState;
        }

        const state = persistedState as Partial<TimelinePreferencesState> & {
          showOpacityFade?: boolean;
        };

        const showOpacityGradient =
          typeof state.showOpacityGradient === "boolean"
            ? state.showOpacityGradient
            : typeof state.showOpacityFade === "boolean"
              ? state.showOpacityFade
              : true;

        const showReviewMarkers =
          typeof state.showReviewMarkers === "boolean" ? state.showReviewMarkers : false;

        const showEventDots =
          typeof state.showEventDots === "boolean" ? state.showEventDots : true;

        return {
          showOpacityGradient,
          showReviewMarkers,
          showEventDots
        } as TimelinePreferencesState;
      }
    }
  )
);
