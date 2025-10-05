import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import {
  addDays,
  daysBetween,
  getDayKeyInTimeZone,
  nowInTimeZone,
  startOfDayInTimeZone
} from "@/lib/date";
import demoSeedData from "../data/demo-seed-data.json";
import { FALLBACK_SUBJECT_COLOR } from "@/lib/colors";
import {
  AutoAdjustPreference,
  ReviewKind,
  ReviewQuality,
  Subject,
  SubjectSummary,
  Topic,
  TopicEvent
} from "@/types/topic";
import { featureFlags } from "@/lib/feature-flags";
import {
  DAY_MS,
  DEFAULT_RETRIEVABILITY_TARGET,
  DEFAULT_STABILITY_DAYS,
  REVIEW_TRIGGER_MAX,
  REVIEW_TRIGGER_MIN,
  STABILITY_MAX_DAYS,
  STABILITY_MIN_DAYS,
  computeIntervalDays,
  computeRiskScore,
  computeRetrievability,
  getAverageQuality,
  updateStability
} from "@/lib/forgetting-curve";

type LegacyCategory = {
  id: string;
  label: string;
  color: string;
  icon: string;
};

export type TopicPayload = {
  title: string;
  notes: string;
  subjectId: string | null;
  subjectLabel: string;
  color?: string | null;
  icon?: string | null;
  categoryId?: string | null;
  categoryLabel?: string;
  reminderTime: string | null;
  intervals: number[];
  examDate?: string | null;
  autoAdjustPreference?: AutoAdjustPreference;
  startedOn?: string | null;
  lastReviewedOn?: string | null;
  reviseNowLastUsedAt?: string | null;
  stability?: number;
  retrievabilityTarget?: number;
  reviewsCount?: number;
  retrievabilityAtLastReview?: number | null;
};

type SubjectCreatePayload = {
  name: string;
  examDate?: string | null;
  color?: string | null;
  icon?: string | null;
  difficultyModifier?: number | null;
};

type SubjectUpdatePayload = {
  name?: string;
  examDate?: string | null;
  color?: string | null;
  icon?: string | null;
  difficultyModifier?: number | null;
};

type ReviseNowMetrics = {
  successCount: number;
  blockedCount: number;
  totalLeadTimeMs: number;
  samples: number;
  lastSuccessAt: string | null;
  lastBlockedAt: string | null;
  lastLeadTimeMs: number | null;
};

type AutoSkipResult = {
  topicId: string;
  previousDate: string;
  nextDate: string;
  kind: ReviewKind;
};

type TopicStoreState = {
  topics: Topic[];
  subjects: Subject[];
  categories: LegacyCategory[];
  reviseNowMetrics: ReviseNowMetrics;
};

type MarkReviewedOptions = {
  reviewedAt?: string;
  adjustFuture?: boolean;
  source?: "revise-now";
  timeZone?: string;
  quality?: ReviewQuality;
};

type TopicStore = TopicStoreState & {
  addSubject: (payload: SubjectCreatePayload) => Subject;
  addCategory: (category: { label: string; color?: string | null; icon?: string | null }) => LegacyCategory;
  updateSubject: (id: string, payload: SubjectUpdatePayload) => Subject | null;
  deleteSubject: (id: string) => { success: boolean; reason?: string };
  getSubjectSummaries: () => SubjectSummary[];
  addTopic: (payload: TopicPayload) => void;
  updateTopic: (id: string, payload: TopicPayload) => void;
  deleteTopic: (id: string) => void;
  markReviewed: (id: string, options?: MarkReviewedOptions) => boolean;
  updateTopicHistory: (
    id: string,
    entries: TopicHistoryEntry[],
    options?: UpdateTopicHistoryOptions
  ) => UpdateTopicHistoryResult;
  skipTopic: (id: string) => void;
  setAutoAdjustPreference: (id: string, preference: AutoAdjustPreference) => void;
  trackReviseNowBlocked: () => void;
  autoSkipOverdueTopics: (timeZone: string) => AutoSkipResult[];
  applyReviewTrigger: (trigger: number) => void;
};

const DEFAULT_SUBJECT_ID = "subject-general";

const DEFAULT_GENERAL_EXAM_DATE = "2026-08-01T00:00:00.000Z";

const createDefaultCategory = (): LegacyCategory => ({
  id: DEFAULT_SUBJECT_ID,
  label: "General Chemistry",
  color: FALLBACK_SUBJECT_COLOR,
  icon: "Sparkles"
});

const createDefaultSubject = (): Subject => {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_SUBJECT_ID,
    name: "General Chemistry",
    color: FALLBACK_SUBJECT_COLOR,
    icon: "Sparkles",
    examDate: DEFAULT_GENERAL_EXAM_DATE,
    difficultyModifier: 1,
    createdAt: now,
    updatedAt: now
  };
};

type DemoSeedReview = (typeof demoSeedData)["reviews"][number];
type DemoSeedTopic = (typeof demoSeedData)["topics"][number];

type DemoSeedState = {
  subjects: Subject[];
  topics: Topic[];
  categories: LegacyCategory[];
};

const DEMO_SEED_FALLBACK_ISO = "2025-01-01T00:00:00.000Z";

const toDemoIso = (value: string | null | undefined) => {
  if (!value) return DEMO_SEED_FALLBACK_ISO;
  const candidate = value.includes("T") ? value : `${value}T00:00:00.000Z`;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    return DEMO_SEED_FALLBACK_ISO;
  }
  return date.toISOString();
};

