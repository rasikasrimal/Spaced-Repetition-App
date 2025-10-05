
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { QuickRevisionDialog } from "@/components/dashboard/quick-revision-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTopicStore } from "@/stores/topics";
import { Subject, Topic } from "@/types/topic";
import type { RiskScore } from "@/lib/forgetting-curve";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
      const statusMeta = statusFilter === "all" ? null : STATUS_META[statusFilter];
      if (statusMeta) {
        descriptions.push(`Status ${statusMeta.label}`);
      }
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
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/70">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/50">
                  <thead className="bg-muted/20 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    <tr>
                      <th scope="col" className="w-[32%] min-w-[200px] px-4 py-3 text-left">
                        Topic
                      </th>
                      <th scope="col" className="w-[20%] min-w-[160px] px-4 py-3 text-left">
                        Subject
                      </th>
                      <th scope="col" className="w-[20%] min-w-[160px] px-4 py-3 text-left">
                        Next review
                      </th>
                      <th scope="col" className="w-[16%] min-w-[140px] px-4 py-3 text-left">
                        Status
                      </th>
                      <th scope="col" className="min-w-[140px] px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
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
                  </tbody>
                </table>
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
    event.stopPropagation();
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
  const detailRowId = `topic-details-${item.topic.id}`;
  const subjectName = subject ? subject.name : "No subject";
  const subjectColor = subject?.color ?? FALLBACK_SUBJECT_COLOR;

  const handleRowClick = React.useCallback(() => {
    setExpanded((value) => !value);
  }, [setExpanded]);

  const handleRowKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setExpanded((value) => !value);
    }
  }, [setExpanded]);

  return (
    <>
      <tr
        className={cn(
          "group cursor-pointer align-top transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          recentlyRevised ? "bg-success/10" : "hover:bg-muted/30"
        )}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-controls={detailRowId}
      >
        <td className="px-4 py-3 align-top">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-border/60 bg-muted/20 text-muted-foreground transition-transform",
                expanded ? "rotate-90 text-primary" : ""
              )}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-fg" title={item.topic.title}>
                  {item.topic.title}
                </span>
                {editing ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Editing…
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground md:hidden">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectColor }} />
                  {subjectName}
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
        </td>
        <td className="hidden px-4 py-3 align-top text-sm text-muted-foreground md:table-cell">
          <div className="flex items-center gap-2 truncate">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectColor }} />
            <span className="truncate">{subjectName}</span>
          </div>
        </td>
        <td className="hidden px-4 py-3 align-top md:table-cell">
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-fg">{nextReviewDateLabel}</span>
            <span className="text-xs text-muted-foreground">{nextReviewRelativeLabel}</span>
          </div>
        </td>
        <td className="hidden px-4 py-3 align-top lg:table-cell">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold",
              statusMeta.badgeClass
            )}
          >
            {statusMeta.icon}
            {statusMeta.label}
          </span>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                size="sm"
                onClick={handleReviseNow}
                disabled={hasUsedReviseToday || isLoggingRevision}
                className="rounded-full px-4"
                title={hasUsedReviseToday ? nextAvailabilityMessage : "Log today’s revision"}
                aria-label={hasUsedReviseToday ? "Revise locked until after midnight" : "Log today’s revision"}
                aria-describedby={hasUsedReviseToday ? lockedDescriptionId : undefined}
              >
                Revise
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                title="Edit topic"
                aria-label="Edit topic"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-fg"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(event) => event.stopPropagation()}
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-fg"
                    title="More actions"
                    aria-label="More topic actions"
                  >
                    <Ellipsis className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 rounded-xl border border-border/60 bg-card/95 p-2 text-sm text-fg shadow-lg">
                  {item.status === "due-today" ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowSkipConfirm(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" /> Skip today
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-error/80 transition hover:bg-error/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete topic
                  </button>
                </PopoverContent>
              </Popover>
            </div>
            {hasUsedReviseToday ? (
              <>
                <p className="text-[11px] text-muted-foreground">{nextAvailabilitySubtext}</p>
                <span id={lockedDescriptionId} className="sr-only">
                  {nextAvailabilityMessage}
                </span>
              </>
            ) : null}
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr id={detailRowId} className="bg-muted/15 text-sm text-muted-foreground">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-6 md:grid-cols-2">
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
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowFullNotes((value) => !value);
                    }}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {showFullNotes ? "Show less" : "View more"}
                  </button>
                ) : null}
              </div>
            </div>
          </td>
        </tr>
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
    </>
  );
}
