"use client";

import * as React from "react";
import { TimelineChart, type TimelineSeries } from "@/components/visualizations/timeline-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadSvg, downloadSvgAsPng } from "@/lib/export-svg";
import { buildCurveSegments, sampleSegment } from "@/selectors/curves";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { Subject, Topic } from "@/types/topic";
import { CalendarClock, Check, Eye, EyeOff, Filter, Info, Search, Sparkles, AlertTriangle } from "lucide-react";
import { daysBetween, formatDateWithWeekday, formatRelativeToNow, isDueToday, nowInTimeZone } from "@/lib/date";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;

type TopicVisibility = Record<string, boolean>;
type SortView = "next" | "title";

const ensureVisibilityState = (topics: Topic[], prev: TopicVisibility): TopicVisibility => {
  const next: TopicVisibility = { ...prev };
  let changed = false;
  for (const topic of topics) {
    if (typeof next[topic.id] === "undefined") {
      next[topic.id] = true;
      changed = true;
    }
  }
  return changed ? next : prev;
};

const deriveSeries = (topics: Topic[], visibility: TopicVisibility): TimelineSeries[] => {
  const visibleTopics = topics.filter((topic) => visibility[topic.id] ?? true);
  const segments = buildCurveSegments(visibleTopics);
  const byTopic = new Map<string, TimelineSeries>();

  for (const segment of segments) {
    const topic = visibleTopics.find((item) => item.id === segment.topicId);
    if (!topic) continue;
    if (!byTopic.has(segment.topicId)) {
      byTopic.set(segment.topicId, {
        topicId: topic.id,
        topicTitle: topic.title,
        color: topic.color ?? "#7c3aed",
        points: [],
        events: []
      });
    }
    const bucket = byTopic.get(segment.topicId)!;
    const samples = sampleSegment(segment, 160);
    bucket.points.push(...samples);
    const fromTs = new Date(segment.from.at).getTime();
    if (!bucket.events.some((event) => event.id === segment.from.id)) {
      bucket.events.push({
        id: segment.from.id,
        t: fromTs,
        type: segment.from.type,
        intervalDays: segment.from.intervalDays,
        notes: segment.from.notes
      });
    }
    if (segment.to) {
      const toTs = new Date(segment.to.at).getTime();
      if (!bucket.events.some((event) => event.id === segment.to!.id)) {
        bucket.events.push({
          id: segment.to.id,
          t: toTs,
          type: segment.to.type,
          intervalDays: segment.to.intervalDays,
          notes: segment.to.notes
        });
      }
    }
  }

  const series: TimelineSeries[] = [];
  for (const topic of visibleTopics) {
    const pack = byTopic.get(topic.id);
    if (!pack) {
      const startedAt = topic.startedAt
        ? new Date(topic.startedAt).getTime()
        : new Date(topic.createdAt).getTime();
      series.push({
        topicId: topic.id,
        topicTitle: topic.title,
        color: topic.color ?? "#7c3aed",
        points: [
          { t: startedAt, r: 1 },
          { t: Date.now(), r: 0.5 }
        ],
        events: [
          {
            id: `start-${topic.id}`,
            t: startedAt,
            type: "started",
            intervalDays: topic.intervals?.[0],
            notes: topic.notes
          }
        ]
      });
      continue;
    }
    const skipEvents = (topic.events ?? []).filter((event) => event.type === "skipped");
    if (skipEvents.length > 0) {
      for (const event of skipEvents) {
        if (!pack.events.some((existing) => existing.id === event.id)) {
          pack.events.push({
            id: event.id,
            t: new Date(event.at).getTime(),
            type: "skipped" as const
          });
        }
      }
    }
    pack.points.sort((a, b) => a.t - b.t);
    pack.events.sort((a, b) => a.t - b.t);
    series.push(pack);
  }
  return series;
};

type TimelineDomainMeta = {
  domain: [number, number] | null;
  hasActivity: boolean;
  warning?: string | null;
  hint?: string | null;
};

type ExamMarker = {
  id: string;
  time: number;
  color: string;
  subjectName: string;
  daysRemaining: number | null;
  dateISO: string;
};

const shiftUtcDays = (timestamp: number, days: number) => {
  const next = new Date(timestamp);
  next.setUTCDate(next.getUTCDate() + days);
  return next.getTime();
};