const createDemoSeedState = (): DemoSeedState => {
  const reviewsByTopic = new Map<string, DemoSeedReview[]>();
  for (const review of demoSeedData.reviews ?? []) {
    const topicId = review.topicId;
    if (!topicId) continue;
    const list = reviewsByTopic.get(topicId) ?? [];
    list.push(review);
    reviewsByTopic.set(topicId, list);
  }

  const topicsBySubject = new Map<string, DemoSeedTopic[]>();
  for (const topic of demoSeedData.topics ?? []) {
    const list = topicsBySubject.get(topic.subjectId) ?? [];
    list.push(topic);
    topicsBySubject.set(topic.subjectId, list);
  }

  const subjects: Subject[] = [];
  const categories: LegacyCategory[] = [];
  const topics: Topic[] = [];

  for (const subjectSeed of demoSeedData.subjects ?? []) {
    const subjectTopics = topicsBySubject.get(subjectSeed.id) ?? [];
    const subjectReviewDates: string[] = [];
    for (const topicSeed of subjectTopics) {
      const topicReviews = reviewsByTopic.get(topicSeed.id) ?? [];
      for (const review of topicReviews) {
        subjectReviewDates.push(toDemoIso(review.reviewDate));
      }
    }

    let createdAt = DEMO_SEED_FALLBACK_ISO;
    let updatedAt = DEMO_SEED_FALLBACK_ISO;
    if (subjectReviewDates.length > 0) {
      createdAt = subjectReviewDates.reduce((min, iso) => (iso < min ? iso : min), subjectReviewDates[0]);
      updatedAt = subjectReviewDates.reduce((max, iso) => (iso > max ? iso : max), subjectReviewDates[0]);
    }

    const examDate = subjectSeed.examDate ? toDemoIso(subjectSeed.examDate) : null;

    subjects.push({
      id: subjectSeed.id,
      name: subjectSeed.name,
      color: subjectSeed.color,
      icon: subjectSeed.icon,
      examDate,
      difficultyModifier: 1,
      createdAt,
      updatedAt
    });

    categories.push({
      id: subjectSeed.id,
      label: subjectSeed.name,
      color: subjectSeed.color,
      icon: subjectSeed.icon
    });

    for (const topicSeed of subjectTopics) {
      const topicReviews = (reviewsByTopic.get(topicSeed.id) ?? [])
        .map((entry) => ({ ...entry }))
        .sort(
          (a, b) => new Date(toDemoIso(a.reviewDate)).getTime() - new Date(toDemoIso(b.reviewDate)).getTime()
        );

      const topicCreatedAt = topicReviews.length > 0 ? toDemoIso(topicReviews[0].reviewDate) : createdAt;

      const intervalCandidates = new Set<number>();
      for (const review of topicReviews) {
        if (typeof review.interval === "number" && review.interval > 0) {
          intervalCandidates.add(review.interval);
        }
      }

      const intervals =
        intervalCandidates.size > 0
          ? Array.from(intervalCandidates).sort((a, b) => a - b)
          : [1, 3, 7, 14, 30, 45, 60];

      let stability = DEFAULT_STABILITY_DAYS;
      let reviewsCountForSeed = 0;
      let previousReviewDate: Date | null = null;
      const reviewEvents: TopicEvent[] = [];
      topicReviews.forEach((review) => {
        const reviewedAt = toDemoIso(review.reviewDate);
        const reviewedAtDate = new Date(reviewedAt);
        const baseDate = previousReviewDate ?? new Date(topicCreatedAt);
        const elapsedMs = reviewedAtDate.getTime() - baseDate.getTime();
        const elapsedDays = Math.max(elapsedMs / DAY_MS, STABILITY_MIN_DAYS / 24);
        const retrievabilityAtReview = previousReviewDate
          ? computeRetrievability(Math.max(stability, STABILITY_MIN_DAYS), Math.max(elapsedMs, 0))
          : 1;
        reviewsCountForSeed += 1;
        stability = updateStability({
          previousStability: stability,
          elapsedDays,
          quality: 1,
          reviewCount: reviewsCountForSeed
        });
        const effectiveStability = Math.max(stability, STABILITY_MIN_DAYS);
        const intervalDays =
          typeof review.interval === "number" && review.interval > 0
            ? review.interval
            : computeIntervalDays(effectiveStability, DEFAULT_RETRIEVABILITY_TARGET);
        if (intervalDays > 0) {
          intervalCandidates.add(Math.max(1, Math.round(intervalDays)));
        }
        const nextReviewAt = addDays(reviewedAt, intervalDays);
        reviewEvents.push({
          id: review.id,
          topicId: topicSeed.id,
          type: "reviewed",
          at: reviewedAt,
          intervalDays,
          notes: review.notes,
          reviewKind: "scheduled",
          reviewQuality: 1,
          resultingStability: stability,
          targetRetrievability: DEFAULT_RETRIEVABILITY_TARGET,
          nextReviewAt,
          retrievabilityAtReview
        });
        previousReviewDate = reviewedAtDate;
      });

      const events: TopicEvent[] = [
        {
          id: `${topicSeed.id}-started`,
          topicId: topicSeed.id,
          type: "started",
          at: topicCreatedAt,
          backfill: reviewEvents.length > 0 ? true : undefined
        },
        ...reviewEvents
      ];

      const lastReview = reviewEvents[reviewEvents.length - 1] ?? null;
      const intervalForProjection = intervals[Math.min(reviewEvents.length, intervals.length - 1)] ?? intervals[0];
      const nextReviewDate = lastReview
        ? lastReview.nextReviewAt ?? addDays(lastReview.at, intervalForProjection)
        : addDays(topicCreatedAt, intervals[0]);

      topics.push({
        id: topicSeed.id,
        title: topicSeed.title,
        notes: topicSeed.notes ?? `Demo history entries for ${topicSeed.title}.`,
        subjectId: subjectSeed.id,
        subjectLabel: subjectSeed.name,
        color: topicSeed.color ?? subjectSeed.color,
        categoryId: subjectSeed.id,
        categoryLabel: subjectSeed.name,
        icon: topicSeed.icon ?? subjectSeed.icon,
        reminderTime: null,
        intervals,
        intervalIndex: Math.min(reviewEvents.length, intervals.length - 1),
        nextReviewDate,
        lastReviewedAt: lastReview ? lastReview.at : null,
        lastReviewedOn: lastReview ? lastReview.at : null,
        stability,
        retrievabilityTarget: DEFAULT_RETRIEVABILITY_TARGET,
        reviewsCount: reviewEvents.length,
        retrievabilityAtLastReview: lastReview?.retrievabilityAtReview ?? null,
        subjectDifficultyModifier: 1,
        autoAdjustPreference: "ask",
        createdAt: topicCreatedAt,
        startedAt: topicCreatedAt,
        startedOn: topicCreatedAt,
        events,
        reviseNowLastUsedAt: null
      });
    }
  }

  return { subjects, topics, categories };
};

const createSeededDefaults = () => {
  const { subjects: seededSubjects, topics, categories: seededCategories } = createDemoSeedState();
  const defaultSubject = createDefaultSubject();
  const defaultCategory = createDefaultCategory();

  const subjectMap = new Map<string, Subject>();
  subjectMap.set(defaultSubject.id, defaultSubject);
  for (const subject of seededSubjects) {
    subjectMap.set(subject.id, subject);
  }

  const categoryMap = new Map<string, LegacyCategory>();
  categoryMap.set(defaultCategory.id, defaultCategory);
  for (const category of seededCategories) {
    categoryMap.set(category.id, category);
  }

  return {
    subjects: Array.from(subjectMap.values()),
    topics,
    categories: Array.from(categoryMap.values())
  };
};

const DEFAULT_TIME_ZONE = "Asia/Colombo";
const DAILY_SOFT_CAP = 20;
const LOAD_SMOOTHING_OFFSETS = [0, 1, -1, 2, -2, 3, -3, 4, -4];
const MIN_RESCHEDULE_BUFFER_MS = 60 * 60 * 1000;
const SKIP_NUDGE_DAYS = 1;

const createDefaultReviseMetrics = (): ReviseNowMetrics => ({
  successCount: 0,
  blockedCount: 0,
  totalLeadTimeMs: 0,
  samples: 0,
  lastSuccessAt: null,
  lastBlockedAt: null,
  lastLeadTimeMs: null
});

const normalizeExamDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Exam date is invalid");
  }
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const findSubjectById = (subjects: Subject[], id: string | null | undefined) => {
  if (!id) return null;
  return subjects.find((subject) => subject.id === id) ?? null;
};

const findSubjectByName = (subjects: Subject[], name: string) => {
  const target = name.trim().toLowerCase();
  return (
    subjects.find((subject) => subject.name.trim().toLowerCase() === target) ?? null
  );
};

const computeSubjectSummaries = (subjects: Subject[], topics: Topic[]): SubjectSummary[] => {
  const now = Date.now();
  const sevenDaysFromNow = new Date(addDays(new Date(), 7)).getTime();

  return subjects.map((subject) => {
    const subjectTopics = topics.filter((topic) => topic.subjectId === subject.id);
    const topicsCount = subjectTopics.length;
    const upcomingReviewsCount = subjectTopics.filter((topic) => {
      const next = new Date(topic.nextReviewDate).getTime();
      return next >= now && next <= sevenDaysFromNow;
    }).length;
    const nextReviewAt = subjectTopics.reduce<string | null>((closest, topic) => {
      if (!closest) return topic.nextReviewDate;
      return new Date(topic.nextReviewDate).getTime() < new Date(closest).getTime()
        ? topic.nextReviewDate
        : closest;
    }, null);

    return {
      subjectId: subject.id,
      topicsCount,
      upcomingReviewsCount,
      nextReviewAt,
      updatedAt: new Date().toISOString()
    };
  });
};

