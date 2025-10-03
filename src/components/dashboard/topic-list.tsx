
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { QuickRevisionDialog } from "@/components/dashboard/quick-revision-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTopicStore } from "@/stores/topics";
import { Subject, Topic } from "@/types/topic";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Ellipsis,
  Flame,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import {
  daysBetween,
  formatDateWithWeekday,
  formatFullDate,
  formatInTimeZone,
  formatRelativeToNow,
  formatTime,
  getDayKeyInTimeZone,
  nextStartOfDayInTimeZone
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type TopicStatus = "overdue" | "due-today" | "upcoming";

export interface TopicListItem {
  topic: Topic;
  subject: Subject | null;
  status: TopicStatus;
}

export type StatusFilter = "all" | TopicStatus;
export type SortOption = "next" | "title" | "subject" | "recent";
export type SubjectFilterValue = Set<string> | null;

type SubjectOption = {
  id: string;
  name: string;
  color: string;
  count: number;
};

export const NO_SUBJECT_KEY = "__none";

const SEARCH_STORAGE_KEY = "dashboard-topic-search";

const STATUS_META: Record<TopicStatus, { label: string; tone: string; subtle: string; icon: React.ReactNode }> = {
  overdue: {
    label: "Overdue",
    tone: "bg-rose-500/15 text-rose-200 border border-rose-400/20",
    subtle: "text-rose-200",
    icon: <Flame className="h-3.5 w-3.5" aria-hidden="true" />
  },
  "due-today": {
    label: "Due today",
    tone: "bg-amber-500/15 text-amber-200 border border-amber-400/20",
    subtle: "text-amber-200",
    icon: <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
  },
  upcoming: {
    label: "Upcoming",
    tone: "bg-sky-500/15 text-sky-200 border border-sky-400/20",
    subtle: "text-sky-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
  }
};

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due-today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" }
];

const sortLabels: Record<SortOption, string> = {
  next: "Next review",
  title: "Topic name",
  subject: "Subject",
  recent: "Recently reviewed"
};

interface TopicListProps {
  id?: string;
  items: TopicListItem[];
  subjects: Subject[];
  timezone: string;
  zonedNow: Date;
  onEditTopic: (id: string) => void;
  onCreateTopic: () => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  subjectFilter: SubjectFilterValue;
  onSubjectFilterChange: (value: SubjectFilterValue) => void;
}

