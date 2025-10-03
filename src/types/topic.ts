export type TopicEventType = "started" | "reviewed" | "skipped";

export type ReviewKind = "scheduled" | "revise_now" | "skip_user" | "skip_auto";

export type ReviewQuality = 0 | 0.5 | 1;

export interface TopicEvent {
  id: string;
  topicId: string;
  type: TopicEventType;
  at: string;
  intervalDays?: number;
  notes?: string;
  backfill?: boolean;
  reviewKind?: ReviewKind;
  reviewQuality?: ReviewQuality;
  resultingStability?: number;
  targetRetrievability?: number;
  nextReviewAt?: string;
}

export type AutoAdjustPreference = "always" | "never" | "ask";

export type Subject = {
  id: string;
  name: string;
  color: string;
  icon: string;
  examDate?: string | null;
  difficultyModifier?: number | null;
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
  reminderTime: string | null;
  intervals: number[];
  intervalIndex: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  lastReviewedOn?: string | null;
  stability: number;
  retrievabilityTarget: number;
  reviewsCount: number;
  subjectDifficultyModifier?: number | null;
  autoAdjustPreference?: AutoAdjustPreference;
  createdAt: string;
  startedAt?: string;
  startedOn?: string | null;
  events?: TopicEvent[];
  reviseNowLastUsedAt?: string | null;
};
