"use client";

import * as React from "react";
import Link from "next/link";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { Button } from "@/components/ui/button";
import { TimelinePanel } from "@/components/visualizations/timeline-panel";
import { TopicList, TopicListItem, TopicStatus } from "@/components/dashboard/topic-list";
import { useZonedNow } from "@/hooks/use-zoned-now";
import {
  CalendarClock,
  LineChart,
  CheckCircle2,
  Flame,
  LucideIcon,
  Plus,
  Sparkles,
  Trophy,
  Info
} from "lucide-react";
import {
  formatDateWithWeekday,
  formatRelativeToNow,
  getDayKey,
  isToday,
  startOfToday
} from "@/lib/date";
import { Subject, Topic } from "@/types/topic";

interface DashboardProps {
  onCreateTopic: () => void;
  onEditTopic: (id: string) => void;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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
    upcomingHighlights,
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
    const upcomingHighlights = byNextReview
      .filter((topic) => new Date(topic.nextReviewDate).getTime() > now)
      .slice(0, 5);

    const streak = computeStreak(topics);

    return {
      dueCount,
      upcomingCount,
      completedCount,
      totalToday,
      completionPercent,
      nextTopic: nextDueTopic,
      upcomingHighlights,
      streak
    };
  }, [topics]);

  const overloadWarning = dueCount >= 15
    ? `⚠ You have ${dueCount} reviews pending. Consider completing a few today to avoid overload later.`
    : null;

  const handleFocusDue = () => {
    window.requestAnimationFrame(() => {
      const anchor = document.getElementById("dashboard-topic-list");
      anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="flex flex-col gap-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-2xl shadow-slate-900/40 backdrop-blur-xl md:p-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 rounded-l-[3rem] bg-gradient-to-l from-accent/15 to-transparent md:block" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Personalized review plan
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-white md:text-4xl">Your next five minutes matter</h1>
              {dueCount === 0 ? (
                <p className="text-sm text-zinc-300">
                  Great work! You’ve completed today’s reviews. Here’s what’s coming next.
                </p>
              ) : (
                <p className="text-sm text-zinc-300">
                  You have <span className="font-semibold text-white">{dueCount}</span> topic
                  {dueCount === 1 ? "" : "s"} ready for review. Tackle them now to keep your streak alive.
                </p>
              )}
              {nextTopic ? (
                <p className="text-xs text-zinc-400">
                  Next up: <span className="font-semibold text-zinc-100">{nextTopic.title}</span> • {formatRelativeToNow(nextTopic.nextReviewDate)} ({formatDateWithWeekday(nextTopic.nextReviewDate)})
                </p>
              ) : null}
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

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Button onClick={onCreateTopic} size="lg" className="gap-2 rounded-2xl">
              <Plus className="h-4 w-4" /> Add topic
            </Button>
            <Button onClick={handleFocusDue} variant="outline" size="lg" className="gap-2 rounded-2xl border-white/20 text-white">
              <Flame className="h-4 w-4" /> Due reviews ({dueCount})
            </Button>
          </div>
        </div>
      </header>

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

      <div className="flex flex-col gap-6">
        <TopicList
          id="dashboard-topic-list"
          items={enrichedTopics}
          subjects={subjects}
          onEditTopic={onEditTopic}
          onCreateTopic={onCreateTopic}
          timezone={resolvedTimezone}
          zonedNow={zonedNow}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ProgressCard completionPercent={completionPercent} completed={completedCount} total={totalToday} />
          <UpcomingScheduleCard upcoming={upcomingHighlights} />
        </div>

        <TimelinePanel />
      </div>
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

const ProgressCard = ({
  completionPercent,
  completed,
  total
}: {
  completionPercent: number;
  completed: number;
  total: number;
}) => {
  const safePercent = Number.isNaN(completionPercent) ? 0 : completionPercent;
  const normalized = Math.max(0, Math.min(100, safePercent));

  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/50 p-6 shadow-lg shadow-slate-900/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Progress today</p>
          <h2 className="text-xl font-semibold text-white">
            {completed}/{total === 0 ? completed : total} reviews completed
          </h2>
          <p className="text-sm text-zinc-400">Keep up the rhythm — every checkmark keeps your memory sharp.</p>
        </div>
        <div className="flex items-center gap-6">
          <div
            className="relative h-20 w-20 rounded-full bg-slate-800"
            style={{
              backgroundImage: `conic-gradient(var(--accent) ${normalized}%, rgba(148,163,184,0.2) ${normalized}% 100%)`
            }}
          >
            <div className="absolute inset-1 flex items-center justify-center rounded-full bg-slate-950">
              <CheckCircle2 className="h-7 w-7 text-accent" />
            </div>
          </div>
          <div className="space-y-1 text-xs text-zinc-400">
            <p className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> {normalized}% complete
            </p>
            <p className="flex items-center gap-2 text-sky-300">
              <LineChart className="h-3.5 w-3.5" /> Finish today to extend your streak
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const UpcomingScheduleCard = ({ upcoming }: { upcoming: Topic[] }) => {
  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/50 p-6 shadow-lg shadow-slate-900/30">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Upcoming reviews</p>
          <h3 className="text-lg font-semibold text-white">Timeline preview</h3>
          <p className="text-xs text-zinc-400">Stay ahead by glancing at the next few scheduled sessions.</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
            Nothing scheduled yet — once you add topics, upcoming reviews appear here.
          </p>
        ) : (
          upcoming.map((topic) => (
            <div key={topic.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: topic.color }} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{topic.title}</p>
                <p className="text-xs text-zinc-400">
                  {formatDateWithWeekday(topic.nextReviewDate)} • {formatRelativeToNow(topic.nextReviewDate)}
                </p>
              </div>
              <span className="rounded-full bg-slate-900/60 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {topic.categoryLabel}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};