const computeTimelineDomain = (topics: Topic[], subjects: Subject[], timeZone: string): TimelineDomainMeta => {
  let earliestStart: number | null = null;

  for (const topic of topics) {
    const candidates = [topic.startedOn, topic.startedAt, topic.createdAt];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const timestamp = new Date(candidate).getTime();
      if (Number.isNaN(timestamp)) continue;
      earliestStart = earliestStart === null ? timestamp : Math.min(earliestStart, timestamp);
    }
    for (const event of topic.events ?? []) {
      if (event.type !== "reviewed") continue;
      const timestamp = new Date(event.at).getTime();
      if (Number.isNaN(timestamp)) continue;
      earliestStart = earliestStart === null ? timestamp : Math.min(earliestStart, timestamp);
    }
  }

  if (earliestStart === null) {
    return { domain: null, hasActivity: false };
  }

  const examTimestamps = subjects
    .map((subject) => (subject.examDate ? new Date(subject.examDate).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));
  const lastExam = examTimestamps.length > 0 ? Math.max(...examTimestamps) : null;

  const scheduleTimestamps = topics
    .map((topic) => new Date(topic.nextReviewDate).getTime())
    .filter((value) => Number.isFinite(value));
  const latestScheduled = scheduleTimestamps.length > 0 ? Math.max(...scheduleTimestamps) : null;

  let hint: string | null = null;
  let warning: string | null = null;

  let endCandidate: number | null = null;
  if (lastExam !== null) {
    endCandidate = lastExam;
  } else if (latestScheduled !== null) {
    endCandidate = latestScheduled;
    hint = "No exam dates yet—showing up to your next scheduled reviews.";
  } else {
    const zonedNow = nowInTimeZone(timeZone);
    endCandidate = shiftUtcDays(zonedNow.getTime(), 30);
    hint = "No exam dates yet—showing up to your next scheduled reviews.";
  }

  if (endCandidate === null) {
    return { domain: null, hasActivity: true, hint };
  }

  let start = earliestStart;
  let end = endCandidate;

  if (end < start) {
    warning = "Timeline adjusted—exam date precedes first study date. Check subject dates.";
    end = shiftUtcDays(start, 30);
  }

  if (end === start) {
    const paddedStart = shiftUtcDays(start, -7);
    const paddedEnd = shiftUtcDays(end, 7);
    start = paddedStart;
    end = paddedEnd;
  }

  return {
    domain: [start, end],
    hasActivity: true,
    warning,
    hint
  };
};

const clampRangeToBounds = (range: [number, number], bounds: [number, number]): [number, number] => {
  const [minBound, maxBound] = bounds;
  const span = Math.max(1, Math.min(range[1] - range[0], maxBound - minBound));
  if (!Number.isFinite(span) || span <= 0) {
    return bounds;
  }
  let start = Math.max(minBound, Math.min(range[0], maxBound - span));
  let end = start + span;
  if (end > maxBound) {
    end = maxBound;
    start = end - span;
  }
  if (start < minBound) {
    start = minBound;
    end = start + span;
  }
  return [start, end];
};

interface TimelinePanelProps {
  variant?: "default" | "compact";
}

