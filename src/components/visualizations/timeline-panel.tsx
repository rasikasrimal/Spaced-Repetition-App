"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  TimelineChart,
  type TimelineSeries
} from "@/components/visualizations/timeline-chart";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadSvg, downloadSvgAsPng } from "@/lib/export-svg";
import { buildCurveSegments, sampleSegment } from "@/selectors/curves";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { useTimelinePreferencesStore } from "@/stores/timeline-preferences";
import { Subject, Topic } from "@/types/topic";
import { SubjectFilterValue, NO_SUBJECT_KEY } from "@/components/dashboard/topic-list";
import {
  CalendarClock,
  Check,
  Droplet,
  Dot,
  EllipsisVertical,
  Eye,
  EyeOff,
  Filter,
  Info,
  Milestone,
  Search,
  Sparkles,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Hand,
  SquareDashedMousePointer,
  Maximize2,
  Minimize2
} from "lucide-react";
import {
  daysBetween,
  formatDateWithWeekday,
  formatRelativeToNow,
  isDueToday,
  nowInTimeZone
} from "@/lib/date";
import {
  DAY_MS,
  STABILITY_MIN_DAYS,
  computeRetrievability
} from "@/lib/forgetting-curve";
import { FALLBACK_SUBJECT_COLOR, generateTopicColorMap } from "@/lib/colors";

const DEFAULT_WINDOW_DAYS = 30;
const MIN_ZOOM_SPAN = DAY_MS;
const MIN_Y_SPAN = 0.05;
const KEYBOARD_STEP_MS = DAY_MS;
const DEFAULT_SUBJECT_ID = "subject-general";
type TopicVisibility = Record<string, boolean>;
type SortView = "next" | "title";
type TimelineViewMode = "combined" | "per-subject";
type ViewportEntry = { x: [number, number]; y: [number, number] };
type SubjectSeriesGroup = {
  subjectId: string;
  subject: Subject | null;
  label: string;
  color: string;
  series: TimelineSeries[];
};

type FullscreenTarget =
  | { type: "combined" }
  | { type: "subject"; subjectId: string };

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

