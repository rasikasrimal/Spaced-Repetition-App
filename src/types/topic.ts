export type IntervalPreset = {
  id: string;
  label: string;
  days: number;
};

export type TopicEventType = "started" | "reviewed" | "skipped";

export interface TopicEvent {
  id: string;
  topicId: string;
  type: TopicEventType;
  at: string;
  intervalDays?: number;
  notes?: string;
  backfill?: boolean;
}

export type AutoAdjustPreference = "always" | "never" | "ask";

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
  lastReviewedOn?: string | null;
  examDate?: string | null;
  autoAdjustPreference?: AutoAdjustPreference;
  createdAt: string;
  startedAt?: string;
  startedOn?: string | null;
  events?: TopicEvent[];
  forgetting?: TopicForgettingConfig;
};

export type Category = {
  id: string;
  label: string;
  color: string;
  icon: string;
};

