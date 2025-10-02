"use client";

import * as React from "react";
import { TimelineChart, type TimelineSeries } from "@/components/visualizations/timeline-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadSvg, downloadSvgAsPng } from "@/lib/export-svg";
import { buildCurveSegments, sampleSegment } from "@/selectors/curves";
import { useTopicStore } from "@/stores/topics";
import { Topic } from "@/types/topic";
import { CalendarClock, Check, Eye, EyeOff, Filter, Search, Sparkles } from "lucide-react";
import { formatDateWithWeekday, formatRelativeToNow, isDueToday } from "@/lib/date";

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

interface TimelinePanelProps {
  variant?: "default" | "compact";
}

export function TimelinePanel({ variant = "default" }: TimelinePanelProps): JSX.Element {
  const topics = useTopicStore((state) => state.topics);
  const categories = useTopicStore((state) => state.categories);

  const [visibility, setVisibility] = React.useState<TopicVisibility>({});
  const [categoryFilter, setCategoryFilter] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [sortView, setSortView] = React.useState<SortView>("next");
  const [domain, setDomain] = React.useState<[number, number]>(() => {
    const now = Date.now();
    return [now - DEFAULT_WINDOW_DAYS * DAY_MS, now + DAY_MS * 0.2];
  });
  const [fullDomain, setFullDomain] = React.useState<[number, number]>(domain);
  const [defaultDomain, setDefaultDomain] = React.useState<[number, number]>(domain);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    setVisibility((prev) => ensureVisibilityState(topics, prev));
  }, [topics]);

  React.useEffect(() => {
    if (topics.length === 0) return;
    const timestamps = topics.map((topic) => new Date(topic.nextReviewDate).getTime());
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const padding = DAY_MS * 2;
    setFullDomain([min - padding, max + padding]);
    setDefaultDomain([Date.now() - DEFAULT_WINDOW_DAYS * DAY_MS, Date.now() + DAY_MS * 0.2]);
  }, [topics]);

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
          <Button size="sm" variant="outline" onClick={() => setDomain(defaultDomain)}>
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
            value={Math.max(7, Math.round((domain[1] - domain[0]) / DAY_MS))}
            onChange={(event) => {
              const days = Math.max(7, Number(event.target.value) || DEFAULT_WINDOW_DAYS);
              const center = domain[1];
              setDomain([center - days * DAY_MS, center]);
            }}
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

      <TimelineChart
        ref={svgRef}
        series={series}
        xDomain={domain}
        onDomainChange={setDomain}
        height={variant === "compact" ? 260 : 360}
        showGrid
        fullDomain={fullDomain}
      />

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


