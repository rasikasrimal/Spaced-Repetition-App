"use client";

import * as React from "react";
import { startOfDayInTimeZone } from "@/lib/date";

export type TimelinePoint = { t: number; r: number; opacity: number };

export type TimelineSegment = {
  id: string;
  points: TimelinePoint[];
  isHistorical: boolean;
  fade: { from: number; to: number };
  checkpoint?: { t: number; target: number };
};

export type TimelineStitch = {
  id: string;
  t: number;
  from: number;
  to: number;
  notes?: string;
};

export type TimelineNowPoint = {
  t: number;
  r: number;
  notes?: string;
};

export type TimelineSeries = {
  topicId: string;
  topicTitle: string;
  color: string;
  points: TimelinePoint[];
  segments: TimelineSegment[];
  stitches: TimelineStitch[];
  events: {
    id: string;
    t: number;
    type: "started" | "reviewed" | "skipped" | "checkpoint";
    intervalDays?: number;
    notes?: string;
  }[];
  nowPoint?: TimelineNowPoint | null;
};

export type TimelineExamMarker = {
  id: string;
  time: number;
  color: string;
  subjectName: string;
  daysRemaining: number | null;
  dateISO: string;
};

type MarkerItem = TimelineExamMarker & { x: number };
type MarkerCluster = { items: MarkerItem[]; x: number };
type MarkerTooltip = {
  x: number;
  y: number;
  title?: string;
  items: { subjectName: string; dateISO: string; daysRemaining: number | null; color: string }[];
};

type TimelineViewport = {
  x: [number, number];
  y: [number, number];
};

type ViewportChangeSource = "selection" | "wheel" | "pan" | "keyboard" | "touch";

type ViewportChangeOptions = {
  push?: boolean;
  replace?: boolean;
  source?: ViewportChangeSource;
};

type InteractionMode = "zoom" | "pan";

type KeyboardBand = {
  start: number;
  end: number;
  y?: [number, number];
};

type SelectionState = {
  pointerId: number;
  pointerType: string;
  origin: { x: number; y: number };
  current: { x: number; y: number };
  shift: boolean;
};

type PanState = {
  pointerId: number;
  originClientX: number;
  startDomain: [number, number];
};

type PinchState = {
  initialDistance: number;
  initialCenter: number;
  initialDomain: [number, number];
  initialSpan: number;
  pushed: boolean;
};

interface TimelineChartProps {
  series: TimelineSeries[];
  xDomain: [number, number];
  yDomain: [number, number];
  onViewportChange?: (viewport: TimelineViewport, options?: ViewportChangeOptions) => void;
  fullDomain?: [number, number];
  fullYDomain?: [number, number];
  height?: number;
  showGrid?: boolean;
  examMarkers?: TimelineExamMarker[];
  showTodayLine?: boolean;
  timeZone?: string;
  onResetDomain?: () => void;
  ariaDescribedBy?: string;
  interactionMode?: InteractionMode;
  temporaryPan?: boolean;
  onRequestStepBack?: () => void;
  onTooSmallSelection?: () => void;
  keyboardSelection?: KeyboardBand | null;
  showOpacityGradient?: boolean;
  showReviewMarkers?: boolean;
  showEventDots?: boolean;
}

const PADDING_X = 48;
const PADDING_Y = 32;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MIN_SPAN_MS = DAY_MS;
const MIN_Y_SPAN = 0.05;
const TICK_SPACING_PX = 96;
const MIN_DRAG_PX = 10;

type RangeTuple = [number, number];

const clampValue = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const clampRange = (range: RangeTuple, bounds: RangeTuple | undefined, minSpan: number): RangeTuple => {
  if (!bounds) return range;
  const [requestedStart, requestedEnd] = range;
  const [boundStart, boundEnd] = bounds;
  const availableSpan = Math.max(minSpan, boundEnd - boundStart);
  const requestedSpan = clampValue(requestedEnd - requestedStart, minSpan, availableSpan);
  let start = clampValue(requestedStart, boundStart, boundEnd - requestedSpan);
  let end = start + requestedSpan;
  if (end > boundEnd) {
    end = boundEnd;
    start = end - requestedSpan;
  }
  if (start < boundStart) {
    start = boundStart;
    end = start + requestedSpan;
  }
  return [start, end];
};

