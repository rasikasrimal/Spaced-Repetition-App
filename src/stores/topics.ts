import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { addDays, daysBetween } from "@/lib/date";
import {
  AutoAdjustPreference,
  Category,
  Topic,
  TopicEvent,
  TopicEventType
} from "@/types/topic";

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
  examDate?: string | null;
  autoAdjustPreference?: AutoAdjustPreference;
  startedOn?: string | null;
  lastReviewedOn?: string | null;
};

type TopicStoreState = {
  topics: Topic[];
  categories: Category[];
};

type MarkReviewedOptions = {
  reviewedAt?: string;
  adjustFuture?: boolean;
};

type TopicStore = TopicStoreState & {
  addCategory: (category: Omit<Category, "id">) => Category;
  addTopic: (payload: TopicPayload) => void;
  updateTopic: (id: string, payload: TopicPayload) => void;
  deleteTopic: (id: string) => void;
  markReviewed: (id: string, options?: MarkReviewedOptions) => void;
  skipTopic: (id: string) => void;
  setAutoAdjustPreference: (id: string, preference: AutoAdjustPreference) => void;
};

const DEFAULT_FORGETTING = Object.freeze({
  beta: 1.0,
  strategy: "reviews" as const,
  baseHalfLifeHours: 12,
  growthPerSuccessfulReview: 2.0
});

const clampToExamDate = (candidate: string, examDate?: string | null) => {
  if (!examDate) return candidate;
  const candidateDate = new Date(candidate);
  const exam = new Date(examDate);
  if (Number.isNaN(exam.getTime())) return candidate;
  if (candidateDate.getTime() > exam.getTime()) {
    return exam.toISOString();
  }
  return candidate;
};

const ensureFutureExamDate = (examDate: string | null | undefined): string | null => {
  if (!examDate) return null;
  const parsed = new Date(examDate);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Exam date is invalid");
  }
  return parsed.toISOString();
};

const computeNextReviewDate = (
  lastReviewedAt: string | null,
  intervals: number[],
  intervalIndex: number,
  reference: Date,
  examDate?: string | null
): string => {
  const safeIntervals = intervals.length > 0 ? intervals : [1];
  const clampedIndex = Math.max(0, Math.min(intervalIndex, safeIntervals.length - 1));
  const baseDate = lastReviewedAt ? new Date(lastReviewedAt) : reference;
  const nextDate = new Date(baseDate);
  nextDate.setDate(baseDate.getDate() + safeIntervals[clampedIndex]);
  return clampToExamDate(nextDate.toISOString(), examDate);
};

const ensureEventsSorted = (events: TopicEvent[]) =>
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

const upsertEvent = (events: TopicEvent[], event: TopicEvent) => {
  const existingIndex = events.findIndex((item) => item.id === event.id);
  if (existingIndex >= 0) {
    events[existingIndex] = event;
  } else {
    events.push(event);
  }
  return ensureEventsSorted(events);
};

const appendEvent = (events: TopicEvent[] | undefined, event: TopicEvent) => {
  const next = Array.isArray(events) ? [...events] : [];
  next.push(event);
  return ensureEventsSorted(next);
};

const ensureStartedEvent = (
  topicId: string,
  events: TopicEvent[] | undefined,
  startedAt: string,
  markBackfilled: boolean
): TopicEvent[] => {
  const collection = Array.isArray(events) ? [...events] : [];
  const started = collection.find((event) => event.type === "started");
  const event: TopicEvent = {
    ...(started ?? {}),
    id: started?.id ?? nanoid(),
    topicId,
    type: "started",
    at: startedAt,
    backfill: markBackfilled || started?.backfill ? true : undefined
  };
  return upsertEvent(collection, event);
};

const evenlyDistributeFrom = (reference: Date, topic: Topic): string => {
  const nowStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const remainingReviews = Math.max(1, topic.intervals.length - topic.intervalIndex);

  if (!topic.examDate) {
    const target = new Date(topic.nextReviewDate ?? reference.toISOString());
    target.setDate(target.getDate() + 1);
    return target.toISOString();
  }

  const exam = new Date(topic.examDate);
  if (Number.isNaN(exam.getTime())) {
    return addDays(nowStart, 1);
  }

  if (nowStart.getTime() >= exam.getTime()) {
    return exam.toISOString();
  }

  const daysRemaining = Math.max(1, daysBetween(nowStart, exam));
  const intervalSize = Math.max(1, Math.floor(daysRemaining / remainingReviews));
  const candidate = new Date(nowStart);
  candidate.setDate(candidate.getDate() + intervalSize);
  if (candidate.getTime() > exam.getTime()) {
    return exam.toISOString();
  }
  return candidate.toISOString();
};

