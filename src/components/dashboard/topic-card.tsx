"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconPreview } from "@/components/icon-preview";
import { Button } from "@/components/ui/button";
import { QuickRevisionDialog } from "@/components/dashboard/quick-revision-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { AutoAdjustPreference, Subject, Topic } from "@/types/topic";
import {
  formatDateWithWeekday,
  formatFullDate,
  formatInTimeZone,
  formatRelativeToNow,
  formatTime,
  getDayKeyInTimeZone,
  isDueToday,
  isToday,
  nextStartOfDayInTimeZone,
  nowInTimeZone
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { FALLBACK_SUBJECT_COLOR } from "@/lib/colors";
import { REMINDER_TIME_OPTIONS, REVISE_LOCKED_MESSAGE } from "@/lib/constants";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock8,
  Flame,
  PenLine,
  RefreshCw,
  SkipForward,
  Sparkles,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

interface TopicCardProps {
  topic: Topic;
  onEdit: () => void;
}

type ReminderValue = string | "custom" | "none";

const reminderOptions = REMINDER_TIME_OPTIONS.filter((option) => option.value !== "custom");

const autoAdjustLabels: Record<AutoAdjustPreference, string> = {
  always: "Always adjust automatically",
  never: "Never adjust automatically",
  ask: "Ask every time"
};

export const TopicCard: React.FC<TopicCardProps> = ({ topic, onEdit }) => {
  const { markReviewed, deleteTopic, updateTopic, skipTopic, setAutoAdjustPreference, subjects, trackReviseNowBlocked } =
    useTopicStore(
    (state) => ({
      markReviewed: state.markReviewed,
      deleteTopic: state.deleteTopic,
      updateTopic: state.updateTopic,
      skipTopic: state.skipTopic,
      setAutoAdjustPreference: state.setAutoAdjustPreference,
      subjects: state.subjects,
      trackReviseNowBlocked: state.trackReviseNowBlocked
    })
  );

  const timezone = useProfileStore((state) => state.profile.timezone);
  const resolvedTimezone = timezone || "Asia/Colombo";

  const subject: Subject | null = React.useMemo(
    () => subjects.find((item) => item.id === topic.subjectId) ?? null,
    [subjects, topic.subjectId]
  );

  const identityIcon = subject?.icon ?? "Sparkles";
  const identityColor = subject?.color ?? FALLBACK_SUBJECT_COLOR;

  const [notesValue, setNotesValue] = React.useState(topic.notes ?? "");
  const [reminderValue, setReminderValue] = React.useState<ReminderValue>(() => {
    if (!topic.reminderTime) return "none";
    const preset = reminderOptions.find((option) => option.value === topic.reminderTime);
    return preset ? preset.value : "custom";
  });
  const [customTime, setCustomTime] = React.useState(topic.reminderTime ?? "09:00");
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  const [isSavingReminder, setIsSavingReminder] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = React.useState(false);
  const [showAdjustPrompt, setShowAdjustPrompt] = React.useState(false);
  const [showQuickRevision, setShowQuickRevision] = React.useState(false);
  const revisionTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [isLoggingRevision, setIsLoggingRevision] = React.useState(false);

  const due = isDueToday(topic.nextReviewDate);
  const reviewedToday = topic.lastReviewedAt ? isToday(topic.lastReviewedAt) : false;
  const totalIntervals = Math.max(topic.intervals.length, 1);
  const clampedIndex = Math.min(topic.intervalIndex, totalIntervals - 1);
  const progress = Math.round(((clampedIndex + (reviewedToday ? 1 : 0)) / totalIntervals) * 100);
  const examDateLabel = subject?.examDate ? formatFullDate(subject.examDate) : null;
  const autoAdjustPreference = topic.autoAdjustPreference ?? "ask";
  const [zonedNow, setZonedNow] = React.useState(() => nowInTimeZone(resolvedTimezone));
  const pendingReviewSource = React.useRef<"revise-now" | undefined>();

  const todayKey = React.useMemo(
    () => getDayKeyInTimeZone(zonedNow, resolvedTimezone),
    [zonedNow, resolvedTimezone]
  );
  const lastReviseKey = React.useMemo(
    () =>
      topic.reviseNowLastUsedAt
        ? getDayKeyInTimeZone(topic.reviseNowLastUsedAt, resolvedTimezone)
        : null,
    [topic.reviseNowLastUsedAt, resolvedTimezone]
  );
  const hasUsedReviseToday = !due && lastReviseKey === todayKey;
  const nextAvailability = React.useMemo(
    () => (hasUsedReviseToday ? nextStartOfDayInTimeZone(resolvedTimezone, zonedNow) : null),
    [hasUsedReviseToday, resolvedTimezone, zonedNow]
  );
  const nextAvailabilityMessage = REVISE_LOCKED_MESSAGE;
  const nextAvailabilitySubtext = nextAvailability
    ? `Available again after midnight (${formatInTimeZone(nextAvailability, resolvedTimezone, {
        month: "short",
        day: "numeric",
        timeZoneName: "short"
      })})`
    : null;

  React.useEffect(() => {
    setNotesValue(topic.notes ?? "");
  }, [topic.notes, topic.id]);

  React.useEffect(() => {
    let timer: number | undefined;

    const syncNow = () => setZonedNow(nowInTimeZone(resolvedTimezone));
    const scheduleRefresh = () => {
      const current = nowInTimeZone(resolvedTimezone);
      const nextMidnight = nextStartOfDayInTimeZone(resolvedTimezone, current);
      const delay = Math.max(60_000, nextMidnight.getTime() - current.getTime() + 1_000);
      timer = window.setTimeout(() => {
        syncNow();
        scheduleRefresh();
      }, delay);
    };

    syncNow();
    scheduleRefresh();

    const handleVisibility = () => {
      if (!document.hidden) {
        syncNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (typeof timer !== "undefined") {
        window.clearTimeout(timer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [resolvedTimezone]);

  React.useEffect(() => {
    if (!topic.reminderTime) {
      setReminderValue("none");
      return;
    }
    const preset = reminderOptions.find((option) => option.value === topic.reminderTime);
    if (!preset) {
      setReminderValue("custom");
      setCustomTime(topic.reminderTime);
      return;
    }
    setReminderValue(preset.value);
  }, [topic.reminderTime, topic.id]);

  const buildPayload = React.useCallback(
    (overrides: Partial<Omit<Topic, "id" | "events">>) => ({
      title: overrides.title ?? topic.title,
      notes: overrides.notes ?? topic.notes ?? "",
      subjectId: overrides.subjectId ?? topic.subjectId ?? null,
      subjectLabel: overrides.subjectLabel ?? topic.subjectLabel,
      categoryId: overrides.categoryId ?? topic.categoryId,
      categoryLabel: overrides.categoryLabel ?? topic.categoryLabel,
      reminderTime: overrides.reminderTime ?? topic.reminderTime,
      intervals: overrides.intervals ?? topic.intervals,
      autoAdjustPreference: overrides.autoAdjustPreference ?? topic.autoAdjustPreference ?? autoAdjustPreference,
      startedOn: overrides.startedOn ?? topic.startedOn ?? topic.startedAt ?? null,
      lastReviewedOn: overrides.lastReviewedOn ?? topic.lastReviewedOn ?? topic.lastReviewedAt ?? null
    }),
    [topic, autoAdjustPreference]
  );

  const endSavingState = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    window.setTimeout(() => setter(false), 420);
  };

  const handleNotesBlur = () => {
    const trimmed = notesValue.trim();
    if (trimmed === (topic.notes ?? "")) return;
    setIsSavingNotes(true);
    updateTopic(topic.id, buildPayload({ notes: trimmed }));
    toast.success("Notes updated");
    endSavingState(setIsSavingNotes);
  };

  const handleReminderChange = (value: ReminderValue) => {
    setReminderValue(value);
    if (value === "none") {
      setIsSavingReminder(true);
      updateTopic(topic.id, buildPayload({ reminderTime: null }));
      toast("Reminders disabled", { description: `${topic.title} will no longer send reminders.` });
      endSavingState(setIsSavingReminder);
      return;
    }
    if (value !== "custom") {
      setIsSavingReminder(true);
      updateTopic(topic.id, buildPayload({ reminderTime: value }));
      toast.success("Reminder time updated");
      endSavingState(setIsSavingReminder);
    }
  };

  const handleCustomTimeCommit = () => {
    if (!customTime) return;
    setIsSavingReminder(true);
    updateTopic(topic.id, buildPayload({ reminderTime: customTime }));
    toast.success("Custom reminder saved");
    endSavingState(setIsSavingReminder);
  };

  const handleMarkReviewed = (adjustFuture?: boolean, source?: "revise-now"): boolean => {
    const nowIso = new Date().toISOString();
    const scheduledTime = new Date(topic.nextReviewDate).getTime();
    const nowTime = Date.now();
    const isEarly = nowTime < scheduledTime && !due;

    if (isEarly && typeof adjustFuture === "undefined") {
      if (autoAdjustPreference === "ask") {
        pendingReviewSource.current = source;
        setShowAdjustPrompt(true);
        return false;
      }
      const shouldAdjust = autoAdjustPreference === "always";
      const success = markReviewed(topic.id, {
        reviewedAt: nowIso,
        adjustFuture: shouldAdjust,
        source,
        timeZone: resolvedTimezone
      });
      if (success) {
        toast.success(source === "revise-now" ? "Logged today’s revision" : "Review recorded early");
        return true;
      } else if (source === "revise-now") {
        toast.error(REVISE_LOCKED_MESSAGE);
      }
      return false;
    }

    const success = markReviewed(topic.id, {
      reviewedAt: nowIso,
      adjustFuture,
      source,
      timeZone: resolvedTimezone
    });

    if (!success) {
      if (source === "revise-now") {
        toast.error(REVISE_LOCKED_MESSAGE);
      }
      return false;
    }

    if (source === "revise-now") {
      toast.success("Logged today’s revision");
    } else if (isEarly) {
      toast.success("Review recorded early");
    } else {
      toast.success("Great job! Schedule updated.");
    }

    return true;
  };

  const handleReviseNow = (event?: React.MouseEvent<HTMLButtonElement>) => {
    if (hasUsedReviseToday) {
      trackReviseNowBlocked();
      toast.error(REVISE_LOCKED_MESSAGE);
      return;
    }
    setShowDeleteConfirm(false);
    setShowSkipConfirm(false);
    setShowAdjustPrompt(false);
    revisionTriggerRef.current = event?.currentTarget ?? null;
    setShowQuickRevision(true);
  };

  const handleConfirmQuickRevision = () => {
    setIsLoggingRevision(true);
    try {
      const success = handleMarkReviewed(false, "revise-now");
      if (success) {
        setShowQuickRevision(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not record that revision. Please try again once you're back online.");
    } finally {
      setIsLoggingRevision(false);
    }
  };

  const handleCloseQuickRevision = () => {
    setShowQuickRevision(false);
  };

  const dismissAdjustPrompt = () => {
    pendingReviewSource.current = undefined;
    setShowAdjustPrompt(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleSkipToday = () => {
    setShowSkipConfirm(true);
  };

  const confirmDelete = () => {
    deleteTopic(topic.id);
    toast("Topic removed", { description: `${topic.title} has been archived.` });
    setShowDeleteConfirm(false);
  };

  const confirmSkip = () => {
    skipTopic(topic.id);
    toast("Skip noted", {
      description:
        "Skipped today. Your upcoming sessions have been adjusted — but don’t worry, we’ll keep you on track before your exam."
    });
    setShowSkipConfirm(false);
  };

  const currentStatus = due ? "due" : reviewedToday ? "completed" : "upcoming";

  const statusStyles: Record<"due" | "upcoming" | "completed", {
    label: string;
    helper: string;
    className: string;
    icon: React.ReactNode;
  }> = {
    due: {
      label: "Due now",
      helper: `${formatRelativeToNow(topic.nextReviewDate)} • ${formatDateWithWeekday(topic.nextReviewDate)}`,
      className: "border border-error/20 bg-error/15 text-error/20",
      icon: <Flame className="h-4 w-4" />
    },
    upcoming: {
      label: "Upcoming",
      helper: `${formatRelativeToNow(topic.nextReviewDate)} • ${formatDateWithWeekday(topic.nextReviewDate)}`,
      className: "border border-accent/20 bg-accent/15 text-accent/20",
      icon: <CalendarClock className="h-4 w-4" />
    },
    completed: {
      label: "Completed",
      helper: `Reviewed today • Next ${formatDateWithWeekday(topic.nextReviewDate)}`,
      className: "border border-success/20 bg-success/15 text-success/20",
      icon: <CheckCircle2 className="h-4 w-4" />
    }
  };

  const currentInterval =
    topic.intervals[Math.min(topic.intervalIndex, topic.intervals.length - 1)] ?? topic.intervals.at(-1) ?? 1;

  const handlePreferenceChange = (value: AutoAdjustPreference) => {
    setAutoAdjustPreference(topic.id, value);
    updateTopic(topic.id, buildPayload({ autoAdjustPreference: value }));
    toast.success("Auto-adjust preference saved");
  };

  const ReminderStatus = () => (
    <div className="flex flex-col gap-1 rounded-2xl border border-inverse/10 bg-card/50 p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock8 className="h-3.5 w-3.5" /> Interval
        </span>
        <span className="text-inverse">
          {currentInterval} day{currentInterval === 1 ? "" : "s"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <motion.div
          layout
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-fg/80">{clampedIndex + 1}</span> of {totalIntervals} steps
        </span>
        {reviewedToday ? (
          <span className="inline-flex items-center gap-1 text-success/40">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed today
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-accent/30">
            <Sparkles className="h-3.5 w-3.5" /> Keep the momentum
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <motion.article
        layout
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="group relative flex h-full flex-col justify-between rounded-3xl border border-inverse/5 bg-card/40 p-6 backdrop-blur-xl"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${identityColor}1f` }}
              >
                <IconPreview name={identityIcon} className="h-5 w-5" />
              </span>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold text-fg">{topic.title}</h3>
                {topic.categoryLabel ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-inverse/10 px-3 py-1 text-xs font-medium text-inverse">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: identityColor }} />
                    {topic.categoryLabel}
                  </span>
                ) : null}
                {examDateLabel ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-warn/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-warn/20">
                    <CalendarClock className="h-3.5 w-3.5" /> Exam {examDateLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                  statusStyles[currentStatus].className
                )}
              >
                {statusStyles[currentStatus].icon}
                {statusStyles[currentStatus].label}
              </span>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Next review</p>
              <p className="text-sm font-semibold text-fg/90">
                {formatDateWithWeekday(topic.nextReviewDate)}
              </p>
              <p className="text-xs text-muted-foreground">{statusStyles[currentStatus].helper}</p>
              <p className="text-[11px] text-muted-foreground/80">
                Retention target ≈ {Math.round(topic.retrievabilityTarget * 100)}%
              </p>
            </div>
          </div>

          <ReminderStatus />

          <div className="grid gap-3 rounded-2xl border border-inverse/10 bg-inverse/5 p-3">
            <label className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Bell className="h-3.5 w-3.5" /> Reminder
              </span>
              {isSavingReminder ? <span className="text-[10px] text-muted-foreground/80">Saving…</span> : null}
            </label>
            <Select value={reminderValue} onValueChange={handleReminderChange}>
              <SelectTrigger className="h-10 rounded-xl border-inverse/10 bg-card/60 text-sm">
                <SelectValue placeholder="Choose reminder" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl backdrop-blur">
                {reminderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom…</SelectItem>
                <SelectItem value="none">No reminder</SelectItem>
              </SelectContent>
            </Select>
            <AnimatePresence initial={false}>
              {reminderValue === "custom" ? (
                <motion.div
                  key="custom-time"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <Input
                    type="time"
                    value={customTime}
                    onChange={(event) => setCustomTime(event.target.value)}
                    onBlur={handleCustomTimeCommit}
                    className="h-10 w-32 rounded-xl border-inverse/10 bg-card/60 text-sm"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleCustomTimeCommit}>
                    Save time
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <p className="text-xs text-muted-foreground">{formatTime(topic.reminderTime)}</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <PenLine className="h-3.5 w-3.5" /> Notes
              </span>
              {isSavingNotes ? <span className="text-[10px] text-muted-foreground/80">Saving…</span> : null}
            </label>
            <Textarea
              value={notesValue}
              onChange={(event) => setNotesValue(event.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add a quick note or mnemonic to help you remember!"
              rows={4}
              className="min-h-[120px] rounded-2xl border-inverse/10 bg-card/60 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Schedule adjustments
            </label>
            <Select
              value={autoAdjustPreference}
              onValueChange={(value: AutoAdjustPreference) => handlePreferenceChange(value)}
            >
              <SelectTrigger className="h-10 rounded-xl border-inverse/10 bg-card/60 text-sm text-left">
                <SelectValue placeholder="Choose behaviour" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl backdrop-blur">
                {Object.entries(autoAdjustLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tweak how upcoming reviews adapt when you study early.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap gap-2 sm:gap-3">
            <Button
              type="button"
              className={cn(
                "flex-1 min-w-[180px] gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent/80 text-sm font-semibold",
                !due && hasUsedReviseToday ? "cursor-not-allowed opacity-60" : ""
              )}
              onClick={(event) => (due ? handleMarkReviewed() : handleReviseNow(event))}
              aria-disabled={!due && hasUsedReviseToday}
              title={!due && hasUsedReviseToday ? nextAvailabilityMessage : undefined}
            >
              <CheckCircle2 className="h-4 w-4" />
              {due ? "Mark review complete" : "Revise now"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-w-[150px] gap-2 rounded-2xl border-warn/40 text-warn/20 hover:bg-warn/10"
              onClick={handleSkipToday}
            >
              <SkipForward className="h-4 w-4" /> Skip today
            </Button>
          </div>
          {!due && hasUsedReviseToday ? (
            <div className="space-y-1 text-right text-xs sm:text-left">
              <p className="font-medium text-success/40">Logged today’s revision.</p>
              <p className="text-muted-foreground">{nextAvailabilityMessage}</p>
              {nextAvailabilitySubtext ? (
                <p className="text-[11px] text-muted-foreground/80">{nextAvailabilitySubtext}</p>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground hover:text-fg"
              onClick={onEdit}
              aria-label="Edit topic"
            >
              <PenLine className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground hover:text-error/20"
              onClick={handleDelete}
              aria-label="Remove topic"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.article>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Remove topic"
        description="This topic will be removed from your plan. You can add it back later if needed."
        confirmLabel="Remove topic"
        confirmTone="danger"
        onConfirm={confirmDelete}
        icon={<Trash2 className="h-5 w-5" />}
      />

      <QuickRevisionDialog
        open={showQuickRevision}
        onConfirm={handleConfirmQuickRevision}
        onClose={handleCloseQuickRevision}
        topicTitle={topic.title}
        isConfirming={isLoggingRevision}
        returnFocusRef={revisionTriggerRef}
      />

      <ConfirmationDialog
        open={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        title="Skip today?"
        description="Skip today? We’ll adjust your upcoming reviews to keep you on track without exceeding your exam date."
        warning="⚠ Skipping today may cause too many reviews to pile up later."
        confirmLabel="Skip today"
        confirmTone="warning"
        onConfirm={confirmSkip}
        icon={<AlertTriangle className="h-5 w-5" />}
      />

      <ConfirmationDialog
        open={showAdjustPrompt}
        onClose={dismissAdjustPrompt}
        title="You studied this earlier than planned"
        description="You reviewed earlier than planned. Adjust future schedule?"
        confirmLabel="Adjust schedule"
        cancelLabel="Keep original plan"
        onConfirm={() => {
          const source = pendingReviewSource.current;
          dismissAdjustPrompt();
          handleMarkReviewed(true, source);
        }}
        onCancel={() => {
          const source = pendingReviewSource.current;
          dismissAdjustPrompt();
          handleMarkReviewed(false, source);
        }}
        icon={<RefreshCw className="h-5 w-5" />}
        extraActions={[
          autoAdjustPreference !== "always"
            ? {
                label: "Always adjust automatically",
                action: () => {
                  const source = pendingReviewSource.current;
                  handlePreferenceChange("always");
                  dismissAdjustPrompt();
                  handleMarkReviewed(true, source);
                }
              }
            : null,
          autoAdjustPreference !== "never"
            ? {
                label: "Never adjust automatically",
                action: () => {
                  const source = pendingReviewSource.current;
                  handlePreferenceChange("never");
                  dismissAdjustPrompt();
                  handleMarkReviewed(false, source);
                }
              }
            : null
        ].filter(Boolean) as { label: string; action: () => void }[]}
      />
    </>
  );
};

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: "default" | "danger" | "warning";
  cancelLabel?: string;
  warning?: string;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  onCancel?: () => void;
  extraActions?: { label: string; action: () => void }[];
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  description,
  warning,
  confirmLabel,
  confirmTone = "default",
  cancelLabel = "Cancel",
  icon,
  onConfirm,
  onClose,
  onCancel,
  extraActions
}) => {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="w-full max-w-md rounded-3xl border border-inverse/10 bg-card/90 p-6"
          >
            <div className="flex items-start gap-3">
              {icon ? <span className="mt-1 rounded-2xl bg-inverse/10 p-2 text-accent">{icon}</span> : null}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-fg">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
                {warning ? <p className="text-xs font-semibold text-warn/30">{warning}</p> : null}
              </div>
            </div>
            {extraActions && extraActions.length > 0 ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-inverse/10 bg-inverse/5 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-fg">Quick preferences</p>
                {extraActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.action}
                    className="w-full rounded-xl border border-inverse/10 px-3 py-2 text-left transition hover:border-accent/40 hover:text-accent"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => (onCancel ? onCancel() : onClose())}>
                {cancelLabel}
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                className={cn(
                  "min-w-[140px] rounded-2xl",
                  confirmTone === "danger"
                    ? "bg-error/80 hover:bg-error text-fg"
                    : confirmTone === "warning"
                    ? "bg-warn/80 hover:bg-warn text-inverse-foreground"
                    : ""
                )}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};