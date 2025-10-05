"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_GROWTH_ALPHA, DEFAULT_LAPSE_BETA } from "@/lib/adaptive-scheduler";
import {
  DEFAULT_RETRIEVABILITY_TARGET,
  REVIEW_TRIGGER_MAX,
  REVIEW_TRIGGER_MIN
} from "@/lib/forgetting-curve";
import { useTopicStore } from "@/stores/topics";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export type AdaptiveMode = "adaptive" | "fixed";

type ReviewPreferencesState = {
  mode: AdaptiveMode;
  reviewTrigger: number;
  alpha: number;
  beta: number;
  setMode: (mode: AdaptiveMode) => void;
  setReviewTrigger: (value: number) => void;
  setAlpha: (value: number) => void;
  setBeta: (value: number) => void;
};

const applyTriggerToTopics = (trigger: number) => {
  const apply = useTopicStore.getState().applyReviewTrigger;
  if (typeof apply === "function") {
    apply(trigger);
  }
};

export const useReviewPreferencesStore = create<ReviewPreferencesState>()(
  persist(
    (set) => ({
      mode: "adaptive",
      reviewTrigger: DEFAULT_RETRIEVABILITY_TARGET,
      alpha: DEFAULT_GROWTH_ALPHA,
      beta: DEFAULT_LAPSE_BETA,
      setMode: (mode) =>
        set((state) => {
          if (mode === "adaptive") {
            applyTriggerToTopics(state.reviewTrigger);
          }
          return { mode };
        }),
      setReviewTrigger: (value) => {
        const clamped = clamp(value, REVIEW_TRIGGER_MIN, REVIEW_TRIGGER_MAX);
        set({ reviewTrigger: clamped, mode: "adaptive" });
        applyTriggerToTopics(clamped);
      },
      setAlpha: (value) => set({ alpha: Math.max(0, value) }),
      setBeta: (value) => set({ beta: clamp(value, 0, 1) })
    }),
    {
      name: "adaptive-review-preferences",
      version: 1,
      onRehydrateStorage: () => (state, error) => {
        if (error) return;
        const trigger = state?.reviewTrigger ?? DEFAULT_RETRIEVABILITY_TARGET;
        applyTriggerToTopics(trigger);
      }
    }
  )
);

export const getReviewPreferencesState = () => useReviewPreferencesStore.getState();
