"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TodayDifficulty = "EASY" | "NORMAL" | "HARD";

type TodayStoreState = {
  topicIds: string[];
  visibleCount: number;
  completedToday: string[];
  difficultyByTopic: Record<string, TodayDifficulty>;
  dayKey: string | null;
};

type TodayStoreActions = {
  ensureSession: (dayKey: string) => void;
  setQueue: (ids: string[]) => void;
  syncQueue: (ids: string[]) => void;
  loadMore: (increment?: number) => void;
  markCompleted: (id: string) => void;
  markDifficulty: (id: string, difficulty: TodayDifficulty) => void;
  resetSession: (dayKey: string) => void;
};

const MIN_VISIBLE = 5;

export const useTodayStore = create<TodayStoreState & TodayStoreActions>()(
  persist(
    (set, get) => ({
      topicIds: [],
      visibleCount: MIN_VISIBLE,
      completedToday: [],
      difficultyByTopic: {},
      dayKey: null,
      ensureSession: (dayKey) => {
        const state = get();
        if (state.dayKey === dayKey) {
          return;
        }
        set({
          dayKey,
          visibleCount: MIN_VISIBLE,
          completedToday: [],
          difficultyByTopic: {}
        });
      },
      setQueue: (ids) => {
        const state = get();
        if (
          ids.length === state.topicIds.length &&
          ids.every((id, index) => id === state.topicIds[index])
        ) {
          return;
        }
        set({ topicIds: ids });
      },
      syncQueue: (ids) => {
        const state = get();
        const completedToday = state.completedToday.filter((id) => ids.includes(id));
        const difficultyByTopic = Object.fromEntries(
          Object.entries(state.difficultyByTopic).filter(([id]) => ids.includes(id))
        );
        const nextVisible = ids.length === 0
          ? 0
          : Math.min(Math.max(state.visibleCount, MIN_VISIBLE), ids.length);
        set({
          completedToday,
          difficultyByTopic,
          visibleCount: nextVisible
        });
      },
      loadMore: (increment = MIN_VISIBLE) => {
        set((state) => ({
          visibleCount: state.topicIds.length === 0
            ? 0
            : Math.min(state.topicIds.length, state.visibleCount + increment)
        }));
      },
      markCompleted: (id) => {
        set((state) => {
          if (state.completedToday.includes(id)) {
            return state;
          }
          return { completedToday: [...state.completedToday, id] };
        });
      },
      markDifficulty: (id, difficulty) => {
        set((state) => ({
          difficultyByTopic: { ...state.difficultyByTopic, [id]: difficulty }
        }));
      },
      resetSession: (dayKey) => {
        set({
          dayKey,
          visibleCount: MIN_VISIBLE,
          completedToday: [],
          difficultyByTopic: {}
        });
      }
    }),
    {
      name: "today-review-session",
      version: 1
    }
  )
);

