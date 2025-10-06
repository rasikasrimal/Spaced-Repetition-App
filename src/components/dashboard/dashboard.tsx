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
import { FALLBACK_SUBJECT_COLOR } from "@/lib/colors";

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
    <section className="flex flex-col gap-10">
      <DashboardSummaryCard
        dueCount={filteredDueCount}
        upcomingCount={filteredUpcomingCount}
        streak={streak}
        nextTopic={filteredNextTopic}
        completed={completedCount}
        total={totalToday}
        completionPercent={completionPercent}
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
    </section>
  );
};

const DashboardSummaryCard = ({
  dueCount,
  upcomingCount,
  streak,
  nextTopic,
  completed,
  total,
  completionPercent
}: {
  dueCount: number;
  upcomingCount: number;
  streak: number;
  nextTopic: Topic | null;
  completed: number;
  total: number;
  completionPercent: number;
}) => {
  const nextRelative = nextTopic ? formatRelativeToNow(nextTopic.nextReviewDate) : null;
  const nextDateLabel = nextTopic ? formatDateWithWeekday(nextTopic.nextReviewDate) : null;
  const dueLine =
    dueCount === 0
      ? "You’re all caught up. Check back tomorrow or add a topic."
      : `You have ${dueCount} topic${dueCount === 1 ? "" : "s"} ready for review. Finish them to extend your streak.`;
  const nextLine = nextTopic
    ? `Next up: ${nextTopic.title} • ${nextRelative} (${nextDateLabel})`
    : "Next up: Add a topic to plan your next review.";

  const safeCompletionPercent = Number.isFinite(completionPercent)
    ? Math.max(0, Math.min(100, completionPercent))
    : 0;
  const hasPlannedReviews = total > 0;
  const progressRatio = hasPlannedReviews ? `${completed} / ${total}` : `${completed}`;
  const progressSummary = hasPlannedReviews
    ? `${progressRatio} (${safeCompletionPercent}% complete)`
    : `${progressRatio} completed`;
  const progressMessage = hasPlannedReviews
    ? safeCompletionPercent >= 100
      ? "All reviews complete — stellar focus!"
      : "Keep going to finish today’s queue!"
    : "Plan a review to keep your streak alive.";

  const metricCards: Array<{
    label: string;
    value: string;
    icon: string;
    valueClass: string;
    iconClass: string;
  }> = [
    {
      label: "Due Today",
      value: String(dueCount),
      icon: "📚",
      valueClass: "status-text status-text--overdue",
      iconClass: "status-text status-text--overdue"
    },
    {
      label: "Upcoming",
      value: String(upcomingCount),
      icon: "⏳",
      valueClass: "status-text status-text--upcoming",
      iconClass: "status-text status-text--upcoming"
    },
    {
      label: "Streak",
      value: `${streak} day${streak === 1 ? "" : "s"}`,
      icon: "🔥",
      valueClass: "text-accent",
      iconClass: "text-accent"
    },
    {
      label: "Progress",
      value: progressSummary,
      icon: "📈",
      valueClass: "text-success",
      iconClass: "text-success"
    }
  ];

  return (
    <section
      className="dashboard-summary-card relative overflow-hidden rounded-3xl border border-inverse/10 bg-card/70 bg-gradient-to-br from-bg/80 via-card/70 to-bg/80 p-6 shadow-sm transition-colors md:p-8"
      style={{ "--card-accent": FALLBACK_SUBJECT_COLOR } as React.CSSProperties}
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
        <div className="space-y-4 lg:max-w-xl">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">🗓️ Today’s Tasks</p>
            <h2 className="text-2xl font-semibold text-fg">Personalized Review Plan</h2>
            <p className="text-sm text-muted-foreground">
              <span aria-hidden="true" className="mr-1">💡</span>Your next five minutes matter.
            </p>
            <p className="text-sm text-muted-foreground">{dueLine}</p>
            <p className="text-xs text-muted-foreground" title={nextTopic ? nextTopic.nextReviewDate : undefined}>
              {nextLine}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-3xl font-semibold text-accent">{safeCompletionPercent}%</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <span aria-hidden="true">🔥</span>
            <span className="font-medium text-fg">{streak} day{streak === 1 ? "" : "s"} streak</span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.label}
            {...metric}
            title={
              metric.label === "Progress"
                ? `Progress today: ${completed} of ${total} completed`
                : undefined
            }
          />
        ))}
      </div>

      <div
        className="mt-8 space-y-3 rounded-2xl border border-inverse/10 bg-card/60 p-4 transition-colors hover:border-accent/40"
        title={`Progress today: ${completed} of ${total} completed`}
      >
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span aria-hidden="true">📈</span>
          <span>
            {safeCompletionPercent}% complete — {progressMessage}
          </span>
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${safeCompletionPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
};

const MetricCard = ({
  label,
  value,
  icon,
  valueClass,
  iconClass,
  title
}: {
  label: string;
  value: string;
  icon: string;
  valueClass: string;
  iconClass: string;
  title?: string;
}) => (
  <div
    className="group rounded-2xl border border-inverse/15 bg-card/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/80 hover:shadow-sm hover:shadow-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    tabIndex={0}
    role="group"
    aria-label={`${label}: ${value}`}
    title={title}
  >
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn("text-lg transition-transform duration-300 group-hover:scale-105", iconClass)}
      >
        {icon}
      </span>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
    <p className={cn("mt-2 text-lg font-semibold", valueClass)}>{value}</p>
  </div>
);
