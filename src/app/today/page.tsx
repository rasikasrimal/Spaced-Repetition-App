"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  FastForward,
  RefreshCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTopicStore } from "@/stores/topics";
import { useTodayStore, TodayDifficulty } from "@/stores/today";
import { useProfileStore } from "@/stores/profile";
import { useZonedNow } from "@/hooks/use-zoned-now";
import {
  formatDateWithWeekday,
  formatRelativeToNow,
  getDayKeyInTimeZone
} from "@/lib/date";
import { computeRetrievability } from "@/lib/forgetting-curve";
import { cn } from "@/lib/utils";
import type { Topic, Subject } from "@/types/topic";
import { FALLBACK_SUBJECT_COLOR } from "@/lib/colors";

import { DifficultyDialog } from "./today-difficulty-dialog";

const RETENTION_WARN_THRESHOLD = 80;
const RETENTION_CAUTION_THRESHOLD = 50;

const DIFFICULTY_LABELS: Record<TodayDifficulty, string> = {
  EASY: "Easy",
  NORMAL: "Normal",
  HARD: "Hard"
};

const DIFFICULTY_MULTIPLIER: Record<TodayDifficulty, number> = {
  EASY: 1.4,
  NORMAL: 1,
  HARD: 1 / 1.3
};

type QueueItem = {
  topic: Topic;
  subject: Subject | null;
  retention: number;
  retentionPercent: number;
  due: boolean;
  nextReviewTime: number;
  anchorDate: Date;
};

const MIN_VISIBLE_COUNT = 5;

const getSubjectColor = (subject: Subject | null) => subject?.color ?? FALLBACK_SUBJECT_COLOR;

const getRetentionTone = (value: number) => {
  if (value >= RETENTION_WARN_THRESHOLD) {
    return "text-success";
  }
  if (value >= RETENTION_CAUTION_THRESHOLD) {
    return "text-warn";
  }
  return "text-error";
};

const getRetentionBar = (value: number) => {
  if (value >= RETENTION_WARN_THRESHOLD) {
    return "bg-success/40";
  }
  if (value >= RETENTION_CAUTION_THRESHOLD) {
    return "bg-warn/40";
  }
  return "bg-error/40";
};