const ensureSpan = (range: RangeTuple, minSpan: number): RangeTuple => {
  const span = range[1] - range[0];
  if (span >= minSpan) return range;
  const center = (range[0] + range[1]) / 2;
  const half = minSpan / 2;
  return [center - half, center + half];
};
export const TimelineChart = React.forwardRef<SVGSVGElement, TimelineChartProps>(
  (
    {
      series,
      xDomain,
      yDomain,
      onViewportChange,
      fullDomain,
      fullYDomain,
      height = 400,
      showGrid = true,
      examMarkers = [],
      showTodayLine = true,
      timeZone = "UTC",
      onResetDomain,
      ariaDescribedBy,
      interactionMode = "zoom",
      temporaryPan = false,
      onRequestStepBack,
      onTooSmallSelection,
      keyboardSelection,
      showOpacityGradient = true,
      showReviewMarkers = false,
      showEventDots = true
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    React.useImperativeHandle(ref, () => svgRef.current as SVGSVGElement);

    const gradientPrefix = React.useId();

    const makeGradientId = React.useCallback(
      (topicId: string, segmentId: string) =>
        `${gradientPrefix}-${topicId}-${segmentId}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
      [gradientPrefix]
    );

    React.useEffect(() => {
      const element = containerRef.current;
      if (!element) return;

      const handleWheelCapture = (event: WheelEvent) => {
        if (!containerRef.current) return;
        if (!containerRef.current.contains(event.target as Node)) return;
        event.preventDefault();
      };

      element.addEventListener("wheel", handleWheelCapture, { passive: false });

      return () => {
        element.removeEventListener("wheel", handleWheelCapture);
      };
    }, []);

    const [width, setWidth] = React.useState(960);
    const [isPanning, setIsPanning] = React.useState(false);

    const tooltipDateFormatter = React.useMemo(
      () =>
        new Intl.DateTimeFormat("en", {
          timeZone,
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric"
        }),
      [timeZone]
    );

    const axisDayFormatter = React.useMemo(
      () =>
        new Intl.DateTimeFormat("en", {
          timeZone,
          month: "short",
          day: "numeric"
        }),
      [timeZone]
    );

    const axisMonthFormatter = React.useMemo(
      () =>
        new Intl.DateTimeFormat("en", {
          timeZone,
          month: "short",
          year: "numeric"
        }),
      [timeZone]
    );

    const examDateFormatter = React.useMemo(
      () =>
        new Intl.DateTimeFormat("en", {
          timeZone,
          month: "short",
          day: "numeric",
          year: "numeric"
        }),
      [timeZone]
    );

    React.useEffect(() => {
      const element = containerRef.current;
      if (!element) return;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setWidth(Math.max(640, entry.contentRect.width));
        }
      });
      observer.observe(element);
      return () => observer.disconnect();
    }, []);

    const plotWidth = React.useMemo(() => Math.max(100, width - PADDING_X * 2), [width]);
    const plotHeight = React.useMemo(() => Math.max(100, height - PADDING_Y * 2), [height]);
    const domainSpan = React.useMemo(() => Math.max(MIN_SPAN_MS, xDomain[1] - xDomain[0]), [xDomain]);
    const ySpan = React.useMemo(() => Math.max(MIN_Y_SPAN, yDomain[1] - yDomain[0]), [yDomain]);

    const scaleX = React.useCallback(
      (time: number) => {
        const ratio = (time - xDomain[0]) / domainSpan;
        return PADDING_X + clampValue(ratio, 0, 1) * plotWidth;
      },
      [xDomain, domainSpan, plotWidth]
    );

    const unscaleX = React.useCallback(
      (pixel: number) => {
        const clamped = clampValue(pixel, PADDING_X, width - PADDING_X);
        const ratio = (clamped - PADDING_X) / plotWidth;
        return xDomain[0] + ratio * domainSpan;
      },
      [xDomain, domainSpan, plotWidth, width]
    );

    const scaleY = React.useCallback(
      (value: number) => {
        const ratio = (value - yDomain[0]) / ySpan;
        const clamped = clampValue(ratio, 0, 1);
        return PADDING_Y + (1 - clamped) * plotHeight;
      },
      [yDomain, ySpan, plotHeight]
    );

    const unscaleY = React.useCallback(
      (pixel: number) => {
        const clamped = clampValue(pixel, PADDING_Y, height - PADDING_Y);
        const ratio = 1 - (clamped - PADDING_Y) / plotHeight;
        return yDomain[0] + clampValue(ratio, 0, 1) * ySpan;
      },
      [yDomain, ySpan, plotHeight, height]
    );

    const segmentGradients = React.useMemo(() => {
      if (!showOpacityGradient) return [] as React.ReactNode[];
      const defs: React.ReactNode[] = [];
      for (const line of series) {
        for (const segment of line.segments) {
          if (segment.points.length === 0) continue;
          const gradientId = makeGradientId(line.topicId, segment.id);
          const fromTime = Number.isFinite(segment.fade.from)
            ? segment.fade.from
            : segment.points[0]?.t ?? segment.points[segment.points.length - 1]?.t;
          const toTime = Number.isFinite(segment.fade.to) ? segment.fade.to : fromTime;
          if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) continue;
          const startTime = Math.min(fromTime, toTime);
          const endTime = Math.max(fromTime, toTime);
          let x1 = scaleX(startTime);
          let x2 = scaleX(endTime);
          if (!Number.isFinite(x1) || !Number.isFinite(x2)) continue;
          if (x1 === x2) {
            x2 = x1 + 0.001;
          }
          const reversed = toTime < fromTime;
          defs.push(
            <linearGradient
              key={gradientId}
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1={x1}
              y1={0}
              x2={x2}
              y2={0}
            >
              {reversed ? (
                <>
                  <stop offset="0%" stopColor={line.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={line.color} stopOpacity={0} />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor={line.color} stopOpacity={0} />
                  <stop offset="100%" stopColor={line.color} stopOpacity={1} />
                </>
              )}
            </linearGradient>
          );
        }
      }
      return defs;
    }, [series, scaleX, makeGradientId, showOpacityGradient]);

    const todayPosition = React.useMemo(() => {
      const now = Date.now();
      if (now < xDomain[0] || now > xDomain[1]) return null;
      return scaleX(now);
    }, [scaleX, xDomain]);

    const yTicks = React.useMemo(() => {
      const steps = 4;
      const ticks: { value: number; label: string; pixel: number }[] = [];
      for (let index = 0; index <= steps; index += 1) {
        const ratio = index / steps;
        const value = yDomain[0] + ratio * ySpan;
        ticks.push({ value, label: `${Math.round(value * 100)}%`, pixel: scaleY(value) });
      }
      return ticks;
    }, [yDomain, ySpan, scaleY]);

    const ticks = React.useMemo(() => {
      if (!Number.isFinite(xDomain[0]) || !Number.isFinite(xDomain[1]) || xDomain[0] >= xDomain[1]) {
        return [] as { time: number; label: string }[];
      }
      const spanMs = xDomain[1] - xDomain[0];
      const spanDays = spanMs / DAY_MS;
      const maxTicks = Math.max(4, Math.floor(plotWidth / TICK_SPACING_PX));
      if (maxTicks <= 0) return [];

      const dailyThreshold = maxTicks * 2;
      const weeklyThreshold = maxTicks * 7;

      let mode: "day" | "week" | "month";
      if (spanDays <= dailyThreshold) {
        mode = "day";
      } else if (spanDays <= weeklyThreshold) {
        mode = "week";
      } else {
        mode = "month";
      }

      const results: { time: number; label: string }[] = [];
      const rangeStart = startOfDayInTimeZone(new Date(xDomain[0]), timeZone).getTime();
      const end = xDomain[1];

      if (mode === "month") {
        const cursor = new Date(rangeStart);
        cursor.setUTCDate(1);
        if (cursor.getTime() < xDomain[0]) {
          cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
        const totalMonths = Math.max(1, Math.ceil(spanDays / 30));
        const stepMonths = Math.max(1, Math.ceil(totalMonths / maxTicks));
        while (cursor.getTime() <= end) {
          results.push({
            time: cursor.getTime(),
            label: axisMonthFormatter.format(cursor)
          });
          cursor.setUTCMonth(cursor.getUTCMonth() + stepMonths);
        }
      } else {
        const stepMs = mode === "day" ? DAY_MS : WEEK_MS;
        let cursor = rangeStart;
        if (cursor < xDomain[0]) {
          const delta = Math.ceil((xDomain[0] - cursor) / stepMs);
          cursor += delta * stepMs;
        }
        while (cursor <= end) {
          results.push({
            time: cursor,
            label: axisDayFormatter.format(new Date(cursor))
          });
          cursor += stepMs;
        }
      }

      return results;
    }, [xDomain, plotWidth, timeZone, axisDayFormatter, axisMonthFormatter]);

    const [tooltip, setTooltip] = React.useState<
      | null
      | {
          x: number;
          y: number;
          topic: string;
          time: number;
          retention?: number;
          type?: "started" | "reviewed" | "skipped" | "checkpoint";
          intervalDays?: number;
          notes?: string;
        }
    >(null);
    const [markerTooltip, setMarkerTooltip] = React.useState<MarkerTooltip | null>(null);

    const tooltipsSuspendedRef = React.useRef(false);

    const hideTooltip = React.useCallback(() => setTooltip(null), []);
    const hideMarkerTooltip = React.useCallback(() => setMarkerTooltip(null), []);

    const handlePointerMove: React.PointerEventHandler<SVGRectElement> = (event) => {
      if (tooltipsSuspendedRef.current) {
        hideTooltip();
        hideMarkerTooltip();
        return;
      }
      const { offsetX } = event.nativeEvent;
      if (offsetX < PADDING_X || offsetX > width - PADDING_X) {
        hideTooltip();
        hideMarkerTooltip();
        return;
      }
      const ratio = clampValue((offsetX - PADDING_X) / plotWidth, 0, 1);
      const time = xDomain[0] + ratio * domainSpan;
      let best:
        | null
        | {
            series: TimelineSeries;
            point: { t: number; r: number };
            distance: number;
          } = null;

      for (const line of series) {
        if (line.points.length === 0) continue;
        let left = 0;
        let right = line.points.length - 1;
        while (right - left > 1) {
          const mid = (left + right) >> 1;
          if (line.points[mid].t < time) left = mid;
          else right = mid;
        }
        const candidates = [line.points[left], line.points[Math.min(right, line.points.length - 1)]];
        for (const candidate of candidates) {
          const x = scaleX(candidate.t);
          const distance = Math.abs(x - offsetX);
          if (!best || distance < best.distance) {
            best = { series: line, point: candidate, distance };
          }
        }
      }

      if (best) {
        setTooltip({
          x: scaleX(best.point.t),
          y: scaleY(best.point.r),
          topic: best.series.topicTitle,
          time: best.point.t,
          retention: best.point.r
        });
      } else {
        hideTooltip();
      }
    };

    const selectionRef = React.useRef<SelectionState | null>(null);
    const [selectionRect, setSelectionRect] = React.useState<SelectionState | null>(null);
    const [selectionLabel, setSelectionLabel] = React.useState<{ primary: string; secondary?: string } | null>(null);

    const panStateRef = React.useRef<PanState | null>(null);

    const activeTouchesRef = React.useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchStateRef = React.useRef<PinchState | null>(null);

    const wheelActiveRef = React.useRef(false);
    const wheelTimeoutRef = React.useRef<number | null>(null);

    const clearWheelSession = React.useCallback(() => {
      if (wheelTimeoutRef.current) {
        window.clearTimeout(wheelTimeoutRef.current);
        wheelTimeoutRef.current = null;
      }
      wheelActiveRef.current = false;
    }, []);

    const commitViewportChange = React.useCallback(
      (viewport: TimelineViewport, options: ViewportChangeOptions) => {
        if (!onViewportChange) return;
        onViewportChange(viewport, options);
      },
      [onViewportChange]
    );

    const cancelSelection = React.useCallback(() => {
      selectionRef.current = null;
      setSelectionRect(null);
      setSelectionLabel(null);
      tooltipsSuspendedRef.current = false;
    }, []);

    const updateSelectionVisual = React.useCallback(
      (state: SelectionState | null) => {
        if (!state) {
          setSelectionRect(null);
          setSelectionLabel(null);
          return;
        }
        const x0 = clampValue(state.origin.x, PADDING_X, width - PADDING_X);
        const y0 = clampValue(state.origin.y, PADDING_Y, height - PADDING_Y);
        const x1 = clampValue(state.current.x, PADDING_X, width - PADDING_X);
        const y1 = clampValue(state.current.y, PADDING_Y, height - PADDING_Y);
        const rect: SelectionState = {
          ...state,
          origin: { x: x0, y: y0 },
          current: { x: x1, y: y1 }
        };
        setSelectionRect(rect);

        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);
        const startTime = unscaleX(minX);
        const endTime = unscaleX(maxX);
        const primary = `${axisDayFormatter.format(new Date(startTime))} ? ${axisDayFormatter.format(new Date(endTime))}`;

        if (rect.shift) {
          const topValue = unscaleY(minY);
          const bottomValue = unscaleY(maxY);
          const secondary = `${Math.round(bottomValue * 100)}% ? ${Math.round(topValue * 100)}% retention`;
          setSelectionLabel({ primary, secondary });
        } else {
          setSelectionLabel({ primary });
        }
      },
      [axisDayFormatter, height, unscaleX, unscaleY, width]
    );

    const finalizeSelection = React.useCallback(
      (state: SelectionState | null) => {
        if (!state) {
          cancelSelection();
          return;
        }
        const x0 = clampValue(state.origin.x, PADDING_X, width - PADDING_X);
        const x1 = clampValue(state.current.x, PADDING_X, width - PADDING_X);
        const spanPx = Math.abs(x1 - x0);
        if (spanPx < MIN_DRAG_PX) {
          cancelSelection();
          return;
        }
        const startTime = unscaleX(Math.min(x0, x1));
        const endTime = unscaleX(Math.max(x0, x1));
        const span = endTime - startTime;
        if (span < MIN_SPAN_MS) {
          onTooSmallSelection?.();
          cancelSelection();
          return;
        }
        let nextY: RangeTuple;
        if (state.shift) {
          const y0 = clampValue(state.origin.y, PADDING_Y, height - PADDING_Y);
          const y1 = clampValue(state.current.y, PADDING_Y, height - PADDING_Y);
          const topValue = unscaleY(Math.min(y0, y1));
          const bottomValue = unscaleY(Math.max(y0, y1));
          const ensured = ensureSpan([topValue, bottomValue], MIN_Y_SPAN);
          nextY = clampRange(ensured, fullYDomain, MIN_Y_SPAN);
        } else {
          nextY = yDomain;
        }
        const ensuredX = ensureSpan([startTime, endTime], MIN_SPAN_MS);
        const nextX = clampRange(ensuredX, fullDomain, MIN_SPAN_MS);
        commitViewportChange({ x: nextX, y: nextY }, { push: true, source: "selection" });
        cancelSelection();
      },
      [cancelSelection, commitViewportChange, fullDomain, fullYDomain, height, onTooSmallSelection, unscaleX, unscaleY, width, yDomain]
    );

    React.useEffect(() => {
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && selectionRef.current) {
          event.preventDefault();
          cancelSelection();
        }
      };
      window.addEventListener("keydown", handleKeydown);
      return () => window.removeEventListener("keydown", handleKeydown);
    }, [cancelSelection]);

    const beginPan = React.useCallback(
      (event: React.PointerEvent<SVGRectElement>) => {
        panStateRef.current = {
          pointerId: event.pointerId,
          originClientX: event.clientX,
          startDomain: xDomain
        };
        tooltipsSuspendedRef.current = true;
        setIsPanning(true);
        hideTooltip();
        hideMarkerTooltip();
      },
      [hideMarkerTooltip, hideTooltip, xDomain]
    );

    const updatePan = React.useCallback(
      (event: React.PointerEvent<SVGRectElement>) => {
        if (!panStateRef.current || !onViewportChange) return;
        const deltaPx = event.clientX - panStateRef.current.originClientX;
        const fraction = deltaPx / plotWidth;
        const deltaMs = fraction * domainSpan;
        const next: RangeTuple = [
          panStateRef.current.startDomain[0] - deltaMs,
          panStateRef.current.startDomain[1] - deltaMs
        ];
        const clamped = clampRange(next, fullDomain, MIN_SPAN_MS);
        commitViewportChange({ x: clamped, y: yDomain }, { replace: true, source: "pan" });
      },
      [commitViewportChange, domainSpan, fullDomain, onViewportChange, plotWidth, yDomain]
    );

    const endPan = React.useCallback(
      () => {
        panStateRef.current = null;
        setIsPanning(false);
        tooltipsSuspendedRef.current = false;
      },
      []
    );

    const shouldPan = React.useCallback(
      (event: React.PointerEvent<SVGRectElement>) => {
        if (temporaryPan) return true;
        if (interactionMode === "pan") return true;
        if (event.pointerType === "touch" && activeTouchesRef.current.size >= 2) return true;
        if (event.button === 1) return true;
        return false;
      },
      [interactionMode, temporaryPan]
    );

    const handlePointerDown: React.PointerEventHandler<SVGRectElement> = (event) => {
      if (event.button === 2) {
        event.preventDefault();
        onRequestStepBack?.();
        return;
      }

      (event.target as Element).setPointerCapture(event.pointerId);

      tooltipsSuspendedRef.current = true;
      hideTooltip();
      hideMarkerTooltip();

      if (event.pointerType === "touch") {
        activeTouchesRef.current.set(event.pointerId, {
          x: event.nativeEvent.offsetX,
          y: event.nativeEvent.offsetY
        });
      }

      if (shouldPan(event)) {
        beginPan(event);
        return;
      }

      const state: SelectionState = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        origin: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
        current: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
        shift: event.shiftKey
      };
      selectionRef.current = state;
      updateSelectionVisual(state);
    };

    const handlePointerMovePan: React.PointerEventHandler<SVGRectElement> = (event) => {
      if (event.pointerType === "touch") {
        if (activeTouchesRef.current.has(event.pointerId)) {
          activeTouchesRef.current.set(event.pointerId, {
            x: event.nativeEvent.offsetX,
            y: event.nativeEvent.offsetY
          });
        }
        if (activeTouchesRef.current.size >= 2) {
          event.preventDefault();
          const touches = Array.from(activeTouchesRef.current.values());
          const [first, second] = touches;
          const distance = Math.abs(second.x - first.x);
          const center = (second.x + first.x) / 2;
          if (!pinchStateRef.current) {
            pinchStateRef.current = {
              initialDistance: Math.max(1, distance),
              initialCenter: center,
              initialDomain: xDomain,
              initialSpan: domainSpan,
              pushed: false
            };
            tooltipsSuspendedRef.current = true;
            hideTooltip();
            hideMarkerTooltip();
          } else {
            const session = pinchStateRef.current;
            const ratio = clampValue(distance / session.initialDistance, 0.25, 4);
            const newSpan = Math.max(MIN_SPAN_MS, session.initialSpan * ratio);
            const centerRatio = clampValue((session.initialCenter - PADDING_X) / plotWidth, 0, 1);
            const initialCenterValue = session.initialDomain[0] + centerRatio * session.initialSpan;
            const centerDeltaPx = center - session.initialCenter;
            const centerShift = (centerDeltaPx / plotWidth) * session.initialSpan;
            let nextCenter = initialCenterValue + centerShift;
            let nextStart = nextCenter - newSpan / 2;
            let nextEnd = nextCenter + newSpan / 2;
            const clamped = clampRange([nextStart, nextEnd], fullDomain, MIN_SPAN_MS);
            nextStart = clamped[0];
            nextEnd = clamped[1];
            const options: ViewportChangeOptions = session.pushed
              ? { replace: true, source: "touch" }
              : { push: true, source: "touch" };
            commitViewportChange({ x: [nextStart, nextEnd], y: yDomain }, options);
            pinchStateRef.current = { ...session, pushed: true };
          }
          return;
        }
      }

      if (panStateRef.current) {
        updatePan(event);
        return;
      }

      if (!selectionRef.current || selectionRef.current.pointerId !== event.pointerId) return;
      const nextState: SelectionState = {
        ...selectionRef.current,
        current: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
        shift: event.shiftKey
      };
      selectionRef.current = nextState;
      updateSelectionVisual(nextState);
    };

    const handlePointerUp: React.PointerEventHandler<SVGRectElement> = (event) => {
      (event.target as Element).releasePointerCapture(event.pointerId);

      if (event.pointerType === "touch") {
        activeTouchesRef.current.delete(event.pointerId);
        if (activeTouchesRef.current.size < 2) {
          pinchStateRef.current = null;
          tooltipsSuspendedRef.current = false;
        }
      }

      if (panStateRef.current && panStateRef.current.pointerId === event.pointerId) {
        endPan();
        return;
      }

      if (selectionRef.current && selectionRef.current.pointerId === event.pointerId) {
        finalizeSelection(selectionRef.current);
      }
    };

    const handlePointerLeave: React.PointerEventHandler<SVGRectElement> = () => {
      cancelSelection();
      hideTooltip();
      hideMarkerTooltip();
      endPan();
      pinchStateRef.current = null;
      activeTouchesRef.current.clear();
    };

    const handlePointerCancel: React.PointerEventHandler<SVGRectElement> = () => {
      cancelSelection();
      endPan();
      pinchStateRef.current = null;
      activeTouchesRef.current.clear();
      tooltipsSuspendedRef.current = false;
    };

    const handleWheel: React.WheelEventHandler<SVGSVGElement> = (event) => {
      if (!onViewportChange) return;
      const { deltaY, deltaX, offsetX, shiftKey } = event.nativeEvent;

      if (shiftKey) {
        event.preventDefault();
        const delta = deltaX !== 0 ? deltaX : deltaY;
        if (delta === 0) return;
        const fraction = delta / plotWidth;
        const deltaMs = fraction * domainSpan;
        const next: [number, number] = [xDomain[0] + deltaMs, xDomain[1] + deltaMs];
        commitViewportChange({ x: clampRange(next, fullDomain, MIN_SPAN_MS), y: yDomain }, { replace: true, source: "pan" });
        return;
      }

      if (offsetX < PADDING_X || offsetX > width - PADDING_X) return;
      event.preventDefault();
      const zoomIn = deltaY < 0;
      let newSpan = domainSpan * (zoomIn ? 0.85 : 1.15);
      const fullSpan = fullDomain ? Math.max(MIN_SPAN_MS, fullDomain[1] - fullDomain[0]) : Number.POSITIVE_INFINITY;
      newSpan = clampValue(newSpan, MIN_SPAN_MS, fullSpan);
      const ratio = clampValue((offsetX - PADDING_X) / plotWidth, 0, 1);
      const anchorTime = xDomain[0] + domainSpan * ratio;
      const nextStart = anchorTime - newSpan * ratio;
      const nextEnd = nextStart + newSpan;
      const next = clampRange([nextStart, nextEnd], fullDomain, MIN_SPAN_MS);
      const options: ViewportChangeOptions = wheelActiveRef.current
        ? { replace: true, source: "wheel" }
        : { push: true, source: "wheel" };
      commitViewportChange({ x: next, y: yDomain }, options);
      wheelActiveRef.current = true;
      if (wheelTimeoutRef.current) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = window.setTimeout(clearWheelSession, 220);
    };

    React.useEffect(() => () => clearWheelSession(), [clearWheelSession]);

    React.useEffect(() => {
      setMarkerTooltip(null);
    }, [examMarkers, xDomain]);

    const paths = series.map((line) => (
      <g key={line.topicId}>
        {line.segments.map((segment) => {
          if (segment.points.length === 0) return null;
          const gradientId = makeGradientId(line.topicId, segment.id);
          const strokeColor = showOpacityGradient ? `url(#${gradientId})` : line.color;
          return (
            <path
              key={segment.id}
              d={segment.points
                .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.t)} ${scaleY(point.r)}`)
                .join(" ")}
              fill="none"
              stroke={strokeColor}
              strokeWidth={segment.isHistorical ? 1.5 : 2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={showOpacityGradient ? undefined : 1}
            />
          );
        })}
        {showReviewMarkers
          ? line.stitches.map((stitch) => {
            const x = scaleX(stitch.t);
            const yTop = scaleY(Math.min(1, Math.max(yDomain[0], stitch.to)));
            const yBottom = scaleY(Math.max(yDomain[0], Math.min(yDomain[1], stitch.from)));
            return (
              <line
                key={stitch.id}
                x1={x}
                x2={x}
                y1={yTop}
                y2={yBottom}
                stroke={line.color}
                strokeWidth={1.5}
                strokeDasharray="2 2"
                opacity={0.8}
                pointerEvents="none"
              />
            );
          })
          : null}
        {line.events.map((event) => {
          const x = scaleX(event.t);
          let yValue = 1;
          if (event.type === "checkpoint") {
            const segment = line.segments.find((seg) => seg.checkpoint && seg.checkpoint.t === event.t);
            if (segment?.checkpoint) {
              yValue = segment.checkpoint.target;
            }
          }
          const y = scaleY(Math.max(yDomain[0], Math.min(yDomain[1], yValue)));
          const handleFocus = () =>
            setTooltip({
              x,
              y: scaleY(Math.min(0.9, yDomain[1])),
              topic: line.topicTitle,
              time: event.t,
              type: event.type,
              intervalDays: event.intervalDays,
              notes: event.notes
            });
          const transform = `translate(${x}, ${y})`;

          if (event.type === "started") {
            if (!showEventDots) return null;
            return (
              <rect
                key={event.id}
                x={-5}
                y={-5}
                width={10}
                height={10}
                fill={line.color}
                tabIndex={0}
                transform={transform}
                aria-label={`${line.topicTitle} started ${tooltipDateFormatter.format(new Date(event.t))}`}
                onFocus={handleFocus}
                onBlur={hideTooltip}
                onMouseEnter={handleFocus}
                onMouseLeave={hideTooltip}
              />
            );
          }

          if (!showReviewMarkers) {
            return null;
          }

          if (event.type === "skipped") {
            return (
              <polygon
                key={event.id}
                points="0,-6 6,0 0,6 -6,0"
                fill={line.color}
                tabIndex={0}
                transform={transform}
                aria-label={`${line.topicTitle} skipped ${tooltipDateFormatter.format(new Date(event.t))}`}
                onFocus={handleFocus}
                onBlur={hideTooltip}
                onMouseEnter={handleFocus}
                onMouseLeave={hideTooltip}
              />
            );
          }

          if (event.type === "checkpoint") {
            return (
              <circle
                key={event.id}
                r={6}
                fill="white"
                stroke={line.color}
                strokeWidth={2}
                tabIndex={0}
                transform={transform}
                aria-label={`${line.topicTitle} checkpoint ${tooltipDateFormatter.format(new Date(event.t))}`}
                onFocus={handleFocus}
                onBlur={hideTooltip}
                onMouseEnter={handleFocus}
                onMouseLeave={hideTooltip}
              />
            );
          }

          return (
            <circle
              key={event.id}
              r={5}
              fill={line.color}
              tabIndex={0}
              transform={transform}
              aria-label={`${line.topicTitle} reviewed ${tooltipDateFormatter.format(new Date(event.t))}`}
              onFocus={handleFocus}
              onBlur={hideTooltip}
              onMouseEnter={handleFocus}
              onMouseLeave={hideTooltip}
            />
          );
        })}
        {line.nowPoint && line.nowPoint.t >= xDomain[0] && line.nowPoint.t <= xDomain[1] ? (
          (() => {
            const x = scaleX(line.nowPoint!.t);
            const y = scaleY(line.nowPoint!.r);
            const handleFocus = () => {
              setTooltip({
                x,
                y: scaleY(Math.min(line.nowPoint!.r + 0.1, yDomain[1])),
                topic: line.topicTitle,
                time: line.nowPoint!.t,
                retention: line.nowPoint!.r,
                notes: line.nowPoint!.notes
              });
            };
            return (
              <g key={`${line.topicId}-now`} transform={`translate(${x}, ${y})`}>
                <circle
                  r={4}
                  fill={line.color}
                  stroke="white"
                  strokeWidth={1.5}
                  tabIndex={0}
                  aria-label={`${line.topicTitle} retention now ${Math.round(line.nowPoint!.r * 100)}%`}
                  onFocus={handleFocus}
                  onBlur={hideTooltip}
                  onMouseEnter={handleFocus}
                  onMouseLeave={hideTooltip}
                />
              </g>
            );
          })()
        ) : null}
      </g>
    ));

    const clampX = React.useCallback(
      (value: number) => clampValue(value, PADDING_X, width - PADDING_X),
      [width]
    );

    const markerClusters = React.useMemo<MarkerCluster[]>(() => {
      if (!examMarkers || examMarkers.length === 0) return [];
      const filtered = examMarkers.filter((marker) => marker.time >= xDomain[0] && marker.time <= xDomain[1]);
      if (filtered.length === 0) return [];
      const items: MarkerItem[] = filtered
        .map((marker) => ({
          ...marker,
          x: clampX(scaleX(marker.time))
        }))
        .sort((a, b) => a.x - b.x);
      const threshold = 12;
      const clusters: MarkerCluster[] = [];
      for (const item of items) {
        const last = clusters[clusters.length - 1];
        if (last && Math.abs(item.x - last.x) <= threshold) {
          const nextItems = [...last.items, item];
          const averageX = nextItems.reduce((total, entry) => total + entry.x, 0) / nextItems.length;
          clusters[clusters.length - 1] = { items: nextItems, x: averageX };
        } else {
          clusters.push({ items: [item], x: item.x });
        }
      }
      return clusters;
    }, [examMarkers, xDomain, scaleX, clampX]);

    const markerGraphics: JSX.Element[] = [];

    markerClusters.forEach((cluster, clusterIndex) => {
      if (cluster.items.length <= 3) {
        cluster.items.forEach((marker, index) => {
          const horizontalOffset = (index - (cluster.items.length - 1) / 2) * 6;
          const x = clampX(marker.x + horizontalOffset);
          const labelY = Math.max(12, PADDING_Y - 18 - index * 16);
          const tooltipY = Math.max(8, labelY - 24);
          markerGraphics.push(
            <line
              key={`${marker.id}-line`}
              x1={x}
              x2={x}
              y1={PADDING_Y}
              y2={height - PADDING_Y}
              stroke={marker.color}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.85}
            />
          );
          const tooltipItems = [
            {
              subjectName: marker.subjectName,
              dateISO: marker.dateISO,
              daysRemaining: marker.daysRemaining,
              color: marker.color
            }
          ];
          const handleFocus = () =>
            setMarkerTooltip({
              x,
              y: tooltipY,
              items: tooltipItems
            });
          markerGraphics.push(
            <g
              key={`${marker.id}-label`}
              transform={`translate(${x}, ${labelY})`}
              tabIndex={0}
              role="button"
              aria-label={`Exam date for ${marker.subjectName}, ${examDateFormatter.format(new Date(marker.dateISO))}`}
              onFocus={handleFocus}
              onBlur={hideMarkerTooltip}
              onMouseEnter={handleFocus}
              onMouseLeave={hideMarkerTooltip}
            >
              <foreignObject x={-80} y={-18} width={160} height={26}>
                <div className="pointer-events-none flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-medium text-white shadow-lg">
                  <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: marker.color }} />
                  <span className="uppercase text-[9px] tracking-wide text-accent">Exam</span>
                  <span className="max-w-[90px] truncate">{marker.subjectName}</span>
                </div>
              </foreignObject>
            </g>
          );
        });
        return;
      }

      cluster.items.forEach((marker, index) => {
        const offset = (index - (cluster.items.length - 1) / 2) * 4;
        const lineX = clampX(marker.x + offset);
        markerGraphics.push(
          <line
            key={`${marker.id}-cluster-line`}
            x1={lineX}
            x2={lineX}
            y1={PADDING_Y}
            y2={height - PADDING_Y}
            stroke={marker.color}
            strokeWidth={1.2}
            strokeDasharray="4 4"
            opacity={0.7}
          />
        );
      });

      const clusterX = clampX(cluster.x);
      const labelY = Math.max(12, PADDING_Y - 22);
      const label = `${cluster.items.length} exams`;
      const tooltipY = Math.max(8, labelY - 24);
      const tooltipItems = cluster.items.map((item) => ({
        subjectName: item.subjectName,
        dateISO: item.dateISO,
        daysRemaining: item.daysRemaining,
        color: item.color
      }));
      const handleClusterFocus = () =>
        setMarkerTooltip({
          x: clusterX,
          y: tooltipY,
          title: "Upcoming exams",
          items: tooltipItems
        });

      markerGraphics.push(
        <g
          key={`cluster-${clusterIndex}`}
          transform={`translate(${clusterX}, ${labelY})`}
          tabIndex={0}
          role="button"
          aria-label={`Upcoming exams: ${cluster.items.map((item) => item.subjectName).join(", ")}`}
          onFocus={handleClusterFocus}
          onBlur={hideMarkerTooltip}
          onMouseEnter={handleClusterFocus}
          onMouseLeave={hideMarkerTooltip}
        >
          <foreignObject x={-70} y={-18} width={140} height={26}>
            <div className="pointer-events-none flex items-center justify-center rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-semibold text-white shadow-lg">
              {label}
            </div>
          </foreignObject>
        </g>
      );
    });

    const keyboardOverlay = React.useMemo(() => {
      if (!keyboardSelection) return null;
      const start = clampX(scaleX(Math.min(keyboardSelection.start, keyboardSelection.end)));
      const end = clampX(scaleX(Math.max(keyboardSelection.start, keyboardSelection.end)));
      const widthRect = Math.max(0, end - start);
      if (widthRect <= 0) return null;
      const yTop = keyboardSelection.y ? scaleY(keyboardSelection.y[1]) : PADDING_Y;
      const yBottom = keyboardSelection.y ? scaleY(keyboardSelection.y[0]) : height - PADDING_Y;
      return {
        x: start,
        y: Math.min(yTop, yBottom),
        width: widthRect,
        height: Math.abs(yBottom - yTop)
      };
    }, [keyboardSelection, clampX, scaleX, scaleY, height]);

    const cursor = selectionRect
      ? "crosshair"
      : isPanning
      ? "grabbing"
      : interactionMode === "pan" || temporaryPan
      ? "grab"
      : "default";

    return (
      <div ref={containerRef} className="relative">
        <svg
          ref={svgRef}
          role="img"
          width={width}
          height={height}
          aria-describedby={ariaDescribedBy}
          className="w-full select-none"
          onWheel={handleWheel}
          onContextMenu={(event) => {
            event.preventDefault();
            onRequestStepBack?.();
          }}
          style={{ cursor }}
        >
          {segmentGradients.length > 0 ? <defs>{segmentGradients}</defs> : null}
          <rect width={width} height={height} fill="transparent" />
          <rect
            x={PADDING_X}
            y={PADDING_Y}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerCancel}
            onPointerMove={(event) => {
              handlePointerMovePan(event);
              handlePointerMove(event);
            }}
            onDoubleClick={() => onResetDomain?.()}
          />
          {showGrid ? (
            <g className="stroke-white/10">
              {yTicks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={PADDING_X}
                    y1={tick.pixel}
                    x2={width - PADDING_X}
                    y2={tick.pixel}
                    className="stroke-white/10"
                  />
                  <text
                    x={12}
                    y={tick.pixel + 4}
                    className="fill-white/50 text-[10px]"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}
            </g>
          ) : null}
          <g aria-hidden="true">
            <line
              x1={PADDING_X}
              y1={height - PADDING_Y}
              x2={width - PADDING_X}
              y2={height - PADDING_Y}
              className="stroke-white/15"
            />
            {ticks.map((tick) => {
              const x = scaleX(tick.time);
              return (
                <g key={tick.time} transform={`translate(${x}, ${height - PADDING_Y})`}>
                  <line y1={0} y2={6} className="stroke-white/30" />
                  <text
                    y={18}
                    textAnchor="middle"
                    className="fill-white/60 text-[10px]"
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}
          </g>
          {showTodayLine && todayPosition !== null && (
            <g>
              <line
                x1={todayPosition}
                x2={todayPosition}
                y1={PADDING_Y}
                y2={height - PADDING_Y}
                className="stroke-red-400/70"
                strokeWidth={1.5}
              />
              <text
                x={todayPosition + 4}
                y={PADDING_Y + 12}
                className="fill-red-200 text-[10px]"
              >
                Today
              </text>
            </g>
          )}
          {markerGraphics}
          {paths}
          <text x={12} y={16} className="fill-white/40 text-[11px]">
            Retention
          </text>
          {keyboardOverlay ? (
            <rect
              x={keyboardOverlay.x}
              y={keyboardOverlay.y}
              width={keyboardOverlay.width}
              height={keyboardOverlay.height}
              fill="rgba(56,189,248,0.12)"
              stroke="rgba(56,189,248,0.7)"
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          ) : null}
          {selectionRect ? (
            <g pointerEvents="none">
              <rect
                x={Math.min(selectionRect.origin.x, selectionRect.current.x)}
                y={Math.min(selectionRect.origin.y, selectionRect.current.y)}
                width={Math.abs(selectionRect.current.x - selectionRect.origin.x)}
                height={Math.abs(selectionRect.current.y - selectionRect.origin.y)}
                fill="rgba(56,189,248,0.15)"
                stroke="rgba(56,189,248,0.8)"
                strokeDasharray="6 4"
              />
              {selectionLabel ? (
                <foreignObject
                  x={Math.min(selectionRect.origin.x, selectionRect.current.x) + 8}
                  y={Math.min(selectionRect.origin.y, selectionRect.current.y) + 8}
                  width={220}
                  height={64}
                >
                  <div className="pointer-events-none rounded-md bg-slate-950/80 px-3 py-2 text-[11px] text-white shadow-lg">
                    <div className="font-semibold">{selectionLabel.primary}</div>
                    {selectionRect.shift && selectionLabel.secondary ? (
                      <div className="text-[10px] text-sky-200">{selectionLabel.secondary}</div>
                    ) : null}
                  </div>
                </foreignObject>
              ) : null}
            </g>
          ) : null}
          {tooltip && (
            <g transform={`translate(${tooltip.x}, ${tooltip.y})`} className="pointer-events-none">
              <circle r={4} fill="#fff" />
              <foreignObject x={8} y={-4} width={220} height={96}>
                <div className="rounded-md bg-zinc-900/90 p-2 text-xs text-white shadow-lg">
                  <div className="font-semibold" style={{ color: tooltip.type ? undefined : "inherit" }}>
                    {tooltip.topic}
                  </div>
                  <div>{tooltipDateFormatter.format(new Date(tooltip.time))}</div>
                  {typeof tooltip.retention !== "undefined" && (
                    <div>Retention: {Math.round(tooltip.retention * 100)}%</div>
                  )}
                  {tooltip.type && (
                    <div>
                      Event: {tooltip.type === "started"
                        ? "Started"
                        : tooltip.type === "skipped"
                        ? "Skipped"
                        : tooltip.type === "checkpoint"
                        ? "Checkpoint"
                        : "Reviewed"}
                    </div>
                  )}
                  {typeof tooltip.intervalDays !== "undefined" && (
                    <div>Interval: {tooltip.intervalDays} day{tooltip.intervalDays === 1 ? "" : "s"}</div>
                  )}
                  {tooltip.notes && <div className="text-[11px] text-zinc-300">Notes: {tooltip.notes}</div>}
                </div>
              </foreignObject>
            </g>
          )}
          {markerTooltip && (
            <g transform={`translate(${markerTooltip.x}, ${markerTooltip.y})`} className="pointer-events-none">
              <foreignObject x={8} y={-4} width={240} height={Math.max(80, markerTooltip.items.length * 36 + 20)}>
                <div className="rounded-md bg-zinc-900/95 p-3 text-xs text-white shadow-lg">
                  {markerTooltip.title ? (
                    <div className="mb-1 font-semibold text-white">{markerTooltip.title}</div>
                  ) : null}
                  {markerTooltip.items.map((item) => {
                    const days = item.daysRemaining ?? 0;
                    const dayLabel = days === 0 ? "Exam today" : `${days} day${days === 1 ? "" : "s"} left`;
                    return (
                      <div key={`${item.subjectName}-${item.dateISO}`} className="mb-2 last:mb-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold">{item.subjectName}</span>
                        </div>
                        <div className="text-[11px] text-zinc-300">{examDateFormatter.format(new Date(item.dateISO))}</div>
                        <div className="text-[11px] text-zinc-400">{dayLabel}</div>
                      </div>
                    );
                  })}
                </div>
              </foreignObject>
            </g>
          )}
        </svg>
      </div>
    );
  }
);

TimelineChart.displayName = "TimelineChart";
