"use client";

import * as React from "react";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import {
  TopicList,
  TopicListItem,
  TopicStatus,
  StatusFilter,
  SubjectFilterValue,
  NO_SUBJECT_KEY
} from "@/components/dashboard/topic-list";
import { useZonedNow } from "@/hooks/use-zoned-now";
import { usePersistedSubjectFilter } from "@/hooks/use-persisted-subject-filter";
import { formatDateWithWeekday, formatRelativeToNow, getDayKey, isToday, startOfToday } from "@/lib/date";
import { computeRiskScore, getAverageQuality } from "@/lib/forgetting-curve";
import { Subject, Topic } from "@/types/topic";
import { cn } from "@/lib/utils";

interface DashboardProps {
  onCreateTopic: () => void;
  onEditTopic: (id: string) => void;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STATUS_FILTER_STORAGE_KEY = "dashboard-status-filter";
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

const computeStreak = (topics: Topic[]) => {
  const reviewDays = new Set<string>();
  for (const topic of topics) {
    for (const event of topic.events ?? []) {
      if (event.type === "reviewed") {
        reviewDays.add(getDayKey(event.at));
      }
    }
  }
  let streak = 0;
  let cursor = startOfToday();
  while (reviewDays.has(getDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_IN_MS);
  }
  return streak;
};

export const Dashboard: React.FC<DashboardProps> = ({ onCreateTopic, onEditTopic }) => {
  const { topics, subjects } = useTopicStore((state) => ({
    topics: state.topics,
    subjects: state.subjects
  }));
  const timezone = useProfileStore((state) => state.profile.timezone);
  const resolvedTimezone = timezone || "Asia/Colombo";
  const zonedNow = useZonedNow(resolvedTimezone);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("due-today");
  const { subjectFilter, setSubjectFilter } = usePersistedSubjectFilter();

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(STATUS_FILTER_STORAGE_KEY);
    if (!stored) return;
    if (stored === "all" || stored === "overdue" || stored === "due-today" || stored === "upcoming") {
      setStatusFilter(stored);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STATUS_FILTER_STORAGE_KEY, statusFilter);
  }, [statusFilter]);

  const resolvedSubjectFilter = subjectFilter ?? null;


  const enrichedTopics = React.useMemo<TopicListItem[]>(() => {
    const subjectMap = new Map<string, Subject>();
    for (const subject of subjects) {
      subjectMap.set(subject.id, subject);
    }
    const start = startOfToday().getTime();
    const endOfTodayMs = start + DAY_IN_MS;

    return topics.map((topic) => {
      const nextTime = new Date(topic.nextReviewDate).getTime();
      let status: TopicStatus;
      if (nextTime < start) {
        status = "overdue";
      } else if (nextTime < endOfTodayMs) {
        status = "due-today";
      } else {
        status = "upcoming";
      }

      const subject = topic.subjectId ? subjectMap.get(topic.subjectId) ?? null : null;

      return {
        topic,
        subject,
        status,
        risk: computeRiskScore({
          now: zonedNow,
          stabilityDays: topic.stability,
          targetRetrievability: topic.retrievabilityTarget,
          lastReviewedAt: topic.lastReviewedAt,
          nextReviewAt: topic.nextReviewDate,
          reviewsCount: topic.reviewsCount,
          averageQuality: getAverageQuality(
            (topic.events ?? [])
              .filter((event) => event.type === "reviewed" && typeof event.reviewQuality === "number")
              .map((event) => event.reviewQuality as number)
          ),
          examDate: subject?.examDate ?? null,
          difficultyModifier: subject?.difficultyModifier ?? topic.subjectDifficultyModifier ?? 1
        })
      } satisfies TopicListItem;
    });
  }, [topics, subjects, zonedNow]);

  const {
    dueCount,
    upcomingCount,
    completedCount,
    totalToday,
    completionPercent,
    nextTopic,
    streak
  } = React.useMemo(() => {
    const now = Date.now();
    const start = startOfToday().getTime();
    const endOfTodayMs = start + DAY_IN_MS;

    let dueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    for (const topic of topics) {
      const nextTime = new Date(topic.nextReviewDate).getTime();
      const reviewedToday = topic.lastReviewedAt ? isToday(topic.lastReviewedAt) : false;

      if (nextTime < start) {
        if (reviewedToday) {
          completedCount += 1;
        } else {
          dueCount += 1;
        }
        continue;
      }

      if (nextTime < endOfTodayMs) {
        if (reviewedToday) {
          completedCount += 1;
        } else {
          dueCount += 1;
        }
        continue;
      }

      if (reviewedToday) {
        completedCount += 1;
      } else {
        upcomingCount += 1;
      }
    }

    const totalToday = dueCount + completedCount;
    const completionPercent = totalToday === 0 ? 100 : Math.round((completedCount / totalToday) * 100);

    const byNextReview = [...topics].sort(
      (a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
    );
    const nextDueTopic =
      byNextReview.find((topic) => new Date(topic.nextReviewDate).getTime() <= now) ??
      byNextReview[0] ??
      null;

    const streak = computeStreak(topics);

    return {
      dueCount,
      upcomingCount,
      completedCount,
      totalToday,
      completionPercent,
      nextTopic: nextDueTopic,
      streak
    };
  }, [topics]);

  const filteredTopicsForPlan = React.useMemo(() => {
    return enrichedTopics.filter((item) => {
      const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;
      const matchesSubject =
        resolvedSubjectFilter === null
          ? true
          : resolvedSubjectFilter.has(item.subject?.id ?? NO_SUBJECT_KEY);
      return matchesStatus && matchesSubject;
    });
  }, [enrichedTopics, statusFilter, resolvedSubjectFilter]);

  const filteredDueCount = React.useMemo(
    () => filteredTopicsForPlan.filter((item) => item.status !== "upcoming").length,
    [filteredTopicsForPlan]
  );
  const filteredUpcomingCount = React.useMemo(
    () => filteredTopicsForPlan.filter((item) => item.status === "upcoming").length,
    [filteredTopicsForPlan]
  );

  const filteredNextTopic = React.useMemo(() => {
    if (filteredTopicsForPlan.length === 0) return null;
    return (
      [...filteredTopicsForPlan]
        .map((item) => item.topic)
        .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime())[0] ?? null
    );
  }, [filteredTopicsForPlan]);

  const handleSubjectFilterChange = React.useCallback((value: SubjectFilterValue) => {
    setSubjectFilter(value === null ? null : new Set<string>(value));
  }, [setSubjectFilter]);

  const handleStatusFilterChange = React.useCallback((value: StatusFilter) => {
    setStatusFilter(value);
  }, []);

  return (
    <section className="flex flex-col gap-8 lg:gap-10">
      <DailySummarySection
        dueCount={filteredDueCount}
        upcomingCount={filteredUpcomingCount}
        streak={streak}
        nextTopic={filteredNextTopic}
      />

      <TopicList
        id="dashboard-topic-list"
        items={enrichedTopics}
        subjects={subjects}
        onEditTopic={onEditTopic}
        onCreateTopic={onCreateTopic}
        timezone={resolvedTimezone}
        zonedNow={zonedNow}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        subjectFilter={resolvedSubjectFilter}
        onSubjectFilterChange={handleSubjectFilterChange}
      />

      <ProgressTodayModule completed={completedCount} total={totalToday} completionPercent={completionPercent} />
    </section>
  );
};

