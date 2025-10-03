import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { addDays, daysBetween, getDayKeyInTimeZone } from "@/lib/date";
import {
  AutoAdjustPreference,
  Subject,
  SubjectSummary,
  Topic,
  TopicEvent
} from "@/types/topic";
import { featureFlags } from "@/lib/feature-flags";

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
  categoryId?: string | null;
  categoryLabel?: string;
  reminderTime: string | null;
  intervals: number[];
  examDate?: string | null;
  autoAdjustPreference?: AutoAdjustPreference;
  startedOn?: string | null;
  lastReviewedOn?: string | null;
  reviseNowLastUsedAt?: string | null;
};

type SubjectCreatePayload = {
  name: string;
  examDate?: string | null;
  color?: string | null;
  icon?: string | null;
};

type SubjectUpdatePayload = {
  name?: string;
  examDate?: string | null;
  color?: string | null;
  icon?: string | null;
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
  skipTopic: (id: string) => void;
  setAutoAdjustPreference: (id: string, preference: AutoAdjustPreference) => void;
  trackReviseNowBlocked: () => void;
};

const DEFAULT_SUBJECT_ID = "subject-general";

const createDefaultCategory = (): LegacyCategory => ({
  id: DEFAULT_SUBJECT_ID,
  label: "General",
  color: "#38bdf8",
  icon: "Sparkles"
});

const createDefaultSubject = (): Subject => {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_SUBJECT_ID,
    name: "General",
    color: "#38bdf8",
    icon: "Sparkles",
    examDate: null,
    createdAt: now,
    updatedAt: now
  };
};

const DEFAULT_TIME_ZONE = "Asia/Colombo";

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

const evenlyDistributeFrom = (
  reference: Date,
  topic: Topic,
  examDate: string | null
): string => {
  const nowStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const remainingReviews = Math.max(1, topic.intervals.length - topic.intervalIndex);

  if (!examDate) {
    const target = new Date(topic.nextReviewDate ?? reference.toISOString());
    target.setDate(target.getDate() + 1);
    return target.toISOString();
  }

  const exam = new Date(examDate);
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
  topicId: string,
  reviewedAtIso: string,
  intervalDays: number
): TopicEvent => ({
  id: nanoid(),
  topicId,
  type: "reviewed",
  at: reviewedAtIso,
  intervalDays
});

const VERSION = 6;
type PersistedState = TopicStoreState & { version?: number; categories?: LegacyCategory[] };

