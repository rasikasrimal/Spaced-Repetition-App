"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Topic, Subject, ReviewQuality } from "@/types/topic";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import {
  combineDateAndTimeInTimeZone,
  formatDateWithWeekday,
  getDayKeyInTimeZone,
  nowInTimeZone,
  toDateInputValueInTimeZone,
  toTimeInputValueInTimeZone
} from "@/lib/date";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  Plus,
  Trash2
} from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

const DEFAULT_REVIEW_TIME = "12:00";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type HistoryDraft = {
  localId: string;
  id?: string;
  date: string;
  time: string;
  quality: ReviewQuality;
  persisted?: boolean;
};

type MergePromptState = {
  entries: { id?: string; at: string; quality: ReviewQuality }[];
  days: string[];
};

const QUALITY_LABEL: Record<ReviewQuality, string> = {
  1: "Easy",
  0.5: "Hard",
  0: "Forgot"
};

const QUALITY_OPTIONS: { value: ReviewQuality; label: string }[] = [
  { value: 1, label: "Easy" },
  { value: 0.5, label: "Hard" },
  { value: 0, label: "Forgot" }
];

const parseQualityToken = (token: string | undefined, fallback: ReviewQuality): ReviewQuality => {
  if (!token) return fallback;
  const normalized = token.trim().toLowerCase();
  if (normalized === "easy" || normalized === "e" || normalized === "1") return 1;
  if (normalized === "hard" || normalized === "h" || normalized === "0.5") return 0.5;
  if (normalized === "forgot" || normalized === "f" || normalized === "0") return 0;
  const numeric = Number.parseFloat(normalized);
  if (numeric === 1) return 1;
  if (numeric === 0.5) return 0.5 as ReviewQuality;
  if (numeric === 0) return 0;
  return fallback;
};

const getDraftTimestamp = (draft: HistoryDraft, timeZone: string) => {
  if (!draft.date) {
    return Number.POSITIVE_INFINITY;
  }
  try {
    const iso = combineDateAndTimeInTimeZone(draft.date, draft.time, timeZone);
    return new Date(iso).getTime();
  } catch (error) {
    return Number.POSITIVE_INFINITY;
  }
};

const sortDrafts = (drafts: HistoryDraft[], timeZone: string) =>
  drafts
    .slice()
    .sort((a, b) => getDraftTimestamp(a, timeZone) - getDraftTimestamp(b, timeZone));

export interface TopicHistoryEditorProps {
  open: boolean;
  topic: Topic;
  subject: Subject | null;
  onClose: () => void;
}

