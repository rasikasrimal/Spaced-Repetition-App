"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useTopicStore } from "@/stores/topics";
import { Subject, Topic } from "@/types/topic";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  Flame,
  Filter,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2
} from "lucide-react";
import {
  formatDateWithWeekday,
  formatFullDate,
  formatRelativeToNow,
  formatTime,
  daysBetween,
  formatInTimeZone,
  getDayKeyInTimeZone,
  nextStartOfDayInTimeZone
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export type TopicStatus = "overdue" | "due-today" | "upcoming";

export interface TopicListItem {
  topic: Topic;
  subject: Subject | null;
  status: TopicStatus;
}

const DENSITY_STORAGE_KEY = "dashboard-topic-density";

type Density = "comfortable" | "compact" | "ultra";

const DENSITY_HEIGHT: Record<Density, number> = {
  comfortable: 104,
  compact: 88,
  ultra: 76
};

const STATUS_LABELS: Record<TopicStatus, { label: string; tone: string; icon: React.ReactNode; subtle: string }> = {
  "overdue": {
    label: "Overdue",
    tone: "bg-rose-500/15 text-rose-100 border border-rose-400/30",
    subtle: "text-rose-200",
    icon: <Flame className="h-3.5 w-3.5" />
  },
  "due-today": {
    label: "Due today",
    tone: "bg-amber-500/15 text-amber-100 border border-amber-400/30",
    subtle: "text-amber-200",
    icon: <CalendarClock className="h-3.5 w-3.5" />
  },
  upcoming: {
    label: "Upcoming",
    tone: "bg-sky-500/15 text-sky-100 border border-sky-400/30",
    subtle: "text-sky-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />
  }
};

interface TopicListProps {
  id?: string;
  items: TopicListItem[];
  subjects: Subject[];
  onEditTopic: (id: string) => void;
  onCreateTopic: () => void;
  timezone: string;
  zonedNow: Date;
}

type StatusFilter = "all" | TopicStatus;
type SortOption = "next" | "title" | "subject" | "recent";

type SubjectChip = { id: string; label: string; color: string; count: number };

const densityOptions: { id: Density; label: string }[] = [
  { id: "comfortable", label: "Comfortable" },
  { id: "compact", label: "Compact" },
  { id: "ultra", label: "Ultra" }
];

export function TopicList({ id, items, subjects, onEditTopic, onCreateTopic, timezone, zonedNow }: TopicListProps) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = React.useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = React.useState<SortOption>("next");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [density, setDensity] = React.useState<Density>(() => {
    if (typeof window === "undefined") return "comfortable";
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY) as Density | null;
    return stored ?? "comfortable";
  });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [rowHeights, setRowHeights] = React.useState<Map<string, number>>(() => new Map());
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(480);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const handleScroll = () => setScrollTop(element.scrollTop);
    element.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => element.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const subjectLookup = React.useMemo(() => {
    const map = new Map<string, Subject>();
    for (const subject of subjects) {
      map.set(subject.id, subject);
    }
    return map;
  }, [subjects]);

  const subjectChips = React.useMemo<SubjectChip[]>(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const id = item.subject?.id ?? "__none";
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const chips: SubjectChip[] = [];
    for (const subject of subjects) {
      chips.push({
        id: subject.id,
        label: subject.name,
        color: subject.color,
        count: counts.get(subject.id) ?? 0
      });
    }
    if ((counts.get("__none") ?? 0) > 0) {
      chips.push({ id: "__none", label: "No subject", color: "#64748b", count: counts.get("__none") ?? 0 });
    }
    return chips;
  }, [items, subjects]);

  const filteredItems = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = (topic: Topic) => {
      if (!normalizedSearch) return true;
      return (
        topic.title.toLowerCase().includes(normalizedSearch) ||
        topic.notes.toLowerCase().includes(normalizedSearch)
      );
    };

    const matchesStatus = (status: TopicStatus) => (statusFilter === "all" ? true : status === statusFilter);

    const matchesSubject = (subjectId: string | null) => {
      if (subjectFilter.size === 0) return true;
      const key = subjectId ?? "__none";
      return subjectFilter.has(key);
    };

    const sorted = [...items]
      .filter((item) => matchesSearch(item.topic) && matchesStatus(item.status) && matchesSubject(item.subject?.id ?? null))
      .sort((a, b) => {
        switch (sortOption) {
          case "title":
            return a.topic.title.localeCompare(b.topic.title);
          case "subject":
            return (a.subject?.name ?? "").localeCompare(b.subject?.name ?? "");
          case "recent":
            return (new Date(b.topic.lastReviewedAt ?? 0).getTime() || 0) - (new Date(a.topic.lastReviewedAt ?? 0).getTime() || 0);
          case "next":
          default:
            return new Date(a.topic.nextReviewDate).getTime() - new Date(b.topic.nextReviewDate).getTime();
        }
      });

    return sorted;
  }, [items, search, statusFilter, subjectFilter, sortOption]);

  const defaultHeight = DENSITY_HEIGHT[density];
  const heights = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of filteredItems) {
      map.set(item.topic.id, rowHeights.get(item.topic.id) ?? defaultHeight);
    }
    return map;
  }, [filteredItems, rowHeights, defaultHeight]);

  const virtual = React.useMemo(() => {
    const total = filteredItems.length;
    const overscan = 3;
    const prefix: number[] = new Array(total);
    let offset = 0;
    for (let index = 0; index < total; index++) {
      prefix[index] = offset;
      const topic = filteredItems[index];
      const height = heights.get(topic.topic.id) ?? defaultHeight;
      offset += height;
    }
    const totalHeight = offset;

    let startIndex = 0;
    let foundStart = false;
    for (let index = 0; index < total; index++) {
      const height = heights.get(filteredItems[index].topic.id) ?? defaultHeight;
      if (prefix[index] + height > scrollTop) {
        startIndex = Math.max(0, index - overscan);
        foundStart = true;
        break;
      }
    }
    if (!foundStart) {
      startIndex = Math.max(0, total - overscan);
    }

    let endIndex = total;
    let foundEnd = false;
    for (let index = startIndex; index < total; index++) {
      const top = prefix[index];
      if (top > scrollTop + viewportHeight) {
        endIndex = Math.min(total, index + overscan);
        foundEnd = true;
        break;
      }
    }
    if (!foundEnd) {
      endIndex = total;
    }

    return {
      prefix,
      totalHeight,
      startIndex,
      endIndex
    };
  }, [filteredItems, heights, defaultHeight, scrollTop, viewportHeight]);

  const handleMeasure = React.useCallback((id: string, height: number) => {
    setRowHeights((prev) => {
      const rounded = Math.max(1, Math.round(height));
      const current = prev.get(id);
      if (current === rounded) return prev;
      const next = new Map(prev);
      next.set(id, rounded);
      return next;
    });
  }, []);

  const handleToggleSubject = (id: string) => {
    setSubjectFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    onEditTopic(id);
    window.setTimeout(() => setEditingId((current) => (current === id ? null : current)), 2000);
  };

  const visibleRows = filteredItems.slice(virtual.startIndex, virtual.endIndex);

  return (
    <div
      id={id}
      className="rounded-3xl border border-white/5 bg-slate-900/40 p-5 shadow-lg shadow-slate-900/40"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2">
          <Search className="h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics…"
            className="h-10 border-none bg-transparent text-sm text-white placeholder:text-zinc-500 focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1">
            <Filter className="h-3.5 w-3.5" /> Density
          </span>
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/60 p-1">
            {densityOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDensity(option.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] transition",
                  density === option.id
                    ? "bg-accent text-slate-950"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        {["all", "overdue", "due-today", "upcoming"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value as StatusFilter)}
            className={cn(
              "rounded-full border px-3 py-1 transition",
              statusFilter === value
                ? "border-accent/40 bg-accent/20 text-white"
                : "border-white/10 bg-transparent hover:text-white"
            )}
          >
            {value === "all"
              ? "All"
              : STATUS_LABELS[value as TopicStatus].label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        {subjectChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => handleToggleSubject(chip.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 transition",
              subjectFilter.has(chip.id)
                ? "border-accent/40 bg-accent/20 text-white"
                : "border-white/10 bg-transparent hover:text-white"
            )}
          >
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: chip.color }}
            />
            {chip.label}
            <span className="text-[10px] text-zinc-400">{chip.count}</span>
          </button>
        ))}
        {subjectFilter.size > 0 ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-xs text-zinc-400 hover:text-white"
            onClick={() => setSubjectFilter(new Set())}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
        <span>Sort by:</span>
        {["next", "title", "subject", "recent"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSortOption(value as SortOption)}
            className={cn(
              "rounded-full border px-3 py-1 transition",
              sortOption === value
                ? "border-accent/40 bg-accent/20 text-white"
                : "border-white/10 bg-transparent hover:text-white"
            )}
          >
            {value === "next"
              ? "Next review"
              : value === "title"
              ? "Topic name"
              : value === "subject"
              ? "Subject"
              : "Recently reviewed"}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="mt-5 max-h-[560px] overflow-auto rounded-3xl border border-white/5 bg-slate-950/40"
      >
        {items.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-accent">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">No topics yet</h3>
              <p className="text-sm text-zinc-400">Create your first topic to start reviewing.</p>
            </div>
            <Button onClick={onCreateTopic} className="gap-2 rounded-2xl">
              <Sparkles className="h-4 w-4" /> Add topic
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-2 p-10 text-center text-sm text-zinc-400">
            <p>No topics match your filters.</p>
          </div>
        ) : (
          <div style={{ height: `${virtual.totalHeight}px`, position: "relative" }}>
            {visibleRows.map((row, index) => {
              const actualIndex = virtual.startIndex + index;
              const top = virtual.prefix[actualIndex];
              return (
                <div
                  key={row.topic.id}
                  style={{ transform: `translateY(${top}px)` }}
                  className="absolute left-0 right-0"
                >
                  <TopicListRow
                    item={row}
                    subject={row.subject ?? subjectLookup.get(row.topic.subjectId ?? "") ?? null}
                    expanded={expandedId === row.topic.id}
                    onToggleExpand={() => setExpandedId((current) => (current === row.topic.id ? null : row.topic.id))}
                    density={density}
                    timezone={timezone}
                    zonedNow={zonedNow}
                    onEdit={() => handleEdit(row.topic.id)}
                    editing={editingId === row.topic.id}
                    onMeasure={(height) => handleMeasure(row.topic.id, height)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface TopicListRowProps {
  item: TopicListItem;
  subject: Subject | null;
  expanded: boolean;
  onToggleExpand: () => void;
  density: Density;
  timezone: string;
  zonedNow: Date;
  onEdit: () => void;
  editing: boolean;
  onMeasure: (height: number) => void;
}

const densityPadding: Record<Density, string> = {
  comfortable: "py-4 px-5",
  compact: "py-3 px-4",
  ultra: "py-2.5 px-4"
};

const densityGap: Record<Density, string> = {
  comfortable: "gap-4",
  compact: "gap-3",
  ultra: "gap-2"
};

const densityText: Record<Density, string> = {
  comfortable: "text-sm",
  compact: "text-[13px]",
  ultra: "text-xs"
};

function TopicListRow({
  item,
  subject,
  expanded,
  onToggleExpand,
  density,
  timezone,
  zonedNow,
  onEdit,
  editing,
  onMeasure
}: TopicListRowProps) {
  const { markReviewed, skipTopic, deleteTopic, setAutoAdjustPreference, trackReviseNowBlocked } = useTopicStore(
    (state) => ({
      markReviewed: state.markReviewed,
      skipTopic: state.skipTopic,
      deleteTopic: state.deleteTopic,
      setAutoAdjustPreference: state.setAutoAdjustPreference,
      trackReviseNowBlocked: state.trackReviseNowBlocked
    })
  );

  const rowRef = React.useRef<HTMLDivElement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = React.useState(false);
  const [showAdjustPrompt, setShowAdjustPrompt] = React.useState(false);
  const [recentlyRevised, setRecentlyRevised] = React.useState(false);
  const pendingReviewSource = React.useRef<"revise-now" | undefined>();

  const autoAdjustPreference = item.topic.autoAdjustPreference ?? "ask";

  React.useLayoutEffect(() => {
    const element = rowRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        onMeasure(entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onMeasure]);

  const todayKey = React.useMemo(
    () => getDayKeyInTimeZone(zonedNow, timezone),
    [zonedNow, timezone]
  );

  const lastReviseKey = React.useMemo(
    () =>
      item.topic.reviseNowLastUsedAt
        ? getDayKeyInTimeZone(item.topic.reviseNowLastUsedAt, timezone)
        : null,
    [item.topic.reviseNowLastUsedAt, timezone]
  );

  const hasUsedReviseToday = lastReviseKey === todayKey;
  const nextAvailability = React.useMemo(
    () => (hasUsedReviseToday ? nextStartOfDayInTimeZone(timezone, zonedNow) : null),
    [hasUsedReviseToday, timezone, zonedNow]
  );
  const nextAvailabilityLabel = React.useMemo(
    () =>
      nextAvailability
        ? formatInTimeZone(nextAvailability, timezone, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })
        : null,
    [nextAvailability, timezone]
  );

  const statusMeta = STATUS_LABELS[item.status];
  const intervalsLabel = item.topic.intervals.map((day) => `${day}d`).join(" • ");
  const reminderLabel = item.topic.reminderTime ? formatTime(item.topic.reminderTime) : "No reminder set";
  const totalReviews = (item.topic.events ?? []).filter((event) => event.type === "reviewed").length;
  const lastReviewedLabel = item.topic.lastReviewedAt ? formatDateWithWeekday(item.topic.lastReviewedAt) : "Never";
  const examDateLabel = subject?.examDate ? formatFullDate(subject.examDate) : null;
  const daysUntilExam = subject?.examDate ? Math.max(0, daysBetween(zonedNow, subject.examDate)) : null;

  const handleMarkReviewed = (adjustFuture?: boolean, source?: "revise-now") => {
    const nowIso = new Date().toISOString();
    const scheduledTime = new Date(item.topic.nextReviewDate).getTime();
    const nowTime = Date.now();
    const due = item.status !== "upcoming";
    const isEarly = nowTime < scheduledTime && !due;

    if (isEarly && typeof adjustFuture === "undefined") {
      if (autoAdjustPreference === "ask") {
        pendingReviewSource.current = source;
        setShowAdjustPrompt(true);
        return;
      }
      const shouldAdjust = autoAdjustPreference === "always";
      const success = markReviewed(item.topic.id, {
        reviewedAt: nowIso,
        adjustFuture: shouldAdjust,
        source,
        timeZone: timezone
      });
      if (success) {
        toast.success(
          source === "revise-now" ? "Great job—logged today’s quick revision." : "Review recorded early"
        );
        setRecentlyRevised(true);
        window.setTimeout(() => setRecentlyRevised(false), 1500);
      } else if (source === "revise-now") {
        toast.error("Already used today. Try again after midnight.");
      }
      return;
    }

    const success = markReviewed(item.topic.id, {
      reviewedAt: nowIso,
      adjustFuture,
      source,
      timeZone: timezone
    });

    if (!success) {
      if (source === "revise-now") {
        toast.error("Already used today. Try again after midnight.");
      }
      return;
    }

    setRecentlyRevised(true);
    window.setTimeout(() => setRecentlyRevised(false), 1500);

    if (source === "revise-now") {
      toast.success("Great job—logged today’s quick revision.");
    } else if (isEarly) {
      toast.success("Review recorded early");
    } else {
      toast.success("Great job! Schedule updated.");
    }
  };

  const handleReviseNow = () => {
    if (hasUsedReviseToday) {
      trackReviseNowBlocked();
      toast.error("Already used today. Try again after midnight.");
      return;
    }

    try {
      handleMarkReviewed(undefined, "revise-now");
    } catch (error) {
      console.error(error);
      toast.error("Could not record that revision. Please try again once you're back online.");
    }
  };

  const dismissAdjustPrompt = () => {
    pendingReviewSource.current = undefined;
    setShowAdjustPrompt(false);
  };

  const confirmDelete = () => {
    deleteTopic(item.topic.id);
    toast("Topic removed", { description: `${item.topic.title} has been archived.` });
    setShowDeleteConfirm(false);
  };

  const confirmSkip = () => {
    skipTopic(item.topic.id);
    toast("Skip noted", {
      description: "Skipped today. Your upcoming sessions have been adjusted — but don’t worry, we’ll keep you on track before your exam."
    });
    setShowSkipConfirm(false);
  };

  const notes = item.topic.notes?.trim() ?? "";
  const [showFullNotes, setShowFullNotes] = React.useState(false);
  const notesPreview = React.useMemo(() => {
    if (!notes) return "No notes added";
    if (notes.length <= 180 || showFullNotes) return notes;
    return `${notes.slice(0, 180)}…`;
  }, [notes, showFullNotes]);

  const nextReviewLabel = `${formatRelativeToNow(item.topic.nextReviewDate)} • ${formatDateWithWeekday(
    item.topic.nextReviewDate
  )}`;

  return (
    <div
      ref={rowRef}
      className={cn(
        "border-b border-white/5 transition",
        recentlyRevised ? "bg-emerald-500/10" : "bg-transparent"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 sm:grid sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_140px_140px] sm:items-center",
          densityPadding[density]
        )}
      >
        <button
          type="button"
          onClick={onToggleExpand}
          className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className={cn("flex flex-col", densityGap[density])}>
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-white" title={item.topic.title}>
              {item.topic.title}
            </p>
            {editing ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-accent">Editing…</span> : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
              style={{ backgroundColor: `${(subject?.color ?? "#64748b")}1f` }}
            >
              <span
                className="inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: subject?.color ?? "#64748b" }}
              />
              {subject ? subject.name : "No subject"}
            </span>
          </div>
        </div>
        <div className={cn("text-sm text-zinc-300", densityText[density])}>{nextReviewLabel}</div>
        <div>
          <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", statusMeta.tone)}>
            {statusMeta.icon}
            {statusMeta.label}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleReviseNow}
              disabled={hasUsedReviseToday}
              className="rounded-2xl"
              title={
                hasUsedReviseToday
                  ? nextAvailabilityLabel
                    ? `You’ve already revised this today. Available again at ${nextAvailabilityLabel}.`
                    : "You’ve already revised this today. Available again after midnight."
                  : "Revise now"
              }
            >
              Revise
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onEdit}
              title="Edit topic"
              className="rounded-full text-zinc-300 hover:text-white"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full text-zinc-300 hover:text-white"
                  title="More actions"
                >
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 rounded-2xl border border-white/10 bg-slate-900/90 p-2 text-sm text-white">
                <button
                  type="button"
                  onClick={() => {
                    setShowSkipConfirm(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-zinc-200 transition hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" /> Skip today
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-rose-200 transition hover:bg-rose-500/20"
                >
                  <Trash2 className="h-4 w-4" /> Delete topic
                </button>
              </PopoverContent>
            </Popover>
          </div>
          {hasUsedReviseToday && (
            <span className="text-[11px] text-zinc-500">
              {nextAvailabilityLabel
                ? `Available again at ${nextAvailabilityLabel}`
                : "Available again after midnight"}
            </span>
          )}
        </div>
      </div>

      {expanded ? (
        <div className="grid gap-4 border-t border-white/5 bg-slate-950/40 px-5 py-4 text-sm text-zinc-300 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Schedule</p>
            <ul className="space-y-1 text-xs text-zinc-300">
              <li>
                <span className="text-zinc-400">Reminder:</span> {reminderLabel}
              </li>
              <li>
                <span className="text-zinc-400">Intervals:</span> {intervalsLabel}
              </li>
              <li>
                <span className="text-zinc-400">Last reviewed:</span> {lastReviewedLabel}
              </li>
              <li>
                <span className="text-zinc-400">Total reviews:</span> {totalReviews}
              </li>
              {examDateLabel ? (
                <li>
                  <span className="text-zinc-400">Exam:</span> {examDateLabel}
                  {typeof daysUntilExam === "number" ? ` • ${daysUntilExam} day${daysUntilExam === 1 ? "" : "s"} left` : ""}
                </li>
              ) : null}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Notes</p>
            <p className="whitespace-pre-line text-xs text-zinc-200">{notesPreview}</p>
            {notes.length > 180 ? (
              <button
                type="button"
                onClick={() => setShowFullNotes((value) => !value)}
                className="text-xs font-semibold text-accent hover:underline"
              >
                {showFullNotes ? "Show less" : "View more"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

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
        onClose={dismissAdjustPrompt}
        title="You studied this earlier than planned"
        description="Adjust future intervals to reflect your progress?"
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
                label: "Always auto-adjust",
                action: () => {
                  const source = pendingReviewSource.current;
                  setAutoAdjustPreference(item.topic.id, "always");
                  dismissAdjustPrompt();
                  handleMarkReviewed(true, source);
                }
              }
            : null,
          autoAdjustPreference !== "never"
            ? {
                label: "Never auto-adjust",
                action: () => {
                  const source = pendingReviewSource.current;
                  setAutoAdjustPreference(item.topic.id, "never");
                  dismissAdjustPrompt();
                  handleMarkReviewed(false, source);
                }
              }
            : null
        ].filter(Boolean) as { label: string; action: () => void }[]}
      />
    </div>
  );
}
