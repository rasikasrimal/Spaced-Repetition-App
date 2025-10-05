
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { QuickRevisionDialog } from "@/components/dashboard/quick-revision-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconPreview } from "@/components/icon-preview";
import { useTopicStore } from "@/stores/topics";
import { Subject, Topic } from "@/types/topic";
import type { RiskScore } from "@/lib/forgetting-curve";
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
  nextStartOfDayInTimeZone,
  startOfDayInTimeZone
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { FALLBACK_SUBJECT_COLOR } from "@/lib/colors";
import { REVISE_LOCKED_MESSAGE } from "@/lib/constants";
import { toast } from "sonner";

export type TopicStatus = "overdue" | "due-today" | "upcoming";

export interface TopicListItem {
  topic: Topic;
  subject: Subject | null;
  status: TopicStatus;
  risk: RiskScore;
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
const SORT_STORAGE_KEY = "dashboard-topic-sort";
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const REVIEW_CHART_DAYS = 14;

type ReviewLoadPoint = {
  iso: string;
  label: string;
  axisLabel: string;
  count: number;
};

const STATUS_META: Record<
  TopicStatus,
  { label: string; badgeClass: string; textClass: string; icon: React.ReactNode }
> = {
  overdue: {
    label: "Overdue",
    badgeClass: "status-chip status-chip--overdue",
    textClass: "status-text status-text--overdue",
    icon: <Flame className="h-3.5 w-3.5" aria-hidden="true" />
  },
  "due-today": {
    label: "Due today",
    badgeClass: "status-chip status-chip--due-today",
    textClass: "status-text status-text--due",
    icon: <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
  },
  upcoming: {
    label: "Upcoming",
    badgeClass: "status-chip status-chip--upcoming",
    textClass: "status-text status-text--upcoming",
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
  const [subjectSearch, setSubjectSearch] = React.useState("");
  const searchFieldRef = React.useRef<HTMLInputElement | null>(null);
  const appliedFiltersDescriptionId = React.useId();
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!subjectOpen) {
      setSubjectSearch("");
    }
  }, [subjectOpen]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(SORT_STORAGE_KEY);
    if (!stored) return;
    if (stored === "next" || stored === "title" || stored === "subject" || stored === "recent") {
      setSortOption(stored);
    }
  }, []);

  React.useEffect(() => {
    if (!subjectOpen) {
      setSubjectSearch("");
    }
  }, [subjectOpen]);

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
    window.sessionStorage.setItem(SORT_STORAGE_KEY, sortOption);
  }, [sortOption]);

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
    onStatusFilterChange("due-today");
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
        color: FALLBACK_SUBJECT_COLOR,
        count: noSubjectCount
      });
    }
    return options;
  }, [items, subjects]);

  const allSubjectIds = React.useMemo(() => subjectOptions.map((option) => option.id), [subjectOptions]);
  const totalSubjectOptions = subjectOptions.length;

  const normalizedSubjectSearch = subjectSearch.trim().toLowerCase();
  const filteredSubjectOptions = React.useMemo(() => {
    if (!normalizedSubjectSearch) {
      return subjectOptions;
    }
    return subjectOptions.filter((option) =>
      option.name.toLowerCase().includes(normalizedSubjectSearch)
    );
  }, [subjectOptions, normalizedSubjectSearch]);

  const selectedSubjectCount = subjectFilter === null ? totalSubjectOptions : subjectFilter.size;
  const allSubjectsSelected = subjectFilter === null || selectedSubjectCount === totalSubjectOptions;

  const subjectsLabel = allSubjectsSelected ? "Subjects: All" : `Subjects: ${selectedSubjectCount} selected`;

  const filterDescriptions = React.useMemo(() => {
    const descriptions: string[] = [];
    if (statusFilter !== "due-today") {
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
            if (a.risk.score !== b.risk.score) {
              return b.risk.score - a.risk.score;
            }
            return new Date(a.topic.nextReviewDate).getTime() - new Date(b.topic.nextReviewDate).getTime();
        }
      });
  }, [items, searchQuery, statusFilter, subjectFilter, sortOption]);

  const dueNowCount = React.useMemo(
    () => filteredItems.filter((item) => item.status !== "upcoming").length,
    [filteredItems]
  );

  const reviewChartData = React.useMemo(() => {
    const baseStart = startOfDayInTimeZone(zonedNow, timezone);
    if (Number.isNaN(baseStart.getTime())) {
      return [] as ReviewLoadPoint[];
    }

    const buckets = Array.from({ length: REVIEW_CHART_DAYS }, (_, index) => {
      const bucketDate = new Date(baseStart.getTime() + index * DAY_IN_MS);
      return {
        iso: bucketDate.toISOString(),
        label: formatInTimeZone(bucketDate, timezone, {
          weekday: "short",
          month: "short",
          day: "numeric"
        }),
        axisLabel: formatInTimeZone(bucketDate, timezone, { weekday: "short" }),
        count: 0
      } satisfies ReviewLoadPoint;
    });

    const counts = new Array(REVIEW_CHART_DAYS).fill(0);

    for (const item of filteredItems) {
      const nextReviewStart = startOfDayInTimeZone(item.topic.nextReviewDate, timezone);
      if (Number.isNaN(nextReviewStart.getTime())) continue;
      const diff = Math.round((nextReviewStart.getTime() - baseStart.getTime()) / DAY_IN_MS);
      const bucketIndex = Math.min(Math.max(diff, 0), REVIEW_CHART_DAYS - 1);
      counts[bucketIndex] += 1;
    }

    return buckets.map((bucket, index) => ({
      ...bucket,
      count: counts[index]
    }));
  }, [filteredItems, timezone, zonedNow]);

  const [editingId, setEditingId] = React.useState<string | null>(null);

  const totalFilteredCount = filteredItems.length;
  const totalHiddenCount = items.length - totalFilteredCount;

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
      className="rounded-[32px] border border-inverse/5 bg-card/50 p-5 backdrop-blur xl:p-8"
    >
      <div className="flex flex-col gap-5 xl:gap-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div role="search" className="w-full lg:max-w-2xl lg:flex-1 lg:min-w-0">
            <label htmlFor="dashboard-topic-search" className="sr-only">
              Search topics
            </label>
            <div
              className={cn(
                "group relative flex h-12 w-full min-w-0 items-center rounded-2xl border border-inverse/10 bg-bg/85 px-4 text-base text-fg transition",
                "hover:border-inverse/20",
                searchFocused
                  ? "border-accent ring-2 ring-accent/45 ring-offset-2 ring-offset-bg"
                  : "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/45 focus-within:ring-offset-2 focus-within:ring-offset-bg"
              )}
            >
              <Search
                className="pointer-events-none absolute left-4 h-5 w-5 flex-none text-muted-foreground"
                aria-hidden="true"
              />
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
                className="h-full w-full rounded-2xl bg-transparent pl-10 pr-12 text-sm text-fg placeholder:text-muted-foreground focus:outline-none"
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
                  "absolute right-3 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-muted-foreground transition",
                  "hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
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
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground/80">
              <p className="flex items-center gap-1">
                <span className="rounded-full border border-inverse/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  /
                </span>
                to focus search
              </p>
              <p className="flex items-center gap-1">
                <span className="rounded-full border border-inverse/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Esc
                </span>
                clears
              </p>
            </div>
          </div>
          <div className="flex flex-none items-start justify-end">
            <Button
              type="button"
              onClick={onCreateTopic}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Add topic
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div
              className="flex min-w-0 gap-2 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth snap-x snap-mandatory"
              role="group"
              aria-label="Filter by status"
            >
              {statusFilters.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStatusFilterChange(value)}
                  aria-pressed={statusFilter === value}
                  className={cn(
                    "flex-shrink-0 snap-start rounded-md border px-3 py-1.5 text-sm font-medium uppercase tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                    statusFilter === value
                      ? "border-primary bg-primary/10 text-primary font-semibold hover:bg-primary/15"
                      : "border-transparent text-muted-foreground hover:bg-accent/20 hover:text-fg"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-none items-center gap-2 whitespace-nowrap">
              <Popover open={subjectOpen} onOpenChange={setSubjectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="inline-flex items-center gap-2 rounded-full border-inverse/15 bg-card/60 px-3 py-1 text-xs text-fg/80 hover:border-inverse/25 hover:text-fg"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {subjectsLabel}
                    <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 rounded-2xl border border-inverse/10 bg-card/95 p-3 text-sm text-fg">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subjects</span>
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
                        className="text-xs font-medium text-muted-foreground hover:underline"
                        onClick={() => onSubjectFilterChange(new Set<string>())}
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label htmlFor="subject-filter-search" className="sr-only">
                      Search subjects
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" aria-hidden="true" />
                      <Input
                        id="subject-filter-search"
                        type="search"
                        value={subjectSearch}
                        onChange={(event) => setSubjectSearch(event.target.value)}
                        placeholder="Search subjects"
                        className="h-9 w-full rounded-xl border-inverse/10 bg-bg/80 pl-9 pr-3 text-xs text-fg placeholder:text-muted-foreground/80 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                      />
                    </div>
                  </div>
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                    {subjectOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No subjects yet.</p>
                    ) : filteredSubjectOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No matching subjects.</p>
                    ) : (
                      filteredSubjectOptions.map((option) => {
                        const isChecked = subjectFilter === null ? true : subjectFilter.has(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleSubject(option.id)}
                            role="menuitemcheckbox"
                            aria-checked={isChecked}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-inverse/10"
                          >
                            <span className="flex items-center gap-2">
                              <span className="flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.color }} />
                              {option.name}
                            </span>
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                              {option.count}
                              <span
                                className={cn(
                                  "flex h-5 w-5 items-center justify-center rounded-full border",
                                  isChecked
                                    ? "border-accent bg-accent/20 text-accent"
                                    : "border-inverse/20 text-muted-foreground/80"
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
                    className="inline-flex items-center gap-2 rounded-full border-inverse/15 bg-card/60 px-3 py-1 text-xs text-fg/80 hover:border-inverse/25 hover:text-fg"
                  >
                    <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" /> Sort by: {sortLabels[sortOption]}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 rounded-2xl border border-inverse/10 bg-card/95 p-2 text-sm text-fg">
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
                          sortOption === value ? "bg-accent/20 text-fg" : "hover:bg-inverse/10 hover:text-fg"
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
        </div>

        <ReviewLoadChart data={reviewChartData} dueNowCount={dueNowCount} totalCount={totalFilteredCount} />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground" aria-live="polite">
          <span>
            Showing {totalFilteredCount} of {items.length} topics
            {totalHiddenCount > 0 ? ` • ${totalHiddenCount} hidden by filters` : ""}
          </span>
          {searchInput || statusFilter !== "due-today" || subjectFilter !== null ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto text-xs font-medium text-muted-foreground transition hover:text-fg hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="mt-2">
          {items.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center gap-4 rounded-3xl border border-inverse/5 bg-bg/40 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                <Sparkles className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-fg">No topics yet</h3>
                <p className="text-sm text-muted-foreground">Create your first topic to start reviewing.</p>
              </div>
              <Button onClick={onCreateTopic} className="gap-2 rounded-2xl">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Add topic
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center gap-4 rounded-3xl border border-inverse/5 bg-bg/40 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No topics match {searchQuery ? `‘${searchQuery}’` : "your current filters"}. Try clearing Subjects or changing the status.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearSearch}
                  disabled={!searchInput && !searchQuery}
                  className="rounded-full border-inverse/20 bg-transparent px-4 py-2 text-sm text-fg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-40"
                >
                  Clear search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilters}
                  disabled={statusFilter === "due-today" && (subjectFilter === null || subjectFilter.size === totalSubjectOptions)}
                  className="rounded-full border-inverse/20 bg-transparent px-4 py-2 text-sm text-fg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-40"
                >
                  Reset filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-inverse/5 bg-bg/40">
              <div className="hidden border-b border-inverse/5 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto]">
                <span>Topic</span>
                <span>Subject</span>
                <span>Next review</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-border/40">
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

interface ReviewLoadChartProps {
  data: ReviewLoadPoint[];
  dueNowCount: number;
  totalCount: number;
}

function ReviewLoadChart({ data, dueNowCount, totalCount }: ReviewLoadChartProps) {
  const gradientId = React.useId();
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [isHovered, setIsHovered] = React.useState(false);

  const safeData = data.length > 0 ? data : Array.from({ length: REVIEW_CHART_DAYS }, (_, index) => ({
    iso: `placeholder-${index}`,
    label: "",
    axisLabel: "",
    count: 0
  }));

  const maxValue = React.useMemo(
    () => safeData.reduce((acc, point) => Math.max(acc, point.count), 0),
    [safeData]
  );

  const effectiveMax = maxValue === 0 ? 1 : maxValue;
  const width = 100;
  const height = 48;
  const paddingX = 6;
  const paddingY = 6;

  const xForIndex = React.useCallback(
    (index: number) => {
      if (safeData.length <= 1) return paddingX;
      const ratio = index / (safeData.length - 1);
      return paddingX + ratio * (width - paddingX * 2);
    },
    [safeData.length]
  );

  const yForValue = React.useCallback(
    (value: number) => {
      const ratio = value / effectiveMax;
      return height - paddingY - ratio * (height - paddingY * 2);
    },
    [effectiveMax]
  );

  const areaPath = React.useMemo(() => {
    if (safeData.length === 0) return "";
    const baseY = height - paddingY;
    const segments = [`M ${xForIndex(0)} ${baseY}`, `L ${xForIndex(0)} ${yForValue(safeData[0].count)}`];
    for (let index = 1; index < safeData.length; index += 1) {
      segments.push(`L ${xForIndex(index)} ${yForValue(safeData[index].count)}`);
    }
    segments.push(`L ${xForIndex(safeData.length - 1)} ${baseY}`, "Z");
    return segments.join(" ");
  }, [safeData, xForIndex, yForValue, height, paddingY]);

  const linePath = React.useMemo(() => {
    if (safeData.length === 0) return "";
    const commands: string[] = [];
    for (let index = 0; index < safeData.length; index += 1) {
      const point = safeData[index];
      commands.push(`${index === 0 ? "M" : "L"} ${xForIndex(index)} ${yForValue(point.count)}`);
    }
    return commands.join(" ");
  }, [safeData, xForIndex, yForValue]);

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (safeData.length === 0) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const ratio = bounds.width === 0 ? 0 : (event.clientX - bounds.left) / bounds.width;
      const index = Math.round(ratio * (safeData.length - 1));
      setHoverIndex(Math.max(0, Math.min(safeData.length - 1, index)));
    },
    [safeData.length]
  );

  const handlePointerEnter = React.useCallback(() => {
    setIsHovered(true);
  }, []);

  const handlePointerLeave = React.useCallback(() => {
    setIsHovered(false);
    setHoverIndex(null);
  }, []);

  const hoveredPoint = hoverIndex !== null ? safeData[hoverIndex] : null;
  const hoveredX = hoveredPoint !== null ? xForIndex(hoverIndex as number) : null;
  const hoveredY = hoveredPoint !== null ? yForValue(hoveredPoint.count) : null;
  const tooltipLeft = hoveredX !== null ? Math.max(0, Math.min(1, hoveredX / width)) * 100 : 0;

  const labelStep = React.useMemo(() => {
    if (safeData.length <= 1) return 1;
    return Math.max(1, Math.ceil(safeData.length / 6));
  }, [safeData.length]);

  const srDescription = `Upcoming review load over the next ${safeData.length} days. ${dueNowCount} topics due now out of ${totalCount} filtered topics.`;

  return (
    <div className="group/chart relative mt-4 rounded-lg border border-border/40 bg-muted/30 p-4 shadow-sm transition-colors hover:bg-muted/40 dark:shadow-none">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review load preview</p>
        <span className="text-xs text-muted-foreground">{totalCount} topics filtered</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Due now: <span className="font-semibold text-fg">{dueNowCount}</span>
      </p>
      <span className="sr-only">{srDescription}</span>
      <div className="relative mt-3 w-full">
        <svg
          role="img"
          aria-label="Area chart showing upcoming review counts"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-36 w-full cursor-crosshair select-none text-accent transition-colors duration-200"
          onPointerMove={handlePointerMove}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          {Array.from({ length: 4 }).map((_, index) => {
            const ratio = index / 3;
            const y = paddingY + ratio * (height - paddingY * 2);
            return (
              <line
                key={`grid-${index}`}
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeWidth={0.5}
                strokeOpacity={isHovered ? 0.8 : 0.6}
                className="text-muted-foreground/60 transition-opacity duration-200"
              />
            );
          })}
          <path d={areaPath} fill={`url(#${gradientId})`} opacity={isHovered ? 0.9 : 0.75} />
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth={isHovered ? 2.5 : 2}
            className="transition-all duration-200"
            style={{ filter: isHovered ? "drop-shadow(0px 6px 12px rgba(33, 206, 153, 0.25))" : "none" }}
          />
          {hoveredPoint && hoveredX !== null ? (
            <>
              <line
                x1={hoveredX}
                x2={hoveredX}
                y1={paddingY}
                y2={height - paddingY}
                stroke="currentColor"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              <circle cx={hoveredX} cy={hoveredY ?? height - paddingY} r={3} fill="currentColor" />
            </>
          ) : null}
        </svg>
        <div
          className={cn(
            "pointer-events-none absolute -translate-x-1/2 -translate-y-3 rounded-md bg-card/90 px-2 py-1 text-xs font-medium text-fg shadow-sm transition-opacity duration-150",
            hoveredPoint ? "opacity-100" : "opacity-0"
          )}
          style={{ left: `${tooltipLeft}%`, top: 0 }}
        >
          {hoveredPoint ? (
            <>
              <span className="block text-[11px] text-muted-foreground">{hoveredPoint.label}</span>
              <span className="block text-sm font-semibold text-accent">{hoveredPoint.count} topics</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-1 text-[10px] text-muted-foreground/80">
        {safeData.map((point, index) => {
          const isEdge = index === 0 || index === safeData.length - 1;
          const shouldShow = isEdge || index % labelStep === 0;
          return (
            <span
              key={`${point.iso}-${index}`}
              className={cn(
                "flex-1 text-center",
                index === 0 && "text-left",
                index === safeData.length - 1 && "text-right"
              )}
              aria-hidden={!shouldShow}
            >
              {shouldShow ? point.axisLabel : "\u00a0"}
            </span>
          );
        })}
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
  const lockedDescriptionId = React.useId();

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
  const nextAvailabilityMessage = REVISE_LOCKED_MESSAGE;
  const nextAvailabilitySubtext = nextAvailability
    ? `Available again after midnight (${formatInTimeZone(nextAvailability, timezone, {
        month: "short",
        day: "numeric",
        timeZoneName: "short"
      })})`
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
        toast.error(REVISE_LOCKED_MESSAGE);
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
        toast.error(REVISE_LOCKED_MESSAGE);
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
      toast.error(REVISE_LOCKED_MESSAGE);
      return;
    }
    setShowDeleteConfirm(false);
    setShowSkipConfirm(false);
    setShowAdjustPrompt(false);
    pendingReviewSource.current = undefined;
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
    <div className={cn("transition-colors", recentlyRevised ? "bg-success/10" : "bg-transparent")}
    >
      <div className="flex flex-col gap-3 px-4 py-4 md:grid md:grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center md:gap-4 md:px-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-0.5 inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border border-inverse/10 bg-inverse/5 text-fg transition hover:bg-inverse/10"
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
                <p className="truncate text-base font-semibold text-fg" title={item.topic.title}>
                  {item.topic.title}
                </p>
                {editing ? (
                  <span className="rounded-full bg-inverse/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                    Editing…
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-inverse/10 bg-inverse/5 px-2.5 py-1"
                  style={{ backgroundColor: `${(subject?.color ?? FALLBACK_SUBJECT_COLOR)}1f` }}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-inverse/15 text-fg">
                    <IconPreview name={subject?.icon ?? "Sparkles"} className="h-3.5 w-3.5" />
                  </span>
                  <span>{subject ? subject.name : "No subject"}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" aria-hidden="true" /> {nextReviewRelativeLabel}
                </span>
                <span className={cn("inline-flex items-center gap-1", statusMeta.textClass)}>
                  {statusMeta.icon}
                  {statusMeta.label}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden min-w-0 items-center gap-2 text-sm text-fg/80 md:flex">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-inverse/10 bg-inverse/5 px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: `${(subject?.color ?? FALLBACK_SUBJECT_COLOR)}1f` }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-inverse/15 text-fg">
              <IconPreview name={subject?.icon ?? "Sparkles"} className="h-3.5 w-3.5" />
            </span>
            {subject ? subject.name : "No subject"}
          </span>
        </div>
        <div className="hidden min-w-0 flex-col text-sm text-inverse md:flex">
          <span className="font-medium text-fg">{nextReviewDateLabel}</span>
          <span className="text-xs text-muted-foreground">{nextReviewRelativeLabel}</span>
        </div>
        <div className="hidden md:flex">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs",
              statusMeta.badgeClass
            )}
          >
            {statusMeta.icon}
            {statusMeta.label}
          </span>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button
            size="lg"
            onClick={(event) => handleReviseNow(event)}
            disabled={hasUsedReviseToday || isLoggingRevision}
            className="min-w-[6.5rem] rounded-full px-5"
            title={hasUsedReviseToday ? nextAvailabilityMessage : "Log today’s revision"}
            aria-label={hasUsedReviseToday ? "Revise locked until after midnight" : "Log today’s revision"}
            aria-describedby={hasUsedReviseToday ? lockedDescriptionId : undefined}
          >
            Revise
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            title="Edit topic"
            aria-label="Edit topic"
            className="h-11 w-11 rounded-full text-muted-foreground hover:text-fg"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11 rounded-full text-muted-foreground hover:text-fg"
                title="More actions"
                aria-label="More topic actions"
              >
                <Ellipsis className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 rounded-2xl border border-inverse/10 bg-card/95 p-2 text-sm text-fg">
              <button
                type="button"
                onClick={() => {
                  setShowSkipConfirm(true);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-fg/80 transition hover:bg-inverse/10"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Skip today
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-error/20 transition hover:bg-error/20"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete topic
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {hasUsedReviseToday ? (
        <>
          <p className="px-6 text-[11px] text-muted-foreground/80 md:text-right">{nextAvailabilitySubtext}</p>
          <span id={lockedDescriptionId} className="sr-only">
            {nextAvailabilityMessage}
          </span>
        </>
      ) : null}
      {expanded ? (
        <div
          id={`topic-details-${item.topic.id}`}
          className="border-t border-inverse/5 bg-bg/40 px-4 py-4 text-sm text-muted-foreground md:px-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>
                  <span className="text-muted-foreground">Reminder:</span> {reminderLabel}
                </li>
                <li>
                  <span className="text-muted-foreground">Intervals:</span> {intervalsLabel}
                </li>
                <li>
                  <span className="text-muted-foreground">Last reviewed:</span> {lastReviewedLabel}
                </li>
                <li>
                  <span className="text-muted-foreground">Total reviews:</span> {totalReviews}
                </li>
                {examDateLabel ? (
                  <li>
                    <span className="text-muted-foreground">Exam:</span> {examDateLabel}
                    {typeof daysUntilExam === "number" ? ` • ${daysUntilExam} day${daysUntilExam === 1 ? "" : "s"} left` : ""}
                  </li>
                ) : null}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="whitespace-pre-line text-xs text-fg/80">{notesPreview}</p>
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
