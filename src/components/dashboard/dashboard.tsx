"use client";

import * as React from "react";
import Link from "next/link";
import { useTopicStore } from "@/stores/topics";
import { TopicCard } from "@/components/dashboard/topic-card";
import { IconPreview } from "@/components/icon-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimelinePanel } from "@/components/visualizations/timeline-panel";
import {
  ArrowUpDown,
  CalendarClock,
  LineChart,
  CheckCircle2,
  Flame,
  ListFilter,
  LucideIcon,
  Plus,
  Search,
  Sparkles,
  Trophy,
  NotebookPen
} from "lucide-react";
import { daysBetween, formatDateWithWeekday, formatFullDate, formatRelativeToNow, getDayKey, isToday, startOfToday } from "@/lib/date";
import { Subject, Topic } from "@/types/topic";

interface DashboardProps {
  onCreateTopic: () => void;
  onEditTopic: (id: string) => void;
}

type StatusFilter = "all" | "due" | "upcoming" | "completed";
type SortOption = "next-review" | "title-asc" | "recently-reviewed" | "subject";

type SubjectInsight = {
  subject: Subject;
  topicCount: number;
  daysRemaining: number | null;
  examDate: Date | null;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const groupMeta: Record<Exclude<StatusFilter, "all">, { title: string; description: string; accent: string; icon: LucideIcon }>
  = {
    due: {
      title: "Due now",
      description: "Prioritise these topics to keep your streak alive.",
      accent: "border border-rose-400/20 bg-rose-500/10",
      icon: Flame
    },
    upcoming: {
      title: "Upcoming",
      description: "Scheduled soon — review early if you’re ahead of schedule.",
      accent: "border border-amber-400/20 bg-amber-500/10",
      icon: CalendarClock
    },
    completed: {
      title: "Completed",
      description: "Nicely done! These were reviewed today.",
      accent: "border border-emerald-400/20 bg-emerald-500/10",
      icon: CheckCircle2
    }
  };

const sortTopics = (topics: Topic[], sortOption: SortOption): Topic[] => {
  const cloned = [...topics];
  switch (sortOption) {
    case "title-asc":
      return cloned.sort((a, b) => a.title.localeCompare(b.title));
    case "recently-reviewed":
      return cloned.sort((a, b) => {
        const aReviewed = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
        const bReviewed = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
        return bReviewed - aReviewed;
      });
    case "subject":
      return cloned.sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel));
    case "next-review":
    default:
      return cloned.sort(
        (a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
      );
  }
};

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
  const { topics, categories, subjects } = useTopicStore((state) => ({
    topics: state.topics,
    categories: state.categories,
    subjects: state.subjects
  }));

  const subjectInsights = React.useMemo<SubjectInsight[]>(() => {
    const today = startOfToday();
    return subjects
      .map((subject) => {
        const subjectTopics = topics.filter((topic) => topic.subjectId === subject.id);
        const examDate = subject.examDate ? new Date(subject.examDate) : null;
        const validExam = examDate && !Number.isNaN(examDate.getTime()) ? examDate : null;
        const daysRemaining = validExam ? Math.max(0, daysBetween(today, validExam)) : null;
        return {
          subject,
          topicCount: subjectTopics.length,
          daysRemaining,
          examDate: validExam
        };
      })
      .sort((a, b) => {
        if (a.examDate && b.examDate) {
          return a.examDate.getTime() - b.examDate.getTime();
        }
        if (a.examDate) return -1;
        if (b.examDate) return 1;
        return a.subject.name.localeCompare(b.subject.name);
      });
  }, [subjects, topics]);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sortOption, setSortOption] = React.useState<SortOption>("next-review");
  const [subjectFilter, setSubjectFilter] = React.useState<Set<string>>(new Set());

  const {
    groupedTopics,
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
    const normalizedSearch = search.trim().toLowerCase();

    const sorted = sortTopics(topics, sortOption);

    const filtered = sorted.filter((topic) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        topic.title.toLowerCase().includes(normalizedSearch) ||
        topic.notes.toLowerCase().includes(normalizedSearch) ||
        topic.categoryLabel.toLowerCase().includes(normalizedSearch);
      const categoryId = topic.categoryId ?? "__uncategorised";
      const matchesCategory = subjectFilter.size === 0 || subjectFilter.has(categoryId);
      return matchesSearch && matchesCategory;
    });

    const grouped: Record<Exclude<StatusFilter, "all">, Topic[]> = {
      due: [],
      upcoming: [],
      completed: []
    };

    for (const topic of filtered) {
      const due = new Date(topic.nextReviewDate).getTime() <= now;
      const reviewedToday = topic.lastReviewedAt ? isToday(topic.lastReviewedAt) : false;
      if (due) {
        grouped.due.push(topic);
      } else if (reviewedToday) {
        grouped.completed.push(topic);
      } else {
        grouped.upcoming.push(topic);
      }
    }

    const dueCount = grouped.due.length;
    const upcomingCount = grouped.upcoming.length;
    const completedCount = grouped.completed.length;
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
      groupedTopics: grouped,
      dueCount,
      upcomingCount,
      completedCount,
      totalToday,
      completionPercent,
      nextTopic: nextDueTopic,
      upcomingHighlights,
      streak
    };
  }, [topics, search, sortOption, subjectFilter]);

  const groupsToRender = (statusFilter === "all"
    ? (["due", "upcoming", "completed"] as const)
    : ([statusFilter] as const)
  ).map((key) => ({
    key,
    topics: groupedTopics[key],
    meta: groupMeta[key]
  }));

  const handleToggleSubject = React.useCallback((id: string) => {
    setSubjectFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [setSubjectFilter]);

  const handleClearSubjects = React.useCallback(() => {
    setSubjectFilter(new Set());
  }, [setSubjectFilter]);

  const overloadWarning = dueCount >= 15
    ? `⚠ You have ${dueCount} reviews pending. Consider completing a few today to avoid overload later.`
    : null;

  const handleFocusDue = () => {
    setStatusFilter("due");
    window.requestAnimationFrame(() => {
      const anchor = document.getElementById("dashboard-section-due");
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
              <ListFilter className="h-4 w-4" /> Due reviews ({dueCount})
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)] xl:auto-rows-min">
        <div className="flex flex-col gap-6">
          <ProgressCard completionPercent={completionPercent} completed={completedCount} total={totalToday} />

          <FilterCard
            search={search}
            onSearchChange={setSearch}
            subjectFilter={subjectFilter}
            onToggleSubject={handleToggleSubject}
            onClearSubjects={handleClearSubjects}
            subjects={categories}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />

          <div className="flex flex-col gap-6">
            {topics.length === 0 ? (
              <EmptyState onCreateTopic={onCreateTopic} />
            ) : (
              groupsToRender.map(({ key, topics: collection, meta }) => (
                <TopicSection
                  key={key}
                  id={`dashboard-section-${key}`}
                  title={meta.title}
                  description={meta.description}
                  accentClass={meta.accent}
                  icon={meta.icon}
                  topics={collection}
                  onEditTopic={onEditTopic}
                />
              ))
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <SubjectManagementCard subjects={subjectInsights} />
          <UpcomingScheduleCard upcoming={upcomingHighlights} />
        </aside>
        <div className="xl:col-span-2">
          <TimelinePanel />
        </div>
      </div>
    </section>
  );
};


const SubjectManagementCard = ({ subjects }: { subjects: SubjectInsight[] }) => {
  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/50 p-5 shadow-lg shadow-slate-900/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-accent sm:flex">
            <NotebookPen className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Subject management</p>
            <h2 className="text-lg font-semibold text-white">Keep subjects exam-ready</h2>
            <p className="text-xs text-zinc-400">Review exam timelines and topic counts at a glance.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full border-white/20 text-xs text-white">
          <Link href="/subjects">Manage</Link>
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {subjects.length === 0 ? (
          <p className="text-xs text-zinc-500">Add a subject to start organising your topics.</p>
        ) : (
          subjects.map(({ subject, topicCount, daysRemaining, examDate }) => (
            <div
              key={subject.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${subject.color}1f` }}
                >
                  <IconPreview name={subject.icon} className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{subject.name}</p>
                  <p className="text-xs text-zinc-400">{topicCount} topic{topicCount === 1 ? "" : "s"}</p>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-400">
                {examDate ? (
                  <>
                    <p className="text-amber-100">Exam {formatFullDate(examDate.toISOString())}</p>
                    <p>
                      {daysRemaining === 0
                        ? "Exam today"
                        : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`}
                    </p>
                  </>
                ) : (
                  <p>No exam date</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
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

const FilterCard = ({
  search,
  onSearchChange,
  subjectFilter,
  onToggleSubject,
  onClearSubjects,
  subjects,
  statusFilter,
  onStatusChange,
  sortOption,
  onSortChange
}: {
  search: string;
  onSearchChange: (value: string) => void;
  subjectFilter: Set<string>;
  onToggleSubject: (id: string) => void;
  onClearSubjects: () => void;
  subjects: { id: string; label: string; color: string }[];
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
}) => {
  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-5 shadow-inner shadow-slate-900/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2">
          <Search className="h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by topic, note, or subject"
            className="h-10 border-none bg-transparent text-sm text-white placeholder:text-zinc-500 focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-slate-900/60 p-1">
            {(["all", "due", "upcoming", "completed"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onStatusChange(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === value
                    ? "bg-accent text-accent-foreground"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {value === "all" ? "All" : value === "due" ? "Due" : value === "upcoming" ? "Upcoming" : "Completed"}
              </button>
            ))}
          </div>
          <Select value={sortOption} onValueChange={(value: SortOption) => onSortChange(value)}>
            <SelectTrigger className="h-10 rounded-xl border-white/10 bg-slate-900/60 text-sm text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl backdrop-blur">
              <SelectItem value="next-review">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Next review
                </div>
              </SelectItem>
              <SelectItem value="title-asc">Topic name (A-Z)</SelectItem>
              <SelectItem value="recently-reviewed">Recently reviewed</SelectItem>
              <SelectItem value="subject">Subject</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {subjects.map((subject) => {
          const active = subjectFilter.has(subject.id);
          return (
            <button
              type="button"
              key={subject.id}
              onClick={() => onToggleSubject(subject.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                active
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/10 bg-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
              {subject.label}
            </button>
          );
        })}
        {subjectFilter.size > 0 ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-xs text-zinc-400 hover:text-white"
            onClick={onClearSubjects}
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
};

const TopicSection = ({
  id,
  title,
  description,
  accentClass,
  icon: Icon,
  topics,
  onEditTopic
}: {
  id: string;
  title: string;
  description: string;
  accentClass: string;
  icon: LucideIcon;
  topics: Topic[];
  onEditTopic: (id: string) => void;
}) => {
  if (topics.length === 0) {
    return null;
  }

  return (
    <section id={id} className="space-y-4">
      <header className={`flex flex-col gap-2 rounded-3xl ${accentClass} px-5 py-4 text-sm text-zinc-100 md:flex-row md:items-center md:justify-between`}>
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-slate-900/60 p-2">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-xs text-zinc-200/80">{description}</p>
          </div>
        </div>
        <p className="text-xs text-zinc-200/80">{topics.length} topic{topics.length === 1 ? "" : "s"}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} onEdit={() => onEditTopic(topic.id)} />
        ))}
      </div>
    </section>
  );
};

const EmptyState = ({ onCreateTopic }: { onCreateTopic: () => void }) => (
  <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
    <div className="max-w-sm space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-accent">
        <Sparkles className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-semibold text-white">Create your first topic</h2>
      <p className="text-sm text-zinc-300">
        Add notes, icons, intervals, and reminders to stay on top of the subjects that matter most to you.
      </p>
      <Button onClick={onCreateTopic} className="gap-2 rounded-2xl">
        <Plus className="h-4 w-4" /> New topic
      </Button>
    </div>
  </div>
);

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


