"use client";

import * as React from "react";
import { TimelineChart, type TimelineSeries } from "@/components/visualizations/timeline-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadSvg, downloadSvgAsPng } from "@/lib/export-svg";
import { buildCurveSegments, sampleSegment } from "@/selectors/curves";
import { useTopicStore } from "@/stores/topics";
import { Topic } from "@/types/topic";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;

type TopicVisibility = Record<string, boolean>;

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
      const startedAt = topic.startedAt ? new Date(topic.startedAt).getTime() : new Date(topic.createdAt).getTime();
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
    pack.points.sort((a, b) => a.t - b.t);
    pack.events.sort((a, b) => a.t - b.t);
    series.push(pack);
  }
  return series;
};

export function TimelinePanel(): JSX.Element {
  const topics = useTopicStore((state) => state.topics);
  const categories = useTopicStore((state) => state.categories);
  const initialize = useTopicStore((state) => state.initialize);
  const hydrated = useTopicStore((state) => state.hydrated);

  React.useEffect(() => {
    if (!hydrated) {
      void initialize();
    }
  }, [hydrated, initialize]);

  const [visibility, setVisibility] = React.useState<TopicVisibility>({});
  const [categoryFilter, setCategoryFilter] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
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

  const filteredTopics = React.useMemo(() => {
    const lower = search.trim().toLowerCase();
    return topics.filter((topic) => {
      if (categoryFilter.size > 0) {
        const categoryId = topic.categoryId ?? "__none";
        if (!categoryFilter.has(categoryId)) return false;
      }
      if (lower) {
        return topic.title.toLowerCase().includes(lower);
      }
      return true;
    });
  }, [topics, categoryFilter, search]);

  const series = React.useMemo(() => deriveSeries(filteredTopics, visibility), [filteredTopics, visibility]);

  React.useEffect(() => {
    if (series.length === 0) {
      const now = Date.now();
      const baseDomain: [number, number] = [now - DEFAULT_WINDOW_DAYS * DAY_MS, now + DAY_MS * 0.2];
      setDefaultDomain(baseDomain);
      setFullDomain(baseDomain);
      setDomain(baseDomain);
      return;
    }
    const timestamps: number[] = [];
    series.forEach((line) => {
      line.points.forEach((point) => timestamps.push(point.t));
      line.events.forEach((event) => timestamps.push(event.t));
    });
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps, Date.now());
    const computedFull: [number, number] = [min, max + DAY_MS * 0.1];
    const computedDefault: [number, number] = [Math.min(max - DEFAULT_WINDOW_DAYS * DAY_MS, min), max + DAY_MS * 0.1];
    setFullDomain(computedFull);
    setDefaultDomain(computedDefault);
    setDomain((prev) => {
      const span = prev[1] - prev[0];
      if (!Number.isFinite(span) || span <= 0) {
        return computedDefault;
      }
      return prev;
    });
  }, [series]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "f") {
        setDomain(fullDomain);
      }
      if (event.key === "r") {
        setDomain(defaultDomain);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [defaultDomain, fullDomain]);

  const toggleCategory = (categoryId: string) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const showAllTopics = () => {
    const next: TopicVisibility = {};
    topics.forEach((topic) => {
      next[topic.id] = true;
    });
    setVisibility(next);
  };

  const hideAllTopics = () => {
    const next: TopicVisibility = {};
    topics.forEach((topic) => {
      next[topic.id] = false;
    });
    setVisibility(next);
  };

  const showDueTopics = () => {
    const now = Date.now();
    const next: TopicVisibility = {};
    topics.forEach((topic) => {
      next[topic.id] = new Date(topic.nextReviewDate).getTime() <= now;
    });
    setVisibility(next);
  };

  const exportPng = async () => {
    if (svgRef.current) {
      await downloadSvgAsPng(svgRef.current);
    }
  };

  const exportSvg = () => {
    if (svgRef.current) {
      downloadSvg(svgRef.current);
    }
  };

  if (topics.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
        Add topics to unlock the retention timeline.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Retention timeline</h2>
          <p className="text-sm text-zinc-400">
            Visualise study sessions and forgetting curves for every topic.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportSvg}>
            Export SVG
          </Button>
          <Button size="sm" variant="outline" onClick={exportPng}>
            Export PNG
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDomain(defaultDomain)}>
            Reset view
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Window (days)</span>
          <Input
            type="number"
            min={7}
            max={365}
            className="w-24"
            value={Math.max(7, Math.round((domain[1] - domain[0]) / DAY_MS))}
            onChange={(event) => {
              const days = Math.max(7, Number(event.target.value) || DEFAULT_WINDOW_DAYS);
              const center = domain[1];
              setDomain([center - days * DAY_MS, center]);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Search topics</span>
          <Input
            placeholder="Find a topic"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56"
          />
        </div>
      </div>

      <TimelineChart
        ref={svgRef}
        series={series}
        xDomain={domain}
        onDomainChange={setDomain}
        height={360}
        showGrid
        fullDomain={fullDomain}
      />

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">Filter categories</p>
          {categories.map((category) => (
            <label key={category.id} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-white/40 bg-transparent"
                checked={categoryFilter.has(category.id)}
                onChange={() => toggleCategory(category.id)}
                aria-label={`Toggle category ${category.label}`}
              />
              <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
              {category.label}
            </label>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setCategoryFilter(new Set())}>
            Clear categories
          </Button>
        </div>

        <div className="mt-4 space-y-2">
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
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTopics.map((topic) => {
              const isVisible = visibility[topic.id] ?? true;
              return (
                <label key={topic.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-white/40 bg-transparent"
                    checked={isVisible}
                    onChange={() =>
                      setVisibility((prev) => ({
                        ...prev,
                        [topic.id]: !(prev[topic.id] ?? true)
                      }))
                    }
                    aria-label={`Toggle ${topic.title}`}
                  />
                  <span className="inline-flex h-3 w-3 rounded-sm" style={{ backgroundColor: topic.color ?? "#7c3aed" }} />
                  <span className="truncate">{topic.title}</span>
                  <span className="ml-auto text-[10px] text-zinc-400">
                    Next {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(topic.nextReviewDate))}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}