export const TopicHistoryEditor: React.FC<TopicHistoryEditorProps> = ({
  open,
  topic,
  subject,
  onClose
}) => {
  const updateTopicHistory = useTopicStore((state) => state.updateTopicHistory);
  const timezone = useProfileStore((state) => state.profile.timezone) || "Asia/Colombo";

  const [drafts, setDrafts] = React.useState<HistoryDraft[]>([]);
  const [bulkInput, setBulkInput] = React.useState("");
  const [bulkQuality, setBulkQuality] = React.useState<ReviewQuality>(0.5);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [mergePrompt, setMergePrompt] = React.useState<MergePromptState | null>(null);

  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const focusPanel = panelRef.current;
    if (focusPanel) {
      const focusable = focusPanel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const first = focusable[0];
      if (first) {
        window.requestAnimationFrame(() => first.focus({ preventScroll: true }));
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const element = panelRef.current;
      if (!element) return;

      const focusable = Array.from(
        element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((node) => !node.hasAttribute("disabled"));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) return;
    const target = previouslyFocused.current;
    if (target) {
      window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const events = (topic.events ?? [])
      .filter((event) => event.type === "reviewed")
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    if (events.length === 0) {
      setDrafts([]);
      return;
    }

    const mapped: HistoryDraft[] = events.map((event) => ({
      localId: event.id,
      id: event.id,
      date: toDateInputValueInTimeZone(event.at, timezone),
      time: toTimeInputValueInTimeZone(event.at, timezone),
      quality: (event.reviewQuality ?? 1) as ReviewQuality,
      persisted: true
    }));

    setDrafts(sortDrafts(mapped, timezone));
  }, [open, topic, timezone]);

  const addDraft = React.useCallback(() => {
    const now = nowInTimeZone(timezone);
    const draft: HistoryDraft = {
      localId: nanoid(),
      date: toDateInputValueInTimeZone(now.toISOString(), timezone),
      time: DEFAULT_REVIEW_TIME,
      quality: 0.5
    };
    setDrafts((prev) => sortDrafts([...prev, draft], timezone));
  }, [timezone]);

  const updateDraft = React.useCallback(
    (localId: string, updates: Partial<HistoryDraft>) => {
      setDrafts((prev) => {
        const next = prev.map((draft) =>
          draft.localId === localId ? { ...draft, ...updates } : draft
        );
        return sortDrafts(next, timezone);
      });
    },
    [timezone]
  );

  const removeDraft = React.useCallback((localId: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.localId !== localId));
  }, []);

  const applyBulkInput = React.useCallback(() => {
    const lines = bulkInput
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return;
    }

    const additions: HistoryDraft[] = lines.map((line) => {
      const [dateToken, qualityToken] = line.split(/\s+/);
      const quality = parseQualityToken(qualityToken, bulkQuality);
      return {
        localId: nanoid(),
        date: dateToken ?? "",
        time: DEFAULT_REVIEW_TIME,
        quality
      };
    });

    setDrafts((prev) => sortDrafts([...prev, ...additions], timezone));
    setBulkInput("");
  }, [bulkInput, bulkQuality, timezone]);

  const resetState = React.useCallback(() => {
    setDrafts([]);
    setBulkInput("");
    setBulkQuality(0.5);
    setError(null);
    setMergePrompt(null);
  }, []);

  const handleClose = React.useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const prepareEntries = React.useCallback(
    (source: HistoryDraft[]) => {
      return source
        .filter((draft) => draft.date)
        .map((draft) => ({
          id: draft.id,
          at: combineDateAndTimeInTimeZone(draft.date, draft.time, timezone),
          quality: draft.quality
        }));
    },
    [timezone]
  );

  const validateDuplicates = React.useCallback(
    (entries: { at: string }[]) => {
      const seen = new Map<string, number>();
      const duplicates: string[] = [];
      for (const entry of entries) {
        const dayKey = getDayKeyInTimeZone(entry.at, timezone);
        if (seen.has(dayKey)) {
          duplicates.push(dayKey);
        } else {
          seen.set(dayKey, 1);
        }
      }
      return Array.from(new Set(duplicates));
    },
    [timezone]
  );

  const saveEntries = React.useCallback(
    (entries: { id?: string; at: string; quality: ReviewQuality }[]) => {
      setIsSaving(true);
      const result = updateTopicHistory(topic.id, entries, { timeZone: timezone });
      setIsSaving(false);

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      if (result.mergedDays.length > 0) {
        const labels = result.mergedDays
          .map((day) =>
            formatDateWithWeekday(
              combineDateAndTimeInTimeZone(day, DEFAULT_REVIEW_TIME, timezone)
            )
          )
          .join(", ");
        toast.info(`Merged duplicate entries on ${labels}.`);
      }

      toast.success("History saved. Schedule and timeline updated.");
      handleClose();
    },
    [updateTopicHistory, topic.id, timezone, handleClose]
  );

  const handleSave = React.useCallback(() => {
    setError(null);
    const entries = prepareEntries(drafts);
    const duplicates = validateDuplicates(entries);
    if (duplicates.length > 0) {
      setMergePrompt({ entries, days: duplicates });
      return;
    }
    saveEntries(entries);
  }, [drafts, prepareEntries, validateDuplicates, saveEntries]);

  const confirmMerge = React.useCallback(() => {
    if (!mergePrompt) return;
    saveEntries(mergePrompt.entries);
    setMergePrompt(null);
  }, [mergePrompt, saveEntries]);

  const cancelMerge = React.useCallback(() => {
    setMergePrompt(null);
  }, []);

  if (!isMounted) {
    return null;
  }

  const content = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="history-editor"
          ref={overlayRef}
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 backdrop-blur"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === overlayRef.current) {
              handleClose();
            }
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-editor-title"
            aria-describedby="history-editor-description"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl"
          >
            <header className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                <Calendar className="h-3.5 w-3.5" /> Edit history
              </div>
              <h2 id="history-editor-title" className="text-2xl font-semibold text-white">
                Edit history — {topic.title}
              </h2>
              <p id="history-editor-description" className="text-sm text-zinc-300">
                Backfill past reviews so retention curves stay continuous and schedules reflect when you actually studied.
              </p>
            </header>

            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : null}

            <ScrollArea className="flex-1 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
              <div className="space-y-4">
                {drafts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-6 text-center text-sm text-zinc-400">
                    No past reviews yet.
                  </div>
                ) : (
                  drafts.map((draft) => {
                    const maxDate = subject?.examDate
                      ? toDateInputValueInTimeZone(subject.examDate, timezone)
                      : undefined;
                    return (
                      <div
                        key={draft.localId}
                        className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                      >
                        <div className="space-y-1">
                          <Label htmlFor={`history-date-${draft.localId}`}>Date</Label>
                          <Input
                            id={`history-date-${draft.localId}`}
                            type="date"
                            value={draft.date}
                            max={maxDate}
                            onChange={(event) => updateDraft(draft.localId, { date: event.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`history-time-${draft.localId}`}>Time</Label>
                          <Input
                            id={`history-time-${draft.localId}`}
                            type="time"
                            value={draft.time}
                            onChange={(event) => updateDraft(draft.localId, { time: event.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Quality</Label>
                          <Select
                            value={String(draft.quality)}
                            onValueChange={(value) =>
                              updateDraft(draft.localId, { quality: Number.parseFloat(value) as ReviewQuality })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select quality" />
                            </SelectTrigger>
                            <SelectContent>
                              {QUALITY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={String(option.value)}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDraft(draft.localId)}
                            aria-label="Remove entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="md:col-span-3 text-xs text-zinc-400">
                          Saved quality: <span className="font-medium text-white">{QUALITY_LABEL[draft.quality]}</span>
                        </p>
                      </div>
                    );
                  })
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="ghost" onClick={addDraft} className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add entry
                  </Button>
                  <span className="text-xs text-zinc-400">
                    Entries are sorted chronologically and merged on the same day using the highest quality.
                  </span>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ClipboardList className="h-4 w-4" /> Bulk add from pasted dates
                  </div>
                  <p className="text-xs text-zinc-400">
                    Paste one date per line (YYYY-MM-DD). Optionally include a quality token (easy, hard, forgot). Missing tokens use the selected default quality.
                  </p>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                    <textarea
                      value={bulkInput}
                      onChange={(event) => setBulkInput(event.target.value)}
                      rows={3}
                      className="min-h-[96px] resize-y rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
                      placeholder="2024-03-01 easy\n2024-03-05 hard\n2024-03-12"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="bulk-quality">Default quality</Label>
                      <Select
                        value={String(bulkQuality)}
                        onValueChange={(value) => setBulkQuality(Number.parseFloat(value) as ReviewQuality)}
                      >
                        <SelectTrigger id="bulk-quality">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUALITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={String(option.value)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="outline" onClick={applyBulkInput} disabled={bulkInput.trim().length === 0}>
                        <Check className="mr-2 h-4 w-4" /> Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <footer className="flex flex-col gap-3 border-t border-white/5 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-zinc-400">
                {subject?.examDate ? (
                  <span>
                    Reviews must stay on or before {formatDateWithWeekday(subject.examDate)}.
                  </span>
                ) : (
                  <span>Save to replay the schedule and refresh the dashboard instantly.</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save history"}
                </Button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      {isMounted ? createPortal(content, document.body) : null}
      <ConfirmationDialog
        open={Boolean(mergePrompt)}
        title="Merge duplicate entries?"
        description={
          mergePrompt
            ? `You already logged ${mergePrompt.days
                .map((day) =>
                  formatDateWithWeekday(
                    combineDateAndTimeInTimeZone(day, DEFAULT_REVIEW_TIME, timezone)
                  )
                )
                .join(", ")}. Merge into one entry per day?`
            : ""
        }
        warning="Duplicates are merged using the highest quality for that day."
        confirmLabel="Merge & save"
        onConfirm={confirmMerge}
        onClose={cancelMerge}
        onCancel={cancelMerge}
        icon={<Clock className="h-5 w-5" />}
      />
    </>
  );
};

