"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import { invoke } from "@tauri-apps/api/core";

import { idbStorage } from "@/lib/idb-storage";
import { Category, DesktopSnapshot, Topic } from "@/types/topic";

export type ReviewStatus = "due" | "scheduled" | "completed";

export type TopicPayload = {
  title: string;
  notes: string;
  categoryId: string | null;
  icon: string;
  color: string;
  reminderTime: string | null;
  intervals: number[];
};

export type TopicStore = {
  topics: Topic[];
  categories: Category[];
  hydrated: boolean;
  initializing: boolean;
  initialize: () => Promise<void>;
  refreshSnapshot: () => Promise<void>;
  addCategory: (payload: Omit<Category, "id">) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  addTopic: (payload: TopicPayload, options?: { id?: string }) => Promise<Topic>;
  updateTopic: (id: string, payload: TopicPayload) => Promise<Topic>;
  deleteTopic: (id: string) => Promise<void>;
  markReviewed: (id: string) => Promise<Topic>;
};

const isDesktop =
  typeof window !== "undefined" && Boolean((window as any).__TAURI__);

const computeNextReviewDate = (
  lastReviewedAt: string | null,
  intervals: number[],
  intervalIndex: number
): string => {
  const baseDate = lastReviewedAt ? new Date(lastReviewedAt) : new Date();
  const safeIntervals = intervals.length > 0 ? intervals : [1];
  const clampedIndex = Math.max(0, Math.min(intervalIndex, safeIntervals.length - 1));
  const nextInterval = safeIntervals[clampedIndex];
  const nextDate = new Date(baseDate);
  nextDate.setDate(baseDate.getDate() + nextInterval);
  return nextDate.toISOString();
};

const createDesktopStore = () => {
  const store = create<TopicStore>((set, get) => ({
    topics: [],
    categories: [],
    hydrated: false,
    initializing: false,
    initialize: async () => {
      if (get().hydrated || get().initializing) return;
      set({ initializing: true });
      try {
        const snapshot = await invoke<DesktopSnapshot>("db_get_snapshot");
        set({
          topics: snapshot.topics,
          categories: snapshot.categories,
          hydrated: true,
        });
      } finally {
        set({ initializing: false });
      }
    },
    refreshSnapshot: async () => {
      const snapshot = await invoke<DesktopSnapshot>("db_get_snapshot");
      set({
        topics: snapshot.topics,
        categories: snapshot.categories,
        hydrated: true,
      });
    },
    addCategory: async (payload) => {
      const category = await invoke<Category>("db_create_category", { payload });
      set((state) => ({ categories: [...state.categories, category] }));
      return category;
    },
    deleteCategory: async (id) => {
      await invoke("db_delete_category", { id });
      set((state) => ({
        categories: state.categories.filter((category) => category.id !== id),
        topics: state.topics.map((topic) =>
          topic.categoryId === id
            ? { ...topic, categoryId: null, categoryLabel: null }
            : topic
        ),
      }));
    },
    addTopic: async (payload, options) => {
      const topic = await invoke<Topic>("db_create_topic", {
        id: options?.id ?? null,
        payload,
      });
      set((state) => ({ topics: [topic, ...state.topics] }));
      return topic;
    },
    updateTopic: async (id, payload) => {
      const topic = await invoke<Topic>("db_update_topic", { id, payload });
      set((state) => ({
        topics: state.topics.map((item) => (item.id === id ? topic : item)),
      }));
      return topic;
    },
    deleteTopic: async (id) => {
      await invoke("db_delete_topic", { id });
      set((state) => ({ topics: state.topics.filter((topic) => topic.id !== id) }));
    },
    markReviewed: async (id) => {
      const topic = await invoke<Topic>("db_mark_reviewed", { id });
      set((state) => ({
        topics: state.topics.map((item) => (item.id === id ? topic : item)),
      }));
      return topic;
    },
  }));

  if (typeof window !== "undefined") {
    void store.getState().initialize();
  }

  return store;
};

