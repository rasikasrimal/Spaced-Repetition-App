"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDaySheet, RevisionAllowance } from "@/components/calendar/calendar-day-sheet";
import { QuickRevisionDialog } from "@/components/dashboard/quick-revision-dialog";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { useZonedNow } from "@/hooks/use-zoned-now";
import { usePersistedSubjectFilter } from "@/hooks/use-persisted-subject-filter";
import {
  CalendarDayData,
  CalendarDaySubjectEntry,
  CalendarMonthData,
  CalendarSubjectAggregate,
  buildCalendarMonthData
} from "@/lib/calendar";
import {
  addMonthsInTimeZone,
  formatInTimeZone,
  formatMonthYearInTimeZone,
  getDayKeyInTimeZone,
  startOfMonthInTimeZone
} from "@/lib/date";
import { Topic } from "@/types/topic";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { REVISE_LOCKED_MESSAGE } from "@/lib/constants";
import { toast } from "sonner";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_DOTS = 5;

const formatSubjectTooltip = (subject: { name: string; count: number }) =>
  `${subject.name} — ${subject.count === 1 ? "1 topic due" : `${subject.count} topics due`}`;

const formatExamTooltip = (subjectName: string, dateLabel: string) =>
  `Exam: ${subjectName} — ${dateLabel}`;

