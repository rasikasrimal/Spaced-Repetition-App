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

export type Subject = {
  id: string;
  name: string;
  color: string;
  icon: string;
  examDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubjectSummary = {
  subjectId: string;
  topicsCount: number;
  upcomingReviewsCount: number;
  nextReviewAt: string | null;
  updatedAt: string;
};

export type Topic = {
  id: string;
  title: string;
  notes: string;
  subjectId: string | null;
  subjectLabel: string;
  categoryId?: string | null;
  categoryLabel?: string;
  icon: string;
  color: string;
  reminderTime: string | null;
  intervals: number[];
  intervalIndex: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  lastReviewedOn?: string | null;
  autoAdjustPreference?: AutoAdjustPreference;
  createdAt: string;
  startedAt?: string;
  startedOn?: string | null;
  events?: TopicEvent[];
  forgetting?: TopicForgettingConfig;
};
