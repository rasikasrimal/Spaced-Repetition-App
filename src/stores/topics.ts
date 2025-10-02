import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { Category, Topic } from "@/types/topic";

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

type TopicStore = {
  topics: Topic[];
  categories: Category[];
  addCategory: (category: Omit<Category, "id">) => Category;
  addTopic: (payload: TopicPayload) => void;
  updateTopic: (id: string, payload: TopicPayload) => void;
  deleteTopic: (id: string) => void;
  markReviewed: (id: string) => void;
};

const calculateNextReview = (
  lastReviewedAt: string | null,
  intervals: number[],
  currentIndex: number
): string => {
  const baseDate = lastReviewedAt ? new Date(lastReviewedAt) : new Date();
  const safeIndex = intervals.length === 0 ? 0 : Math.min(currentIndex, intervals.length - 1);
  const nextInterval = intervals[safeIndex] ?? 1;
  const nextDate = new Date(baseDate);
  nextDate.setDate(baseDate.getDate() + nextInterval);
  return nextDate.toISOString();
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
          id: uuid(),
          ...category
        };
        set((state) => ({ categories: [...state.categories, newCategory] }));
        return newCategory;
      },
      addTopic: (payload) => {
        const id = uuid();
        const createdAt = new Date().toISOString();
        const nextReviewDate = calculateNextReview(null, payload.intervals, 0);
        const topic: Topic = {
          id,
          createdAt,
          lastReviewedAt: null,
          currentIntervalIndex: 0,
          nextReviewDate,
          ...payload
        };
        set((state) => ({ topics: [topic, ...state.topics] }));
      },
      updateTopic: (id, payload) => {
        set((state) => ({
          topics: state.topics.map((topic) =>
            topic.id === id
              ? {
                  ...topic,
                  ...payload,
                  intervals: payload.intervals,
                  nextReviewDate: calculateNextReview(
                    topic.lastReviewedAt,
                    payload.intervals,
                    topic.currentIntervalIndex
                  )
                }
              : topic
          )
        }));
      },
      deleteTopic: (id) => {
        set((state) => ({ topics: state.topics.filter((topic) => topic.id !== id) }));
      },
      markReviewed: (id) => {
        set((state) => ({
          topics: state.topics.map((topic) => {
            if (topic.id !== id) return topic;
            const nextIndex = Math.min(topic.currentIntervalIndex + 1, topic.intervals.length - 1);
            const lastReviewedAt = new Date().toISOString();
            return {
              ...topic,
              currentIntervalIndex: nextIndex,
              lastReviewedAt,
              nextReviewDate: calculateNextReview(lastReviewedAt, topic.intervals, nextIndex)
            };
          })
        }));
      }
    }),
    {
      name: "spaced-repetition-store"
    }
  )
);
