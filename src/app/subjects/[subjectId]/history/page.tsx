"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, Layers, NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconPreview } from "@/components/icon-preview";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import {
  daysBetween,
  formatDateWithWeekday,
  formatFullDate,
  formatInTimeZone,
  formatRelativeToNow,
  getDayKeyInTimeZone
} from "@/lib/date";
import { ReviewQuality } from "@/types/topic";

const QUALITY_LABEL: Record<ReviewQuality, string> = {
  1: "Easy",
  0.5: "Hard",
  0: "Forgot"
};

const QUALITY_TONE: Record<ReviewQuality, string> = {
  1: "text-emerald-300",
  0.5: "text-amber-300",
  0: "text-rose-300"
};

type SubjectReview = {
  id: string;
  subjectId: string;
  topicId: string;
  topicTitle: string;
  reviewDate: string;
  intervalDays: number | null;
  quality: ReviewQuality;
  notes: string | null;
};

const resolveUrgency = (examDate: string | null | undefined) => {
  if (!examDate) {
    return {
      label: "No exam date",
      tone: "bg-zinc-800/80 text-zinc-200",
      description: "Set an exam date to unlock countdowns and exam alerts.",
      daysLeft: null
    };
  }

  const today = new Date();
  const daysLeft = daysBetween(today, examDate);

  if (daysLeft < 0) {
    return {
      label: "Exam passed",
      tone: "bg-zinc-800/80 text-zinc-200",
      description: "This exam date has passed. Plan a new milestone when you are ready.",
      daysLeft
    };
  }

  if (daysLeft <= 7) {
    return {
      label: "Urgent",
      tone: "bg-rose-500/20 text-rose-100",
      description: "Exam is around the corner. Prioritise these reviews.",
      daysLeft
    };
  }

  if (daysLeft <= 30) {
    return {
      label: "Next up",
      tone: "bg-amber-500/20 text-amber-100",
      description: "Exam is approaching. Keep momentum steady.",
      daysLeft
    };
  }

  return {
    label: "Plenty of time",
    tone: "bg-emerald-500/20 text-emerald-100",
    description: "Planned well ahead. Maintain a consistent cadence.",
    daysLeft
  };
};

interface SubjectHistoryPageProps {
  params: {
    subjectId: string;
  };
}

