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
import { downloadSvg, downloadSvgAsPng } from "@/lib/export-svg";
import { buildCurveSegments, sampleSegment } from "@/selectors/curves";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { useTimelinePreferencesStore } from "@/stores/timeline-preferences";
import { useThemePalette } from "@/hooks/use-theme-palette";
import { Subject, Topic } from "@/types/topic";
import { SubjectFilterValue, NO_SUBJECT_KEY } from "@/components/dashboard/topic-list";
import {
  AlertTriangle,
  Check,
  Dot,
  Droplet,
  Eraser,
  Filter,
  GraduationCap,
  ImageDown,
  Info,
  Maximize2,
  Milestone,
  Minimize2,
  Search,
  Sparkles,
  Tag,
  FileDown
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
import {
  SubjectRevisionRow,
  SubjectRevisionTable
} from "@/components/visualizations/subject-revision-table";

const MIN_ZOOM_SPAN = DAY_MS;
const MIN_Y_SPAN = 0.05;
const KEYBOARD_STEP_MS = DAY_MS;
const DEFAULT_SUBJECT_ID = "subject-general";
type TopicVisibility = Record<string, boolean>;
type TimelineViewMode = "combined" | "per-subject";
type ViewportEntry = { x: [number, number]; y: [number, number] };
type SubjectSeriesGroup = {
  subjectId: string;
  subject: Subject | null;
  label: string;
  color: string;
  series: TimelineSeries[];
};

type SubjectOption = {
  id: string;
  label: string;
  color: string;
  topicCount: number;
};

type FullscreenTarget =
  | { type: "combined" }
  | { type: "per-subject-grid" }
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
  const [activeSubjectId, setActiveSubjectId] = React.useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<TimelineViewMode>("combined");
  const [categoryFilter, setCategoryFilter] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
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
  const showTopicLabels = useTimelinePreferencesStore((state) => state.showTopicLabels);
  const setShowTopicLabels = useTimelinePreferencesStore((state) => state.setShowTopicLabels);
  const showMilestones = showCheckpoints || showReviewMarkers;
  const handleToggleMilestones = (pressed: boolean) => {
    const next = Boolean(pressed);
    setShowCheckpoints(next);
    setShowReviewMarkers(next);
  };
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
  const palette = useThemePalette();

  const handleSelectSubject = React.useCallback((subjectId: string) => {
    setActiveSubjectId(subjectId);
    setActiveTopicId(null);
  }, []);

  const handleSelectTopic = React.useCallback((topicId: string) => {
    setActiveTopicId((prev) => (prev === topicId ? null : topicId));
    setVisibility((prev) => {
      if (prev[topicId]) {
        return prev;
      }
      return { ...prev, [topicId]: true };
    });
  }, []);

  const handleToggleTopicVisibility = React.useCallback((topicId: string) => {
    setVisibility((prev) => {
      const current = prev[topicId];
      const nextValue = !(typeof current === "undefined" ? true : current);
      return { ...prev, [topicId]: nextValue };
    });
    setActiveTopicId((prev) => (prev === topicId ? null : prev));
  }, []);

  const subjectOptions = React.useMemo<SubjectOption[]>(() => {
    const map = new Map<string, SubjectOption>();
    const ensure = (id: string, label: string, color: string) => {
      const existing = map.get(id);
      if (existing) {
        return existing;
      }
      const created: SubjectOption = { id, label, color, topicCount: 0 };
      map.set(id, created);
      return created;
    };

    subjects.forEach((subject) => {
      const color = resolveSubjectColor(subject.id);
      ensure(subject.id, subject.name, color);
    });

    for (const topic of topics) {
      const key = topic.subjectId ?? DEFAULT_SUBJECT_ID;
      const label = key === DEFAULT_SUBJECT_ID ? "No subject" : subjectLookup.get(key)?.name ?? "No subject";
      const color = resolveSubjectColor(topic.subjectId ?? null);
      const entry = ensure(key, label, color);
      entry.topicCount += 1;
    }

    if (!map.has(DEFAULT_SUBJECT_ID)) {
      const generalCount = topics.filter((topic) => !topic.subjectId).length;
      if (generalCount > 0) {
        map.set(DEFAULT_SUBJECT_ID, {
          id: DEFAULT_SUBJECT_ID,
          label: "No subject",
          color: FALLBACK_SUBJECT_COLOR,
          topicCount: generalCount
        });
      }
    }

    const result = Array.from(map.values()).filter((option) => option.topicCount > 0);
    result.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return result;
  }, [subjects, topics, subjectLookup, resolveSubjectColor]);

  React.useEffect(() => {
    if (subjectOptions.length === 0) {
      if (activeSubjectId !== null) {
        setActiveSubjectId(null);
      }
      return;
    }
    if (!activeSubjectId) {
      setActiveSubjectId(subjectOptions[0].id);
      return;
    }
    if (!subjectOptions.some((option) => option.id === activeSubjectId)) {
      setActiveSubjectId(subjectOptions[0].id);
    }
  }, [subjectOptions, activeSubjectId]);

  const activeSubjectOption = React.useMemo(
    () => subjectOptions.find((option) => option.id === activeSubjectId) ?? null,
    [subjectOptions, activeSubjectId]
  );

  React.useEffect(() => {
    setActiveTopicId(null);
  }, [activeSubjectId]);

  React.useEffect(() => {
    if (!subjectFilter || subjectFilter.size !== 1) {
      return;
    }
    const [single] = Array.from(subjectFilter);
    const resolvedId = single === NO_SUBJECT_KEY ? DEFAULT_SUBJECT_ID : single;
    if (!activeSubjectId && subjectOptions.some((option) => option.id === resolvedId)) {
      setActiveSubjectId(resolvedId);
    }
  }, [subjectFilter, subjectOptions, activeSubjectId]);

  const domainMeta = React.useMemo(
    () => computeTimelineDomain(topics, subjects, resolvedTimezone),
    [topics, subjects, resolvedTimezone]
  );

  React.useEffect(() => {
    setVisibility((prev) => ensureVisibilityState(topics, prev));
  }, [topics]);

  React.useEffect(() => {
    if (!activeSubjectId) return;
    setVisibility((prev) => {
      const next: TopicVisibility = { ...prev };
      let changed = false;
      for (const topic of topics) {
        const key = topic.subjectId ?? DEFAULT_SUBJECT_ID;
        if (key === activeSubjectId && typeof next[topic.id] === "undefined") {
          next[topic.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeSubjectId, topics]);

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
    sorted.sort((a, b) => {
      const dateDelta = new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
      if (dateDelta !== 0) {
        return dateDelta;
      }
      return a.title.localeCompare(b.title);
    });
    return sorted;
  }, [topics, categoryFilter, search]);

  const activeSubjectTopics = React.useMemo(() => {
    if (!activeSubjectId) return [];
    return filteredTopics.filter((topic) => (topic.subjectId ?? DEFAULT_SUBJECT_ID) === activeSubjectId);
  }, [filteredTopics, activeSubjectId]);

  const activeSubjectVisibleTopics = React.useMemo(
    () => activeSubjectTopics.filter((topic) => visibility[topic.id] ?? true),
    [activeSubjectTopics, visibility]
  );

  const activeTopic = React.useMemo(() => {
    if (!activeTopicId) return null;
    return activeSubjectTopics.find((topic) => topic.id === activeTopicId) ?? null;
  }, [activeTopicId, activeSubjectTopics]);

  const topicsForChart = React.useMemo(() => {
    if (activeTopic) {
      return [activeTopic];
    }
    return activeSubjectVisibleTopics;
  }, [activeTopic, activeSubjectVisibleTopics]);

  const subjectTopicCount = activeSubjectTopics.length;
  const visibleTopicCount = activeSubjectVisibleTopics.length;

  React.useEffect(() => {
    if (!activeTopicId) return;
    if (activeSubjectTopics.some((topic) => topic.id === activeTopicId)) {
      return;
    }
    setActiveTopicId(null);
  }, [activeTopicId, activeSubjectTopics]);

  const singleSubjectColorOverrides = React.useMemo(() => {
    if (activeSubjectTopics.length === 0) return null;
    const uniqueSubjectKeys = new Set(
      activeSubjectTopics.map((topic) => topic.subjectId ?? DEFAULT_SUBJECT_ID)
    );
    if (uniqueSubjectKeys.size !== 1) return null;
    const [singleKey] = Array.from(uniqueSubjectKeys);
    const subjectId = singleKey === DEFAULT_SUBJECT_ID ? null : singleKey;
    const baseColor = resolveSubjectColor(subjectId);
    return generateTopicColorMap(baseColor, activeSubjectTopics);
  }, [activeSubjectTopics, resolveSubjectColor]);

  const singleSubjectLegend = React.useMemo(() => {
    if (!singleSubjectColorOverrides || singleSubjectColorOverrides.size <= 1) {
      return null;
    }
    const sorted = activeSubjectTopics
      .filter((topic) => singleSubjectColorOverrides.has(topic.id))
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    if (sorted.length <= 1) return null;
    const limit = 14;
    const visible = sorted.slice(0, limit);
    const remaining = sorted.length - visible.length;
    return { visible, remaining };
  }, [activeSubjectTopics, singleSubjectColorOverrides]);

  const legendItems = React.useMemo(() => {
    if (activeSubjectTopics.length === 0) return [];
    if (singleSubjectLegend) {
      return singleSubjectLegend.visible;
    }
    return activeSubjectTopics;
  }, [activeSubjectTopics, singleSubjectLegend]);

  const legendRemaining = singleSubjectLegend?.remaining ?? 0;

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
    () => deriveSeries(topicsForChart, visibility, resolveTopicColor, nowMs, showCheckpoints),
    [topicsForChart, visibility, resolveTopicColor, nowMs, showCheckpoints]
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

  const subjectTableData = React.useMemo(
    () => {
      if (filteredTopics.length === 0) return [];
      const groups = new Map<
        string,
        {
          subjectId: string;
          subject: Subject | null;
          color: string;
          rows: SubjectRevisionRow[];
        }
      >();

      for (const topic of filteredTopics) {
        const subjectKey = topic.subjectId ?? DEFAULT_SUBJECT_ID;
        const actualSubjectId = topic.subjectId ?? null;
        const subject = actualSubjectId ? subjectLookup.get(actualSubjectId) ?? null : null;
        const color = resolveSubjectColor(actualSubjectId);

        const revisionEvents = (topic.events ?? [])
          .filter((event) => event.type === "reviewed")
          .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

        const revisions = revisionEvents.map((event) => ({ id: event.id, date: event.at }));

        const lastReviewSource =
          revisionEvents.length > 0
            ? revisionEvents[revisionEvents.length - 1].at
            : topic.lastReviewedAt ?? topic.startedAt ?? topic.createdAt;
        const lastReviewMs = lastReviewSource ? new Date(lastReviewSource).getTime() : nowMs;
        const stability = Number.isFinite(topic.stability)
          ? Math.max(topic.stability, STABILITY_MIN_DAYS)
          : STABILITY_MIN_DAYS;
        const elapsedMs = Math.max(0, nowMs - lastReviewMs);
        const retention = computeRetrievability(stability, elapsedMs);
        const retentionPercent = Number.isFinite(retention)
          ? Math.round(Math.min(Math.max(retention * 100, 0), 100))
          : 0;

        const row: SubjectRevisionRow = {
          topicId: topic.id,
          title: topic.title,
          retentionPercent,
          revisions
        };

        const bucket = groups.get(subjectKey);
        if (bucket) {
          bucket.rows.push(row);
        } else {
          groups.set(subjectKey, {
            subjectId: subjectKey,
            subject,
            color,
            rows: [row]
          });
        }
      }

      const entries = Array.from(groups.values()).map((entry) => ({
        subjectId: entry.subjectId,
        subjectName: entry.subject?.name ?? "Unassigned",
        subjectColor: entry.color,
        rows: entry.rows.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }))
      }));

      entries.sort((a, b) => a.subjectName.localeCompare(b.subjectName, undefined, { sensitivity: "base" }));
      return entries;
    },
    [filteredTopics, subjectLookup, resolveSubjectColor, nowMs]
  );

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
    } else if (fullscreenTarget.type === "per-subject-grid") {
      if (perSubjectSeries.length === 0) {
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
          color: subject.color ?? palette.accent,
          subjectName: subject.name,
          daysRemaining,
          dateISO: examDate.toISOString()
        };
      })
      .filter((marker): marker is ExamMarker => marker !== null)
      .sort((a, b) => a.time - b.time);
  }, [subjects, filteredTopics, visibility, resolvedTimezone, showExamMarkers, palette.accent]);

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
    if (!activeSubjectId) return [];
    return activeSubjectTopics
      .slice()
      .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime())
      .slice(0, variant === "compact" ? 5 : 8);
  }, [activeSubjectId, activeSubjectTopics, variant]);

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
            showTopicLabels={showTopicLabels}
          />
        )
      } as const;
    }

    if (fullscreenTarget.type === "per-subject-grid") {
      if (perSubjectSeries.length === 0) return null;
      const columns = perSubjectSeries.length > 1 ? 2 : 1;
      const rows = Math.max(1, Math.ceil(perSubjectSeries.length / columns));
      const columnTemplate =
        columns === 1 ? "minmax(0, 1fr)" : "repeat(auto-fit, minmax(360px, 1fr))";
      const verticalGap = 24; // gap-6
      return {
        title: "Per-subject timelines",
        subtitle: "Fullscreen view",
        renderChart: (height: number) => {
          const usableHeight = Math.max(height - (rows - 1) * verticalGap, 260);
          const perChartHeight = Math.max(260, Math.floor(usableHeight / rows));
          return (
            <div className="flex h-full w-full flex-col overflow-hidden">
              <div className="flex-1 overflow-auto pr-2">
                <div
                  className="grid gap-6"
                  style={{ gridTemplateColumns: columnTemplate }}
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
                        className="space-y-2 rounded-3xl border border-inverse/10 bg-card/60 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex h-2 w-2 rounded-full"
                              style={{ backgroundColor: group.color }}
                              aria-hidden="true"
                            />
                            <h3 className="text-sm font-semibold text-fg">{group.label}</h3>
                          </div>
                          {examLabel ? (
                            <span className="text-xs text-muted-foreground">Exam {examLabel}</span>
                          ) : null}
                        </div>
                        <TimelineChart
                          series={group.series}
                          xDomain={domain}
                          yDomain={yDomain}
                          onViewportChange={(next, options) =>
                            handleViewportChange(next, { push: options?.push })
                          }
                          height={perChartHeight}
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
                          showTopicLabels={showTopicLabels}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }
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
          showTopicLabels={showTopicLabels}
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
    showEventDots,
    showTopicLabels
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

  const exportPng = async () => {
    const notifyFailure = () =>
      toast.error("Export failed: please reset filters before saving chart.");

    if (viewMode === "per-subject") {
      const combined = buildPerSubjectExportSvg();
      if (!combined) return;
      const success = await downloadSvgAsPng(combined, "review-timeline.png");
      if (!success) {
        notifyFailure();
      }
      return;
    }
    if (!svgRef.current) return;
    const success = await downloadSvgAsPng(svgRef.current, "review-timeline.png");
    if (!success) {
      notifyFailure();
    }
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
    ? "rounded-3xl border border-inverse/5 bg-card/50 p-5"
    : "rounded-3xl border border-inverse/5 bg-card/40 p-6 md:p-8";

  const handleClearFilters = React.useCallback(() => {
    setSearch("");
    setCategoryFilter(new Set());
    setShowExamMarkers(true);
    setShowCheckpoints(false);
    setShowReviewMarkers(false);
    setShowEventDots(true);
    setShowOpacityGradient(true);
    setShowTopicLabels(true);
  }, [
    setSearch,
    setCategoryFilter,
    setShowExamMarkers,
    setShowCheckpoints,
    setShowReviewMarkers,
    setShowEventDots,
    setShowOpacityGradient,
    setShowTopicLabels
  ]);

  const hasCustomFilters =
    search.trim().length > 0 ||
    categoryFilter.size > 0 ||
    !showExamMarkers ||
    showMilestones ||
    !showEventDots ||
    !showOpacityGradient ||
    !showTopicLabels;

  const overlayControls = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div
        className="flex items-center gap-1 overflow-x-auto whitespace-nowrap rounded-2xl border border-inverse/15 bg-card/70 p-1 shadow-sm scrollbar-none"
        role="group"
        aria-label="Timeline overlays"
      >
        <Toggle
          type="button"
          pressed={showExamMarkers}
          onPressedChange={(pressed) => setShowExamMarkers(Boolean(pressed))}
          aria-label="Toggle exam markers"
          title="Exam markers"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-transparent text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg data-[state=off]:border-transparent data-[state=off]:bg-transparent data-[state=off]:opacity-75 data-[state=off]:hover:border-inverse/20 data-[state=off]:hover:bg-card/60 data-[state=off]:hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:shadow-sm"
        >
          <GraduationCap className="h-4 w-4" />
          <span className="sr-only">Exam markers</span>
        </Toggle>
        <Toggle
          type="button"
          pressed={showMilestones}
          onPressedChange={handleToggleMilestones}
          aria-label="Toggle milestones"
          title="Milestones"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-transparent text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg data-[state=off]:border-transparent data-[state=off]:bg-transparent data-[state=off]:opacity-75 data-[state=off]:hover:border-inverse/20 data-[state=off]:hover:bg-card/60 data-[state=off]:hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:shadow-sm"
        >
          <Milestone className="h-4 w-4" />
          <span className="sr-only">Milestones</span>
        </Toggle>
        <Toggle
          type="button"
          pressed={showEventDots}
          onPressedChange={(pressed) => setShowEventDots(Boolean(pressed))}
          aria-label="Toggle event dots"
          title="Event dots"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-transparent text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg data-[state=off]:border-transparent data-[state=off]:bg-transparent data-[state=off]:opacity-75 data-[state=off]:hover:border-inverse/20 data-[state=off]:hover:bg-card/60 data-[state=off]:hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:shadow-sm"
        >
          <Dot className="h-4 w-4" />
          <span className="sr-only">Event dots</span>
        </Toggle>
        <Toggle
          type="button"
          pressed={showOpacityGradient}
          onPressedChange={(pressed) => setShowOpacityGradient(Boolean(pressed))}
          aria-label="Toggle opacity fade"
          title="Opacity fade"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-transparent text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg data-[state=off]:border-transparent data-[state=off]:bg-transparent data-[state=off]:opacity-75 data-[state=off]:hover:border-inverse/20 data-[state=off]:hover:bg-card/60 data-[state=off]:hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:shadow-sm"
        >
          <Droplet className="h-4 w-4" />
          <span className="sr-only">Opacity fade</span>
        </Toggle>
        <Toggle
          type="button"
          pressed={showTopicLabels}
          onPressedChange={(pressed) => setShowTopicLabels(Boolean(pressed))}
          aria-label="Toggle topic labels"
          title="Topic labels"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-transparent text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg data-[state=off]:border-transparent data-[state=off]:bg-transparent data-[state=off]:opacity-75 data-[state=off]:hover:border-inverse/20 data-[state=off]:hover:bg-card/60 data-[state=off]:hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:shadow-sm"
        >
          <Tag className="h-4 w-4" />
          <span className="sr-only">Topic labels</span>
        </Toggle>
      </div>
      {hasCustomFilters ? (
        <button
          type="button"
          onClick={handleClearFilters}
          className="inline-flex items-center gap-2 rounded-full border border-transparent bg-transparent px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <Eraser className="h-3.5 w-3.5" />
          Clear filters
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <section className={`${cardClasses} space-y-6`}
        aria-label="Review timeline">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="h-3 w-3" /> Retention & schedule
          </span>
          <div>
            <h2 className="text-xl font-semibold text-fg">Review timeline</h2>
            <p className="text-sm text-muted-foreground">
              Track when each topic is due and how its memory curve evolves.
            </p>
          </div>
        </header>

        <div className="flex w-full flex-wrap items-center gap-3 md:justify-between">
          <div
            className="flex items-center gap-1 rounded-2xl border border-inverse/10 bg-card/60 p-1"
            role="group"
            aria-label="Timeline view mode"
          >
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">View</span>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "combined" ? "default" : "ghost"}
            className={`rounded-xl px-3 ${viewMode === "combined" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            onClick={() => setViewMode("combined")}
            aria-pressed={viewMode === "combined"}
          >
            Combined
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "per-subject" ? "default" : "ghost"}
            className={`rounded-xl px-3 ${viewMode === "per-subject" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            onClick={() => setViewMode("per-subject")}
            aria-pressed={viewMode === "per-subject"}
          >
            Per subject
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-inverse/10 bg-muted/30 px-3 py-2 shadow-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground/80" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics"
            className="h-8 w-52 border-none bg-transparent text-xs text-fg placeholder:text-muted-foreground/80 focus-visible:ring-0"
          />
        </div>
      </div>


      <div className="flex flex-wrap items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        {categories.map((category) => {
          const active = categoryFilter.has(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleToggleCategory(category.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                active
                  ? "border-inverse/40 bg-inverse/10 text-fg"
                  : "border-inverse/10 bg-transparent text-muted-foreground hover:text-fg"
              }`}
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
              {category.label}
            </button>
          );
        })}
        {categories.length === 0 ? (
          <p className="text-xs text-muted-foreground/80">Categories you create appear here for quick filtering.</p>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {isZoomed
          ? "Timeline zoomed. Right-click the chart or double-click to return to the full schedule."
          : "Timeline showing the full scheduled range."}
      </p>

      <p className="sr-only" id="timeline-zoom-shortcuts">
        Keyboard shortcuts: plus zooms in, minus zooms out, zero resets, Z toggles zoom mode, Shift with the arrow keys adjusts the selection band,
        Enter applies the zoom, and Escape cancels it.
      </p>

      <p className="sr-only" id={pointerInstructionId}>
        Drag to draw a selection and release to zoom that range. Hold Shift while dragging to include retention. Hold Space to pan, right-click to step back,
        and double-click the chart to restore the default window.
      </p>

      {rangeWarning ? (
        <div className="flex items-center gap-2 rounded-2xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn/20">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{rangeWarning}</span>
        </div>
      ) : null}
      {rangeHint ? (
        <div className="flex items-center gap-2 rounded-2xl border border-inverse/10 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-accent" />
          <span>{rangeHint}</span>
        </div>
      ) : null}

      {viewMode === "combined" ? (
        <div className="space-y-6">
          <section aria-label="Subject selector" className="space-y-3">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Subjects
              </div>
              <span className="text-[10px] text-muted-foreground/70">
                {subjectOptions.length} available
              </span>
            </header>
            <p className="text-xs text-muted-foreground">
              Choose one subject to explore its retention curve.
            </p>
            {subjectOptions.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {subjectOptions.map((option) => {
                  const isActive = option.id === activeSubjectId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectSubject(option.id)}
                      aria-pressed={isActive}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                        isActive
                          ? "border-accent/60 bg-accent/15 text-accent shadow-sm"
                          : "border-inverse/10 bg-card/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-left">
                        <span
                          className="inline-flex h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: option.color }}
                          aria-hidden="true"
                        />
                        <span className="max-w-[12rem] truncate text-xs font-medium uppercase tracking-wide">
                          {option.label}
                        </span>
                      </span>
                      <span className="text-[11px] text-muted-foreground/80">
                        {option.topicCount} topic{option.topicCount === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-inverse/10 bg-card/50 px-3 py-3 text-xs text-muted-foreground">
                Add topics to start focusing the timeline by subject.
              </p>
            )}
          </section>

          <div className="border-t border-inverse/10" />

          <section aria-label="Topic visibility" className="space-y-3">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Tag className="h-3.5 w-3.5" /> Topics
              </div>
              {activeSubjectOption ? (
                <span className="text-[10px] text-muted-foreground/70">
                  {visibleTopicCount} selected
                </span>
              ) : null}
            </header>
            {activeSubjectOption ? (
              activeSubjectTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
                  {activeSubjectTopics.map((topic) => {
                    const isVisible = visibility[topic.id] ?? true;
                    const isFocused = activeTopic?.id === topic.id;
                    const color = singleSubjectColorOverrides?.get(topic.id) ?? resolveTopicColor(topic);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => handleToggleTopicVisibility(topic.id)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                          isVisible
                            ? "border-primary/50 bg-primary/15 text-primary shadow-sm"
                            : "border-inverse/10 bg-card/40 text-muted-foreground hover:text-fg"
                        } ${isFocused ? "ring-2 ring-primary/50" : ""}`}
                        aria-pressed={isVisible}
                        title={isVisible ? "Hide topic from chart" : "Show topic on chart"}
                      >
                        <span
                          className="inline-flex h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <span className="max-w-[9rem] truncate text-left">{topic.title}</span>
                        {isVisible ? <Check className="h-3 w-3" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No topics match the current filters for this subject.
                </p>
              )
            ) : (
              <p className="text-xs text-muted-foreground">Select a subject to manage its topics.</p>
            )}
            {activeSubjectOption && !activeTopic && visibleTopicCount === 0 ? (
              <p className="rounded-2xl border border-dashed border-inverse/10 bg-card/50 px-3 py-3 text-xs text-muted-foreground">
                Select at least one topic to display curves.
              </p>
            ) : null}
          </section>

          <div className="border-t border-inverse/10" />

          <section aria-label="Subject selected" className="space-y-3">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Subject selected
              </div>
              {activeSubjectOption ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-inverse/10 bg-inverse/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span
                    className="inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: activeSubjectOption.color }}
                    aria-hidden="true"
                  />
                  {activeSubjectOption.label}
                  <span className="font-normal text-muted-foreground/70">
                    · {subjectTopicCount} topic{subjectTopicCount === 1 ? "" : "s"}
                  </span>
                </span>
              ) : null}
            </header>
            {activeSubjectOption ? (
              <>
                {activeTopic ? (
                  <p className="text-xs text-muted-foreground">
                    Topic focus is active. Use Back to Subject View to restore all curves for {activeSubjectOption.label}.
                  </p>
                ) : null}
                {!activeTopic ? overlayControls : null}
                {!activeTopic ? (
                  domain && yDomain && series.length > 0 ? (
                    <div className="group relative rounded-3xl border border-inverse/10 bg-muted/30 p-3 shadow-sm transition-colors hover:bg-muted/40">
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
                        showTopicLabels={showTopicLabels}
                      />
                      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="pointer-events-auto rounded-full bg-card/70 text-muted-foreground shadow-sm hover:text-foreground"
                          onClick={(event) => {
                            if (series.length === 0) return;
                            fullscreenReturnFocusRef.current = event.currentTarget;
                            setFullscreenTarget({ type: "combined" });
                          }}
                          disabled={series.length === 0}
                          aria-label="Expand timeline"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        {variant === "default" ? (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="pointer-events-auto rounded-full bg-card/70 text-muted-foreground shadow-sm hover:text-foreground"
                              onClick={exportSvg}
                              disabled={series.length === 0}
                              aria-label="Download SVG"
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="pointer-events-auto rounded-full bg-card/70 text-muted-foreground shadow-sm hover:text-foreground"
                              onClick={() => void exportPng()}
                              disabled={series.length === 0}
                              aria-label="Download PNG"
                            >
                              <ImageDown className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-60 items-center justify-center rounded-3xl border border-dashed border-inverse/10 bg-card/40 text-sm text-muted-foreground">
                      {hasStudyActivity
                        ? visibleTopicCount === 0
                          ? "Select at least one topic to display curves."
                          : "No retention data for this selection yet."
                        : "No study activity yet. Add a topic to see your timeline."}
                    </div>
                  )
                ) : null}
                {subjectTopicCount > 0 ? (
                  <div
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-inverse/10 bg-card/60 px-3 py-2 text-xs text-muted-foreground"
                    aria-label="Topic color legend"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Topic colors
                    </span>
                    {legendItems.map((topic) => {
                      const color = singleSubjectColorOverrides?.get(topic.id) ?? resolveTopicColor(topic);
                      const isFocused = activeTopic?.id === topic.id;
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => handleSelectTopic(topic.id)}
                          className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] transition ${
                            isFocused
                              ? "border-primary/60 bg-primary/20 text-primary"
                              : "border-inverse/10 bg-inverse/5 text-muted-foreground hover:text-fg"
                          }`}
                          aria-pressed={isFocused}
                        >
                          <span
                            className="inline-flex h-2 w-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="max-w-[10rem] truncate text-left">{topic.title}</span>
                        </button>
                      );
                    })}
                    {legendRemaining > 0 ? (
                      <span className="text-[11px] text-muted-foreground">+{legendRemaining} more</span>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-inverse/10 bg-card/50 px-3 py-3 text-xs text-muted-foreground">
                Select a subject to view its retention curves.
              </p>
            )}
          </section>

          {activeTopic ? (
            <>
              <div className="border-t border-inverse/10" />

              <section aria-label="Topic focus" className="space-y-3">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> Topic focus
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setActiveTopicId(null)}>
                    Back to Subject View
                  </Button>
                </header>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-fg">{activeTopic.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Next review {formatDateWithWeekday(activeTopic.nextReviewDate)} · {formatRelativeToNow(activeTopic.nextReviewDate)}
                  </p>
                </div>
                {overlayControls}
                {domain && yDomain && series.length > 0 ? (
                  <div className="group relative rounded-3xl border border-inverse/10 bg-muted/30 p-3 shadow-sm transition-colors hover:bg-muted/40">
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
                      showTopicLabels={showTopicLabels}
                    />
                    <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="pointer-events-auto rounded-full bg-card/70 text-muted-foreground shadow-sm hover:text-foreground"
                        onClick={(event) => {
                          if (series.length === 0) return;
                          fullscreenReturnFocusRef.current = event.currentTarget;
                          setFullscreenTarget({ type: "combined" });
                        }}
                        disabled={series.length === 0}
                        aria-label="Expand timeline"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      {variant === "default" ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="pointer-events-auto rounded-full bg-card/70 text-muted-foreground shadow-sm hover:text-foreground"
                            onClick={exportSvg}
                            disabled={series.length === 0}
                            aria-label="Download SVG"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="pointer-events-auto rounded-full bg-card/70 text-muted-foreground shadow-sm hover:text-foreground"
                            onClick={() => void exportPng()}
                            disabled={series.length === 0}
                            aria-label="Download PNG"
                          >
                            <ImageDown className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          ) : null}

          <div className="border-t border-inverse/10" />

          <section aria-label="Upcoming checkpoints" className="space-y-3 rounded-2xl border border-inverse/5 bg-inverse/5 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Upcoming checkpoints</span>
              <span>
                {upcomingSchedule.length} topic{upcomingSchedule.length === 1 ? "" : "s"}
              </span>
            </div>
            {activeSubjectId ? (
              upcomingSchedule.length === 0 ? (
                <p className="rounded-2xl border border-inverse/10 bg-card/50 px-3 py-3 text-xs text-muted-foreground">
                  All caught up! Adjust your filters or add new reviews to see them here.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingSchedule.map((topic) => {
                    const due = isDueToday(topic.nextReviewDate);
                    const isFocused = activeTopic?.id === topic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => handleSelectTopic(topic.id)}
                        className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                          isFocused
                            ? "border-primary/60 bg-primary/10"
                            : "border-inverse/10 bg-card/60 hover:bg-card/70"
                        }`}
                        aria-pressed={isFocused}
                      >
                        <span
                          className="mt-1 inline-flex h-2 w-2 rounded-full"
                          style={{ backgroundColor: due ? palette.warn : resolveTopicColor(topic) }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-fg">{topic.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateWithWeekday(topic.nextReviewDate)} · {formatRelativeToNow(topic.nextReviewDate)}
                          </p>
                        </div>
                        <span
                          className={`checkpoint-status inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide ${
                            due ? "checkpoint-status--due" : "checkpoint-status--scheduled"
                          }`}
                        >
                          <Check className="h-3 w-3" /> {due ? "Due" : "Scheduled"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <p className="rounded-2xl border border-dashed border-inverse/10 bg-card/50 px-3 py-3 text-xs text-muted-foreground">
                Select a subject to preview its upcoming checkpoints.
              </p>
            )}
          </section>
        </div>
      ) : perSubjectSeries.length > 0 && domain && yDomain ? (
        <>
          {overlayControls}
          <div ref={perSubjectContainerRef} className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
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
                className="space-y-2 rounded-3xl border border-inverse/10 bg-card/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-2 w-2 rounded-full"
                      style={{ backgroundColor: group.color }}
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-semibold text-fg">{group.label}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {examLabel ? (
                      <span className="text-xs text-muted-foreground">Exam {examLabel}</span>
                    ) : null}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={(event) => {
                        if (group.series.length === 0) {
                          return;
                        }
                        fullscreenReturnFocusRef.current = event.currentTarget;
                        setFullscreenTarget({ type: "subject", subjectId: group.subjectId });
                      }}
                      disabled={group.series.length === 0}
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
                  showTopicLabels={showTopicLabels}
                />
              </div>
            );
            })}
          </div>
        </>
      ) : (
          <div className="flex h-60 items-center justify-center rounded-3xl border border-dashed border-inverse/10 bg-card/40 text-sm text-muted-foreground">
            No study activity yet. Add a topic to see your timeline.
          </div>
        )}
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
      className="fixed inset-0 z-[1200] flex flex-col bg-bg/95 backdrop-blur"
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
        className="flex h-full w-full flex-col gap-6 p-4 text-fg sm:p-6"
      >
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 id={titleId} className="text-xl font-semibold text-fg">
              {title}
            </h2>
            <p id={descriptionId} className="text-sm text-muted-foreground">
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
          <div className="flex min-h-0 flex-1 items-stretch rounded-3xl border border-inverse/10 bg-card/60 p-3">
            <div className="h-full w-full">{renderChart(chartHeight)}</div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use the mouse wheel or touch gestures to zoom, drag to pan, or press Escape to exit fullscreen.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
