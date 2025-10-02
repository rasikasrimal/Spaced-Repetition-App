import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import { Category, Topic, TopicEvent } from "@/types/topic";
import { idbStorage } from "@/lib/idb-storage";

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
  _migratedToIDB?: boolean;
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

const STORAGE_KEY = "spacedrep-store-v3";
const LEGACY_STORAGE_KEY = "spaced-repetition-store";
const VERSION = 3;

type PersistedState = TopicStoreState & { version?: number };

const migrateEventsAndConfig = (rawTopic: Topic & { currentIntervalIndex?: number }): Topic => {
  const intervalIndex = rawTopic.intervalIndex ?? rawTopic.currentIntervalIndex ?? 0;
  const { currentIntervalIndex: _legacy, ...rest } = rawTopic as Topic & {
    currentIntervalIndex?: number;
  };
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
};

const migratePersistedState = async (persisted: PersistedState | undefined, from: number): Promise<PersistedState> => {
  if (!persisted) {
    return { topics: [], categories: [], _migratedToIDB: false };
  }

  let state = persisted;

  if (from < 2) {
    state = {
      ...state,
      topics: state.topics.map((topic) => migrateEventsAndConfig(topic as Topic))
    };
  }

  if (from < VERSION) {
    state = {
      ...state,
      topics: state.topics.map((topic) => migrateEventsAndConfig(topic as Topic)),
      _migratedToIDB: state._migratedToIDB ?? false
    };
  }

  return state;
};

export const useTopicStore = create<TopicStore>()(
  persist(
    (set, get) => ({
      topics: [],
      categories: [
        { id: "general", label: "General", color: "#38bdf8", icon: "Sparkles" }
      ],
      _migratedToIDB: false,
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
      name: STORAGE_KEY,
      storage: createJSONStorage(() => idbStorage),
      version: VERSION,
      migrate: async (persistedState, from) => migratePersistedState(persistedState as PersistedState | undefined, from),
      onRehydrateStorage: () => {
        return (state) => {
          if (!state || state._migratedToIDB) return;
          try {
            const legacy = localStorage.getItem(LEGACY_STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
            if (legacy) {
              const parsed = JSON.parse(legacy);
              idbStorage.setItem(STORAGE_KEY, parsed);
              localStorage.removeItem(LEGACY_STORAGE_KEY);
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch (error) {
            console.warn("IDB migration failed", error);
          }
          useTopicStore.setState({ _migratedToIDB: true });
        };
      }
    }
  )
);