const createReviewedEvent = (
  topic: Topic,
  reviewedAtIso: string,
  intervalDays: number
): TopicEvent => ({
  id: nanoid(),
  topicId: topic.id,
  type: "reviewed",
  at: reviewedAtIso,
  intervalDays
});

const VERSION = 4;
type PersistedState = TopicStoreState & { version?: number };

const migrate = (persisted: PersistedState, from: number): PersistedState => {
  if (!persisted.topics) {
    persisted.topics = [];
  }

  if (from < VERSION) {
    persisted.topics = persisted.topics.map((rawTopic) => {
      const anyTopic = rawTopic as Topic & { currentIntervalIndex?: number; autoAdjustPreference?: AutoAdjustPreference };
      const intervalIndex = anyTopic.intervalIndex ?? anyTopic.currentIntervalIndex ?? 0;
      const intervals =
        Array.isArray(anyTopic.intervals) && anyTopic.intervals.length > 0
          ? anyTopic.intervals
          : [1];
      const createdAt = anyTopic.createdAt ?? new Date().toISOString();
      const normalizedStartedOn = anyTopic.startedOn ?? anyTopic.startedAt ?? createdAt;
      const startedAt = anyTopic.startedAt ?? normalizedStartedOn ?? createdAt;
      const normalizedLastReviewedOn = anyTopic.lastReviewedOn ?? anyTopic.lastReviewedAt ?? null;
      const lastReviewedAt = anyTopic.lastReviewedAt ?? normalizedLastReviewedOn ?? null;

      let events = ensureStartedEvent(
        anyTopic.id,
        anyTopic.events,
        startedAt,
        startedAt !== createdAt
      );

      if (lastReviewedAt) {
        events = appendEvent(events, {
          id: nanoid(),
          topicId: anyTopic.id,
          type: "reviewed",
          at: lastReviewedAt,
          intervalDays: intervals[Math.min(intervalIndex, intervals.length - 1)] ?? 1
        });
      }

      return {
        ...anyTopic,
        intervalIndex,
        createdAt,
        intervals,
        startedAt,
        startedOn: normalizedStartedOn ?? null,
        lastReviewedAt,
        lastReviewedOn: normalizedLastReviewedOn ?? null,
        events,
        forgetting: anyTopic.forgetting ?? { ...DEFAULT_FORGETTING },
        examDate: ensureFutureExamDate(anyTopic.examDate ?? null),
        autoAdjustPreference: anyTopic.autoAdjustPreference ?? "ask"
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
        const now = new Date();
        const createdAt = now.toISOString();
        const topicId = nanoid();

        const {
          examDate: rawExamDate,
          autoAdjustPreference: rawPreference,
          startedOn: inputStartedOn,
          lastReviewedOn: inputLastReviewedOn,
          ...restPayload
        } = payload;

        const startedOnIso = inputStartedOn ?? createdAt;
        const startedAtDate = new Date(startedOnIso);
        const lastReviewedAtDate = inputLastReviewedOn ? new Date(inputLastReviewedOn) : null;
        const intervalIndex = 0;
        const examDate = ensureFutureExamDate(rawExamDate ?? null);

        let events = ensureStartedEvent(
          topicId,
          [],
          startedAtDate.toISOString(),
          startedAtDate.getTime() !== now.getTime()
        );

        if (lastReviewedAtDate) {
          events = appendEvent(events, {
            id: nanoid(),
            topicId,
            type: "reviewed",
            at: lastReviewedAtDate.toISOString(),
            intervalDays: restPayload.intervals[Math.min(intervalIndex, restPayload.intervals.length - 1)] ?? 1
          });
        }

        const nextReviewDate = computeNextReviewDate(
          lastReviewedAtDate ? lastReviewedAtDate.toISOString() : null,
          restPayload.intervals,
          intervalIndex,
          now,
          examDate
        );

        const topic: Topic = {
          id: topicId,
          title: restPayload.title,
          notes: restPayload.notes,
          categoryId: restPayload.categoryId,
          categoryLabel: restPayload.categoryLabel,
          icon: restPayload.icon,
          color: restPayload.color,
          reminderTime: restPayload.reminderTime,
          intervals: restPayload.intervals,
          examDate,
          autoAdjustPreference: rawPreference ?? "ask",
          createdAt,
          startedAt: startedAtDate.toISOString(),
          startedOn: startedAtDate.toISOString(),
          lastReviewedAt: lastReviewedAtDate ? lastReviewedAtDate.toISOString() : null,
          lastReviewedOn: lastReviewedAtDate ? lastReviewedAtDate.toISOString() : null,
          intervalIndex,
          nextReviewDate,
          events,
          forgetting: { ...DEFAULT_FORGETTING }
        };

        set((state) => ({ topics: [topic, ...state.topics] }));
      },
      updateTopic: (id, payload) => {
        const now = new Date();
        set((state) => ({
          topics: state.topics.map((topic) => {
            if (topic.id !== id) return topic;

            const { startedOn, lastReviewedOn, examDate, autoAdjustPreference, ...rest } = payload;
            const hasStartedOn = typeof startedOn !== "undefined";
            const hasLastReviewedOn = typeof lastReviewedOn !== "undefined";
            const normalizedStartedOn = hasStartedOn ? startedOn : topic.startedOn ?? topic.startedAt ?? topic.createdAt;
            const normalizedLastReviewedOn = hasLastReviewedOn ? lastReviewedOn : topic.lastReviewedOn ?? topic.lastReviewedAt ?? null;

            const startedAt = normalizedStartedOn ?? topic.startedAt ?? topic.createdAt;
            const lastReviewedAt = normalizedLastReviewedOn ?? null;
            const resolvedExamDate = ensureFutureExamDate(
              typeof examDate !== "undefined" ? examDate : topic.examDate ?? null
            );

            const nextReviewDate = computeNextReviewDate(
              lastReviewedAt,
              rest.intervals,
              topic.intervalIndex,
              now,
              resolvedExamDate
            );

            let events = ensureStartedEvent(topic.id, topic.events, startedAt, startedAt !== topic.createdAt);
            if (lastReviewedAt) {
              events = appendEvent(events, {
                id: nanoid(),
                topicId: topic.id,
                type: "reviewed",
                at: lastReviewedAt,
                intervalDays: rest.intervals[Math.min(topic.intervalIndex, rest.intervals.length - 1)] ?? 1
              });
            }

            return {
              ...topic,
              ...rest,
              intervals: rest.intervals,
              startedAt,
              startedOn: normalizedStartedOn ?? null,
              lastReviewedAt,
              lastReviewedOn: normalizedLastReviewedOn ?? null,
              nextReviewDate,
              events,
              examDate: resolvedExamDate,
              autoAdjustPreference: autoAdjustPreference ?? topic.autoAdjustPreference ?? "ask"
            };
          })
        }));
      },
      deleteTopic: (id) => {
        set((state) => ({ topics: state.topics.filter((topic) => topic.id !== id) }));
      },
      markReviewed: (id, options) => {
        const state = get();
        const topic = state.topics.find((item) => item.id === id);
        if (!topic) return;

        const now = new Date();
        const reviewedAtIso = options?.reviewedAt ?? now.toISOString();
        const reviewedAt = new Date(reviewedAtIso);

        const currentIntervals = topic.intervals.length > 0 ? topic.intervals : [1];
        const nextIndex = Math.min(topic.intervalIndex + 1, currentIntervals.length - 1);
        const wasEarly = reviewedAt.getTime() < new Date(topic.nextReviewDate).getTime();

        let shouldAdjust = options?.adjustFuture;
        const preference = topic.autoAdjustPreference ?? "ask";
        if (typeof shouldAdjust === "undefined") {
          if (!wasEarly) {
            shouldAdjust = true;
          } else {
            shouldAdjust = preference === "always" ? true : preference === "never" ? false : false;
          }
        }
        if (preference === "never") {
          shouldAdjust = false;
        }
        if (preference === "always") {
          shouldAdjust = true;
        }

        const intervalDays = currentIntervals[Math.min(nextIndex, currentIntervals.length - 1)] ?? 1;
        let nextReviewDate = computeNextReviewDate(
          reviewedAtIso,
          currentIntervals,
          nextIndex,
          reviewedAt,
          topic.examDate
        );

        if (wasEarly && !shouldAdjust) {
          nextReviewDate = topic.nextReviewDate;
        }

        const reviewedEvent = createReviewedEvent(topic, reviewedAtIso, intervalDays);

        set((prev) => ({
          topics: prev.topics.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              intervalIndex: nextIndex,
              lastReviewedAt: reviewedAtIso,
              lastReviewedOn: reviewedAtIso,
              nextReviewDate,
              events: appendEvent(item.events, reviewedEvent)
            };
          })
        }));
      },
      skipTopic: (id) => {
        const state = get();
        const topic = state.topics.find((item) => item.id === id);
        if (!topic) return;

        const now = new Date();
        const skipEvent: TopicEvent = {
          id: nanoid(),
          topicId: id,
          type: "skipped",
          at: now.toISOString()
        };

        const nextReviewDate = evenlyDistributeFrom(now, topic);

        set((prev) => ({
          topics: prev.topics.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              nextReviewDate,
              events: appendEvent(item.events, skipEvent)
            };
          })
        }));
      },
      setAutoAdjustPreference: (id, preference) => {
        set((state) => ({
          topics: state.topics.map((topic) =>
            topic.id === id ? { ...topic, autoAdjustPreference: preference } : topic
          )
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