export function CalendarView() {
  const { topics, subjects, markReviewed, trackReviseNowBlocked } = useTopicStore(
    React.useCallback(
      (state) => ({
        topics: state.topics,
        subjects: state.subjects,
        markReviewed: state.markReviewed,
        trackReviseNowBlocked: state.trackReviseNowBlocked
      }),
      []
    )
  );
  const timezone = useProfileStore((state) => state.profile.timezone) || "Asia/Colombo";
  const zonedNow = useZonedNow(timezone);
  const todayKey = React.useMemo(() => getDayKeyInTimeZone(zonedNow, timezone), [zonedNow, timezone]);

  const [monthCursor, setMonthCursor] = React.useState(() => startOfMonthInTimeZone(zonedNow, timezone));
  const [focusedDayKey, setFocusedDayKey] = React.useState<string>(todayKey);
  const [activeDayKey, setActiveDayKey] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [revisionTopic, setRevisionTopic] = React.useState<Topic | null>(null);
  const [isLoggingRevision, setIsLoggingRevision] = React.useState(false);

  const { subjectFilter, setSubjectFilter } = usePersistedSubjectFilter();
  const selectedSubjectIds = subjectFilter ?? null;

  const revisionTriggerRef = React.useRef<HTMLElement | null>(null);
  const dayButtonRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const daySheetReturnFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setMonthCursor(startOfMonthInTimeZone(zonedNow, timezone));
    setFocusedDayKey(todayKey);
  }, [todayKey, timezone, zonedNow]);

  const calendarData: CalendarMonthData = React.useMemo(
    () =>
      buildCalendarMonthData({
        topics,
        subjects,
        timeZone: timezone,
        monthDate: monthCursor,
        selectedSubjectIds,
        todayKey,
        weekStartsOn: 0
      }),
    [topics, subjects, timezone, monthCursor, selectedSubjectIds, todayKey]
  );

  const subjectOptions = calendarData.subjectOptions;
  const allVisibleSubjectIds = React.useMemo(
    () => subjectOptions.map((subject) => subject.id),
    [subjectOptions]
  );

  const toggleSubject = React.useCallback(
    (subjectId: string) => {
      if (allVisibleSubjectIds.length === 0) {
        return;
      }
      setSubjectFilter((current) => {
        const base =
          current === null
            ? new Set<string>(allVisibleSubjectIds)
            : new Set<string>(current);
        if (base.has(subjectId)) {
          base.delete(subjectId);
        } else {
          base.add(subjectId);
        }
        if (base.size === 0) {
          return new Set<string>();
        }
        return base.size === allVisibleSubjectIds.length ? null : base;
      });
    },
    [allVisibleSubjectIds, setSubjectFilter]
  );

  const handleSelectAllSubjects = React.useCallback(() => {
    setSubjectFilter(null);
  }, [setSubjectFilter]);

  const handleClearSubjects = React.useCallback(() => {
    setSubjectFilter(new Set<string>());
  }, [setSubjectFilter]);

  const subjectFilterLabel = React.useMemo(() => {
    if (selectedSubjectIds === null) return "Subjects: All";
    if (selectedSubjectIds.size === 0) return "Subjects: 0 selected";
    return `Subjects: ${selectedSubjectIds.size} selected`;
  }, [selectedSubjectIds]);

  React.useEffect(() => {
    if (calendarData.days.length === 0) return;
    const hasFocusedDay = calendarData.days.some((day) => day.dayKey === focusedDayKey);
    if (!hasFocusedDay) {
      const fallback =
        calendarData.days.find((day) => day.isCurrentMonth)?.dayKey ?? calendarData.days[0].dayKey;
      setFocusedDayKey(fallback);
    }
  }, [calendarData.days, focusedDayKey]);

  const monthLabel = React.useMemo(
    () => formatMonthYearInTimeZone(monthCursor, timezone),
    [monthCursor, timezone]
  );

  const activeDay = React.useMemo<CalendarDayData | null>(
    () => calendarData.days.find((day) => day.dayKey === activeDayKey) ?? null,
    [calendarData.days, activeDayKey]
  );

  const activeDayButton = activeDayKey ? dayButtonRefs.current.get(activeDayKey) : null;
  React.useEffect(() => {
    daySheetReturnFocusRef.current = activeDayButton ?? null;
  }, [activeDayButton]);

  const handleMonthChange = React.useCallback(
    (delta: number) => {
      setMonthCursor((current) => addMonthsInTimeZone(current, delta, timezone));
    },
    [timezone]
  );

  const handleJumpToToday = React.useCallback(() => {
    const todayMonth = startOfMonthInTimeZone(zonedNow, timezone);
    setMonthCursor(todayMonth);
    setFocusedDayKey(todayKey);
    setActiveDayKey(todayKey);
    const todayButton = dayButtonRefs.current.get(todayKey);
    if (todayButton) {
      window.requestAnimationFrame(() => todayButton.focus());
    }
  }, [todayKey, timezone, zonedNow]);

  const canReviseTopic = React.useCallback(
    (topic: Topic): RevisionAllowance => {
      if (!activeDay || !activeDay.isToday) {
        return { allowed: false, message: "Scheduled for this day" };
      }
      if (!topic.reviseNowLastUsedAt) {
        return { allowed: true };
      }
      const lastKey = getDayKeyInTimeZone(topic.reviseNowLastUsedAt, timezone);
      if (lastKey === todayKey) {
        return { allowed: false, message: REVISE_LOCKED_MESSAGE };
      }
      return { allowed: true };
    },
    [activeDay, todayKey, timezone]
  );

  const handleReviseRequest = React.useCallback(
    (topic: Topic, trigger?: HTMLButtonElement | null) => {
      const allowance = canReviseTopic(topic);
      if (!allowance.allowed) {
        trackReviseNowBlocked();
        if (allowance.message) {
          toast.error(allowance.message);
        }
        return;
      }
      revisionTriggerRef.current = trigger ?? null;
      setActiveDayKey(null);
      setRevisionTopic(topic);
    },
    [canReviseTopic, setActiveDayKey, trackReviseNowBlocked]
  );

  const handleConfirmRevision = React.useCallback(() => {
    if (!revisionTopic) return;
    setIsLoggingRevision(true);
    try {
      const success = markReviewed(revisionTopic.id, {
        reviewedAt: new Date().toISOString(),
        adjustFuture: false,
        source: "revise-now",
        timeZone: timezone
      });
      if (success) {
        toast.success("Logged today's revision");
        setRevisionTopic(null);
      } else {
        trackReviseNowBlocked();
        toast.error(REVISE_LOCKED_MESSAGE);
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not log that revision. Please try again.");
    } finally {
      setIsLoggingRevision(false);
    }
  }, [markReviewed, revisionTopic, timezone, trackReviseNowBlocked]);

  const handleCloseRevision = React.useCallback(() => {
    setRevisionTopic(null);
  }, []);

  const dayIndexMap = React.useMemo(() => {
    const map = new Map<string, number>();
    calendarData.days.forEach((day, index) => {
      map.set(day.dayKey, index);
    });
    return map;
  }, [calendarData.days]);

  const focusDayByIndex = React.useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(calendarData.days.length - 1, index));
      const day = calendarData.days[clamped];
      if (!day) return;
      setFocusedDayKey(day.dayKey);
      const ref = dayButtonRefs.current.get(day.dayKey);
      if (ref) {
        window.requestAnimationFrame(() => ref.focus({ preventScroll: true }));
      }
    },
    [calendarData.days]
  );

  const handleDayKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, day: CalendarDayData) => {
      if (!dayIndexMap.has(day.dayKey)) return;
      const index = dayIndexMap.get(day.dayKey)!;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (index + 1 >= calendarData.days.length) {
          handleMonthChange(1);
        } else {
          focusDayByIndex(index + 1);
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (index - 1 < 0) {
          handleMonthChange(-1);
        } else {
          focusDayByIndex(index - 1);
        }
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (index - 7 < 0) {
          handleMonthChange(-1);
        } else {
          focusDayByIndex(index - 7);
        }
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (index + 7 >= calendarData.days.length) {
          handleMonthChange(1);
        } else {
          focusDayByIndex(index + 7);
        }
        return;
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        handleMonthChange(event.shiftKey ? -12 : -1);
        return;
      }
      if (event.key === "PageDown") {
        event.preventDefault();
        handleMonthChange(event.shiftKey ? 12 : 1);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        focusDayByIndex(index - (index % 7));
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        focusDayByIndex(index - (index % 7) + 6);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setActiveDayKey(day.dayKey);
        return;
      }
    },
    [calendarData.days.length, dayIndexMap, focusDayByIndex, handleMonthChange]
  );

  const handleDaySelect = React.useCallback((day: CalendarDayData) => {
    setActiveDayKey(day.dayKey);
  }, []);

  const handleCloseDaySheet = React.useCallback(() => {
    setActiveDayKey(null);
  }, []);

  const overflowTooltip = React.useCallback(
    (entries: CalendarDaySubjectEntry[]) =>
      entries
        .map((entry) =>
          `${entry.subject.name} — ${entry.count} ${entry.count === 1 ? "topic" : "topics"}`
        )
        .join("\n"),
    []
  );

  const dotAriaLabel = React.useCallback(
    (subjectName: string, fullDate: string, topicCount: number) =>
      `${subjectName} has reviews on ${fullDate}. ${topicCount} ${topicCount === 1 ? "topic" : "topics"}.`,
    []
  );

  const fullDateLabel = React.useMemo(
    () => (day: CalendarDayData) =>
      formatInTimeZone(day.date, timezone, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
    [timezone]
  );

  const hasSubjects = subjectOptions.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5 text-white shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-accent" aria-hidden="true" />
            <h1 className="text-lg font-semibold">Calendar</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
            <button
              type="button"
              className="rounded-full px-3 py-1 text-white"
              aria-pressed="true"
            >
              Month
            </button>
            <button
              type="button"
              className="rounded-full px-3 py-1 text-zinc-500"
              aria-pressed="false"
              title="Week view coming soon"
              disabled
            >
              Week
            </button>
            <button
              type="button"
              className="rounded-full px-3 py-1 text-zinc-500"
              aria-pressed="false"
              title="Agenda view coming soon"
              disabled
            >
              Agenda
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
          <div className="inline-flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="rounded-full border border-white/10"
              onClick={() => handleMonthChange(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="rounded-full border border-white/10"
              onClick={() => handleMonthChange(1)}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-base font-semibold text-white">
            {monthLabel}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleJumpToToday}
            className="rounded-full border-white/20"
          >
            Jump to today
          </Button>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-2 rounded-full border border-white/10"
              >
                <Filter className="h-4 w-4" />
                {subjectFilterLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-3 text-sm text-white">
              <div className="mb-3 flex items-center justify-between text-xs text-zinc-300">
                <button
                  type="button"
                  className="font-semibold text-accent"
                  onClick={handleSelectAllSubjects}
                >
                  Select all
                </button>
                <button type="button" className="font-semibold text-accent" onClick={handleClearSubjects}>
                  Clear all
                </button>
              </div>
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {subjectOptions.map((subject) => {
                  const checked = selectedSubjectIds === null || selectedSubjectIds.has(subject.id);
                  return (
                    <label
                      key={subject.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-xs hover:border-white/20"
                    >
                      <input
                        type="checkbox"
                        className="scale-105"
                        checked={checked}
                        onChange={() => toggleSubject(subject.id)}
                      />
                      <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                      <span className="flex-1 text-white">{subject.name}</span>
                      <span className="text-[11px] text-zinc-400">{subject.count}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {hasSubjects ? (
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-3 text-xs uppercase tracking-wide text-zinc-400">
            <span>Subjects</span>
            {subjectOptions.map((subject) => (
              <span
                key={subject.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1"
                title={formatSubjectTooltip(subject)}
              >
                <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                <span className="text-[11px] text-zinc-200">{subject.name}</span>
              </span>
            ))}
          </div>
          <div className="mt-4">
            <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="px-2 py-2 text-center">
                  {label}
                </div>
              ))}
            </div>
            <div
              role="grid"
              aria-labelledby="calendar-grid-heading"
              className="mt-1 grid grid-cols-7 gap-1 text-sm"
            >
              <span id="calendar-grid-heading" className="sr-only">
                {monthLabel} calendar grid
              </span>
              {calendarData.weeks.map((week, weekIndex) => (
                <React.Fragment key={`week-${weekIndex}`}>
                  {week.map((day) => {
                    const isFocused = focusedDayKey === day.dayKey;
                    const dayRef = (node: HTMLButtonElement | null) => {
                      if (node) {
                        dayButtonRefs.current.set(day.dayKey, node);
                      } else {
                        dayButtonRefs.current.delete(day.dayKey);
                      }
                    };
                    const fullDate = fullDateLabel(day);
                    const overflowCount = day.overflowSubjects.length;
                    const overflowSubjects = overflowCount > 0 ? day.overflowSubjects : [];
                    const examDateLabel = formatInTimeZone(day.date, timezone, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    });
                    const examDescription = day.hasExam
                      ? day.examSubjects
                          .map((entry) => formatExamTooltip(entry.name, examDateLabel))
                          .join(", ")
                      : null;
                    const topicsLabel = `${day.totalTopics} ${day.totalTopics === 1 ? "topic" : "topics"}`;
                    const ariaLabel = `${fullDate}. ${topicsLabel} scheduled.` +
                      (examDescription ? ` ${examDescription}.` : "");
                    return (
                      <button
                        key={day.dayKey}
                        ref={dayRef}
                        type="button"
                        role="gridcell"
                        aria-selected={activeDayKey === day.dayKey}
                        aria-label={ariaLabel}
                        tabIndex={isFocused ? 0 : -1}
                        onFocus={() => setFocusedDayKey(day.dayKey)}
                        onKeyDown={(event) => handleDayKeyDown(event, day)}
                        onClick={() => handleDaySelect(day)}
                        className={`flex h-28 flex-col justify-between rounded-2xl border border-white/5 bg-slate-900/70 p-3 text-left transition hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          day.isCurrentMonth ? "text-white" : "text-zinc-500"
                        } ${day.isToday ? "ring-2 ring-accent/80" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${day.isToday ? "text-accent" : ""}`}>
                            {day.dayNumberLabel}
                          </span>
                          {day.hasOverdueBacklog ? (
                            <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500" aria-hidden="true" />
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1">
                            {day.subjects.slice(0, MAX_VISIBLE_DOTS).map((entry) => (
                              <span
                                key={entry.subject.id}
                                className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border border-white/20"
                                style={{ backgroundColor: entry.subject.color }}
                                title={formatSubjectTooltip({
                                  name: entry.subject.name,
                                  count: entry.count
                                })}
                                role="img"
                                aria-label={dotAriaLabel(entry.subject.name, fullDate, entry.count)}
                              />
                            ))}
                            {overflowCount > 0 ? (
                              <span
                                className="inline-flex items-center rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] text-white"
                                title={overflowTooltip(overflowSubjects)}
                                role="img"
                                aria-label={`+${overflowCount} more subjects with reviews on ${fullDate}: ${overflowTooltip(
                                  overflowSubjects
                                ).replace(/\n/g, ", ")}`}
                              >
                                +{overflowCount}
                              </span>
                            ) : null}
                          </div>
                          {day.hasExam ? (
                            <span
                              className="w-fit rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white"
                              title={day.examSubjects
                                .map((entry) => formatExamTooltip(entry.name, examDateLabel))
                                .join("\n")}
                              role="img"
                              aria-label={day.examSubjects
                                .map((entry) => formatExamTooltip(entry.name, examDateLabel))
                                .join(", ")}
                            >
                              Exam
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center text-sm text-zinc-300">
          No scheduled reviews this month. Try another month or add topics.
        </div>
      )}

      <CalendarDaySheet
        open={Boolean(activeDay)}
        day={activeDay}
        timeZone={timezone}
        onClose={handleCloseDaySheet}
        onReviseRequest={handleReviseRequest}
        canReviseTopic={canReviseTopic}
        returnFocusRef={daySheetReturnFocusRef}
      />

      <QuickRevisionDialog
        open={Boolean(revisionTopic)}
        onConfirm={handleConfirmRevision}
        onClose={handleCloseRevision}
        topicTitle={revisionTopic?.title}
        isConfirming={isLoggingRevision}
        returnFocusRef={revisionTriggerRef}
      />
    </div>
  );
}