const deriveSeries = (
  topics: Topic[],
  visibility: TopicVisibility,
  resolveColor: (topic: Topic) => string,
  nowMs: number,
  includeCheckpoints: boolean
): TimelineSeries[] => {
  const visibleTopics = topics.filter((topic) => visibility[topic.id] ?? true);
  const segments = buildCurveSegments(visibleTopics);
  const segmentsByTopic = new Map<string, typeof segments>();

  for (const segment of segments) {
    const bucket = segmentsByTopic.get(segment.topicId);
    if (bucket) {
      bucket.push(segment);
    } else {
      segmentsByTopic.set(segment.topicId, [segment]);
    }
  }

  const series: TimelineSeries[] = [];
  for (const topic of visibleTopics) {
    const color = resolveColor(topic);
    const topicSegments = [...(segmentsByTopic.get(topic.id) ?? [])].sort(
      (a, b) => new Date(a.start.at).getTime() - new Date(b.start.at).getTime()
    );

    const startedAt = topic.startedAt
      ? new Date(topic.startedAt).getTime()
      : new Date(topic.createdAt).getTime();

    const pack: TimelineSeries = {
      topicId: topic.id,
      topicTitle: topic.title,
      color,
      points: [],
      segments: [],
      connectors: [],
      stitches: [],
      events: [
        {
          id: `start-${topic.id}`,
          t: startedAt,
          type: "started",
          notes: topic.notes
        }
      ],
      nowPoint: null
    };

    let previousRenderableSegment: (typeof topicSegments)[number] | null = null;

    for (const segment of topicSegments) {
      const samples = sampleSegment(segment, 160, nowMs);
      const hasSamples = samples.length > 0;
      const reviewTime = new Date(segment.start.at).getTime();
      if (hasSamples) {
        pack.points.push(...samples);
      }
      const checkpointTime = new Date(segment.checkpointAt).getTime();
      if (hasSamples) {
        const fadeFrom = Number.isFinite(reviewTime)
          ? reviewTime
          : samples[0]?.t ?? nowMs;
        pack.segments.push({
          id: `${segment.topicId}-${segment.start.id}-${segment.displayEndAt}`,
          points: samples,
          isHistorical: segment.isHistorical,
          fade: { from: fadeFrom, to: nowMs },
          checkpoint: includeCheckpoints && Number.isFinite(checkpointTime)
            ? { t: checkpointTime, target: segment.target }
            : undefined
        });
      }

      if (Number.isFinite(reviewTime) && !pack.events.some((event) => event.id === segment.start.id)) {
        const notes: string[] = [];
        if (typeof segment.start.reviewQuality === "number") {
          notes.push(`Quality ${(segment.start.reviewQuality * 100).toFixed(0)}%`);
        }
        if (typeof segment.start.intervalDays === "number") {
          notes.push(`Next interval ≈ ${segment.start.intervalDays.toFixed(2)} days`);
        }
        if (typeof segment.start.retrievabilityAtReview === "number") {
          notes.push(
            `Retention ${(segment.start.retrievabilityAtReview * 100).toFixed(0)}% at review`
          );
        }
        pack.events.push({
          id: segment.start.id,
          t: reviewTime,
          type: "reviewed",
          intervalDays: segment.start.intervalDays,
          notes: notes.length > 0 ? notes.join(" • ") : undefined
        });
      }

      const checkpointId = `${segment.topicId}-checkpoint-${segment.checkpointAt}`;
      if (
        includeCheckpoints &&
        Number.isFinite(checkpointTime) &&
        !pack.events.some((event) => event.id === checkpointId)
      ) {
        const startTime = new Date(segment.start.at).getTime();
        if (Number.isFinite(startTime)) {
          const intervalDays = Math.max(0, (checkpointTime - startTime) / DAY_MS);
          pack.events.push({
            id: checkpointId,
            t: checkpointTime,
            type: "checkpoint",
            intervalDays,
            notes: `Retention target ≈ ${(segment.target * 100).toFixed(0)}%`
          });
        }
      }

      if (previousRenderableSegment && hasSamples && Number.isFinite(reviewTime)) {
        const prevStart = new Date(previousRenderableSegment.start.at).getTime();
        const elapsed = Math.max(0, reviewTime - prevStart);
        const priorRetention = computeRetrievability(previousRenderableSegment.stabilityDays, elapsed);
        pack.stitches.push({
          id: `stitch-${segment.start.id}`,
          t: reviewTime,
          from: priorRetention,
          to: 1,
          notes:
            segment.start.intervalDays && segment.start.reviewQuality !== undefined
              ? `Reviewed → next interval ${(segment.start.intervalDays ?? 0).toFixed(2)} days`
              : undefined
        });

        if (Number.isFinite(prevStart)) {
          const intervalMs = Math.max(0, reviewTime - prevStart);
          const epsilonMs = Math.max(60_000, Math.min(intervalMs * 0.1, 12 * 60 * 60 * 1000));
          const connectorStartTime = Math.max(prevStart, reviewTime - epsilonMs);
          const connectorElapsed = Math.max(0, connectorStartTime - prevStart);
          const connectorRetention = computeRetrievability(
            previousRenderableSegment.stabilityDays,
            connectorElapsed
          );
          const nowSpan = nowMs - prevStart;
          const computeOpacity = (timestamp: number) => {
            if (!Number.isFinite(timestamp)) return 0;
            if (nowSpan <= 0) {
              return timestamp >= prevStart ? 1 : 0;
            }
            const ratio = (timestamp - prevStart) / nowSpan;
            return Math.max(0, Math.min(1, ratio));
          };
          if (connectorStartTime < reviewTime) {
            pack.connectors.push({
              id: `connector-${segment.start.id}`,
              from: {
                t: connectorStartTime,
                r: connectorRetention,
                opacity: computeOpacity(connectorStartTime)
              },
              to: { t: reviewTime, r: 1, opacity: 1 }
            });
          }
        }
      }

      if (hasSamples) {
        previousRenderableSegment = segment;
      }
    }

    const activeSegment = topicSegments[topicSegments.length - 1];
    if (activeSegment) {
      const startTime = new Date(activeSegment.start.at).getTime();
      if (Number.isFinite(startTime) && startTime <= nowMs) {
        const elapsed = Math.max(0, nowMs - startTime);
        const stability = Math.max(activeSegment.stabilityDays, STABILITY_MIN_DAYS);
        const retentionNow = computeRetrievability(stability, elapsed);
        pack.nowPoint = {
          t: nowMs,
          r: retentionNow,
          notes: `Stability ≈ ${stability.toFixed(2)} days`
        };
      } else {
        pack.nowPoint = null;
      }
    }

    for (const event of topic.events ?? []) {
      if (event.type !== "skipped") continue;
      if (pack.events.some((existing) => existing.id === event.id)) continue;
      pack.events.push({
        id: event.id,
        t: new Date(event.at).getTime(),
        type: "skipped",
        notes: event.notes
      });
    }

    pack.points.sort((a, b) => a.t - b.t);
    pack.events.sort((a, b) => a.t - b.t);
    pack.stitches.sort((a, b) => a.t - b.t);
    pack.connectors.sort((a, b) => a.from.t - b.from.t);
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
    hint = "No exam dates yetshowing up to your next scheduled reviews.";
  } else {
    const zonedNow = nowInTimeZone(timeZone);
    endCandidate = shiftUtcDays(zonedNow.getTime(), 30);
    hint = "No exam dates yetshowing up to your next scheduled reviews.";
  }

  if (endCandidate === null) {
    return { domain: null, hasActivity: true, hint };
  }

  let start = earliestStart;
  let end = endCandidate;

  if (end < start) {
    warning = "Timeline adjustedexam date precedes first study date. Check subject dates.";
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

const clampInterval = (range: [number, number], bounds: [number, number], minSpan: number): [number, number] => {
  const [minBound, maxBound] = bounds;
  const availableSpan = Math.max(minSpan, maxBound - minBound);
  const requestedSpan = Math.min(Math.max(range[1] - range[0], minSpan), availableSpan);
  let start = Math.max(minBound, Math.min(range[0], maxBound - requestedSpan));
  let end = start + requestedSpan;
  if (end > maxBound) {
    end = maxBound;
    start = end - requestedSpan;
  }
  if (start < minBound) {
    start = minBound;
    end = start + requestedSpan;
  }
  return [start, end];
};

const ensureSpan = (range: [number, number], minSpan: number): [number, number] => {
  const span = range[1] - range[0];
  if (span >= minSpan) {
    return range;
  }
  const center = (range[0] + range[1]) / 2;
  const half = minSpan / 2;
  return [center - half, center + half];
};

interface TimelinePanelProps {
  variant?: "default" | "compact";
  subjectFilter?: SubjectFilterValue;
}

export function TimelinePanel({ variant = "default", subjectFilter = null }: TimelinePanelProps): JSX.Element {
  const { topics: storeTopics, categories, subjects: storeSubjects } = useTopicStore((state) => ({
    topics: state.topics,
    categories: state.categories,
    subjects: state.subjects
  }));
  const timezone = useProfileStore((state) => state.profile.timezone);
  const resolvedTimezone = timezone || "Asia/Colombo";

  const topics = React.useMemo(() => {
    if (subjectFilter === null) return storeTopics;
    return storeTopics.filter((topic) => subjectFilter.has(topic.subjectId ?? NO_SUBJECT_KEY));
  }, [storeTopics, subjectFilter]);

  const subjects = React.useMemo(() => {
    if (subjectFilter === null) return storeSubjects;
    return storeSubjects.filter((subject) => subjectFilter.has(subject.id));
  }, [storeSubjects, subjectFilter]);

  const subjectLookup = React.useMemo(() => {
    const map = new Map<string, Subject>();
    storeSubjects.forEach((subject) => map.set(subject.id, subject));
    return map;
  }, [storeSubjects]);

  const resolveSubjectColor = React.useCallback(
    (subjectId: string | null | undefined) => {
      if (!subjectId) {
        return FALLBACK_SUBJECT_COLOR;
      }
      const subject = subjectLookup.get(subjectId);
      return subject?.color ?? FALLBACK_SUBJECT_COLOR;
    },
    [subjectLookup]
  );

  const [visibility, setVisibility] = React.useState<TopicVisibility>({});
  const [viewMode, setViewMode] = React.useState<TimelineViewMode>("combined");
  const [categoryFilter, setCategoryFilter] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [sortView, setSortView] = React.useState<SortView>("next");
  const [domain, setDomain] = React.useState<[number, number] | null>(null);
  const [fullDomain, setFullDomain] = React.useState<[number, number] | null>(null);
  const [defaultDomain, setDefaultDomain] = React.useState<[number, number] | null>(null);
  const [yDomain, setYDomain] = React.useState<[number, number] | null>(null);
  const [fullYDomain, setFullYDomain] = React.useState<[number, number] | null>(null);
  const [defaultYDomain, setDefaultYDomain] = React.useState<[number, number] | null>(null);
  const [zoomStack, setZoomStack] = React.useState<ViewportEntry[]>([]);
  const [interactionMode, setInteractionMode] = React.useState<"zoom" | "pan">("zoom");
  const [spacePanning, setSpacePanning] = React.useState(false);
  const [keyboardSelection, setKeyboardSelection] = React.useState<{ start: number; end: number; y?: [number, number] } | null>(null);
  const [rangeWarning, setRangeWarning] = React.useState<string | null>(null);
  const [rangeHint, setRangeHint] = React.useState<string | null>(null);
  const [hasStudyActivity, setHasStudyActivity] = React.useState(true);
  const [showExamMarkers, setShowExamMarkers] = React.useState(true);
  const [showCheckpoints, setShowCheckpoints] = React.useState(false);
  const showOpacityGradient = useTimelinePreferencesStore((state) => state.showOpacityGradient);
  const setShowOpacityGradient = useTimelinePreferencesStore((state) => state.setShowOpacityGradient);
  const showReviewMarkers = useTimelinePreferencesStore((state) => state.showReviewMarkers);
  const setShowReviewMarkers = useTimelinePreferencesStore((state) => state.setShowReviewMarkers);
  const showEventDots = useTimelinePreferencesStore((state) => state.showEventDots);
  const setShowEventDots = useTimelinePreferencesStore((state) => state.setShowEventDots);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const perSubjectSvgRefs = React.useRef(new Map<string, SVGSVGElement | null>());
  const perSubjectContainerRef = React.useRef<HTMLDivElement | null>(null);
  const pointerInstructionId = React.useId();
  const spacePressedRef = React.useRef(false);
  const [fullscreenTarget, setFullscreenTarget] = React.useState<FullscreenTarget | null>(null);
  const fullscreenReturnFocusRef = React.useRef<HTMLElement | null>(null);
  const setSubjectChartRef = React.useCallback((subjectId: string, element: SVGSVGElement | null) => {
    const map = perSubjectSvgRefs.current;
    if (element) {
      map.set(subjectId, element);
    } else {
      map.delete(subjectId);
    }
  }, []);

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
      setYDomain(null);
      setFullYDomain(null);
      setDefaultYDomain(null);
      setZoomStack([]);
      setKeyboardSelection(null);
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
      const clamped = clampInterval(prev, domainMeta.domain!, MIN_ZOOM_SPAN);
      if (clamped[0] === prev[0] && clamped[1] === prev[1]) {
        return prev;
      }
      return clamped;
    });
  }, [domainMeta]);

  const applyViewport = React.useCallback(
    (next: ViewportEntry, options: { push?: boolean; clearStack?: boolean } = {}) => {
      if (!next) return;
      const nextX = fullDomain ? clampInterval(next.x, fullDomain, MIN_ZOOM_SPAN) : next.x;
      const nextY = fullYDomain ? clampInterval(next.y, fullYDomain, MIN_Y_SPAN) : next.y;
      const snapshotX: [number, number] = [nextX[0], nextX[1]];
      const snapshotY: [number, number] = [nextY[0], nextY[1]];

      if (options.clearStack) {
        setZoomStack([]);
      } else if (options.push && domain && yDomain) {
        setZoomStack((prev) => [...prev.slice(-9), { x: [domain[0], domain[1]], y: [yDomain[0], yDomain[1]] }]);
      }

      setDomain(snapshotX);
      setYDomain(snapshotY);
    },
    [domain, yDomain, fullDomain, fullYDomain]
  );

  const handleResetDomain = React.useCallback(() => {
    if (!defaultDomain || !defaultYDomain) return;
    applyViewport({ x: [defaultDomain[0], defaultDomain[1]], y: [defaultYDomain[0], defaultYDomain[1]] }, { clearStack: true });
    setKeyboardSelection(null);
  }, [applyViewport, defaultDomain, defaultYDomain]);

  const zoomIn = React.useCallback(() => {
    if (!domain || !yDomain) return;
    const span = domain[1] - domain[0];
    if (span <= MIN_ZOOM_SPAN * 1.05) {
      return;
    }
    const nextSpan = Math.max(MIN_ZOOM_SPAN, span * 0.7);
    const center = domain[0] + span / 2;
    const candidate: [number, number] = [center - nextSpan / 2, center + nextSpan / 2];
    const xRange = fullDomain ? clampInterval(candidate, fullDomain, MIN_ZOOM_SPAN) : candidate;
    applyViewport({ x: xRange, y: yDomain }, { push: true });
  }, [applyViewport, domain, yDomain, fullDomain]);

  const zoomOut = React.useCallback(() => {
    if (!domain || !yDomain) return;
    const span = domain[1] - domain[0];
    const maxSpan = fullDomain ? Math.max(fullDomain[1] - fullDomain[0], MIN_ZOOM_SPAN) : span * 2;
    const nextSpan = Math.min(Math.max(span * 1.3, MIN_ZOOM_SPAN), maxSpan);
    const center = domain[0] + span / 2;
    const candidate: [number, number] = [center - nextSpan / 2, center + nextSpan / 2];
    const xRange = fullDomain ? clampInterval(candidate, fullDomain, MIN_ZOOM_SPAN) : candidate;
    applyViewport({ x: xRange, y: yDomain }, { push: true });
  }, [applyViewport, domain, yDomain, fullDomain]);

  const handleViewportChange = React.useCallback(
    (next: ViewportEntry, options?: { push?: boolean }) => {
      applyViewport(next, { push: options?.push });
      setKeyboardSelection(null);
    },
    [applyViewport]
  );

  const handleStepBack = React.useCallback(() => {
    setZoomStack((prev) => {
      if (prev.length === 0) return prev;
      const nextStack = prev.slice(0, -1);
      const last = prev[prev.length - 1];
      setDomain([last.x[0], last.x[1]]);
      setYDomain([last.y[0], last.y[1]]);
      return nextStack;
    });
    setKeyboardSelection(null);
  }, []);

  const isZoomed = React.useMemo(() => {
    if (!domain || !defaultDomain) return false;
    if (!yDomain || !defaultYDomain) return false;
    const xChanged = domain[0] !== defaultDomain[0] || domain[1] !== defaultDomain[1];
    const yChanged = yDomain[0] !== defaultYDomain[0] || yDomain[1] !== defaultYDomain[1];
    return xChanged || yChanged;
  }, [domain, defaultDomain, yDomain, defaultYDomain]);

  const canZoomIn = React.useMemo(() => {
    if (!domain) return false;
    return domain[1] - domain[0] > MIN_ZOOM_SPAN + 60 * 1000;
  }, [domain]);

  const canZoomOut = React.useMemo(() => {
    if (!domain || !fullDomain) return false;
    if (!yDomain || !fullYDomain) {
      return domain[0] > fullDomain[0] || domain[1] < fullDomain[1];
    }
    const xDiff = domain[0] > fullDomain[0] || domain[1] < fullDomain[1];
    const yDiff = yDomain[0] > fullYDomain[0] || yDomain[1] < fullYDomain[1];
    return xDiff || yDiff;
  }, [domain, fullDomain, yDomain, fullYDomain]);

  const isUndoAvailable = zoomStack.length > 0;

  const createDefaultKeyboardSelection = React.useCallback(() => {
    if (!domain) return null;
    const span = domain[1] - domain[0];
    const fallbackSpan = Math.max(MIN_ZOOM_SPAN, Math.min(span, 7 * DAY_MS));
    const center = domain[0] + span / 2;
    const candidate: [number, number] = [center - fallbackSpan / 2, center + fallbackSpan / 2];
    const bounded = fullDomain ? clampInterval(candidate, fullDomain, MIN_ZOOM_SPAN) : candidate;
    return { start: bounded[0], end: bounded[1] };
  }, [domain, fullDomain]);

  const adjustKeyboardSelection = React.useCallback(
    (action: "expand-end" | "expand-start" | "expand-both" | "contract") => {
      if (!domain) return;
      const seed = keyboardSelection ?? createDefaultKeyboardSelection();
      if (!seed) return;
      let start = seed.start;
      let end = seed.end;

      if (action === "expand-end") {
        end += KEYBOARD_STEP_MS;
      } else if (action === "expand-start") {
        start -= KEYBOARD_STEP_MS;
      } else if (action === "expand-both") {
        start -= KEYBOARD_STEP_MS / 2;
        end += KEYBOARD_STEP_MS / 2;
      } else if (action === "contract") {
        if (end - start <= MIN_ZOOM_SPAN + KEYBOARD_STEP_MS) {
          return;
        }
        start += KEYBOARD_STEP_MS / 2;
        end -= KEYBOARD_STEP_MS / 2;
      }

      const normalized = ensureSpan([start, end], MIN_ZOOM_SPAN);
      const bounded = fullDomain ? clampInterval(normalized, fullDomain, MIN_ZOOM_SPAN) : normalized;
      setKeyboardSelection({ start: bounded[0], end: bounded[1] });
    },
    [keyboardSelection, createDefaultKeyboardSelection, fullDomain, domain]
  );

  const commitKeyboardSelection = React.useCallback(() => {
    if (!keyboardSelection) return;
    const normalized = ensureSpan([keyboardSelection.start, keyboardSelection.end], MIN_ZOOM_SPAN);
    const bounded = fullDomain ? clampInterval(normalized, fullDomain, MIN_ZOOM_SPAN) : normalized;
    const targetY = yDomain ?? defaultYDomain;
    if (!targetY) return;
    applyViewport({ x: bounded, y: [targetY[0], targetY[1]] }, { push: true });
    setKeyboardSelection(null);
  }, [keyboardSelection, applyViewport, fullDomain, yDomain, defaultYDomain]);

  const handleTooSmallSelection = React.useCallback(() => {
    toast.error("Select at least one full day to zoom.");
  }, []);

  const handleCloseFullscreen = React.useCallback(() => {
    setFullscreenTarget(null);
  }, []);

  React.useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) {
          return;
        }
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
        return;
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomOut();
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        handleResetDomain();
        return;
      }

      if ((event.key === " " || event.key === "Spacebar") && !event.repeat) {
        event.preventDefault();
        spacePressedRef.current = true;
        setSpacePanning(true);
        return;
      }

      if (event.key === "z" || event.key === "Z") {
        event.preventDefault();
        setInteractionMode((prev) => (prev === "zoom" ? "pan" : "zoom"));
        setKeyboardSelection(null);
        return;
      }

      if (event.key === "Escape" && keyboardSelection) {
        event.preventDefault();
        setKeyboardSelection(null);
        return;
      }

      if (event.key === "Enter" && keyboardSelection) {
        event.preventDefault();
        commitKeyboardSelection();
        return;
      }

      if (event.shiftKey && event.key === "ArrowRight") {
        event.preventDefault();
        adjustKeyboardSelection("expand-end");
        return;
      }

      if (event.shiftKey && event.key === "ArrowLeft") {
        event.preventDefault();
        adjustKeyboardSelection("expand-start");
        return;
      }

      if (event.shiftKey && event.key === "ArrowDown") {
        event.preventDefault();
        adjustKeyboardSelection("expand-both");
        return;
      }

      if (event.shiftKey && event.key === "ArrowUp") {
        event.preventDefault();
        adjustKeyboardSelection("contract");
      }
    };

    const handleKeyup = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Spacebar") {
        if (spacePressedRef.current) {
          event.preventDefault();
          spacePressedRef.current = false;
          setSpacePanning(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("keyup", handleKeyup);
    };
  }, [
    adjustKeyboardSelection,
    commitKeyboardSelection,
    handleResetDomain,
    keyboardSelection,
    zoomIn,
    zoomOut
  ]);

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
          (topic.categoryLabel ?? "").toLowerCase().includes(lower)
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

  const singleSubjectColorOverrides = React.useMemo(() => {
    if (filteredTopics.length === 0) return null;
    const uniqueSubjectKeys = new Set(
      filteredTopics.map((topic) => topic.subjectId ?? DEFAULT_SUBJECT_ID)
    );
    if (uniqueSubjectKeys.size !== 1) return null;
    const [singleKey] = Array.from(uniqueSubjectKeys);
    const subjectId = singleKey === DEFAULT_SUBJECT_ID ? null : singleKey;
    const baseColor = resolveSubjectColor(subjectId);
    return generateTopicColorMap(baseColor, filteredTopics);
  }, [filteredTopics, resolveSubjectColor]);

  const singleSubjectLegend = React.useMemo(() => {
    if (!singleSubjectColorOverrides || singleSubjectColorOverrides.size <= 1) {
      return null;
    }
    const sorted = filteredTopics
      .filter((topic) => singleSubjectColorOverrides.has(topic.id))
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    if (sorted.length <= 1) return null;
    const limit = 14;
    const visible = sorted.slice(0, limit);
    const remaining = sorted.length - visible.length;
    return { visible, remaining };
  }, [filteredTopics, singleSubjectColorOverrides]);

  const resolveTopicColor = React.useCallback(
    (topic: Topic) =>
      singleSubjectColorOverrides?.get(topic.id) ?? resolveSubjectColor(topic.subjectId),
    [singleSubjectColorOverrides, resolveSubjectColor]
  );

  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const series = React.useMemo(
    () => deriveSeries(filteredTopics, visibility, resolveTopicColor, nowMs, showCheckpoints),
    [filteredTopics, visibility, resolveTopicColor, nowMs, showCheckpoints]
  );

  const perSubjectSeries = React.useMemo<SubjectSeriesGroup[]>(() => {
    const grouped = new Map<string, Topic[]>();
    for (const topic of filteredTopics) {
      const key = topic.subjectId ?? DEFAULT_SUBJECT_ID;
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(topic);
      } else {
        grouped.set(key, [topic]);
      }
    }
    const items: SubjectSeriesGroup[] = [];
    for (const [subjectId, list] of grouped) {
      const actualSubjectId = subjectId === DEFAULT_SUBJECT_ID ? null : subjectId;
      const subject = actualSubjectId ? subjectLookup.get(actualSubjectId) ?? null : null;
      const baseColor = resolveSubjectColor(actualSubjectId);
      const palette = generateTopicColorMap(baseColor, list);
      const derived = deriveSeries(
        list,
        visibility,
        (topic) => palette.get(topic.id) ?? resolveSubjectColor(topic.subjectId),
        nowMs,
        showCheckpoints
      );
      if (derived.length === 0) continue;
      items.push({
        subjectId,
        subject,
        label: subject?.name ?? "Unassigned",
        color: baseColor,
        series: derived
      });
    }
    items.sort((a, b) => a.label.localeCompare(b.label));
    return items;
  }, [filteredTopics, subjectLookup, visibility, resolveSubjectColor, nowMs, showCheckpoints]);

  React.useEffect(() => {
    if (!fullscreenTarget) return;
    if (!domain || !yDomain) {
      setFullscreenTarget(null);
      return;
    }
    if (fullscreenTarget.type === "subject") {
      const exists = perSubjectSeries.some((group) => group.subjectId === fullscreenTarget.subjectId);
      if (!exists) {
        setFullscreenTarget(null);
      }
    }
  }, [fullscreenTarget, domain, yDomain, perSubjectSeries]);

  React.useEffect(() => {
    if (series.length === 0) {
      const fallback: [number, number] = [0, 1];
      setFullYDomain(fallback);
      setDefaultYDomain((prev) => (prev ? prev : fallback));
      setYDomain((prev) => (prev ? prev : fallback));
      return;
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const line of series) {
      for (const segment of line.segments) {
        for (const point of segment.points) {
          if (!Number.isFinite(point.r)) continue;
          if (point.r < min) min = point.r;
          if (point.r > max) max = point.r;
        }
      }
      if (line.nowPoint && Number.isFinite(line.nowPoint.r)) {
        if (line.nowPoint.r < min) min = line.nowPoint.r;
        if (line.nowPoint.r > max) max = line.nowPoint.r;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 1;
    }
    if (min === max) {
      const padding = Math.max(0.05, MIN_Y_SPAN / 2);
      min = Math.max(0, min - padding);
      max = Math.min(1, max + padding);
    }
    const span = Math.max(MIN_Y_SPAN, max - min);
    const padding = Math.max(0.02, span * 0.1);
    let start = min - padding;
    let end = max + padding;
    if (end - start < MIN_Y_SPAN) {
      const center = (start + end) / 2;
      start = center - MIN_Y_SPAN / 2;
      end = center + MIN_Y_SPAN / 2;
    }
    const bounded: [number, number] = [Math.max(0, start), Math.min(1, end)];
    setFullYDomain(bounded);
    setDefaultYDomain((prev) => {
      if (!prev) return bounded;
      if (prev[0] === bounded[0] && prev[1] === bounded[1]) {
        return prev;
      }
      return bounded;
    });
    setYDomain((prev) => {
      if (!prev) return bounded;
      return clampInterval(prev, bounded, MIN_Y_SPAN);
    });
  }, [series]);

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

  const examMarkersBySubject = React.useMemo(() => {
    const map = new Map<string, ExamMarker[]>();
    for (const marker of examMarkers) {
      const subjectId = marker.id.replace("exam-marker-", "");
      const bucket = map.get(subjectId);
      if (bucket) {
        bucket.push(marker);
      } else {
        map.set(subjectId, [marker]);
      }
    }
    return map;
  }, [examMarkers]);

  const upcomingSchedule = React.useMemo(() => {
    return filteredTopics
      .slice()
      .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime())
      .slice(0, variant === "compact" ? 5 : 8);
  }, [filteredTopics, variant]);

  const fullscreenConfig = React.useMemo(() => {
    if (!fullscreenTarget) return null;
    if (!domain || !yDomain) return null;

    if (fullscreenTarget.type === "combined") {
      if (series.length === 0) return null;
      const markers = showExamMarkers ? examMarkers : [];
      return {
        title: "Review timeline",
        subtitle: "Fullscreen view",
        renderChart: (height: number) => (
          <TimelineChart
            series={series}
            xDomain={domain}
            yDomain={yDomain}
            onViewportChange={(next, options) => handleViewportChange(next, { push: options?.push })}
            height={height}
            showGrid
            fullDomain={fullDomain ?? undefined}
            fullYDomain={fullYDomain ?? undefined}
            examMarkers={markers}
            timeZone={resolvedTimezone}
            onResetDomain={handleResetDomain}
            ariaDescribedBy={`timeline-zoom-shortcuts ${pointerInstructionId}`}
            interactionMode={interactionMode}
            temporaryPan={spacePanning}
            onRequestStepBack={handleStepBack}
            onTooSmallSelection={handleTooSmallSelection}
            keyboardSelection={keyboardSelection}
            showOpacityGradient={showOpacityGradient}
            showReviewMarkers={showReviewMarkers}
            showEventDots={showEventDots}
          />
        )
      } as const;
    }

    const group = perSubjectSeries.find((item) => item.subjectId === fullscreenTarget.subjectId);
    if (!group || group.series.length === 0) return null;
    const markers = showExamMarkers ? examMarkersBySubject.get(group.subjectId) ?? [] : [];
    const subtitle = group.subject?.examDate ? `Exam ${formatDateWithWeekday(group.subject.examDate)}` : undefined;

    return {
      title: `${group.label} timeline`,
      subtitle,
      renderChart: (height: number) => (
        <TimelineChart
          series={group.series}
          xDomain={domain}
          yDomain={yDomain}
          onViewportChange={(next, options) => handleViewportChange(next, { push: options?.push })}
          height={height}
          showGrid
          fullDomain={fullDomain ?? undefined}
          fullYDomain={fullYDomain ?? undefined}
          examMarkers={markers}
          timeZone={resolvedTimezone}
          onResetDomain={handleResetDomain}
          ariaDescribedBy={`timeline-zoom-shortcuts ${pointerInstructionId}`}
          interactionMode={interactionMode}
          temporaryPan={spacePanning}
          onRequestStepBack={handleStepBack}
          onTooSmallSelection={handleTooSmallSelection}
          keyboardSelection={keyboardSelection}
          showOpacityGradient={showOpacityGradient}
          showReviewMarkers={showReviewMarkers}
          showEventDots={showEventDots}
        />
      )
    } as const;
  }, [
    fullscreenTarget,
    domain,
    yDomain,
    series,
    showExamMarkers,
    examMarkers,
    handleViewportChange,
    fullDomain,
    fullYDomain,
    resolvedTimezone,
    handleResetDomain,
    pointerInstructionId,
    interactionMode,
    spacePanning,
    handleStepBack,
    handleTooSmallSelection,
    keyboardSelection,
    perSubjectSeries,
    examMarkersBySubject,
    showOpacityGradient,
    showReviewMarkers,
    showEventDots
  ]);

  const isFullscreenOpen = Boolean(fullscreenConfig);

  const buildPerSubjectExportSvg = React.useCallback(() => {
    const container = perSubjectContainerRef.current;
    if (!container) return null;
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) {
      return null;
    }

    const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    root.setAttribute("width", String(containerRect.width));
    root.setAttribute("height", String(containerRect.height));
    root.setAttribute("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`);

    for (const [, svg] of perSubjectSvgRefs.current.entries()) {
      if (!svg) continue;
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("x", String(rect.left - containerRect.left));
      clone.setAttribute("y", String(rect.top - containerRect.top));
      root.appendChild(clone);
    }

    return root;
  }, []);

  const exportSvg = () => {
    if (viewMode === "per-subject") {
      const combined = buildPerSubjectExportSvg();
      if (!combined) return;
      downloadSvg(combined, "review-timeline.svg");
      return;
    }
    if (!svgRef.current) return;
    downloadSvg(svgRef.current, "review-timeline.svg");
  };

  const exportPng = () => {
    if (viewMode === "per-subject") {
      const combined = buildPerSubjectExportSvg();
      if (!combined) return;
      downloadSvgAsPng(combined, "review-timeline.png");
      return;
    }
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
    <>
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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/60 p-1"
            role="group"
            aria-label="Timeline view mode"
          >
            <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              View:
            </span>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "combined" ? "default" : "ghost"}
              className={`rounded-xl px-3 ${viewMode === "combined" ? "bg-accent/20 text-white" : "text-zinc-300"}`}
              onClick={() => setViewMode("combined")}
              aria-pressed={viewMode === "combined"}
            >
              Combined
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "per-subject" ? "default" : "ghost"}
              className={`rounded-xl px-3 ${viewMode === "per-subject" ? "bg-accent/20 text-white" : "text-zinc-300"}`}
              onClick={() => setViewMode("per-subject")}
              aria-pressed={viewMode === "per-subject"}
            >
              Per subject
            </Button>
          </div>
          <div
            className="flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/60 p-1"
            role="group"
            aria-label="Timeline zoom controls"
            aria-describedby="timeline-zoom-shortcuts"
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleStepBack}
              disabled={!isUndoAvailable}
              aria-label="Step back"
              title="Step back (right click)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={zoomOut}
              disabled={!canZoomOut}
              aria-label="Zoom out (-)"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={zoomIn}
              disabled={!canZoomIn}
              aria-label="Zoom in (+)"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div
            className="flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/60 p-1"
            role="group"
            aria-label="Interaction mode"
          >
            <Button
              type="button"
              size="sm"
              variant={interactionMode === "zoom" ? "default" : "ghost"}
              className={`inline-flex items-center gap-1 rounded-xl px-3 ${interactionMode === "zoom" ? "bg-accent/20 text-white" : "text-zinc-300"}`}
              onClick={() => setInteractionMode("zoom")}
              aria-pressed={interactionMode === "zoom"}
              title="Zoom select (Z)"
            >
              <SquareDashedMousePointer className="h-4 w-4" />
              Zoom (Z)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={interactionMode === "pan" ? "default" : "ghost"}
              className={`inline-flex items-center gap-1 rounded-xl px-3 ${interactionMode === "pan" ? "bg-accent/20 text-white" : "text-zinc-300"}`}
              onClick={() => {
                setInteractionMode("pan");
                setKeyboardSelection(null);
              }}
              aria-pressed={interactionMode === "pan"}
              title="Pan (Space)"
            >
              <Hand className="h-4 w-4" />
              Pan (Space)
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetDomain}
            disabled={!defaultDomain || !defaultYDomain || !isZoomed}
            className="inline-flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              fullscreenReturnFocusRef.current = event.currentTarget;
              setFullscreenTarget({ type: "combined" });
            }}
            disabled={!domain || !yDomain || series.length === 0}
            className="inline-flex items-center gap-2"
            aria-label="Expand timeline to fullscreen"
            title="Expand timeline"
          >
            <Maximize2 className="h-4 w-4" />
            <span>Fullscreen</span>
          </Button>
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
        </div>
      </header>

      <p className="sr-only" aria-live="polite">
        {isZoomed ? "Timeline zoomed. Activate reset to return to the full schedule." : "Timeline showing the full scheduled range."}
      </p>

      <p className="sr-only" id="timeline-zoom-shortcuts">
        Keyboard shortcuts: plus zooms in, minus zooms out, zero resets, Z toggles zoom mode, Shift with the arrow keys adjusts the selection band,
        Enter applies the zoom, and Escape cancels it.
      </p>

      <p className="sr-only" id={pointerInstructionId}>
        Drag to draw a selection and release to zoom that range. Hold Shift while dragging to include retention. Hold Space to pan, right-click to step back,
        and double-click the chart to restore the default window.
      </p>

      {isZoomed ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-amber-100" aria-live="polite">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
            Zoomed
          </span>
          <span>Use Back to step out or reset to return to the full schedule.</span>
          <button
            type="button"
            onClick={handleResetDomain}
            className="font-semibold text-amber-200 underline-offset-2 hover:underline"
          >
            Reset view
          </button>
        </div>
      ) : null}

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
            const xRange = fullDomain ? clampInterval(candidate, fullDomain, MIN_ZOOM_SPAN) : candidate;
            const targetY = yDomain ?? defaultYDomain;
            if (!targetY) {
              return;
            }
            applyViewport({ x: xRange, y: [targetY[0], targetY[1]] }, { push: true });
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
        <div
          className="flex flex-wrap items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/60 p-1"
          role="group"
          aria-label="Timeline overlays"
        >
          <Toggle
            type="button"
            pressed={showExamMarkers}
            onPressedChange={(pressed) => setShowExamMarkers(Boolean(pressed))}
            aria-label="Toggle exam markers"
            title="Toggle exam markers"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Exam Markers</span>
          </Toggle>
          <Toggle
            type="button"
            pressed={showCheckpoints}
            onPressedChange={(pressed) => setShowCheckpoints(Boolean(pressed))}
            aria-label="Toggle checkpoints"
            title="Toggle checkpoints"
          >
            <Milestone className="h-3.5 w-3.5" />
            <span>Checkpoints</span>
          </Toggle>
          <Toggle
            type="button"
            pressed={showReviewMarkers}
            onPressedChange={(pressed) => setShowReviewMarkers(Boolean(pressed))}
            aria-label="Toggle review markers"
            title="Toggle review markers"
          >
            <EllipsisVertical className="h-3.5 w-3.5" />
            <span>Review Markers</span>
          </Toggle>
          <Toggle
            type="button"
            pressed={showEventDots}
            onPressedChange={(pressed) => setShowEventDots(Boolean(pressed))}
            aria-label="Toggle event start dots"
            title="Toggle event start dots"
          >
            <Dot className="h-3.5 w-3.5" />
            <span>Event Dots</span>
          </Toggle>
          <Toggle
            type="button"
            pressed={showOpacityGradient}
            onPressedChange={(pressed) => setShowOpacityGradient(Boolean(pressed))}
            aria-label="Toggle opacity gradient"
            title="Toggle opacity gradient"
          >
            <Droplet className="h-3.5 w-3.5" />
            <span>Opacity Gradient</span>
          </Toggle>
        </div>
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

      {viewMode === "combined"
        ? hasStudyActivity && domain && yDomain
          ? (
              <div className="space-y-3">
                <TimelineChart
                  ref={svgRef}
                  series={series}
                  xDomain={domain}
                  yDomain={yDomain}
                  onViewportChange={(next, options) => handleViewportChange(next, { push: options?.push })}
                  height={variant === "compact" ? 320 : 460}
                  showGrid
                  fullDomain={fullDomain ?? undefined}
                  fullYDomain={fullYDomain ?? undefined}
                  examMarkers={showExamMarkers ? examMarkers : []}
                  timeZone={resolvedTimezone}
                  onResetDomain={handleResetDomain}
                  ariaDescribedBy={`timeline-zoom-shortcuts ${pointerInstructionId}`}
                  interactionMode={interactionMode}
                  temporaryPan={spacePanning}
                  onRequestStepBack={handleStepBack}
                  onTooSmallSelection={handleTooSmallSelection}
                  keyboardSelection={keyboardSelection}
                  showOpacityGradient={showOpacityGradient}
                  showReviewMarkers={showReviewMarkers}
                  showEventDots={showEventDots}
                />
                {singleSubjectLegend ? (
                  <div
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-zinc-300"
                    aria-label="Topic color legend"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Topic colors
                    </span>
                    {singleSubjectLegend.visible.map((topic) => {
                      const color =
                        singleSubjectColorOverrides?.get(topic.id) ?? resolveTopicColor(topic);
                      return (
                        <span
                          key={topic.id}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1"
                        >
                          <span
                            className="inline-flex h-2 w-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="max-w-[10rem] truncate text-[11px] text-zinc-200">
                            {topic.title}
                          </span>
                        </span>
                      );
                    })}
                    {singleSubjectLegend.remaining > 0 ? (
                      <span className="text-[11px] text-zinc-400">
                        +{singleSubjectLegend.remaining} more
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          : (
              <div className="flex h-60 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/40 text-sm text-zinc-400">
                No study activity yet. Add a topic to see your timeline.
              </div>
            )
        : perSubjectSeries.length > 0 && domain && yDomain
          ? (
              <div
                ref={perSubjectContainerRef}
                className="grid gap-6 md:grid-cols-1 lg:grid-cols-2"
              >
                {perSubjectSeries.map((group) => {
                  const markers = showExamMarkers
                    ? examMarkersBySubject.get(group.subjectId) ?? []
                    : [];
                  const examLabel = group.subject?.examDate
                    ? formatDateWithWeekday(group.subject.examDate)
                    : null;
                  return (
                    <div
                      key={group.subjectId}
                      className="space-y-2 rounded-3xl border border-white/10 bg-slate-900/50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-2 w-2 rounded-full"
                            style={{ backgroundColor: group.color }}
                            aria-hidden="true"
                          />
                          <h3 className="text-sm font-semibold text-white">{group.label}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {examLabel ? (
                            <span className="text-xs text-zinc-400">Exam {examLabel}</span>
                          ) : null}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={(event) => {
                              fullscreenReturnFocusRef.current = event.currentTarget;
                              setFullscreenTarget({ type: "subject", subjectId: group.subjectId });
                            }}
                            disabled={!domain || !yDomain || group.series.length === 0}
                            aria-label={`Expand ${group.label} timeline`}
                            title="Expand timeline"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <TimelineChart
                        ref={(element) => setSubjectChartRef(group.subjectId, element)}
                        series={group.series}
                        xDomain={domain}
                        yDomain={yDomain}
                        onViewportChange={(next, options) => handleViewportChange(next, { push: options?.push })}
                        height={variant === "compact" ? 300 : 360}
                        showGrid
                        fullDomain={fullDomain ?? undefined}
                        fullYDomain={fullYDomain ?? undefined}
                        examMarkers={markers}
                        timeZone={resolvedTimezone}
                        onResetDomain={handleResetDomain}
                        ariaDescribedBy={`timeline-zoom-shortcuts ${pointerInstructionId}`}
                        interactionMode={interactionMode}
                        temporaryPan={spacePanning}
                        onRequestStepBack={handleStepBack}
                        onTooSmallSelection={handleTooSmallSelection}
                        keyboardSelection={keyboardSelection}
                        showOpacityGradient={showOpacityGradient}
                        showReviewMarkers={showReviewMarkers}
                        showEventDots={showEventDots}
                      />
                    </div>
                  );
                })}
              </div>
            )
          : (
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
                  <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: resolveTopicColor(topic) }} />
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
                    <span
                      className="mt-1 inline-flex h-2 w-2 rounded-full"
                      style={{ backgroundColor: due ? "#f97316" : resolveTopicColor(topic) }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{topic.title}</p>
                      <p className="text-xs text-zinc-400">
                        {formatDateWithWeekday(topic.nextReviewDate)}  {formatRelativeToNow(topic.nextReviewDate)}
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
      <TimelineFullscreenDialog
        open={isFullscreenOpen}
        title={fullscreenConfig?.title ?? ""}
        subtitle={fullscreenConfig?.subtitle}
        onClose={handleCloseFullscreen}
        renderChart={fullscreenConfig?.renderChart}
        returnFocusRef={fullscreenReturnFocusRef}
      />
    </>
  );
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface TimelineFullscreenDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  renderChart?: ((height: number) => React.ReactNode) | null;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

function TimelineFullscreenDialog({
  open,
  title,
  subtitle,
  onClose,
  renderChart,
  returnFocusRef
}: TimelineFullscreenDialogProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const [viewportHeight, setViewportHeight] = React.useState(() =>
    typeof window === "undefined" ? 900 : window.innerHeight
  );
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const updateHeight = () => setViewportHeight(window.innerHeight);
    updateHeight();
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const focusDialog = () => {
      const node = dialogRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute("disabled"));
      const target = focusable[0] ?? node;
      window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    };

    focusDialog();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const node = dialogRef.current;
      if (!node) return;

      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const node = dialogRef.current;
      if (!node) return;
      if (node.contains(event.target as Node)) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute("disabled"));
      const fallback = focusable[0] ?? node;
      window.requestAnimationFrame(() => fallback.focus({ preventScroll: true }));
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) return;
    const target = returnFocusRef?.current ?? previouslyFocused.current;
    if (target && target.isConnected) {
      window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }
  }, [open, returnFocusRef]);

  if (!isMounted || !open || !renderChart) {
    return null;
  }

  const chartHeight = Math.max(viewportHeight - 160, 520);

  const overlay = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1200] flex flex-col bg-slate-950/95 backdrop-blur"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="flex h-full w-full flex-col gap-6 p-4 text-white sm:p-6"
      >
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 id={titleId} className="text-xl font-semibold text-white">
              {title}
            </h2>
            <p id={descriptionId} className="text-sm text-zinc-300">
              {subtitle ?? "Interact with the expanded retention timeline."}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Exit fullscreen"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 items-stretch rounded-3xl border border-white/10 bg-slate-900/60 p-3">
            <div className="h-full w-full">{renderChart(chartHeight)}</div>
          </div>
          <p className="text-xs text-zinc-400">
            Use the mouse wheel or touch gestures to zoom, drag to pan, or press Escape to exit fullscreen.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
