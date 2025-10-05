"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarDayData, CalendarDaySubjectEntry } from "@/lib/calendar";
import { formatInTimeZone } from "@/lib/date";
import { IconPreview } from "@/components/icon-preview";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";
import { Topic } from "@/types/topic";

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export type RevisionAllowance = {
  allowed: boolean;
  message?: string;
};

interface CalendarDaySheetProps {
  open: boolean;
  day: CalendarDayData | null;
  timeZone: string;
  onClose: () => void;
  onReviseRequest: (topic: Topic, trigger?: HTMLButtonElement | null) => void;
  canReviseTopic: (topic: Topic) => RevisionAllowance;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function CalendarDaySheet({
  open,
  day,
  timeZone,
  onClose,
  onReviseRequest,
  canReviseTopic,
  returnFocusRef
}: CalendarDaySheetProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const panel = panelRef.current;
    if (panel) {
      const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
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
    const target = returnFocusRef?.current ?? previouslyFocused.current;
    if (target) {
      window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }
  }, [open, returnFocusRef]);

  if (!open || !isMounted || !day) {
    return null;
  }

  const formattedDate = formatInTimeZone(day.date, timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const fullExamDate = formatInTimeZone(day.date, timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const subjectsForDay: CalendarDaySubjectEntry[] = [...day.subjects, ...day.overflowSubjects];

  const totalTopics = subjectsForDay.reduce((sum, entry) => sum + entry.count, 0);
  const showCapacityHint = totalTopics >= 10;

  const overlay = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-bg/80 px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-6 backdrop-blur-sm transition sm:items-center sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-sheet-title"
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-inverse/10 bg-card/95 text-fg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-inverse/5 px-6 py-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span id="calendar-day-sheet-title" className="font-semibold text-fg">
                {formattedDate}
              </span>
              {day.isToday ? (
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  Today
                </span>
              ) : null}
            </div>
            {day.hasOverdueBacklog ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-error/15 px-3 py-1 text-[11px] font-semibold text-error/20">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Overdue reviews waiting
              </div>
            ) : null}
            {day.hasExam && day.examSubjects.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-fg/80" aria-label="Exam markers">
                {day.examSubjects.map((entry) => {
                  const examLabel = `Exam: ${entry.name} — ${fullExamDate}`;
                  return (
                    <span
                      key={entry.id}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1"
                      style={{ borderColor: `${entry.color}80`, color: entry.color }}
                      title={examLabel}
                      aria-label={examLabel}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                      Exam: {entry.name}
                    </span>
                  );
                })}
              </div>
            ) : null}
            {showCapacityHint ? (
              <p className="text-xs font-medium text-warn/30">
                Busy day ahead — consider reviewing some items earlier.
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close day details"
            className="rounded-full border border-inverse/15 text-muted-foreground hover:text-fg"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="custom-scrollbar flex max-h-[70vh] flex-col gap-6 overflow-y-auto px-6 py-6 sm:max-h-[60vh]">
          {subjectsForDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews scheduled for this day.</p>
          ) : (
            subjectsForDay.map((entry) => (
              <section key={entry.subject.id} className="space-y-3">
                <div className="inline-flex items-center gap-3">
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${entry.subject.color}1f` }}
                  >
                    <IconPreview name={entry.subject.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-fg">{entry.subject.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.count} {entry.count === 1 ? "topic" : "topics"} scheduled</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {entry.topics
                    .slice()
                    .sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }))
                    .map((topic) => {
                      const allowance = canReviseTopic(topic);
                      const dueTimeLabel = formatInTimeZone(topic.nextReviewDate, timeZone, {
                        hour: "numeric",
                        minute: "2-digit"
                      });
                      return (
                        <li
                          key={topic.id}
                          className="rounded-2xl border border-inverse/10 bg-inverse/5 px-4 py-3 text-sm text-inverse"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-fg">{topic.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Next review window: {dueTimeLabel}
                              </p>
                            </div>
                            {day.isToday ? (
                              allowance.allowed ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={(event) => onReviseRequest(topic, event.currentTarget)}
                                >
                                  Revise
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="rounded-full border-dashed text-muted-foreground"
                                  title={allowance.message}
                                >
                                  {allowance.message ?? "Not available"}
                                </Button>
                              )
                            ) : day.isPast ? (
                              <span className="text-xs font-medium text-warn/30">Missed - catch up anytime.</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Scheduled for this day.</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}



