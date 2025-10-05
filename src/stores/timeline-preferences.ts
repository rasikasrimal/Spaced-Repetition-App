"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type TimelinePreferencesState = {
  showOpacityGradient: boolean;
  showReviewMarkers: boolean;
  showEventDots: boolean;
  showTopicLabels: boolean;
  setShowOpacityGradient: (value: boolean) => void;
  setShowReviewMarkers: (value: boolean) => void;
  setShowEventDots: (value: boolean) => void;
  setShowTopicLabels: (value: boolean) => void;
};

export const useTimelinePreferencesStore = create<TimelinePreferencesState>()(
  persist(
    (set) => ({
      showOpacityGradient: true,
      showReviewMarkers: false,
      showEventDots: true,
      showTopicLabels: true,
      setShowOpacityGradient: (value) => set({ showOpacityGradient: value }),
      setShowReviewMarkers: (value) => set({ showReviewMarkers: value }),
      setShowEventDots: (value) => set({ showEventDots: value }),
      setShowTopicLabels: (value) => set({ showTopicLabels: value })
    }),
    {
      name: "timeline-preferences",
      version: 3,
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

        const showTopicLabels =
          typeof state.showTopicLabels === "boolean" ? state.showTopicLabels : true;

        return {
          showOpacityGradient,
          showReviewMarkers,
          showEventDots,
          showTopicLabels
        } as TimelinePreferencesState;
      }
    }
  )
);