const migrate = (persisted: PersistedState, from: number): PersistedState => {
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
  }

  if (from < VERSION) {
    const now = new Date().toISOString();
    const existingSubjects = new Map<string, Subject>();
    for (const subject of persisted.subjects) {
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
            color: (topic as any).color ?? "#38bdf8",
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

  return persisted;
};

export const useTopicStore = create<TopicStore>()(
  persist(
    (set, get) => ({
      topics: [],
      subjects: [createDefaultSubject()],
      categories: [createDefaultCategory()],
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
          color: payload.color ?? "#38bdf8",
          icon: payload.icon ?? "Sparkles",
          examDate: normalizeExamDate(payload.examDate),
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
        set((state) => ({
          subjects: state.subjects.map((subject) => {
            if (subject.id !== id) return subject;
            return {
              ...subject,
              name: updatedName ?? subject.name,
              color: identityColor ?? subject.color,
              icon: identityIcon ?? subject.icon,
              examDate: typeof payload.examDate === "undefined" ? subject.examDate : examDate,
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
              subjectLabel: updatedName ?? topic.subjectLabel
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
        if (id === DEFAULT_SUBJECT_ID) {
          return { success: false, reason: "Default subject cannot be deleted" };
        }
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

        const subjectExamDate = resolvedSubject?.examDate ?? null;
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

        if (lastReviewedAtDate) {
          events = appendEvent(events, {
            id: nanoid(),
            topicId,
            type: "reviewed",
            at: lastReviewedAtDate.toISOString(),
            intervalDays: payload.intervals[Math.min(intervalIndex, payload.intervals.length - 1)] ?? 1
          });
        }

        const nextReviewDate = computeNextReviewDate(
          lastReviewedAtDate ? lastReviewedAtDate.toISOString() : null,
          payload.intervals,
          intervalIndex,
          now,
          subjectExamDate
        );

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
          autoAdjustPreference: payload.autoAdjustPreference ?? "ask",
          createdAt,
          startedAt: startedAtDate.toISOString(),
          startedOn: startedAtDate.toISOString(),
          events,
          forgetting: undefined,
          reviseNowLastUsedAt: payload.reviseNowLastUsedAt ?? null
        };

        set((state) => ({ topics: [topic, ...state.topics] }));
      },
      updateTopic: (id, payload) => {
        const now = new Date();
        const { subjects } = get();
        const requestedLabelRaw = payload.subjectLabel ?? payload.categoryLabel ?? "General";
        const requestedLabel = requestedLabelRaw.trim() || "General";
        const requestedId = payload.subjectId ?? payload.categoryId ?? null;

        let resolvedSubject =
          findSubjectById(subjects, requestedId) ?? findSubjectByName(subjects, requestedLabel);

        if (!resolvedSubject && featureFlags.subjectsWrite) {
          resolvedSubject = get().addSubject({
            name: requestedLabel,
            examDate: payload.examDate ?? null
          });
        }

        set((state) => ({
          topics: state.topics.map((topic) => {
            if (topic.id !== id) return topic;

            const effectiveSubject =
              resolvedSubject ??
              findSubjectById(state.subjects, topic.subjectId ?? null) ??
              findSubjectById(state.subjects, DEFAULT_SUBJECT_ID) ??
              createDefaultSubject();
            const examDate = effectiveSubject.examDate ?? null;

            const startedOn = payload.startedOn ?? topic.startedOn ?? topic.startedAt ?? topic.createdAt;
            const lastReviewedOn = payload.lastReviewedOn ?? topic.lastReviewedOn ?? topic.lastReviewedAt ?? null;

            const startedAt = startedOn ?? topic.startedAt ?? topic.createdAt;
            const lastReviewedAt = lastReviewedOn ?? null;

            const nextReviewDate = computeNextReviewDate(
              lastReviewedAt,
              payload.intervals,
              topic.intervalIndex,
              now,
              examDate
            );

            let events = ensureStartedEvent(topic.id, topic.events, startedAt, startedAt !== topic.createdAt);
            if (lastReviewedAt) {
              events = appendEvent(events, {
                id: nanoid(),
                topicId: topic.id,
                type: "reviewed",
                at: lastReviewedAt,
                intervalDays: payload.intervals[Math.min(topic.intervalIndex, payload.intervals.length - 1)] ?? 1
              });
            }

            const effectiveSubjectId = effectiveSubject.id ?? topic.subjectId ?? DEFAULT_SUBJECT_ID;
            const effectiveSubjectLabel = effectiveSubject.name ?? requestedLabel;

            return {
              ...topic,
              title: payload.title,
              notes: payload.notes,
              subjectId: effectiveSubjectId,
              subjectLabel: effectiveSubjectLabel,
              categoryId: payload.categoryId ?? effectiveSubjectId,
              categoryLabel: payload.categoryLabel ?? effectiveSubjectLabel,
              reminderTime: payload.reminderTime,
              intervals: payload.intervals,
              startedAt,
              startedOn,
              lastReviewedAt,
              lastReviewedOn,
              nextReviewDate,
              events,
              autoAdjustPreference: payload.autoAdjustPreference ?? topic.autoAdjustPreference ?? "ask",
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

        const subject = findSubjectById(state.subjects, topic.subjectId ?? null);
        const examDate = subject?.examDate ?? null;

        const leadTimeMsRaw = new Date(topic.nextReviewDate).getTime() - reviewedAt.getTime();
        const leadTimeMs = Math.max(0, leadTimeMsRaw);
        const intervalDays = currentIntervals[Math.min(nextIndex, currentIntervals.length - 1)] ?? 1;
        let nextReviewDate = computeNextReviewDate(
          reviewedAtIso,
          currentIntervals,
          nextIndex,
          reviewedAt,
          examDate
        );

        if (wasEarly && !shouldAdjust) {
          nextReviewDate = topic.nextReviewDate;
        }

        const reviewedEvent = createReviewedEvent(topic.id, reviewedAtIso, intervalDays);

        set((prev) => ({
          topics: prev.topics.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              intervalIndex: nextIndex,
              lastReviewedAt: reviewedAtIso,
              lastReviewedOn: reviewedAtIso,
              nextReviewDate,
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
        const skipEvent: TopicEvent = {
          id: nanoid(),
          topicId: id,
          type: "skipped",
          at: now.toISOString()
        };

        const subject = findSubjectById(state.subjects, topic.subjectId ?? null);
        const nextReviewDate = evenlyDistributeFrom(now, topic, subject?.examDate ?? null);

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
      }
    }),
    {
      name: "spaced-repetition-store",
      version: VERSION,
      migrate
    }
  )
);