const ProgressTodayModule = ({
  completed,
  total,
  completionPercent
}: {
  completed: number;
  total: number;
  completionPercent: number;
}) => {
  const safeTotal = total === 0 ? completed : total;
  const safePercent = Number.isFinite(completionPercent) ? Math.max(0, Math.min(100, completionPercent)) : 0;
  const isComplete = safePercent >= 100;
  const summaryText = `${completed}/${safeTotal} reviews completed • ${safePercent}% complete. Keep up the rhythm — every checkmark keeps your memory sharp.`;

  return (
    <section className="progress-summary rounded-3xl border border-inverse/10 bg-card/60 px-6 py-8 md:px-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress today</p>
          <h2 className="text-3xl font-semibold text-fg">
            {completed}/{safeTotal} reviews completed
          </h2>
          <p className="text-sm text-muted-foreground">{summaryText}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-fg">{safePercent}% complete</p>
          <p className="text-sm text-muted-foreground">
            {isComplete
              ? "Great work! You\u2019ve completed today\u2019s reviews."
              : "Finish today to extend your streak."}
          </p>
        </div>
      </div>
    </section>
  );
};

const DailySummarySection = ({
  dueCount,
  upcomingCount,
  streak,
  nextTopic
}: {
  dueCount: number;
  upcomingCount: number;
  streak: number;
  nextTopic: Topic | null;
}) => {
  const nextRelative = nextTopic ? formatRelativeToNow(nextTopic.nextReviewDate) : null;
  const nextDateLabel = nextTopic ? formatDateWithWeekday(nextTopic.nextReviewDate) : null;
  const dueLine =
    dueCount === 0
      ? "You\u2019re all caught up. Check back tomorrow or add a topic."
      : `You have ${dueCount} topic${dueCount === 1 ? "" : "s"} ready for review. Finish them to extend your streak.`;
  const nextLine = nextTopic
    ? `Next up: ${nextTopic.title} • ${nextRelative} (${nextDateLabel})`
    : "Next up: Add a topic to plan your next review.";

  return (
    <section className="rounded-3xl border border-inverse/10 bg-bg/60 px-6 py-6 md:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4 lg:max-w-xl">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today\u2019s Tasks</p>
            <p className="text-sm font-medium text-accent">Personalized review plan</p>
            <h2 className="text-2xl font-semibold text-fg">Your next five minutes matter.</h2>
            <p className="text-sm text-muted-foreground">{dueLine}</p>
            <p className="text-xs text-muted-foreground">{nextLine}</p>
          </div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
          <MetricCard label="Due today" value={dueCount} tone="status-text status-text--overdue" />
          <MetricCard label="Upcoming" value={upcomingCount} tone="status-text status-text--upcoming" />
          <MetricCard label="Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} tone="text-fg" />
        </div>
      </div>
    </section>
  );
};

const MetricCard = ({
  label,
  value,
  tone
}: {
  label: string;
  value: number | string;
  tone: string;
}) => (
  <div className="rounded-2xl border border-inverse/15 bg-card/80 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={cn("text-xl font-semibold", tone)}>{value}</p>
  </div>
);


