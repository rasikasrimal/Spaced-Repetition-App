"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconPreview } from "@/components/icon-preview";
import { Button } from "@/components/ui/button";
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
import { AutoAdjustPreference, Topic } from "@/types/topic";
import {
  formatDateWithWeekday,
  formatFullDate,
  formatRelativeToNow,
  formatTime,
  isDueToday,
  isToday
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { REMINDER_TIME_OPTIONS } from "@/lib/constants";
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
  const { markReviewed, deleteTopic, updateTopic, skipTopic, setAutoAdjustPreference } = useTopicStore(
    (state) => ({
      markReviewed: state.markReviewed,
      deleteTopic: state.deleteTopic,
      updateTopic: state.updateTopic,
      skipTopic: state.skipTopic,
      setAutoAdjustPreference: state.setAutoAdjustPreference
    })
  );

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

  const due = isDueToday(topic.nextReviewDate);
  const reviewedToday = topic.lastReviewedAt ? isToday(topic.lastReviewedAt) : false;
  const totalIntervals = Math.max(topic.intervals.length, 1);
  const clampedIndex = Math.min(topic.intervalIndex, totalIntervals - 1);
  const progress = Math.round(((clampedIndex + (reviewedToday ? 1 : 0)) / totalIntervals) * 100);
  const examDateLabel = topic.examDate ? formatFullDate(topic.examDate) : null;
  const autoAdjustPreference = topic.autoAdjustPreference ?? "ask";

  React.useEffect(() => {
    setNotesValue(topic.notes ?? "");
  }, [topic.notes, topic.id]);

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
    (overrides: Partial<Omit<Topic, "id" | "events" | "forgetting">>) => ({
      title: overrides.title ?? topic.title,
      notes: overrides.notes ?? topic.notes ?? "",
      categoryId: overrides.categoryId ?? topic.categoryId,
      categoryLabel: overrides.categoryLabel ?? topic.categoryLabel,
      icon: overrides.icon ?? topic.icon,
      color: overrides.color ?? topic.color,
      reminderTime: overrides.reminderTime ?? topic.reminderTime,
      intervals: overrides.intervals ?? topic.intervals,
      examDate: overrides.examDate ?? topic.examDate ?? null,
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

  const handleMarkReviewed = (adjustFuture?: boolean) => {
    const nowIso = new Date().toISOString();
    const scheduledTime = new Date(topic.nextReviewDate).getTime();
    const nowTime = Date.now();
    const isEarly = nowTime < scheduledTime && !due;

    if (isEarly && typeof adjustFuture === "undefined") {
      if (autoAdjustPreference === "ask") {
        setShowAdjustPrompt(true);
        return;
      }
      const shouldAdjust = autoAdjustPreference === "always";
      markReviewed(topic.id, { reviewedAt: nowIso, adjustFuture: shouldAdjust });
      toast.success("Review recorded early");
      return;
    }

    markReviewed(topic.id, { reviewedAt: nowIso, adjustFuture });
    toast.success("Great job! Schedule updated.");
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
      description: "We’ve reshuffled upcoming reviews to keep things balanced."
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
      className:
        "border border-rose-400/20 bg-rose-500/15 text-rose-100 shadow-[0_1px_10px_rgba(244,63,94,0.15)]",
      icon: <Flame className="h-4 w-4" />
    },
    upcoming: {
      label: "Upcoming",
      helper: `${formatRelativeToNow(topic.nextReviewDate)} • ${formatDateWithWeekday(topic.nextReviewDate)}`,
      className:
        "border border-sky-400/20 bg-sky-500/15 text-sky-100 shadow-[0_1px_10px_rgba(14,165,233,0.12)]",
      icon: <CalendarClock className="h-4 w-4" />
    },
    completed: {
      label: "Completed",
      helper: `Reviewed today • Next ${formatDateWithWeekday(topic.nextReviewDate)}`,
      className:
        "border border-emerald-400/20 bg-emerald-500/15 text-emerald-100 shadow-[0_1px_10px_rgba(16,185,129,0.12)]",
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
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-slate-900/50 p-3">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1 text-zinc-300">
          <Clock8 className="h-3.5 w-3.5" /> Interval
        </span>
        <span className="text-zinc-100">
          {currentInterval} day{currentInterval === 1 ? "" : "s"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <motion.div
          layout
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          <span className="font-medium text-zinc-200">{clampedIndex + 1}</span> of {totalIntervals} steps
        </span>
        {reviewedToday ? (
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed today
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sky-300">
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
        className="group relative flex h-full flex-col justify-between rounded-3xl border border-white/5 bg-slate-900/40 p-6 shadow-lg shadow-slate-900/30 backdrop-blur-xl"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner"
                style={{ backgroundColor: `${topic.color}1f` }}
              >
                <IconPreview name={topic.icon} className="h-5 w-5" />
              </span>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold text-white">{topic.title}</h3>
                {topic.categoryLabel ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-zinc-100">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: topic.color }} />
                    {topic.categoryLabel}
                  </span>
                ) : null}
                {examDateLabel ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100">
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
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Next review</p>
              <p className="text-sm font-semibold text-white/90">
                {formatDateWithWeekday(topic.nextReviewDate)}
              </p>
              <p className="text-xs text-zinc-400">{statusStyles[currentStatus].helper}</p>
            </div>
          </div>

          <ReminderStatus />

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <label className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-400">
              <span className="inline-flex items-center gap-1 text-zinc-300">
                <Bell className="h-3.5 w-3.5" /> Reminder
              </span>
              {isSavingReminder ? <span className="text-[10px] text-zinc-500">Saving…</span> : null}
            </label>
            <Select value={reminderValue} onValueChange={handleReminderChange}>
              <SelectTrigger className="h-10 rounded-xl border-white/10 bg-slate-900/60 text-sm">
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
                    className="h-10 w-32 rounded-xl border-white/10 bg-slate-900/60 text-sm"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleCustomTimeCommit}>
                    Save time
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <p className="text-xs text-zinc-400">{formatTime(topic.reminderTime)}</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-400">
              <span className="inline-flex items-center gap-1 text-zinc-300">
                <PenLine className="h-3.5 w-3.5" /> Notes
              </span>
              {isSavingNotes ? <span className="text-[10px] text-zinc-500">Saving…</span> : null}
            </label>
            <Textarea
              value={notesValue}
              onChange={(event) => setNotesValue(event.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add a quick note or mnemonic to help you remember!"
              rows={4}
              className="min-h-[120px] rounded-2xl border-white/10 bg-slate-900/60 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              <RefreshCw className="h-3.5 w-3.5" /> Schedule adjustments
            </label>
            <Select
              value={autoAdjustPreference}
              onValueChange={(value: AutoAdjustPreference) => handlePreferenceChange(value)}
            >
              <SelectTrigger className="h-10 rounded-xl border-white/10 bg-slate-900/60 text-sm text-left">
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
            <p className="text-xs text-zinc-400">
              Tweak how upcoming reviews adapt when you study early.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap gap-2 sm:gap-3">
            <Button
              type="button"
              className="flex-1 min-w-[180px] gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent/80 text-sm font-semibold"
              onClick={() => handleMarkReviewed()}
            >
              <CheckCircle2 className="h-4 w-4" />
              {due ? "Mark review complete" : "Review now"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-w-[150px] gap-2 rounded-2xl border-amber-400/40 text-amber-100 hover:bg-amber-500/10"
              onClick={handleSkipToday}
            >
              <SkipForward className="h-4 w-4" /> Skip today
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-zinc-300 hover:text-white"
              onClick={onEdit}
              aria-label="Edit topic"
            >
              <PenLine className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-zinc-300 hover:text-rose-200"
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
        onClose={() => setShowAdjustPrompt(false)}
        title="You reviewed earlier than planned"
        description="Adjust your future schedule?"
        confirmLabel="Adjust schedule"
        cancelLabel="Keep original plan"
        onConfirm={() => {
          setShowAdjustPrompt(false);
          handleMarkReviewed(true);
        }}
        onCancel={() => {
          setShowAdjustPrompt(false);
          handleMarkReviewed(false);
        }}
        icon={<RefreshCw className="h-5 w-5" />}
        extraActions={[
          autoAdjustPreference !== "always"
            ? {
                label: "Always adjust automatically",
                action: () => {
                  handlePreferenceChange("always");
                  setShowAdjustPrompt(false);
                  handleMarkReviewed(true);
                }
              }
            : null,
          autoAdjustPreference !== "never"
            ? {
                label: "Never adjust automatically",
                action: () => {
                  handlePreferenceChange("never");
                  setShowAdjustPrompt(false);
                  handleMarkReviewed(false);
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              {icon ? <span className="mt-1 rounded-2xl bg-white/10 p-2 text-accent">{icon}</span> : null}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="text-sm text-zinc-300">{description}</p>
                {warning ? <p className="text-xs font-semibold text-amber-200">{warning}</p> : null}
              </div>
            </div>
            {extraActions && extraActions.length > 0 ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                <p className="font-semibold text-white">Quick preferences</p>
                {extraActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.action}
                    className="w-full rounded-xl border border-white/10 px-3 py-2 text-left transition hover:border-accent/40 hover:text-accent"
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
                    ? "bg-rose-500/80 hover:bg-rose-500 text-white"
                    : confirmTone === "warning"
                    ? "bg-amber-500/80 hover:bg-amber-500 text-slate-900"
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