const clampToExamDate = (candidate: string | Date, examDate?: string | null) => {
  const iso = candidate instanceof Date ? candidate.toISOString() : candidate;
  if (!examDate) return iso;
  const candidateDate = new Date(iso);
  const exam = new Date(examDate);
  if (Number.isNaN(exam.getTime())) return iso;
  if (candidateDate.getTime() > exam.getTime()) {
    return exam.toISOString();
  }
  return iso;
};

const clampDateToExam = (candidate: Date, examDate?: string | null) => {
  return new Date(clampToExamDate(candidate, examDate));
};

const resolveDifficultyModifier = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 1;
  return Math.min(Math.max(value, 0.5), 1.5);
};

const collectRecentQualities = (events: TopicEvent[] | undefined, sampleSize = 5): number[] => {
  if (!events) return [];
  const reviewed = events
    .filter((event) => event.type === "reviewed" && typeof event.reviewQuality === "number")
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return reviewed.slice(0, sampleSize).map((event) => event.reviewQuality ?? 0);
};

const countTopicsOnDay = (
  topics: Topic[],
  dayKey: string,
  timeZone: string,
  ignoreTopicId?: string
) => {
  return topics.reduce((count, topic) => {
    if (topic.id === ignoreTopicId) return count;
    const topicKey = getDayKeyInTimeZone(topic.nextReviewDate, timeZone);
    if (topicKey === dayKey) {
      return count + 1;
    }
    return count;
  }, 0);
};

type LoadSmoothingParams = {
  candidate: Date;
  topics: Topic[];
  topicId: string;
  timeZone: string;
  examDate?: string | null;
  minTime: number;
};

const applyLoadSmoothing = ({
  candidate,
  topics,
  topicId,
  timeZone,
  examDate,
  minTime
}: LoadSmoothingParams) => {
  let bestCandidate = candidate;
  let bestLoad = Number.POSITIVE_INFINITY;

  for (const offset of LOAD_SMOOTHING_OFFSETS) {
    let adjusted = new Date(candidate.getTime() + offset * DAY_MS);
    if (adjusted.getTime() < minTime) {
      continue;
    }
    adjusted = clampDateToExam(adjusted, examDate);
    if (adjusted.getTime() < minTime) {
      continue;
    }
    const dayKey = getDayKeyInTimeZone(adjusted.toISOString(), timeZone);
    const load = countTopicsOnDay(topics, dayKey, timeZone, topicId);
    if (load < DAILY_SOFT_CAP) {
      return adjusted;
    }
    if (load < bestLoad || (load === bestLoad && adjusted.getTime() < bestCandidate.getTime())) {
      bestLoad = load;
      bestCandidate = adjusted;
    }
  }

  return bestCandidate;
};

type ScheduleNextReviewParams = {
  topicId: string;
  referenceDate: Date;
  intervalDays: number;
  topics: Topic[];
  timeZone: string;
  examDate?: string | null;
  minimumDate?: Date;
};

const scheduleNextReviewDate = ({
  topicId,
  referenceDate,
  intervalDays,
  topics,
  timeZone,
  examDate,
  minimumDate
}: ScheduleNextReviewParams): string => {
  const baseTime = referenceDate.getTime() + intervalDays * DAY_MS;
  const minAllowedTime = Math.max(
    minimumDate ? minimumDate.getTime() : referenceDate.getTime(),
    referenceDate.getTime() + MIN_RESCHEDULE_BUFFER_MS
  );
  let candidate = new Date(Math.max(baseTime, minAllowedTime));
  candidate = clampDateToExam(candidate, examDate);
  candidate = applyLoadSmoothing({
    candidate,
    topics,
    topicId,
    timeZone,
    examDate,
    minTime: minAllowedTime
  });
  return candidate.toISOString();
};

type SkipScheduleParams = {
  topic: Topic;
  topics: Topic[];
  timeZone: string;
  examDate?: string | null;
  fromDate: Date;
};