export function TopicList({
  id,
  items,
  subjects,
  timezone,
  zonedNow,
  onEditTopic,
  onCreateTopic,
  statusFilter,
  onStatusFilterChange,
  subjectFilter,
  onSubjectFilterChange
}: TopicListProps) {
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortOption, setSortOption] = React.useState<SortOption>("next");
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [subjectOpen, setSubjectOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const searchFieldRef = React.useRef<HTMLInputElement | null>(null);
  const appliedFiltersDescriptionId = React.useId();
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(SEARCH_STORAGE_KEY);
    if (stored) {
      setSearchInput(stored);
      setSearchQuery(stored);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(SEARCH_STORAGE_KEY, searchInput);
  }, [searchInput]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = window.setTimeout(() => {
      setSearchQuery((current) => (current === searchInput ? current : searchInput));
    }, 150);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key !== "/") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tagName = target.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || target.isContentEditable) {
        return;
      }
      event.preventDefault();
      window.requestAnimationFrame(() => {
        searchFieldRef.current?.focus({ preventScroll: true });
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const focusSearchField = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      searchFieldRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const clearSearch = React.useCallback(
    (shouldRefocus: boolean) => {
      setSearchInput("");
      setSearchQuery("");
      if (shouldRefocus) {
        focusSearchField();
      }
    },
    [focusSearchField]
  );

  const handleClearSearch = React.useCallback(() => {
    clearSearch(true);
  }, [clearSearch]);

  const handleResetFilters = React.useCallback(() => {
    onStatusFilterChange("all");
    onSubjectFilterChange(null);
    setSubjectOpen(false);
  }, [onStatusFilterChange, onSubjectFilterChange]);

  const subjectLookup = React.useMemo(() => {
    const map = new Map<string, Subject>();
    for (const subject of subjects) {
      map.set(subject.id, subject);
    }
    return map;
  }, [subjects]);

  const subjectOptions = React.useMemo<SubjectOption[]>(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = item.subject?.id ?? NO_SUBJECT_KEY;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const options: SubjectOption[] = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      color: subject.color,
      count: counts.get(subject.id) ?? 0
    }));
    const noSubjectCount = counts.get(NO_SUBJECT_KEY) ?? 0;
    if (noSubjectCount > 0) {
      options.push({
        id: NO_SUBJECT_KEY,
        name: "No subject",
        color: "#64748b",
        count: noSubjectCount
      });
    }
    return options;
  }, [items, subjects]);

  const allSubjectIds = React.useMemo(() => subjectOptions.map((option) => option.id), [subjectOptions]);
  const totalSubjectOptions = subjectOptions.length;

  const selectedSubjectCount = subjectFilter === null ? totalSubjectOptions : subjectFilter.size;
  const allSubjectsSelected = subjectFilter === null || selectedSubjectCount === totalSubjectOptions;

  const subjectsLabel = allSubjectsSelected ? "Subjects: All" : `Subjects: ${selectedSubjectCount} selected`;

  const filterDescriptions = React.useMemo(() => {
    const descriptions: string[] = [];
    if (statusFilter !== "all") {
      descriptions.push(`Status ${STATUS_META[statusFilter].label}`);
    }
    if (subjectFilter !== null) {
      if (subjectFilter.size === 0) {
        descriptions.push("No subjects selected");
      } else {
        const names = subjectOptions
          .filter((option) => subjectFilter.has(option.id))
          .map((option) => option.name);
        if (names.length > 0) {
          descriptions.push(`Subjects ${names.join(", ")}`);
        }
      }
    }
    return descriptions.join("; ");
  }, [statusFilter, subjectFilter, subjectOptions]);

  const filteredItems = React.useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const matchesSearch = (item: TopicListItem) => {
      if (!normalizedSearch) return true;
      const haystacks = [item.topic.title, item.topic.notes ?? "", item.subject?.name ?? ""];
      return haystacks.some((value) => value.toLowerCase().includes(normalizedSearch));
    };

    const matchesStatus = (status: TopicStatus) => (statusFilter === "all" ? true : status === statusFilter);

    const matchesSubject = (subjectId: string | null) => {
      if (subjectFilter === null) return true;
      const key = subjectId ?? NO_SUBJECT_KEY;
      return subjectFilter.has(key);
    };

    return [...items]
      .filter((item) => matchesSearch(item) && matchesStatus(item.status) && matchesSubject(item.subject?.id ?? null))
      .sort((a, b) => {
        switch (sortOption) {
          case "title":
            return a.topic.title.localeCompare(b.topic.title);
          case "subject":
            return (a.subject?.name ?? "").localeCompare(b.subject?.name ?? "");
          case "recent":
            return (new Date(b.topic.lastReviewedAt ?? 0).getTime() || 0) -
              (new Date(a.topic.lastReviewedAt ?? 0).getTime() || 0);
          case "next":
          default:
            return new Date(a.topic.nextReviewDate).getTime() - new Date(b.topic.nextReviewDate).getTime();
        }
      });
  }, [items, searchQuery, statusFilter, subjectFilter, sortOption]);

  const [editingId, setEditingId] = React.useState<string | null>(null);

  const handleEdit = React.useCallback(
    (id: string) => {
      setEditingId(id);
      onEditTopic(id);
      window.setTimeout(() => setEditingId((current) => (current === id ? null : current)), 2000);
    },
    [onEditTopic]
  );

  const toggleSubject = React.useCallback(
    (optionId: string) => {
      const nextValue: SubjectFilterValue = (() => {
        if (subjectFilter === null) {
          const set = new Set(allSubjectIds);
          set.delete(optionId);
          return set.size === allSubjectIds.length ? null : set;
        }
        const set = new Set(subjectFilter);
        if (set.has(optionId)) {
          set.delete(optionId);
        } else {
          set.add(optionId);
        }
        return set.size === allSubjectIds.length ? null : set;
      })();
      onSubjectFilterChange(nextValue);
    },
    [subjectFilter, onSubjectFilterChange, allSubjectIds]
  );

  return (
    <div
      id={id}
      className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 shadow-lg shadow-slate-900/40"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
          <div role="search" className="xl:flex-1">
            <label htmlFor="dashboard-topic-search" className="sr-only">
              Search topics
            </label>
            <div
              className={cn(
                "group relative flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-white/15 bg-slate-900/70 px-3 text-sm text-white shadow-sm transition",
                "hover:border-white/25 hover:shadow-lg hover:shadow-slate-950/40",
                searchFocused
                  ? "border-accent ring-2 ring-accent/50 ring-offset-2 ring-offset-slate-950"
                  : "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/50 focus-within:ring-offset-2 focus-within:ring-offset-slate-950"
              )}
            >
              <Search className="h-4 w-4 flex-none text-zinc-400" aria-hidden="true" />
              <input
                ref={searchFieldRef}
                id="dashboard-topic-search"
                type="search"
                role="searchbox"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    if (searchInput) {
                      event.preventDefault();
                      clearSearch(false);
                    }
                    (event.currentTarget as HTMLInputElement).blur();
                  }
                }}
                placeholder="Search topics…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-400 focus:outline-none"
                aria-describedby={filterDescriptions ? appliedFiltersDescriptionId : undefined}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                title="Clear search"
                aria-label="Clear search"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault();
                  if (!searchInput) return;
                  handleClearSearch();
                }}
                className={cn(
                  "ml-1 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-zinc-400 transition",
                  "hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  searchInput ? "opacity-100" : "pointer-events-none opacity-0"
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {filterDescriptions ? (
              <span id={appliedFiltersDescriptionId} className="sr-only">
                Active filters: {filterDescriptions}
              </span>
            ) : null}
            <p className="mt-1 text-xs text-zinc-500">Press / to search</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 xl:flex-nowrap xl:justify-end">
            <div
              className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/60 p-1"
              role="group"
              aria-label="Filter by status"
            >
              {statusFilters.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onStatusFilterChange(value)}
                  aria-pressed={statusFilter === value}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition",
                    statusFilter === value
                      ? "bg-accent text-slate-950 hover:bg-accent/90"
                      : "text-zinc-300 hover:text-white"
                  )}
                >
                  {label}
                </Button>
              ))}
            </div>

            <Popover open={subjectOpen} onOpenChange={setSubjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-2 rounded-full border-white/15 bg-slate-900/60 px-3 py-1 text-xs text-zinc-200 hover:border-white/25 hover:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {subjectsLabel}
                  <ChevronDown className="h-3 w-3 text-zinc-400" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 rounded-2xl border border-white/10 bg-slate-900/95 p-3 text-sm text-white shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Subjects</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-accent hover:underline"
                      onClick={() => {
                        onSubjectFilterChange(null);
                        setSubjectOpen(false);
                      }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-zinc-300 hover:underline"
                      onClick={() => onSubjectFilterChange(new Set())}
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                  {subjectOptions.length === 0 ? (
                    <p className="text-xs text-zinc-400">No subjects yet.</p>
                  ) : (
                    subjectOptions.map((option) => {
                      const isChecked = subjectFilter === null ? true : subjectFilter.has(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleSubject(option.id)}
                          role="menuitemcheckbox"
                          aria-checked={isChecked}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/10"
                        >
                          <span className="flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.color }} />
                            {option.name}
                          </span>
                          <span className="flex items-center gap-2 text-xs text-zinc-300">
                            {option.count}
                            <span
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full border",
                                isChecked
                                  ? "border-accent bg-accent/20 text-accent"
                                  : "border-white/20 text-zinc-500"
                              )}
                            >
                              {isChecked ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={sortOpen} onOpenChange={setSortOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-2 rounded-full border-white/15 bg-slate-900/60 px-3 py-1 text-xs text-zinc-200 hover:border-white/25 hover:text-white"
                >
                  <ChevronDown className="h-3 w-3 text-zinc-400" aria-hidden="true" /> Sort by: {sortLabels[sortOption]}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 rounded-2xl border border-white/10 bg-slate-900/95 p-2 text-sm text-white">
                <div className="space-y-1">
                  {(Object.keys(sortLabels) as SortOption[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSortOption(value);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition",
                        sortOption === value ? "bg-accent/20 text-white" : "hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span>{sortLabels[value]}</span>
                      {sortOption === value ? <CheckCircle2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="mt-1">
          {items.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center gap-4 rounded-3xl border border-white/5 bg-slate-950/40 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                <Sparkles className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">No topics yet</h3>
                <p className="text-sm text-zinc-400">Create your first topic to start reviewing.</p>
              </div>
              <Button onClick={onCreateTopic} className="gap-2 rounded-2xl">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Add topic
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center gap-4 rounded-3xl border border-white/5 bg-slate-950/40 p-10 text-center">
              <p className="text-sm text-zinc-300">
                No topics match {searchQuery ? `‘${searchQuery}’` : "your current filters"}. Try clearing Subjects or changing the status.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearSearch}
                  disabled={!searchInput && !searchQuery}
                  className="rounded-full border-white/20 bg-transparent px-4 py-2 text-sm text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-40"
                >
                  Clear search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilters}
                  disabled={statusFilter === "all" && (subjectFilter === null || subjectFilter.size === totalSubjectOptions)}
                  className="rounded-full border-white/20 bg-transparent px-4 py-2 text-sm text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-40"
                >
                  Reset filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/5 bg-slate-950/40">
              <div className="hidden border-b border-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                <span>Topic</span>
                <span>Subject</span>
                <span>Next review</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-white/5">
                {filteredItems.map((row) => (
                  <TopicListRow
                    key={row.topic.id}
                    item={row}
                    subject={row.subject ?? subjectLookup.get(row.topic.subjectId ?? "") ?? null}
                    timezone={timezone}
                    zonedNow={zonedNow}
                    onEdit={() => handleEdit(row.topic.id)}
                    editing={editingId === row.topic.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TopicListRowProps {
  item: TopicListItem;
  subject: Subject | null;
  timezone: string;
  zonedNow: Date;
  onEdit: () => void;
  editing: boolean;
}

function TopicListRow({ item, subject, timezone, zonedNow, onEdit, editing }: TopicListRowProps) {
  const { markReviewed, skipTopic, deleteTopic, setAutoAdjustPreference, trackReviseNowBlocked } = useTopicStore(
    (state) => ({
      markReviewed: state.markReviewed,
      skipTopic: state.skipTopic,
      deleteTopic: state.deleteTopic,
      setAutoAdjustPreference: state.setAutoAdjustPreference,
      trackReviseNowBlocked: state.trackReviseNowBlocked
    })
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = React.useState(false);
  const [showAdjustPrompt, setShowAdjustPrompt] = React.useState(false);
  const [recentlyRevised, setRecentlyRevised] = React.useState(false);
  const pendingReviewSource = React.useRef<"revise-now" | undefined>();
  const [showQuickRevision, setShowQuickRevision] = React.useState(false);
  const revisionTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [isLoggingRevision, setIsLoggingRevision] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const autoAdjustPreference = item.topic.autoAdjustPreference ?? "ask";

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
  const nextAvailabilityDateLabel = React.useMemo(
    () =>
      nextAvailability
        ? formatInTimeZone(nextAvailability, timezone, {
            weekday: "short",
            month: "short",
            day: "numeric"
          })
        : null,
    [nextAvailability, timezone]
  );
  const nextAvailabilityMessage = nextAvailabilityDateLabel
    ? `You’ve already revised this today. Available again after midnight on ${nextAvailabilityDateLabel}.`
    : "You’ve already revised this today. Available again after midnight.";
  const nextAvailabilitySubtext = nextAvailabilityDateLabel
    ? `Available again after midnight on ${nextAvailabilityDateLabel}`
    : "Available again after midnight";

  const statusMeta = STATUS_META[item.status];
  const intervalsLabel = item.topic.intervals.map((day) => `${day}d`).join(" • ");
  const reminderLabel = item.topic.reminderTime ? formatTime(item.topic.reminderTime) : "No reminder set";
  const totalReviews = (item.topic.events ?? []).filter((event) => event.type === "reviewed").length;
  const lastReviewedLabel = item.topic.lastReviewedAt ? formatDateWithWeekday(item.topic.lastReviewedAt) : "Never";
  const examDateLabel = subject?.examDate ? formatFullDate(subject.examDate) : null;
  const daysUntilExam = subject?.examDate ? Math.max(0, daysBetween(zonedNow, subject.examDate)) : null;

  const handleMarkReviewed = (adjustFuture?: boolean, source?: "revise-now"): boolean => {
    const nowIso = new Date().toISOString();
    const scheduledTime = new Date(item.topic.nextReviewDate).getTime();
    const nowTime = Date.now();
    const due = item.status !== "upcoming";
    const isEarly = nowTime < scheduledTime && !due;

    if (isEarly && typeof adjustFuture === "undefined") {
      if (autoAdjustPreference === "ask") {
        pendingReviewSource.current = source;
        setShowAdjustPrompt(true);
        return false;
      }
      const shouldAdjust = autoAdjustPreference === "always";
      const success = markReviewed(item.topic.id, {
        reviewedAt: nowIso,
        adjustFuture: shouldAdjust,
        source,
        timeZone: timezone
      });
      if (success) {
        toast.success(source === "revise-now" ? "Logged today’s revision" : "Review recorded early");
        setRecentlyRevised(true);
        window.setTimeout(() => setRecentlyRevised(false), 1500);
        return true;
      } else if (source === "revise-now") {
        toast.error("Already used today. Try again after midnight.");
      }
      return false;
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
      return false;
    }

    setRecentlyRevised(true);
    window.setTimeout(() => setRecentlyRevised(false), 1500);

    if (source === "revise-now") {
      toast.success("Logged today’s revision");
    } else if (isEarly) {
      toast.success("Review recorded early");
    } else {
      toast.success("Great job! Schedule updated.");
    }

    return true;
  };

  const handleReviseNow = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (hasUsedReviseToday) {
      trackReviseNowBlocked();
      toast.error("Already used today. Try again after midnight.");
      return;
    }
    revisionTriggerRef.current = event.currentTarget;
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

  const nextReviewDateLabel = formatDateWithWeekday(item.topic.nextReviewDate);
  const nextReviewRelativeLabel = formatRelativeToNow(item.topic.nextReviewDate);

  return (
    <div className={cn("transition-colors", recentlyRevised ? "bg-emerald-500/10" : "bg-transparent")}
    >
      <div className="flex flex-col gap-3 px-4 py-4 md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center md:gap-4 md:px-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              aria-expanded={expanded}
              aria-controls={`topic-details-${item.topic.id}`}
              title={expanded ? "Hide details" : "Show details"}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", expanded ? "rotate-180" : "")}
                aria-hidden="true"
              />
            </button>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white" title={item.topic.title}>
                  {item.topic.title}
                </p>
                {editing ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                    Editing…
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 md:hidden">
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
                  style={{ backgroundColor: `${(subject?.color ?? "#64748b")}1f` }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: subject?.color ?? "#64748b" }}
                  />
                  {subject ? subject.name : "No subject"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" aria-hidden="true" /> {nextReviewRelativeLabel}
                </span>
                <span className="inline-flex items-center gap-1">
                  {statusMeta.icon}
                  {statusMeta.label}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden min-w-0 items-center gap-2 text-sm text-zinc-200 md:flex">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: `${(subject?.color ?? "#64748b")}1f` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject?.color ?? "#64748b" }} />
            {subject ? subject.name : "No subject"}
          </span>
        </div>
        <div className="hidden min-w-0 flex-col text-sm text-zinc-100 md:flex">
          <span className="font-medium text-white">{nextReviewDateLabel}</span>
          <span className="text-xs text-zinc-400">{nextReviewRelativeLabel}</span>
        </div>
        <div className="hidden md:flex">
          <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", statusMeta.tone)}>
            {statusMeta.icon}
            {statusMeta.label}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            onClick={(event) => handleReviseNow(event)}
            disabled={hasUsedReviseToday || isLoggingRevision}
            className="rounded-full px-4"
            title={hasUsedReviseToday ? nextAvailabilityMessage : "Log today’s revision"}
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
            <PopoverContent className="w-48 rounded-2xl border border-white/10 bg-slate-900/95 p-2 text-sm text-white">
              <button
                type="button"
                onClick={() => {
                  setShowSkipConfirm(true);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-zinc-200 transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Skip today
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-rose-200 transition hover:bg-rose-500/20"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete topic
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {hasUsedReviseToday ? (
        <p className="px-6 text-[11px] text-zinc-500 md:text-right">{nextAvailabilitySubtext}</p>
      ) : null}
      {expanded ? (
        <div
          id={`topic-details-${item.topic.id}`}
          className="border-t border-white/5 bg-slate-950/40 px-4 py-4 text-sm text-zinc-300 md:px-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
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

      <QuickRevisionDialog
        open={showQuickRevision}
        onConfirm={handleConfirmQuickRevision}
        onClose={handleCloseQuickRevision}
        topicTitle={item.topic.title}
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