const createBrowserStore = () =>
  create<TopicStore>()(
    persist(
      (set, get) => ({
        topics: [],
        categories: [
          { id: "general", label: "General", color: "#38bdf8", icon: "Sparkles" },
        ],
        hydrated: true,
        initializing: false,
        initialize: async () => {},
        refreshSnapshot: async () => {},
        addCategory: async (payload) => {
          const category: Category = {
            id: nanoid(),
            label: payload.label,
            color: payload.color,
            icon: payload.icon,
          };
          set((state) => ({ categories: [...state.categories, category] }));
          return category;
        },
        deleteCategory: async (id) => {
          set((state) => ({
            categories: state.categories.filter((category) => category.id !== id),
            topics: state.topics.map((topic) =>
              topic.categoryId === id
                ? { ...topic, categoryId: null, categoryLabel: null }
                : topic
            ),
          }));
        },
        addTopic: async (payload, options) => {
          const id = options?.id ?? nanoid();
          const createdAt = new Date().toISOString();
          const intervalIndex = 0;
          const nextReviewDate = computeNextReviewDate(null, payload.intervals, intervalIndex);
          const topic: Topic = {
            id,
            title: payload.title,
            notes: payload.notes,
            categoryId: payload.categoryId,
            categoryLabel: get()
              .categories.find((category) => category.id === payload.categoryId)?.label ?? null,
            icon: payload.icon,
            color: payload.color,
            reminderTime: payload.reminderTime,
            intervals: [...payload.intervals],
            intervalIndex,
            nextReviewDate,
            lastReviewedAt: null,
            createdAt,
            updatedAt: createdAt,
            snoozedUntil: null,
          };
          set((state) => ({ topics: [topic, ...state.topics] }));
          return topic;
        },
        updateTopic: async (id, payload) => {
          set((state) => ({
            topics: state.topics.map((topic) => {
              if (topic.id !== id) return topic;
              const nextReviewDate = computeNextReviewDate(
                topic.lastReviewedAt,
                payload.intervals,
                topic.intervalIndex
              );
              return {
                ...topic,
                title: payload.title,
                notes: payload.notes,
                categoryId: payload.categoryId,
                categoryLabel:
                  state.categories.find((category) => category.id === payload.categoryId)?.label ??
                  null,
                icon: payload.icon,
                color: payload.color,
                reminderTime: payload.reminderTime,
                intervals: [...payload.intervals],
                nextReviewDate,
                updatedAt: new Date().toISOString(),
              };
            }),
          }));
          const topic = get().topics.find((item) => item.id === id);
          if (!topic) throw new Error("Topic not found");
          return topic;
        },
        deleteTopic: async (id) => {
          set((state) => ({ topics: state.topics.filter((topic) => topic.id !== id) }));
        },
        markReviewed: async (id) => {
          let updatedTopic: Topic | null = null;
          set((state) => ({
            topics: state.topics.map((topic) => {
              if (topic.id !== id) return topic;
              const now = new Date().toISOString();
              const intervals = topic.intervals.length > 0 ? topic.intervals : [1];
              const nextIndex = Math.min(topic.intervalIndex + 1, intervals.length - 1);
              const nextReviewDate = computeNextReviewDate(now, intervals, nextIndex);
              const nextTopic = {
                ...topic,
                intervalIndex: nextIndex,
                lastReviewedAt: now,
                nextReviewDate,
                updatedAt: now,
                snoozedUntil: null,
              };
              updatedTopic = nextTopic;
              return nextTopic;
            }),
          }));
          if (!updatedTopic) {
            throw new Error("Topic not found");
          }
          return updatedTopic;
        },
      }),
      {
        name: "spacedrep-browser-store",
        storage: createJSONStorage(() => idbStorage),
      }
    )
  );

export const useTopicStore = isDesktop ? createDesktopStore() : createBrowserStore();

