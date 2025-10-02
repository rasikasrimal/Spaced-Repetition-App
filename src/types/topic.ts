export type IntervalPreset = {
  id: string;
  label: string;
  days: number;
};

export type TopicEventType = "started" | "reviewed";

export interface TopicEvent {
  id: string;
  topicId: string;
  type: TopicEventType;
  at: string;
  intervalDays?: number;
  notes?: string;
}

export interface TopicForgettingConfig {
  beta?: number;
  strategy?: "reviews" | "interval";
  baseHalfLifeHours?: number;
  growthPerSuccessfulReview?: number;
}

export type Topic = {
  id: string;
  title: string;
  notes: string;
  categoryId: string | null;
  categoryLabel: string;
  icon: string;
  color: string;
  reminderTime: string | null;
  intervals: number[];
  intervalIndex: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  createdAt: string;
  startedAt?: string;
  events?: TopicEvent[];
  forgetting?: TopicForgettingConfig;
};

export type Category = {
  id: string;
  label: string;
  color: string;
  icon: string;
};