export function TimelinePanel({ variant = "default" }: TimelinePanelProps): JSX.Element {
  const { topics, categories, subjects } = useTopicStore((state) => ({
    topics: state.topics,
    categories: state.categories,
    subjects: state.subjects
  }));
  const timezone = useProfileStore((state) => state.profile.timezone);
  const resolvedTimezone = timezone || "Asia/Colombo";

  const [visibility, setVisibility] = React.useState<TopicVisibility>({});
  const [categoryFilter, setCategoryFilter] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [sortView, setSortView] = React.useState<SortView>("next");
  const [domain, setDomain] = React.useState<[number, number] | null>(null);
  const [fullDomain, setFullDomain] = React.useState<[number, number] | null>(null);
  const [defaultDomain, setDefaultDomain] = React.useState<[number, number] | null>(null);
  const [rangeWarning, setRangeWarning] = React.useState<string | null>(null);
  const [rangeHint, setRangeHint] = React.useState<string | null>(null);
  const [hasStudyActivity, setHasStudyActivity] = React.useState(true);
  const [showExamMarkers, setShowExamMarkers] = React.useState(true);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const domainMeta = React.useMemo(
    () => computeTimelineDomain(topics, subjects, resolvedTimezone),
    [topics, subjects, resolvedTimezone]
  );

  React.useEffect(() => {
    setVisibility((prev) => ensureVisibilityState(topics, prev));
  }, [topics]);

  React.useEffect(() => {
    setHasStudyActivity(domainMeta.hasActivity);
    setRangeWarning(domainMeta.warning ?? null);
    setRangeHint(domainMeta.hint ?? null);

    if (!domainMeta.domain) {
      setDomain(null);
      setFullDomain(null);
      setDefaultDomain(null);
      return;
    }

    setFullDomain(domainMeta.domain);
    setDefaultDomain((prev) => {
      if (!prev) return domainMeta.domain!;
      if (prev[0] === domainMeta.domain![0] && prev[1] === domainMeta.domain![1]) {
        return prev;
      }
      return domainMeta.domain!;
    });
    setDomain((prev) => {
      if (!prev) return domainMeta.domain!;
      const clamped = clampRangeToBounds(prev, domainMeta.domain!);
      if (clamped[0] === prev[0] && clamped[1] === prev[1]) {
        return prev;
      }
      return clamped;
    });
  }, [domainMeta]);

  const filteredTopics = React.useMemo(() => {
    const lower = search.trim().toLowerCase();
    const byCategory = categoryFilter.size > 0
      ? topics.filter((topic) => {
          const categoryId = topic.categoryId ?? "__uncategorised";
          return categoryFilter.has(categoryId);
        })
      : topics;

    const bySearch = lower.length > 0
      ? byCategory.filter((topic) =>
          topic.title.toLowerCase().includes(lower) ||
          topic.notes.toLowerCase().includes(lower) ||
          topic.categoryLabel.toLowerCase().includes(lower)
        )
      : byCategory;

    const sorted = [...bySearch];
    if (sortView === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
    }

    return sorted;
  }, [topics, categoryFilter, search, sortView]);

  const series = React.useMemo(() => deriveSeries(filteredTopics, visibility), [filteredTopics, visibility]);

  const examMarkers = React.useMemo<ExamMarker[]>(() => {
    if (!showExamMarkers) return [];
    const zonedToday = nowInTimeZone(resolvedTimezone);
    return subjects
      .map<ExamMarker | null>((subject) => {
        if (!subject.examDate) return null;
        const examDate = new Date(subject.examDate);
        if (Number.isNaN(examDate.getTime())) return null;
        const hasVisibleTopic = filteredTopics.some(
          (topic) =>
            topic.subjectId === subject.id && (visibility[topic.id] ?? true)
        );
        if (!hasVisibleTopic) return null;
        const daysRemaining = Math.max(0, daysBetween(zonedToday, examDate));
        return {
          id: `exam-marker-${subject.id}`,
          time: examDate.getTime(),
          color: subject.color ?? "#38bdf8",
          subjectName: subject.name,
          daysRemaining,
          dateISO: examDate.toISOString()
        };
      })
      .filter((marker): marker is ExamMarker => marker !== null)
      .sort((a, b) => a.time - b.time);
  }, [subjects, filteredTopics, visibility, resolvedTimezone, showExamMarkers]);

  const upcomingSchedule = React.useMemo(() => {
    return filteredTopics
      .slice()
      .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime())
      .slice(0, variant === "compact" ? 5 : 8);
  }, [filteredTopics, variant]);

  const exportSvg = () => {
    if (!svgRef.current) return;
    downloadSvg(svgRef.current, "review-timeline.svg");
  };

  const exportPng = () => {
    if (!svgRef.current) return;
    downloadSvgAsPng(svgRef.current, "review-timeline.png");
  };

  const showAllTopics = () => {
    const next: TopicVisibility = {};
    for (const topic of filteredTopics) {
      next[topic.id] = true;
    }
    setVisibility(next);
  };

  const hideAllTopics = () => {
    const next: TopicVisibility = {};
    for (const topic of filteredTopics) {
      next[topic.id] = false;
    }
    setVisibility(next);
  };

  const showDueTopics = () => {
    const next: TopicVisibility = {};
    for (const topic of filteredTopics) {
      next[topic.id] = isDueToday(topic.nextReviewDate);
    }
    setVisibility(next);
  };

  const handleToggleCategory = (id: string) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const cardClasses = variant === "compact"
    ? "rounded-3xl border border-white/5 bg-slate-900/50 p-5 shadow-lg shadow-slate-900/30"
    : "rounded-3xl border border-white/5 bg-slate-900/40 p-6 md:p-8 shadow-xl shadow-slate-900/30";

  return (
    <section className={`${cardClasses} space-y-5`}
      aria-label="Review timeline">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="h-3 w-3" /> Retention & schedule
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">Review timeline</h2>
          <p className="text-sm text-zinc-400">
            Track when each topic is due and how its memory curve evolves.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {variant === "default" ? (
            <>
              <Button size="sm" variant="outline" onClick={exportSvg}>
                Export SVG
              </Button>
              <Button size="sm" variant="outline" onClick={exportPng}>
                Export PNG
              </Button>
            </>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!defaultDomain) return;
              setDomain([...defaultDomain] as [number, number]);
            }}
            disabled={!defaultDomain}
          >
            Reset view
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-zinc-300">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>Window (days)</span>
          <Input
            type="number"
            min={7}
            max={365}
            className="h-8 w-20 border-none bg-transparent text-xs text-white focus-visible:ring-0"
            value={domain ? Math.max(7, Math.round((domain[1] - domain[0]) / DAY_MS)) : ""}
            onChange={(event) => {
              if (!domain) return;
              const days = Math.max(7, Number(event.target.value) || DEFAULT_WINDOW_DAYS);
              const end = domain[1];
              const candidate: [number, number] = [end - days * DAY_MS, end];
              if (fullDomain) {
                setDomain(clampRangeToBounds(candidate, fullDomain));
              } else {
                setDomain(candidate);
              }
            }}
            disabled={!domain}
          />
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics"
            className="h-8 w-52 border-none bg-transparent text-xs text-white placeholder:text-zinc-500 focus-visible:ring-0"
          />
        </div>
        <Select value={sortView} onValueChange={(value: SortView) => setSortView(value)}>
          <SelectTrigger className="h-9 rounded-2xl border-white/10 bg-slate-900/60 text-xs text-white">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl backdrop-blur">
            <SelectItem value="next">Next review</SelectItem>
            <SelectItem value="title">Topic name</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setShowExamMarkers((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition ${
            showExamMarkers
              ? "border-accent/40 bg-accent/20 text-white"
              : "border-white/10 bg-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5" /> Exam markers {showExamMarkers ? "on" : "off"}
        </button>
        {categoryFilter.size > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setCategoryFilter(new Set())}>
            Clear categories
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {categories.map((category) => {
          const active = categoryFilter.has(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleToggleCategory(category.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                active
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/10 bg-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
              {category.label}
            </button>
          );
        })}
        {categories.length === 0 ? (
          <p className="text-xs text-zinc-500">Categories you create appear here for quick filtering.</p>
        ) : null}
      </div>

      {rangeWarning ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{rangeWarning}</span>
        </div>
      ) : null}
      {rangeHint ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-zinc-300">
          <Info className="h-3.5 w-3.5 text-accent" />
          <span>{rangeHint}</span>
        </div>
      ) : null}

      {hasStudyActivity && domain ? (
        <TimelineChart
          ref={svgRef}
          series={series}
          xDomain={domain}
          onDomainChange={(next) => setDomain(next)}
          height={variant === "compact" ? 260 : 360}
          showGrid
          fullDomain={fullDomain ?? undefined}
          examMarkers={showExamMarkers ? examMarkers : []}
        />
      ) : (
        <div className="flex h-60 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/40 text-sm text-zinc-400">
          No study activity yet. Add a topic to see your timeline.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <Filter className="h-3.5 w-3.5" /> Visibility
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <Button size="sm" variant="ghost" onClick={showAllTopics}>
              Show all
            </Button>
            <Button size="sm" variant="ghost" onClick={hideAllTopics}>
              Hide all
            </Button>
            <Button size="sm" variant="ghost" onClick={showDueTopics}>
              Only due
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {filteredTopics.map((topic) => {
              const isVisible = visibility[topic.id] ?? true;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() =>
                    setVisibility((prev) => ({
                      ...prev,
                      [topic.id]: !(prev[topic.id] ?? true)
                    }))
                  }
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs transition ${
                    isVisible ? "border-accent/40 bg-accent/10 text-white" : "border-white/10 bg-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: topic.color ?? "#7c3aed" }} />
                  <span className="flex-1 truncate">{topic.title}</span>
                  <span className="text-[10px] text-zinc-400">
                    {formatDateWithWeekday(topic.nextReviewDate)}
                  </span>
                  {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <span>Upcoming checkpoints</span>
            <span>{upcomingSchedule.length} topics</span>
          </div>
          {upcomingSchedule.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-slate-900/50 px-3 py-3 text-xs text-zinc-400">
              As you add topics their next review dates will show up here.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingSchedule.map((topic) => {
                const due = isDueToday(topic.nextReviewDate);
                return (
                  <div key={topic.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: due ? "#f97316" : topic.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{topic.title}</p>
                      <p className="text-xs text-zinc-400">
                        {formatDateWithWeekday(topic.nextReviewDate)} • {formatRelativeToNow(topic.nextReviewDate)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      due ? "bg-rose-500/20 text-rose-100" : "bg-sky-500/15 text-sky-100"
                    }`}>
                      <Check className="h-3 w-3" /> {due ? "Due" : "Scheduled"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}