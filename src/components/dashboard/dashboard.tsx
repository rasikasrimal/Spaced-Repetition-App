"use client";

import * as React from "react";
import Link from "next/link";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { Button } from "@/components/ui/button";
import { TimelinePanel } from "@/components/visualizations/timeline-panel";
import {
  TopicList,
  TopicListItem,
  TopicStatus,
  StatusFilter,
  SubjectFilterValue,
  NO_SUBJECT_KEY
} from "@/components/dashboard/topic-list";
import { useZonedNow } from "@/hooks/use-zoned-now";
import { CalendarClock, Flame, LucideIcon, Plus, Trophy, Info } from "lucide-react";
import { formatDateWithWeekday, formatRelativeToNow, getDayKey, isToday, startOfToday } from "@/lib/date";
import { Subject, Topic } from "@/types/topic";

interface DashboardProps {
  onCreateTopic: () => void;
  onEditTopic: (id: string) => void;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SUBJECT_FILTER_STORAGE_KEY = "dashboard-subject-filter";
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

  const [hideSubjectNudge, setHideSubjectNudge] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = React.useState<SubjectFilterValue | undefined>(
    undefined
  );

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SUBJECT_FILTER_STORAGE_KEY);
    if (!stored) {
      setSubjectFilter(null);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
        setSubjectFilter(parsed.length === 0 ? new Set<string>() : new Set<string>(parsed));
      } else {
        setSubjectFilter(null);
      }
    } catch {
      setSubjectFilter(null);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof subjectFilter === "undefined") return;
    if (subjectFilter === null) {
      window.localStorage.removeItem(SUBJECT_FILTER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SUBJECT_FILTER_STORAGE_KEY, JSON.stringify(Array.from(subjectFilter)));
    }
  }, [subjectFilter]);

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

      return {
        topic,
        subject: topic.subjectId ? subjectMap.get(topic.subjectId) ?? null : null,
        status
      } satisfies TopicListItem;
    });
  }, [topics, subjects]);

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

  const overloadWarning =
    dueCount >= 15
      ? `⚠ You have ${dueCount} reviews pending. Consider completing a few today to avoid overload later.`
      : null;

  const handleFocusDue = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      const anchor = document.getElementById("dashboard-topic-list");
      anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleSubjectFilterChange = React.useCallback((value: SubjectFilterValue) => {
    setSubjectFilter(value === null ? null : new Set<string>(value));
  }, []);

  const handleStatusFilterChange = React.useCallback((value: StatusFilter) => {
    setStatusFilter(value);
  }, []);

  return (
    <section className="flex flex-col gap-8">
      <PersonalizedReviewPlanModule
        dueCount={filteredDueCount}
        upcomingCount={filteredUpcomingCount}
        streak={streak}
        nextTopic={filteredNextTopic}
        overloadWarning={overloadWarning}
        onAddTopic={onCreateTopic}
        onFocusDue={handleFocusDue}
        onSelectDue={() => setStatusFilter("due-today")}
      />

      {!hideSubjectNudge && subjects.length === 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/5 bg-slate-900/40 p-4 text-sm text-zinc-200 shadow-lg shadow-slate-900/30">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Info className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <p className="font-medium text-white">Manage subjects and exam dates in the Subjects tab.</p>
              <p className="text-xs text-zinc-400">Organise your subjects to align topics with upcoming exams.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="rounded-full">
              <Link href="/subjects">Go to Subjects</Link>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="rounded-full text-zinc-400 hover:text-white"
              onClick={() => setHideSubjectNudge(true)}
              aria-label="Dismiss"
            >
              <span aria-hidden="true">×</span>
            </Button>
          </div>
        </div>
      ) : null}

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

      <TimelinePanel subjectFilter={resolvedSubjectFilter} />
    </section>
  );
};

const StatPill = ({
  label,
  value,
  icon: Icon,
  tone
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: string;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
    <span className={`rounded-xl bg-slate-900/60 p-2 ${tone}`}>
      <Icon className="h-5 w-5" />
    </span>
  </div>
);

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

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/50 p-6 shadow-lg shadow-slate-900/30">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Progress today</h2>
          <p className="text-sm text-zinc-300">
            {completed}/{safeTotal} reviews completed
          </p>
          <p className="text-xs text-zinc-400">Keep up the rhythm — every checkmark keeps your memory sharp.</p>
        </div>
        <div className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${safePercent}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-300">
            <span className="font-semibold text-white">{safePercent}% complete</span>
            <span className={isComplete ? "text-emerald-300" : "text-sky-300"}>
              {isComplete ? "Great work! You’ve completed today’s reviews." : "Finish today to extend your streak."}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

const PersonalizedReviewPlanModule = ({
  dueCount,
  upcomingCount,
  streak,
  nextTopic,
  overloadWarning,
  onAddTopic,
  onFocusDue,
  onSelectDue
}: {
  dueCount: number;
  upcomingCount: number;
  streak: number;
  nextTopic: Topic | null;
  overloadWarning: string | null;
  onAddTopic: () => void;
  onFocusDue: () => void;
  onSelectDue: () => void;
}) => {
  const nextRelative = nextTopic ? formatRelativeToNow(nextTopic.nextReviewDate) : null;
  const nextDateLabel = nextTopic ? formatDateWithWeekday(nextTopic.nextReviewDate) : null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-2xl shadow-slate-900/40 backdrop-blur-xl md:p-8">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 rounded-l-[3rem] bg-gradient-to-l from-accent/20 to-transparent lg:block" aria-hidden="true" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
              Personalized review plan
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white md:text-3xl">Your next five minutes matter.</h2>
              {dueCount === 0 ? (
                <p className="text-sm text-zinc-300">
                  Great work! You’ve completed today’s reviews. Here’s what’s coming next.
                </p>
              ) : (
                <p className="text-sm text-zinc-300">
                  You have <span className="font-semibold text-white">{dueCount}</span> topic
                  {dueCount === 1 ? "" : "s"} ready for review. Finish them to extend your streak.
                </p>
              )}
              {nextTopic ? (
                <p className="text-xs text-zinc-400">
                  Next up: <span className="font-semibold text-zinc-100">{nextTopic.title}</span> • {nextRelative} ({nextDateLabel})
                </p>
              ) : (
                <p className="text-xs text-zinc-400">You’re all caught up. Check back tomorrow or add a topic.</p>
              )}
            </div>
          </div>
          {overloadWarning ? (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
              {overloadWarning}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatPill label="Due today" value={dueCount} icon={Flame} tone="text-rose-200" />
            <StatPill label="Upcoming" value={upcomingCount} icon={CalendarClock} tone="text-amber-200" />
            <StatPill label="Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} icon={Trophy} tone="text-emerald-200" />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end lg:pt-2">
          <Button onClick={onAddTopic} size="lg" className="gap-2 rounded-2xl">
            <Plus className="h-4 w-4" /> Add topic
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onSelectDue();
              onFocusDue();
            }}
            disabled={dueCount === 0}
            className="gap-2 rounded-2xl border-white/25 text-white disabled:opacity-40"
          >
            <Flame className="h-4 w-4" /> Due reviews ({dueCount})
          </Button>
        </div>
      </div>
    </section>
  );
};