const SubjectHistoryPage: React.FC<SubjectHistoryPageProps> = ({ params }) => {
  const timezone = useProfileStore((state) => state.profile.timezone) || "Asia/Colombo";
  const { subject, topics } = useTopicStore((state) => ({
    subject: state.subjects.find((item) => item.id === params.subjectId) ?? null,
    topics: state.topics.filter((topic) => topic.subjectId === params.subjectId)
  }));

  const reviews = React.useMemo<SubjectReview[]>(() => {
    if (!subject) return [];

    return topics
      .flatMap((topic) =>
        (topic.events ?? [])
          .filter((event) => event.type === "reviewed")
          .map((event) => ({
            id: event.id,
            subjectId: subject.id,
            topicId: topic.id,
            topicTitle: topic.title,
            reviewDate: event.at,
            intervalDays: typeof event.intervalDays === "number" ? event.intervalDays : null,
            quality: (event.reviewQuality ?? 1) as ReviewQuality,
            notes: event.notes ?? topic.notes ?? null
          }))
      )
      .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
  }, [subject, topics]);

  if (!subject) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950/30 px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-white">Subject not found</h1>
          <p className="text-sm text-zinc-400">
            The subject you tried to open could not be located. It may have been removed or renamed.
          </p>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/subjects">Return to subjects</Link>
          </Button>
        </div>
      </main>
    );
  }

  const urgency = resolveUrgency(subject.examDate ?? null);
  const topicCount = topics.length;
  const hasReviews = reviews.length > 0;
  const groupedByDay = new Map<string, SubjectReview[]>();
  for (const review of reviews) {
    const key = getDayKeyInTimeZone(review.reviewDate, timezone);
    const bucket = groupedByDay.get(key) ?? [];
    bucket.push(review);
    groupedByDay.set(key, bucket);
  }

  const groupedEntries = Array.from(groupedByDay.entries()).sort((a, b) =>
    new Date(b[0]).getTime() - new Date(a[0]).getTime()
  );

  return (
    <main className="min-h-screen bg-slate-950/30 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-zinc-300 hover:text-white">
            <Link href="/subjects">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to subjects
            </Link>
          </Button>
          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" /> {topicCount} topic{topicCount === 1 ? "" : "s"}
          </span>
        </div>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10"
                style={{ backgroundColor: `${subject.color}22`, color: subject.color }}
                aria-hidden="true"
              >
                <IconPreview name={subject.icon} className="h-6 w-6" />
              </span>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Subject history</p>
                <h1 className="text-3xl font-semibold text-white">{subject.name}</h1>
                <p className="text-sm text-zinc-400">Chronological log of every review recorded for this subject.</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${urgency.tone}`}>
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {urgency.label}
              </span>
              <p className="text-zinc-300">
                {subject.examDate ? formatFullDate(subject.examDate) : "No exam scheduled"}
              </p>
              {typeof urgency.daysLeft === "number" ? (
                <p className="text-xs text-zinc-500">
                  {urgency.daysLeft >= 0 ? `${urgency.daysLeft} days left` : `${Math.abs(urgency.daysLeft)} days ago`}
                </p>
              ) : null}
              <p className="max-w-xs text-xs text-zinc-500 text-left sm:text-right">{urgency.description}</p>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-white/5 bg-slate-900/70 p-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Recorded reviews</p>
              <p className="text-2xl font-semibold text-white">{reviews.length}</p>
              <p className="text-xs text-zinc-500">Each entry contributes to retention projections and exam readiness.</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Topics contributing</p>
              <p className="text-2xl font-semibold text-white">{topicCount}</p>
              <p className="text-xs text-zinc-500">Aggregated across every topic linked to this subject.</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Most recent review</p>
              <p className="text-lg font-semibold text-white">
                {hasReviews ? formatDateWithWeekday(reviews[0].reviewDate) : "No reviews yet"}
              </p>
              {hasReviews ? (
                <p className="text-xs text-zinc-500">
                  {formatRelativeToNow(reviews[0].reviewDate)} • {reviews[0].topicTitle}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">Review history updates here once you log study sessions.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Review timeline</h2>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" /> Chronological order
            </div>
          </div>

          {hasReviews ? (
            <ol className="space-y-6">
              {groupedEntries.map(([day, entries]) => {
                const label = formatDateWithWeekday(`${day}T00:00:00Z`);
                return (
                  <li key={day} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      <span className="font-medium text-white">{label}</span>
                    </div>
                    <ul className="space-y-3">
                      {entries
                        .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime())
                        .map((entry) => {
                          const qualityTone = QUALITY_TONE[entry.quality];
                          return (
                            <li
                              key={entry.id}
                              className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-zinc-300"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-base font-semibold text-white">{entry.topicTitle}</p>
                                  <p className="text-xs text-zinc-500">
                                    Logged {formatRelativeToNow(entry.reviewDate)} • {formatInTimeZone(entry.reviewDate, timezone, {
                                      hour: "numeric",
                                      minute: "2-digit"
                                    })}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-xs font-semibold uppercase tracking-wide ${qualityTone}`}>
                                    {QUALITY_LABEL[entry.quality]}
                                  </span>
                                  {typeof entry.intervalDays === "number" ? (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-200">
                                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {entry.intervalDays} day interval
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {entry.notes ? (
                                <p className="mt-3 text-sm text-zinc-300">{entry.notes}</p>
                              ) : null}
                            </li>
                          );
                        })}
                    </ul>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-12 text-center">
              <CalendarDays className="h-6 w-6 text-zinc-500" aria-hidden="true" />
              <p className="text-sm font-medium text-white">No past reviews yet</p>
              <p className="max-w-sm text-xs text-zinc-500">
                Once you log study sessions for topics in this subject, they will appear here chronologically with cadence and quality details.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default SubjectHistoryPage;
