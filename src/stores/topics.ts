import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { Category, Topic, TopicEvent } from "@/types/topic";

export type ReviewStatus = "due" | "scheduled" | "completed";

export type TopicPayload = {
  title: string;
  notes: string;
  categoryId: string | null;
  categoryLabel: string;
  icon: string;
  color: string;
  reminderTime: string | null;
  intervals: number[];
};

type TopicStoreState = {
  topics: Topic[];
  categories: Category[];
};

type TopicStore = TopicStoreState & {
  addCategory: (category: Omit<Category, "id">) => Category;
  addTopic: (payload: TopicPayload) => void;
  updateTopic: (id: string, payload: TopicPayload) => void;
  deleteTopic: (id: string) => void;
  markReviewed: (id: string) => void;
};

const DEFAULT_FORGETTING = Object.freeze({
  beta: 1.0,
  strategy: "reviews" as const,
  baseHalfLifeHours: 12,
  growthPerSuccessfulReview: 2.0
});

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

const VERSION = 2;

type PersistedState = TopicStoreState & { version?: number };

const migrate = (persisted: PersistedState, from: number): PersistedState => {
  if (from < VERSION) {
    persisted.topics = persisted.topics.map((rawTopic) => {
      const anyTopic = rawTopic as Topic & { currentIntervalIndex?: number };
      const intervalIndex = anyTopic.intervalIndex ?? anyTopic.currentIntervalIndex ?? 0;
      const { currentIntervalIndex: _legacy, ...rest } = anyTopic;
      const startedAt = rest.startedAt ?? rest.createdAt;
      const seededEvents: TopicEvent[] = Array.isArray(rest.events) ? [...rest.events] : [];

      if (!seededEvents.some((event) => event.type === "started")) {
        seededEvents.unshift({
          id: nanoid(),
          topicId: rest.id,
          type: "started",
          at: startedAt
        });
      }

      if (
        rest.lastReviewedAt &&
        !seededEvents.some((event) => event.type === "reviewed" && event.at === rest.lastReviewedAt)
      ) {
        const interval = rest.intervals?.[intervalIndex] ?? rest.intervals?.[0] ?? 1;
        seededEvents.push({
          id: nanoid(),
          topicId: rest.id,
          type: "reviewed",
          at: rest.lastReviewedAt,
          intervalDays: interval
        });
      }

      const orderedEvents = seededEvents.sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
      );

      return {
        ...rest,
        intervalIndex,
        startedAt,
        events: orderedEvents,
        forgetting: rest.forgetting ?? { ...DEFAULT_FORGETTING }
      };
    });
  }

  return persisted;
};

export const useTopicStore = create<TopicStore>()(
  persist(
    (set, get) => ({
      topics: [],
      categories: [
        { id: "general", label: "General", color: "#38bdf8", icon: "Sparkles" }
      ],
      addCategory: (category) => {
        const newCategory: Category = {
          id: nanoid(),
          ...category
        };
        set((state) => ({ categories: [...state.categories, newCategory] }));
        return newCategory;
      },
      addTopic: (payload) => {
        const id = nanoid();
        const createdAt = new Date().toISOString();
        const startedAt = createdAt;
        const intervalIndex = 0;
        const nextReviewDate = computeNextReviewDate(null, payload.intervals, intervalIndex);
        const startedEvent: TopicEvent = {
          id: nanoid(),
          topicId: id,
          type: "started",
          at: startedAt
        };

        const topic: Topic = {
          id,
          createdAt,
          startedAt,
          lastReviewedAt: null,
          intervalIndex,
          nextReviewDate,
          events: [startedEvent],
          forgetting: { ...DEFAULT_FORGETTING },
          ...payload
        };
        set((state) => ({ topics: [topic, ...state.topics] }));
      },
      updateTopic: (id, payload) => {
        set((state) => ({
          topics: state.topics.map((topic) => {
            if (topic.id !== id) return topic;
            const updatedIntervals = payload.intervals;
            const nextReviewDate = computeNextReviewDate(
              topic.lastReviewedAt,
              updatedIntervals,
              topic.intervalIndex
            );
            return {
              ...topic,
              ...payload,
              intervals: updatedIntervals,
              nextReviewDate
            };
          })
        }));
      },
      deleteTopic: (id) => {
        set((state) => ({ topics: state.topics.filter((topic) => topic.id !== id) }));
      },
      markReviewed: (id) => {
        set((state) => ({
          topics: state.topics.map((topic) => {
            if (topic.id !== id) return topic;

            const nowIso = new Date().toISOString();
            const currentIntervals = topic.intervals.length > 0 ? topic.intervals : [1];
            const nextIndex = Math.min(topic.intervalIndex + 1, currentIntervals.length - 1);
            const intervalDays = currentIntervals[nextIndex] ?? 1;
            const updatedEvents: TopicEvent[] = [
              ...(topic.events ?? []),
              {
                id: nanoid(),
                topicId: topic.id,
                type: "reviewed",
                at: nowIso,
                intervalDays
              }
            ];

            return {
              ...topic,
              intervalIndex: nextIndex,
              lastReviewedAt: nowIso,
              nextReviewDate: computeNextReviewDate(nowIso, currentIntervals, nextIndex),
              events: updatedEvents
            };
          })
        }));
      }
    }),
    {
      name: "spaced-repetition-store",
      version: VERSION,
      migrate
    }
  )
);