const scheduleSkipReviewDate = ({ topic, topics, timeZone, examDate, fromDate }: SkipScheduleParams) => {
  const minAllowedTime = Math.max(fromDate.getTime(), Date.now());
  let candidate = new Date(fromDate.getTime() + SKIP_NUDGE_DAYS * DAY_MS);
  candidate = clampDateToExam(candidate, examDate ?? null);
  candidate = applyLoadSmoothing({
    candidate,
    topics,
    topicId: topic.id,
    timeZone,
    examDate: examDate ?? null,
    minTime: minAllowedTime
  });
  return candidate.toISOString();
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

const createReviewedEvent = (
  topicId: string,
  reviewedAtIso: string,
  intervalDays: number,
  quality: ReviewQuality,
  kind: ReviewKind,
  stability: number,
  target: number,
  nextReviewAt: string,
  retrievabilityAtReview: number
): TopicEvent => ({
  id: nanoid(),
  topicId,
  type: "reviewed",
  at: reviewedAtIso,
  intervalDays,
  reviewQuality: quality,
  reviewKind: kind,
  resultingStability: stability,
  targetRetrievability: target,
  nextReviewAt,
  retrievabilityAtReview
});

const VERSION = 9;
type PersistedState = TopicStoreState & { version?: number; categories?: LegacyCategory[] };

type TopicHistoryEntry = {
  id?: string;
  at: string;
  quality: ReviewQuality;
};

type UpdateTopicHistoryOptions = {
  timeZone?: string;
};

type UpdateTopicHistoryResult =
  | { success: true; mergedDays: string[] }
  | { success: false; error: string };

const QUALITY_PRIORITY: Record<ReviewQuality, number> = {
  0: 0,
  0.5: 1,
  1: 2
};

const migrate = (persistedState: unknown, from: number): PersistedState => {
  const persisted: PersistedState =
    typeof persistedState === "object" && persistedState !== null
      ? (persistedState as PersistedState)
      : {
          topics: [],
          subjects: [],
          categories: [],
          reviseNowMetrics: createDefaultReviseMetrics()
        };
  if (!persisted.topics) {
    persisted.topics = [];
  }
  if (!Array.isArray(persisted.subjects)) {
    persisted.subjects = [];
  }
  if (!Array.isArray(persisted.categories)) {
    persisted.categories = persisted.categories ?? [];
  }
  if (!persisted.categories.some((category) => category.id === DEFAULT_SUBJECT_ID)) {
    persisted.categories = [createDefaultCategory(), ...persisted.categories];
  } else {
    const filtered = persisted.categories.filter((category) => category.id !== DEFAULT_SUBJECT_ID);
    persisted.categories = [createDefaultCategory(), ...filtered];
  }

  if (!persisted.subjects.some((subject) => subject.id === DEFAULT_SUBJECT_ID)) {
    persisted.subjects = [createDefaultSubject(), ...persisted.subjects];
  }

  if (!persisted.reviseNowMetrics) {
    persisted.reviseNowMetrics = createDefaultReviseMetrics();
  } else {
    persisted.reviseNowMetrics = {
      ...createDefaultReviseMetrics(),
      ...persisted.reviseNowMetrics
    };
  }

  for (const topic of persisted.topics) {
    if (typeof (topic as any).reviseNowLastUsedAt === "undefined") {
      (topic as any).reviseNowLastUsedAt = null;
    }
    if (typeof (topic as any).stability !== "number" || Number.isNaN((topic as any).stability)) {
      (topic as any).stability = DEFAULT_STABILITY_DAYS;
    } else {
      (topic as any).stability = Math.min(
        Math.max((topic as any).stability, STABILITY_MIN_DAYS),
        STABILITY_MAX_DAYS
      );
    }
    if (typeof (topic as any).retrievabilityTarget !== "number") {
      (topic as any).retrievabilityTarget = DEFAULT_RETRIEVABILITY_TARGET;
    }
    if (typeof (topic as any).reviewsCount !== "number") {
      const reviewEvents = Array.isArray((topic as any).events)
        ? (topic as any).events.filter((event: any) => event.type === "reviewed")
        : [];
      (topic as any).reviewsCount = reviewEvents.length;
    }
    if (typeof (topic as any).subjectDifficultyModifier !== "number") {
      (topic as any).subjectDifficultyModifier = 1;
    } else {
      (topic as any).subjectDifficultyModifier = resolveDifficultyModifier(
        (topic as any).subjectDifficultyModifier
      );
    }
    if ((topic as any).forgetting) {
      delete (topic as any).forgetting;
    }
    if (Array.isArray((topic as any).events)) {
      (topic as any).events = (topic as any).events.map((event: any) => {
        if (event.type === "reviewed") {
          const retention =
            typeof event.retrievabilityAtReview === "number"
              ? Math.min(Math.max(event.retrievabilityAtReview, 0), 1)
              : 1;
          return {
            ...event,
            reviewKind: event.reviewKind ?? "scheduled",
            reviewQuality: typeof event.reviewQuality === "number" ? event.reviewQuality : 1,
            resultingStability: event.resultingStability ?? (topic as any).stability,
            targetRetrievability: event.targetRetrievability ?? (topic as any).retrievabilityTarget,
            nextReviewAt: event.nextReviewAt ?? (topic as any).nextReviewDate,
            retrievabilityAtReview: retention
          };
        }
        if (event.type === "skipped") {
          return {
            ...event,
            reviewKind: event.reviewKind ?? "skip_user",
            nextReviewAt: event.nextReviewAt ?? (topic as any).nextReviewDate
          };
        }
        return event;
      });
    }

    if (typeof (topic as any).retrievabilityAtLastReview !== "number") {
      const reviewEvents = Array.isArray((topic as any).events)
        ? (topic as any).events
            .filter((event: any) => event.type === "reviewed")
            .sort(
              (a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime()
            )
        : [];
      const lastReview = reviewEvents[reviewEvents.length - 1];
      (topic as any).retrievabilityAtLastReview = lastReview
        ? Math.min(Math.max(lastReview.retrievabilityAtReview ?? 1, 0), 1)
        : null;
    }
  }

  if (from < VERSION) {
    const now = new Date().toISOString();
    const existingSubjects = new Map<string, Subject>();
    for (const subject of persisted.subjects) {
      subject.difficultyModifier = resolveDifficultyModifier(subject.difficultyModifier);
      existingSubjects.set(subject.id, subject);
    }

    const byName = new Map<string, Subject>();
    for (const subject of persisted.subjects) {
      byName.set(subject.name.trim().toLowerCase(), subject);
    }

    for (const legacy of persisted.categories ?? []) {
      const key = legacy.label.trim().toLowerCase();
      if (byName.has(key)) continue;
      const subject: Subject = {
        id: legacy.id,
        name: legacy.label,
        color: legacy.color,
        icon: legacy.icon,
        examDate: null,
        createdAt: now,
        updatedAt: now
      };
      existingSubjects.set(subject.id, subject);
      byName.set(key, subject);
    }

    for (const topic of persisted.topics) {
      const legacyLabel = (topic as any).categoryLabel ?? topic.subjectLabel ?? "General";
      const subjectId = (topic as any).subjectId ?? (topic as any).categoryId ?? DEFAULT_SUBJECT_ID;
      let subject = existingSubjects.get(subjectId);
      if (!subject) {
        const lookup = byName.get(String(legacyLabel).trim().toLowerCase());
        if (lookup) {
          subject = lookup;
        } else {
          subject = {
            id: subjectId ?? nanoid(),
            name: legacyLabel,
            color: (topic as any).color ?? FALLBACK_SUBJECT_COLOR,
            icon: (topic as any).icon ?? "Sparkles",
            examDate: (topic as any).examDate ?? null,
            createdAt: now,
            updatedAt: now
          };
          existingSubjects.set(subject.id, subject);
          byName.set(subject.name.trim().toLowerCase(), subject);
        }
      }
      (topic as any).subjectId = subject.id;
      (topic as any).subjectLabel = subject.name;
      (topic as any).categoryId = subject.id;
      (topic as any).categoryLabel = subject.name;
    }

    persisted.subjects = Array.from(existingSubjects.values());
    persisted.categories = Array.from(existingSubjects.values()).map((subject) => ({
      id: subject.id,
      label: subject.name,
      color: subject.color,
      icon: subject.icon
    }));
  }

  const nonDefaultSubjects = persisted.subjects.filter((subject) => subject.id !== DEFAULT_SUBJECT_ID);
  if (nonDefaultSubjects.length === 0 && (persisted.topics?.length ?? 0) === 0) {
    const seed = createDemoSeedState();
    const generalSubject =
      persisted.subjects.find((subject) => subject.id === DEFAULT_SUBJECT_ID) ?? createDefaultSubject();
    const subjectMap = new Map<string, Subject>();
    subjectMap.set(generalSubject.id, generalSubject);
    for (const subject of seed.subjects) {
      subjectMap.set(subject.id, subject);
    }
    persisted.subjects = Array.from(subjectMap.values());

    const generalCategory =
      persisted.categories?.find((category) => category.id === DEFAULT_SUBJECT_ID) ?? createDefaultCategory();
    const categoryMap = new Map<string, LegacyCategory>();
    categoryMap.set(generalCategory.id, generalCategory);
    for (const category of seed.categories) {
      categoryMap.set(category.id, category);
    }
    persisted.categories = Array.from(categoryMap.values());
    persisted.topics = seed.topics;
  }

  return persisted;
};

export const useTopicStore = create<TopicStore>()(
  persist(
    (set, get) => {
      const seeded = createSeededDefaults();
      return {
        topics: seeded.topics,
        subjects: seeded.subjects,
        categories: seeded.categories,
        reviseNowMetrics: createDefaultReviseMetrics(),
      addSubject: (payload) => {
        const name = payload.name.trim();
        if (!name) {
          throw new Error("Subject name is required");
        }
        const normalizedName = name.toLowerCase();
        const { subjects } = get();
        if (subjects.some((subject) => subject.name.trim().toLowerCase() === normalizedName)) {
          throw new Error("Subject name must be unique");
        }
        const now = new Date().toISOString();
        const subject: Subject = {
          id: nanoid(),
          name,
          color: payload.color ?? FALLBACK_SUBJECT_COLOR,
          icon: payload.icon ?? "Sparkles",
          examDate: normalizeExamDate(payload.examDate),
          difficultyModifier: resolveDifficultyModifier(payload.difficultyModifier),
          createdAt: now,
          updatedAt: now
        };
        set((state) => {
          const hasCategory = state.categories.some((category) => category.id === subject.id);
          const nextCategories = hasCategory
            ? state.categories
            : [
                ...state.categories,
                { id: subject.id, label: subject.name, color: subject.color, icon: subject.icon }
              ];
          return {
            subjects: [...state.subjects, subject],
            categories: nextCategories
          };
        });
        return subject;
      },
      addCategory: (category) => {
        const trimmed = category.label.trim();
        if (!trimmed) {
          throw new Error("Subject name is required");
        }
        const normalized = trimmed.toLowerCase();
        const existing = get().subjects.find((subject) => subject.name.trim().toLowerCase() === normalized);
        if (existing) {
          return { id: existing.id, label: existing.name, color: existing.color, icon: existing.icon };
        }
        const subject = get().addSubject({
          name: trimmed,
          color: category.color ?? undefined,
          icon: category.icon ?? undefined,
          examDate: null
        });
        return { id: subject.id, label: subject.name, color: subject.color, icon: subject.icon };
      },
      updateSubject: (id, payload) => {
        const { subjects, topics } = get();
        const existing = subjects.find((subject) => subject.id === id);
        if (!existing) {
          return null;
        }
        const updatedName = payload.name?.trim();
        if (updatedName) {
          const normalized = updatedName.toLowerCase();
          if (
            subjects.some(
              (subject) => subject.id !== id && subject.name.trim().toLowerCase() === normalized
            )
          ) {
            throw new Error("Subject name must be unique");
          }
        }
        const examDate = payload.examDate ? normalizeExamDate(payload.examDate) : null;
        const identityColor = payload.color ?? existing.color;
        const identityIcon = payload.icon ?? existing.icon;
        const nextDifficulty =
          typeof payload.difficultyModifier === "undefined"
            ? existing.difficultyModifier ?? 1
            : resolveDifficultyModifier(payload.difficultyModifier);
        set((state) => ({
          subjects: state.subjects.map((subject) => {
            if (subject.id !== id) return subject;
            return {
              ...subject,
              name: updatedName ?? subject.name,
              color: identityColor ?? subject.color,
              icon: identityIcon ?? subject.icon,
              examDate: typeof payload.examDate === "undefined" ? subject.examDate : examDate,
              difficultyModifier: nextDifficulty,
              updatedAt: new Date().toISOString()
            };
          }),
          categories: state.categories.map((category) => {
            if (category.id !== id) return category;
            return {
              ...category,
              label: updatedName ?? category.label,
              color: identityColor ?? category.color,
              icon: identityIcon ?? category.icon
            };
          }),
          topics: state.topics.map((topic) => {
            if (topic.subjectId !== id) return topic;
            return {
              ...topic,
              subjectLabel: updatedName ?? topic.subjectLabel,
              icon: identityIcon ?? topic.icon,
              color: identityColor ?? topic.color,
              subjectDifficultyModifier: nextDifficulty
            };
          })
        }));

        if (payload.examDate) {
          const subject = get().subjects.find((item) => item.id === id);
          if (subject) {
            const exam = subject.examDate ?? null;
            const now = new Date();
            set((state) => ({
              topics: state.topics.map((topic) => {
                if (topic.subjectId !== id) return topic;
                const nextReviewDate = clampToExamDate(topic.nextReviewDate, exam);
                const events = topic.events ?? [];
                return {
                  ...topic,
                  nextReviewDate,
                  events: events.map((event) =>
                    event.type === "reviewed"
                      ? { ...event, at: clampToExamDate(event.at, exam) }
                      : event
                  )
                };
              })
            }));
          }
        }

        return get().subjects.find((subject) => subject.id === id) ?? null;
      },
      deleteSubject: (id) => {
        const { topics } = get();
        const hasTopics = topics.some((topic) => topic.subjectId === id);
        if (hasTopics) {
          return {
            success: false,
            reason: "Subject has topics assigned. Reassign them before deleting."
          };
        }
        set((state) => ({
          subjects: state.subjects.filter((subject) => subject.id !== id),
          categories: state.categories.filter((category) => category.id !== id)
        }));
        return { success: true };
      },
      getSubjectSummaries: () => {
        const { subjects, topics } = get();
        return computeSubjectSummaries(subjects, topics);
      },
      addTopic: (payload) => {
        const now = new Date();
        const createdAt = now.toISOString();
        const subjectsWrite = featureFlags.subjectsWrite;
        const requestedLabelRaw = payload.subjectLabel ?? payload.categoryLabel ?? "General";
        const requestedLabel = requestedLabelRaw.trim() || "General";
        const requestedId = payload.subjectId ?? payload.categoryId ?? null;

        let resolvedSubject =
          findSubjectById(get().subjects, requestedId) ??
          findSubjectByName(get().subjects, requestedLabel);

        if (!resolvedSubject && subjectsWrite) {
          resolvedSubject = get().addSubject({
            name: requestedLabel,
            examDate: payload.examDate ?? null
          });
        }

        if (!resolvedSubject) {
          resolvedSubject = findSubjectById(get().subjects, DEFAULT_SUBJECT_ID) ?? createDefaultSubject();
          if (!get().subjects.some((subject) => subject.id === resolvedSubject!.id)) {
            const subjectToAdd = resolvedSubject!;
            set((state) => ({
              subjects: [...state.subjects, subjectToAdd],
              categories: state.categories.some((category) => category.id === subjectToAdd.id)
                ? state.categories
                : [
                    ...state.categories,
                    {
                      id: subjectToAdd.id,
                      label: subjectToAdd.name,
                      color: subjectToAdd.color,
                      icon: subjectToAdd.icon
                    }
                  ]
            }));
          }
        }

        const subjectExamDate = resolvedSubject?.examDate ?? payload.examDate ?? null;
        const subjectColor = resolvedSubject?.color ?? payload.color ?? FALLBACK_SUBJECT_COLOR;
        const subjectIcon = resolvedSubject?.icon ?? payload.icon ?? "Sparkles";
        const subjectDifficulty = resolveDifficultyModifier(resolvedSubject?.difficultyModifier);
        const startedOnIso = payload.startedOn ?? createdAt;
        const startedAtDate = new Date(startedOnIso);
        const lastReviewedAtDate = payload.lastReviewedOn ? new Date(payload.lastReviewedOn) : null;
        const intervalIndex = 0;

        const topicId = nanoid();

        let events = ensureStartedEvent(
          topicId,
          [],
          startedAtDate.toISOString(),
          startedAtDate.getTime() !== now.getTime()
        );

        const existingTopics = get().topics;
        const stability = Math.min(
          Math.max(payload.stability ?? DEFAULT_STABILITY_DAYS, STABILITY_MIN_DAYS),
          STABILITY_MAX_DAYS
        );
        const retrievabilityTarget = payload.retrievabilityTarget ?? DEFAULT_RETRIEVABILITY_TARGET;
        const reviewsCount = payload.reviewsCount ?? (lastReviewedAtDate ? 1 : 0);
        const effectiveStability = Math.max(stability * subjectDifficulty, STABILITY_MIN_DAYS);
        const intervalDays = computeIntervalDays(effectiveStability, retrievabilityTarget);
        const referenceDate = lastReviewedAtDate ?? now;
        const minimumDate = lastReviewedAtDate ?? now;
        const nextReviewDate = scheduleNextReviewDate({
          topicId,
          referenceDate,
          intervalDays,
          topics: existingTopics,
          timeZone: DEFAULT_TIME_ZONE,
          examDate: subjectExamDate,
          minimumDate
        });

        if (lastReviewedAtDate) {
          const backfillReview = createReviewedEvent(
            topicId,
            lastReviewedAtDate.toISOString(),
            intervalDays,
            1,
            "scheduled",
            stability,
            retrievabilityTarget,
            nextReviewDate,
            1
          );
          events = appendEvent(events, { ...backfillReview, backfill: true });
        }

        const effectiveSubjectId = resolvedSubject?.id ?? DEFAULT_SUBJECT_ID;
        const effectiveSubjectLabel = resolvedSubject?.name ?? requestedLabel;

        const topic: Topic = {
          id: topicId,
          title: payload.title,
          notes: payload.notes,
          subjectId: effectiveSubjectId,
          subjectLabel: effectiveSubjectLabel,
          categoryId: payload.categoryId ?? effectiveSubjectId,
          categoryLabel: payload.categoryLabel ?? effectiveSubjectLabel,
          reminderTime: payload.reminderTime,
          intervals: payload.intervals,
          intervalIndex,
          nextReviewDate,
          lastReviewedAt: lastReviewedAtDate ? lastReviewedAtDate.toISOString() : null,
          lastReviewedOn: lastReviewedAtDate ? lastReviewedAtDate.toISOString() : null,
          stability,
          retrievabilityTarget,
          reviewsCount,
          retrievabilityAtLastReview:
            payload.retrievabilityAtLastReview ?? (lastReviewedAtDate ? 1 : null),
          subjectDifficultyModifier: subjectDifficulty,
          autoAdjustPreference: payload.autoAdjustPreference ?? "ask",
          createdAt,
          startedAt: startedAtDate.toISOString(),
          startedOn: startedAtDate.toISOString(),
          events,
          reviseNowLastUsedAt: payload.reviseNowLastUsedAt ?? null
        };

        set((state) => ({ topics: [topic, ...state.topics] }));
      },
      updateTopic: (id, payload) => {
        const now = new Date();
        const state = get();
        const requestedLabelRaw = payload.subjectLabel ?? payload.categoryLabel ?? "General";
        const requestedLabel = requestedLabelRaw.trim() || "General";
        const requestedId = payload.subjectId ?? payload.categoryId ?? null;

        let resolvedSubject =
          findSubjectById(state.subjects, requestedId) ?? findSubjectByName(state.subjects, requestedLabel);

        if (!resolvedSubject && featureFlags.subjectsWrite) {
          resolvedSubject = get().addSubject({
            name: requestedLabel,
            examDate: payload.examDate ?? null
          });
        }

        set((current) => ({
          topics: current.topics.map((topic) => {
            if (topic.id !== id) return topic;

            const effectiveSubject =
              resolvedSubject ??
              findSubjectById(current.subjects, topic.subjectId ?? null) ??
              findSubjectById(current.subjects, DEFAULT_SUBJECT_ID) ??
              createDefaultSubject();

            const subjectDifficulty = resolveDifficultyModifier(effectiveSubject.difficultyModifier);
            const examDate = effectiveSubject.examDate ?? payload.examDate ?? null;

            const stability = Math.min(
              Math.max(payload.stability ?? topic.stability ?? DEFAULT_STABILITY_DAYS, STABILITY_MIN_DAYS),
              STABILITY_MAX_DAYS
            );
            const retrievabilityTarget =
              payload.retrievabilityTarget ?? topic.retrievabilityTarget ?? DEFAULT_RETRIEVABILITY_TARGET;
            const reviewsCount = payload.reviewsCount ?? topic.reviewsCount ?? 0;
            const intervals = payload.intervals.length > 0 ? payload.intervals : topic.intervals;

            const startedAtIso =
              payload.startedOn ?? topic.startedOn ?? topic.startedAt ?? topic.createdAt ?? now.toISOString();
            const startedAtDate = new Date(startedAtIso);

            const lastReviewedAtIso =
              payload.lastReviewedOn ?? topic.lastReviewedOn ?? topic.lastReviewedAt ?? null;
            const lastReviewedAtDate = lastReviewedAtIso ? new Date(lastReviewedAtIso) : null;

            const intervalDays = computeIntervalDays(
              Math.max(stability * subjectDifficulty, STABILITY_MIN_DAYS),
              retrievabilityTarget
            );

            const nextReviewDate = scheduleNextReviewDate({
              topicId: topic.id,
              referenceDate: lastReviewedAtDate ?? now,
              intervalDays,
              topics: current.topics,
              timeZone: DEFAULT_TIME_ZONE,
              examDate,
              minimumDate: lastReviewedAtDate ?? now
            });

            let events = ensureStartedEvent(
              topic.id,
              topic.events,
              startedAtDate.toISOString(),
              startedAtDate.toISOString() !== (topic.startedAt ?? topic.createdAt)
            );

            if (lastReviewedAtIso) {
              const reviewEvent = createReviewedEvent(
                topic.id,
                lastReviewedAtIso,
                intervalDays,
                1,
                "scheduled",
                stability,
                retrievabilityTarget,
                nextReviewDate,
                topic.retrievabilityAtLastReview ?? 1
              );
              const existingReviewIndex = events.findIndex(
                (event) => event.type === "reviewed" && event.at === lastReviewedAtIso
              );
              if (existingReviewIndex >= 0) {
                events[existingReviewIndex] = { ...events[existingReviewIndex], ...reviewEvent };
              } else {
                events = appendEvent(events, reviewEvent);
              }
            }

            return {
              ...topic,
              title: payload.title,
              notes: payload.notes,
              subjectId: effectiveSubject.id,
              subjectLabel: effectiveSubject.name,
              categoryId: payload.categoryId ?? effectiveSubject.id,
              categoryLabel: payload.categoryLabel ?? effectiveSubject.name,
              reminderTime: payload.reminderTime,
              intervals,
              intervalIndex: Math.min(topic.intervalIndex, intervals.length - 1),
              nextReviewDate,
              lastReviewedAt: lastReviewedAtIso,
              lastReviewedOn: lastReviewedAtIso,
              stability,
              retrievabilityTarget,
              reviewsCount,
              retrievabilityAtLastReview:
                typeof payload.retrievabilityAtLastReview !== "undefined"
                  ? payload.retrievabilityAtLastReview
                  : lastReviewedAtIso
                    ? topic.retrievabilityAtLastReview ?? 1
                    : topic.retrievabilityAtLastReview ?? null,
              subjectDifficultyModifier: subjectDifficulty,
              autoAdjustPreference: payload.autoAdjustPreference ?? topic.autoAdjustPreference ?? "ask",
              startedAt: startedAtDate.toISOString(),
              startedOn: startedAtDate.toISOString(),
              events,
              reviseNowLastUsedAt:
                typeof payload.reviseNowLastUsedAt === "undefined"
                  ? topic.reviseNowLastUsedAt ?? null
                  : payload.reviseNowLastUsedAt ?? null
            };
          })
        }));
      },
      deleteTopic: (id) => {
        set((state) => ({ topics: state.topics.filter((topic) => topic.id !== id) }));
      },
      updateTopicHistory: (id, entries, options) => {
        const state = get();
        const topic = state.topics.find((item) => item.id === id);
        if (!topic) {
          return { success: false, error: "Topic not found" };
        }

        const timeZone = options?.timeZone ?? DEFAULT_TIME_ZONE;
        const subject = findSubjectById(state.subjects, topic.subjectId ?? null);
        const now = nowInTimeZone(timeZone);
        const nowMs = now.getTime();
        const examDate = subject?.examDate ?? null;
        const examMs = examDate ? new Date(examDate).getTime() : null;

        const deduped = new Map<string, TopicHistoryEntry>();
        const mergedDays: string[] = [];

        for (const entry of entries) {
          const reviewedAt = new Date(entry.at);
          if (Number.isNaN(reviewedAt.getTime())) {
            return { success: false, error: "History entry has an invalid date" };
          }
          if (reviewedAt.getTime() > nowMs) {
            return { success: false, error: "History cannot include future dates" };
          }
          if (examMs && reviewedAt.getTime() > examMs) {
            return {
              success: false,
              error: subject
                ? `That date is after the exam for ${subject.name}. Choose an earlier date.`
                : "That date exceeds the subject exam cut-off."
            };
          }

          const dayKey = getDayKeyInTimeZone(reviewedAt.toISOString(), timeZone);
          const existing = deduped.get(dayKey);
          if (existing) {
            mergedDays.push(dayKey);
            const existingRank = QUALITY_PRIORITY[existing.quality];
            const candidateRank = QUALITY_PRIORITY[entry.quality];
            if (
              candidateRank > existingRank ||
              (candidateRank === existingRank && reviewedAt.getTime() > new Date(existing.at).getTime())
            ) {
              deduped.set(dayKey, { ...entry, at: reviewedAt.toISOString() });
            }
          } else {
            deduped.set(dayKey, { ...entry, at: reviewedAt.toISOString() });
          }
        }

        const ordered = Array.from(deduped.values()).sort(
          (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
        );

        const reviewEvents: TopicEvent[] = [];
        let stability = DEFAULT_STABILITY_DAYS;
        let reviewsCount = 0;
        let intervalIndex = 0;
        let lastIntervalDays = computeIntervalDays(DEFAULT_STABILITY_DAYS, topic.retrievabilityTarget);
        const subjectDifficulty = resolveDifficultyModifier(
          subject?.difficultyModifier ?? topic.subjectDifficultyModifier
        );
        const startedAtIso = topic.startedAt ?? topic.createdAt;
        const startedAtDate = new Date(startedAtIso);
        let previousReviewDate: Date | null = null;

        for (const entry of ordered) {
          const reviewedAtDate = new Date(entry.at);
          const baseForElapsed = previousReviewDate ?? startedAtDate;
          const elapsedMs = reviewedAtDate.getTime() - baseForElapsed.getTime();
          const elapsedDays = Math.max(elapsedMs / DAY_MS, STABILITY_MIN_DAYS / 24);
          reviewsCount += 1;

          const priorEffectiveStability = Math.max(stability * subjectDifficulty, STABILITY_MIN_DAYS);
          const retrievabilityAtReview = previousReviewDate
            ? computeRetrievability(priorEffectiveStability, Math.max(elapsedMs, 0))
            : 1;

          stability = updateStability({
            previousStability: stability,
            elapsedDays,
            quality: entry.quality,
            reviewCount: reviewsCount
          });

          const effectiveStability = Math.max(stability * subjectDifficulty, STABILITY_MIN_DAYS);
          const intervalDays = computeIntervalDays(effectiveStability, topic.retrievabilityTarget);
          lastIntervalDays = intervalDays;
          const reviewedAtIso = reviewedAtDate.toISOString();
          const nextReviewIso = clampToExamDate(
            new Date(new Date(reviewedAtIso).getTime() + intervalDays * DAY_MS),
            examDate
          );

          reviewEvents.push({
            id: entry.id ?? nanoid(),
            topicId: topic.id,
            type: "reviewed",
            at: reviewedAtIso,
            intervalDays,
            reviewQuality: entry.quality,
            reviewKind: "scheduled",
            resultingStability: stability,
            targetRetrievability: topic.retrievabilityTarget,
            nextReviewAt: nextReviewIso,
            retrievabilityAtReview,
            backfill: reviewedAtDate.getTime() < nowMs ? true : undefined
          });

          const intervalCap = Math.max(topic.intervals.length - 1, 0);
          intervalIndex = Math.min(reviewsCount, intervalCap);
          previousReviewDate = reviewedAtDate;
        }

        const nonReviewEvents = (topic.events ?? []).filter((event) => event.type !== "reviewed");
        const markBackfilled =
          ordered.length > 0 && new Date(ordered[0].at).getTime() < startedAtDate.getTime();
        let events = ensureStartedEvent(topic.id, nonReviewEvents, startedAtIso, markBackfilled);
        events = ensureEventsSorted([...events, ...reviewEvents]);

        let nextReviewDate = topic.nextReviewDate;
        let lastReviewedAt: string | null = null;
        let retrievabilityAtLastReview: number | null = null;

        if (reviewEvents.length > 0) {
          const lastEvent = reviewEvents[reviewEvents.length - 1];
          lastReviewedAt = lastEvent.at;
          const intervalDays = lastEvent.intervalDays ?? lastIntervalDays;
          const referenceDate = new Date(lastEvent.at);
          retrievabilityAtLastReview = lastEvent.retrievabilityAtReview ?? null;
          nextReviewDate = scheduleNextReviewDate({
            topicId: topic.id,
            referenceDate,
            intervalDays,
            topics: state.topics,
            timeZone,
            examDate,
            minimumDate: referenceDate
          });
        } else {
          stability = DEFAULT_STABILITY_DAYS;
          reviewsCount = 0;
          intervalIndex = 0;
        }

        const finalStability = Math.min(
          Math.max(stability, STABILITY_MIN_DAYS),
          STABILITY_MAX_DAYS
        );

        const uniqueMergedDays = Array.from(new Set(mergedDays)).sort();

        set((prev) => ({
          topics: prev.topics.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              events,
              stability: finalStability,
              reviewsCount,
              intervalIndex,
              nextReviewDate,
              lastReviewedAt,
              lastReviewedOn: lastReviewedAt,
              retrievabilityAtLastReview:
                retrievabilityAtLastReview ?? item.retrievabilityAtLastReview ?? null,
              subjectDifficultyModifier: subjectDifficulty,
              reviseNowLastUsedAt: item.reviseNowLastUsedAt
            };
          })
        }));

        return { success: true, mergedDays: uniqueMergedDays };
      },
      markReviewed: (id, options) => {
        const state = get();
        const topic = state.topics.find((item) => item.id === id);
        if (!topic) return false;

        const now = new Date();
        const reviewedAtIso = options?.reviewedAt ?? now.toISOString();
        const reviewedAt = new Date(reviewedAtIso);
        const timeZone = options?.timeZone ?? DEFAULT_TIME_ZONE;

        if (options?.source === "revise-now" && topic.reviseNowLastUsedAt) {
          const lastKey = getDayKeyInTimeZone(topic.reviseNowLastUsedAt, timeZone);
          const attemptKey = getDayKeyInTimeZone(reviewedAtIso, timeZone);
          if (lastKey === attemptKey) {
            set((prev) => ({
              reviseNowMetrics: {
                ...prev.reviseNowMetrics,
                blockedCount: prev.reviseNowMetrics.blockedCount + 1,
                lastBlockedAt: reviewedAtIso
              }
            }));
            return false;
          }
        }

        if (topic.lastReviewedAt) {
          const lastKey = getDayKeyInTimeZone(topic.lastReviewedAt, timeZone);
          const attemptKey = getDayKeyInTimeZone(reviewedAtIso, timeZone);
          if (lastKey === attemptKey && options?.source !== "revise-now") {
            return false;
          }
        }

        const quality: ReviewQuality = options?.quality ?? 1;
        const wasEarly = reviewedAt.getTime() < new Date(topic.nextReviewDate).getTime();

        let shouldAdjust = options?.adjustFuture;
        const preference = topic.autoAdjustPreference ?? "ask";
        if (typeof shouldAdjust === "undefined") {
          if (!wasEarly) {
            shouldAdjust = true;
          } else if (preference === "always") {
            shouldAdjust = true;
          } else if (preference === "never") {
            shouldAdjust = false;
          } else {
            shouldAdjust = false;
          }
        }
        if (preference === "never") {
          shouldAdjust = false;
        }
        if (preference === "always") {
          shouldAdjust = true;
        }

        const subject = findSubjectById(state.subjects, topic.subjectId ?? null);
        const subjectDifficulty = resolveDifficultyModifier(
          subject?.difficultyModifier ?? topic.subjectDifficultyModifier
        );
        const examDate = subject?.examDate ?? null;

        if (quality === 0) {
          shouldAdjust = true;
        }

        const leadTimeMsRaw = new Date(topic.nextReviewDate).getTime() - reviewedAt.getTime();
        const leadTimeMs = Math.max(0, leadTimeMsRaw);

        const reviewsCount = topic.reviewsCount + 1;
        const nextIntervalIndex =
          quality === 0 ? 0 : Math.min(topic.intervalIndex + 1, topic.intervals.length - 1);

        const anchorDate = topic.lastReviewedAt
          ? new Date(topic.lastReviewedAt)
          : topic.startedAt
            ? new Date(topic.startedAt)
            : new Date(topic.createdAt);
        const elapsedMs = reviewedAt.getTime() - anchorDate.getTime();
        const elapsedDays = Math.max(elapsedMs / DAY_MS, STABILITY_MIN_DAYS / 24);
        const priorEffectiveStability = Math.max(topic.stability * subjectDifficulty, STABILITY_MIN_DAYS);
        const retrievabilityAtReview = topic.lastReviewedAt
          ? computeRetrievability(priorEffectiveStability, Math.max(elapsedMs, 0))
          : 1;

        const updatedStability = updateStability({
          previousStability: topic.stability,
          elapsedDays,
          quality,
          reviewCount: reviewsCount
        });
        const effectiveStability = Math.max(updatedStability * subjectDifficulty, STABILITY_MIN_DAYS);
        const intervalDays = computeIntervalDays(effectiveStability, topic.retrievabilityTarget);

        let nextReviewDate = topic.nextReviewDate;
        if (!wasEarly || shouldAdjust) {
          nextReviewDate = scheduleNextReviewDate({
            topicId: topic.id,
            referenceDate: reviewedAt,
            intervalDays,
            topics: state.topics,
            timeZone,
            examDate,
            minimumDate: reviewedAt
          });
        }

        const reviewKind: ReviewKind = options?.source === "revise-now" ? "revise_now" : "scheduled";
        const reviewedEvent = createReviewedEvent(
          topic.id,
          reviewedAtIso,
          intervalDays,
          quality,
          reviewKind,
          updatedStability,
          topic.retrievabilityTarget,
          nextReviewDate,
          retrievabilityAtReview
        );

        set((prev) => ({
          topics: prev.topics.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              intervalIndex: nextIntervalIndex,
              stability: updatedStability,
              reviewsCount,
              subjectDifficultyModifier: subjectDifficulty,
              lastReviewedAt: reviewedAtIso,
              lastReviewedOn: reviewedAtIso,
              nextReviewDate,
              retrievabilityAtLastReview: retrievabilityAtReview,
              events: appendEvent(item.events, reviewedEvent),
              reviseNowLastUsedAt:
                options?.source === "revise-now" ? reviewedAtIso : item.reviseNowLastUsedAt ?? null
            };
          }),
          reviseNowMetrics:
            options?.source === "revise-now"
              ? {
                  ...prev.reviseNowMetrics,
                  successCount: prev.reviseNowMetrics.successCount + 1,
                  totalLeadTimeMs: prev.reviseNowMetrics.totalLeadTimeMs + leadTimeMs,
                  samples: prev.reviseNowMetrics.samples + 1,
                  lastSuccessAt: reviewedAtIso,
                  lastLeadTimeMs: leadTimeMs
                }
              : prev.reviseNowMetrics
        }));

        return true;
      },
      skipTopic: (id) => {
        const state = get();
        const topic = state.topics.find((item) => item.id === id);
        if (!topic) return;

        const now = new Date();
        const timeZone = DEFAULT_TIME_ZONE;
        const subject = findSubjectById(state.subjects, topic.subjectId ?? null);
        const nextReviewDate = scheduleSkipReviewDate({
          topic,
          topics: state.topics,
          timeZone,
          examDate: subject?.examDate ?? null,
          fromDate: new Date(topic.nextReviewDate)
        });

        const skipEvent: TopicEvent = {
          id: nanoid(),
          topicId: id,
          type: "skipped",
          at: now.toISOString(),
          reviewKind: "skip_user",
          nextReviewAt: nextReviewDate
        };

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
      },
      trackReviseNowBlocked: () => {
        const timestamp = new Date().toISOString();
        set((state) => ({
          reviseNowMetrics: {
            ...state.reviseNowMetrics,
            blockedCount: state.reviseNowMetrics.blockedCount + 1,
            lastBlockedAt: timestamp
          }
        }));
      },
      autoSkipOverdueTopics: (timeZone) => {
        const state = get();
        const now = nowInTimeZone(timeZone);
        const startOfToday = startOfDayInTimeZone(now, timeZone);
        const startMs = startOfToday.getTime();
        const todayKey = getDayKeyInTimeZone(now, timeZone);
        const results: AutoSkipResult[] = [];

        set((prev) => ({
          topics: prev.topics.map((topic) => {
            const nextMs = new Date(topic.nextReviewDate).getTime();
            const reviewedToday =
              topic.lastReviewedAt &&
              getDayKeyInTimeZone(topic.lastReviewedAt, timeZone) === todayKey;

            if (reviewedToday || nextMs >= startMs) {
              return topic;
            }

            const subject = findSubjectById(prev.subjects, topic.subjectId ?? null);
            const nextReviewDate = scheduleSkipReviewDate({
              topic,
              topics: prev.topics,
              timeZone,
              examDate: subject?.examDate ?? null,
              fromDate: new Date(topic.nextReviewDate)
            });

            const skipEvent: TopicEvent = {
              id: nanoid(),
              topicId: topic.id,
              type: "skipped",
              at: now.toISOString(),
              reviewKind: "skip_auto",
              nextReviewAt: nextReviewDate
            };

            results.push({
              topicId: topic.id,
              previousDate: topic.nextReviewDate,
              nextDate: nextReviewDate,
              kind: "skip_auto"
            });

            return {
              ...topic,
              nextReviewDate,
              events: appendEvent(topic.events, skipEvent)
            };
          })
        }));
        return results;
      },
      applyReviewTrigger: (trigger) => {
        const safeTrigger = Math.min(Math.max(trigger, REVIEW_TRIGGER_MIN), REVIEW_TRIGGER_MAX);
        const now = new Date();
        set((state) => {
          const updated = state.topics.map((topic) => {
            const subject = findSubjectById(state.subjects, topic.subjectId ?? null);
            const subjectDifficulty = resolveDifficultyModifier(
              subject?.difficultyModifier ?? topic.subjectDifficultyModifier
            );
            const effectiveStability = Math.max(topic.stability * subjectDifficulty, STABILITY_MIN_DAYS);
            const anchorIso = topic.lastReviewedAt ?? topic.startedAt ?? topic.startedOn ?? topic.createdAt;
            const anchorDate = anchorIso ? new Date(anchorIso) : now;
            const referenceDate = Number.isFinite(anchorDate.getTime()) ? anchorDate : now;
            const intervalDays = computeIntervalDays(effectiveStability, safeTrigger);
            const nextReviewDate = scheduleNextReviewDate({
              topicId: topic.id,
              referenceDate,
              intervalDays,
              topics: state.topics,
              timeZone: DEFAULT_TIME_ZONE,
              examDate: subject?.examDate ?? null,
              minimumDate: now
            });

            let events = topic.events;
            if (Array.isArray(events) && events.length > 0) {
              let latestIndex = -1;
              let latestTime = Number.NEGATIVE_INFINITY;
              events.forEach((event, index) => {
                if (event.type !== "reviewed") return;
                const eventTime = new Date(event.at).getTime();
                if (!Number.isFinite(eventTime)) return;
                if (eventTime >= latestTime) {
                  latestTime = eventTime;
                  latestIndex = index;
                }
              });
              if (latestIndex >= 0) {
                const nextEvents = [...events];
                nextEvents[latestIndex] = {
                  ...nextEvents[latestIndex],
                  targetRetrievability: safeTrigger,
                  nextReviewAt: nextReviewDate
                };
                events = ensureEventsSorted(nextEvents);
              }
            }

            return {
              ...topic,
              retrievabilityTarget: safeTrigger,
              nextReviewDate,
              events
            };
          });
          return { topics: updated };
        });
      }
    };
  },
    {
      name: "spaced-repetition-store",
      version: VERSION,
      migrate
    }
  )
);