export default function TodayPage() {
  const router = useRouter();
  const { topics, subjects, markReviewed, skipTopic, adjustNextReviewByMultiplier } = useTopicStore((state) => ({
    topics: state.topics,
    subjects: state.subjects,
    markReviewed: state.markReviewed,
    skipTopic: state.skipTopic,
    adjustNextReviewByMultiplier: state.adjustNextReviewByMultiplier
  }));
  const timezone = useProfileStore((state) => state.profile.timezone) || "Asia/Colombo";
  const zonedNow = useZonedNow(timezone);
  const dayKey = React.useMemo(() => getDayKeyInTimeZone(zonedNow.toISOString(), timezone), [zonedNow, timezone]);

  const queue = React.useMemo<QueueItem[]>(() => {
    const nowTime = zonedNow.getTime();
    const subjectMap = new Map<string, Subject>();
    for (const subject of subjects) {
      subjectMap.set(subject.id, subject);
    }

    const due: QueueItem[] = [];
    const upcoming: QueueItem[] = [];

    for (const topic of topics) {
      const next = new Date(topic.nextReviewDate);
      const nextTime = next.getTime();
      const anchorIso = topic.lastReviewedAt || topic.startedAt || topic.createdAt;
      const anchorDate = anchorIso ? new Date(anchorIso) : new Date(topic.createdAt);
      const retention = computeRetrievability(
        topic.stability,
        Math.max(0, zonedNow.getTime() - anchorDate.getTime())
      );
      const item: QueueItem = {
        topic,
        subject: topic.subjectId ? subjectMap.get(topic.subjectId) ?? null : null,
        retention,
        retentionPercent: Math.round(retention * 100),
        due: Number.isFinite(nextTime) ? nextTime <= nowTime : false,
        nextReviewTime: Number.isFinite(nextTime) ? nextTime : Number.POSITIVE_INFINITY,
        anchorDate
      };

      if (item.due) {
        due.push(item);
      } else {
        upcoming.push(item);
      }
    }

    const byRetention = (a: QueueItem, b: QueueItem) => {
      if (a.retention !== b.retention) {
        return a.retention - b.retention;
      }
      return a.nextReviewTime - b.nextReviewTime;
    };

    due.sort(byRetention);
    upcoming.sort(byRetention);

    return [...due, ...upcoming];
  }, [subjects, topics, zonedNow]);

  const {
    topicIds,
    visibleCount,
    completedToday,
    difficultyByTopic,
    ensureSession,
    setQueue,
    syncQueue,
    loadMore,
    markCompleted,
    markDifficulty,
    resetSession
  } = useTodayStore((state) => ({
    topicIds: state.topicIds,
    visibleCount: state.visibleCount,
    completedToday: state.completedToday,
    difficultyByTopic: state.difficultyByTopic,
    ensureSession: state.ensureSession,
    setQueue: state.setQueue,
    syncQueue: state.syncQueue,
    loadMore: state.loadMore,
    markCompleted: state.markCompleted,
    markDifficulty: state.markDifficulty,
    resetSession: state.resetSession
  }));

  React.useEffect(() => {
    ensureSession(dayKey);
  }, [dayKey, ensureSession]);

  React.useEffect(() => {
    const ids = queue.map((item) => item.topic.id);
    setQueue(ids);
    syncQueue(ids);
  }, [queue, setQueue, syncQueue]);

  const availableIds = React.useMemo(
    () => topicIds.filter((id) => !completedToday.includes(id)),
    [topicIds, completedToday]
  );
  const visibleIds = React.useMemo(
    () => availableIds.slice(0, visibleCount || MIN_VISIBLE_COUNT),
    [availableIds, visibleCount]
  );

  const visibleItems = React.useMemo(
    () =>
      visibleIds
        .map((id) => queue.find((item) => item.topic.id === id))
        .filter((item): item is QueueItem => Boolean(item)),
    [queue, visibleIds]
  );

  const totalCount = queue.length;
  const completedCount = React.useMemo(
    () => completedToday.filter((id) => queue.some((item) => item.topic.id === id)).length,
    [completedToday, queue]
  );
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const totalForProgress = totalCount === 0 ? MIN_VISIBLE_COUNT : Math.max(totalCount, visibleItems.length);
  const hasMore = availableIds.length > visibleItems.length;

  const [activeAction, setActiveAction] = React.useState<{
    item: QueueItem;
    type: "revise" | "skip";
  } | null>(null);
  const actionSourceRef = React.useRef<HTMLElement | null>(null);

  const rowRefs = React.useRef<(HTMLTableRowElement | null)[]>([]);
  rowRefs.current.length = visibleItems.length;

  const handleOpenAction = React.useCallback(
    (item: QueueItem, type: "revise" | "skip", source?: HTMLElement | null) => {
      actionSourceRef.current = source ?? null;
      setActiveAction({ item, type });
    },
    []
  );

  const handleCloseDialog = React.useCallback(() => {
    setActiveAction(null);
  }, []);

  const handleSelectDifficulty = React.useCallback(
    (choice: TodayDifficulty) => {
      if (!activeAction) return;

      const { item, type } = activeAction;
      const multiplier = DIFFICULTY_MULTIPLIER[choice];
      let success = true;

      if (type === "revise") {
        success = markReviewed(item.topic.id, {
          adjustFuture: true,
          quality: choice === "HARD" ? 0.5 : 1
        });
        if (!success) {
          setActiveAction(null);
          return;
        }
        if (multiplier !== 1) {
          adjustNextReviewByMultiplier(item.topic.id, multiplier);
        }
      } else {
        skipTopic(item.topic.id);
        if (multiplier !== 1) {
          adjustNextReviewByMultiplier(item.topic.id, multiplier, { referenceDate: new Date() });
        }
      }

      markDifficulty(item.topic.id, choice);
      markCompleted(item.topic.id);
      setActiveAction(null);
    },
    [activeAction, adjustNextReviewByMultiplier, markCompleted, markDifficulty, markReviewed, skipTopic]
  );

  const handleRowKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, index: number, item: QueueItem) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextRef = rowRefs.current[index + 1];
        nextRef?.focus();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevRef = rowRefs.current[index - 1];
        prevRef?.focus();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        handleOpenAction(item, "revise", event.currentTarget);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.currentTarget.blur();
      }
    },
    [handleOpenAction]
  );

  const handleReload = React.useCallback(() => {
    resetSession(dayKey);
    syncQueue(queue.map((item) => item.topic.id));
  }, [dayKey, queue, resetSession, syncQueue]);

  const handleBackToDashboard = React.useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <section className="space-y-8 py-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Today&apos;s Focus
          </p>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-accent" aria-hidden="true" />
            <h1 className="text-3xl font-semibold text-fg">Study Today</h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Smart recommendations based on your retention decay. We surface the topics that need your attention right now, so you can dive in without planning.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={handleReload}
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" /> Reload suggestions
        </Button>
      </header>

      <div className="overflow-hidden rounded-3xl border border-inverse/10 bg-card/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-6 py-4 text-sm font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-2 uppercase tracking-wide">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Today&apos;s queue
          </span>
          <span>
            Showing {visibleItems.length} of {totalCount} topics
          </span>
        </div>
        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-lg font-semibold text-fg">You&apos;re caught up for now! 🎉</p>
            <p className="max-w-md text-sm text-muted-foreground">
              We&apos;ll cue new recommendations as soon as your retention slips. Until then, explore your dashboard or revisit favourite topics.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/20 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3">Topic</th>
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Retention %</th>
                <th className="px-6 py-3">Difficulty</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item, index) => {
                const difficulty = difficultyByTopic[item.topic.id] ?? "NORMAL";
                const retentionTone = getRetentionTone(item.retentionPercent);
                const retentionBar = getRetentionBar(item.retentionPercent);
                const lastReviewedLabel = item.topic.lastReviewedAt
                  ? `Last reviewed ${formatRelativeToNow(item.topic.lastReviewedAt)}`
                  : "Not reviewed yet";
                const nextRelative = Number.isFinite(item.nextReviewTime)
                  ? formatRelativeToNow(item.topic.nextReviewDate)
                  : "No schedule";
                const subjectColor = getSubjectColor(item.subject);

                return (
                  <tr
                    key={item.topic.id}
                    ref={(node) => {
                      rowRefs.current[index] = node;
                    }}
                    tabIndex={0}
                    onKeyDown={(event) => handleRowKeyDown(event, index, item)}
                    onClick={(event) => handleOpenAction(item, "revise", event.currentTarget as HTMLElement)}
                    className={cn(
                      "group relative cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                      index > 0 ? "border-t border-border/50" : ""
                    )}
                    style={{ animation: `todayRowIn 0.4s ease ${index * 0.04}s both` }}
                  >
                    <td className="relative px-6 py-5">
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-base font-semibold text-fg" title={item.topic.title}>
                          {item.topic.title}
                        </span>
                        <span className="text-xs text-muted-foreground">{lastReviewedLabel}</span>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                          Next review {nextRelative} · {formatDateWithWeekday(item.topic.nextReviewDate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/30 px-3 py-1 text-xs font-medium text-fg">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: subjectColor }}
                          aria-hidden="true"
                        />
                        {item.subject?.name ?? "No subject"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3" title={`Next review ${nextRelative}`}>
                        <div className="relative h-2 w-24 overflow-hidden rounded-full bg-muted/40">
                          <div
                            className={cn("absolute inset-y-0 left-0 rounded-full transition-all", retentionBar)}
                            style={{ width: `${Math.min(Math.max(item.retentionPercent, 6), 100)}%` }}
                            aria-hidden="true"
                          />
                        </div>
                        <span className={cn("text-sm font-semibold", retentionTone)}>
                          {item.retentionPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                          difficulty === "EASY"
                            ? "bg-success/10 text-success"
                            : difficulty === "HARD"
                            ? "bg-error/10 text-error"
                            : "bg-muted/40 text-muted-foreground"
                        )}
                      >
                        {DIFFICULTY_LABELS[difficulty]}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="rounded-full border border-transparent transition hover:border-success/40 hover:bg-success/10 hover:text-success"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenAction(item, "revise", event.currentTarget as HTMLElement);
                          }}
                          aria-label={`Mark ${item.topic.title} as revised`}
                          title="Revise now"
                        >
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="rounded-full border border-transparent transition hover:border-warn/40 hover:bg-warn/10 hover:text-warn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenAction(item, "skip", event.currentTarget as HTMLElement);
                          }}
                          aria-label={`Skip ${item.topic.title} for today`}
                          title="Skip for tomorrow"
                        >
                          <FastForward className="h-5 w-5" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {hasMore ? (
          <div className="border-t border-border/60 bg-muted/20 px-6 py-4 text-right">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => loadMore()}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </div>

      <footer className="flex flex-col gap-4 rounded-3xl border border-inverse/10 bg-card/70 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-sm font-semibold text-fg">
            📘 {completedCount} / {totalForProgress} topics completed today
          </p>
          <p className="text-xs text-muted-foreground">
            Keep it up — your memory is strengthening!
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
        <Button type="button" variant="ghost" className="self-start rounded-full md:self-auto" onClick={handleBackToDashboard}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
        </Button>
      </footer>

      <DifficultyDialog
        open={Boolean(activeAction)}
        mode={activeAction?.type ?? "revise"}
        topicTitle={activeAction?.item.topic.title ?? ""}
        onClose={handleCloseDialog}
        onSelect={handleSelectDifficulty}
        returnFocusRef={actionSourceRef}
      />
    </section>
  );
}

