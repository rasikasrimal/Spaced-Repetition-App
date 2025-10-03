"use client";

import * as React from "react";
import { startOfDayInTimeZone } from "@/lib/date";

export type TimelineSeries = {
  topicId: string;
  topicTitle: string;
  color: string;
  points: { t: number; r: number }[];
  events: { id: string; t: number; type: "started" | "reviewed" | "skipped"; intervalDays?: number; notes?: string }[];
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

interface TimelineChartProps {
  series: TimelineSeries[];
  xDomain: [number, number];
  onDomainChange?: (domain: [number, number]) => void;
  fullDomain?: [number, number];
  height?: number;
  showGrid?: boolean;
  examMarkers?: TimelineExamMarker[];
  showTodayLine?: boolean;
  timeZone?: string;
  onResetDomain?: () => void;
}

const PADDING_X = 48;
const PADDING_Y = 32;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MIN_SPAN_MS = DAY_MS;
const TICK_SPACING_PX = 96;

const clampDomain = (domain: [number, number], full?: [number, number]) => {
  if (!full) return domain;
  const span = domain[1] - domain[0];
  const min = full[0];
  const max = full[1];
  if (span >= max - min) return [min, max];
  const start = Math.max(min, Math.min(domain[0], max - span));
  const end = Math.min(max, start + span);
  return [start, end];
};


export const TimelineChart = React.forwardRef<SVGSVGElement, TimelineChartProps>(
  ({
    series,
    xDomain,
    onDomainChange,
    fullDomain,
    height = 320,
    showGrid = true,
    examMarkers = [],
    showTodayLine = true,
    timeZone = "UTC",
    onResetDomain
  }, ref) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    React.useImperativeHandle(ref, () => svgRef.current as SVGSVGElement);

    const [width, setWidth] = React.useState(960);

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
    const domainSpan = Math.max(MIN_SPAN_MS, xDomain[1] - xDomain[0]);

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

    const scaleX = React.useCallback(
      (time: number) => PADDING_X + ((time - xDomain[0]) / domainSpan) * plotWidth,
      [xDomain, domainSpan, plotWidth]
    );

    const scaleY = React.useCallback(
      (retention: number) => PADDING_Y + (1 - retention) * plotHeight,
      [plotHeight]
    );

    const todayPosition = React.useMemo(() => {
      const now = Date.now();
      if (now < xDomain[0] || now > xDomain[1]) return null;
      return scaleX(now);
    }, [scaleX, xDomain]);

    const gridElements = showGrid ? (
      <g className="stroke-white/10">
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={PADDING_X}
              y1={scaleY(ratio)}
              x2={width - PADDING_X}
              y2={scaleY(ratio)}
              className="stroke-white/10"
            />
            <text
              x={12}
              y={scaleY(ratio) + 4}
              className="fill-white/50 text-[10px]"
            >
              {Math.round(ratio * 100)}%
            </text>
          </g>
        ))}
      </g>
    ) : null;

    const [tooltip, setTooltip] = React.useState<
      | null
      | {
          x: number;
          y: number;
          topic: string;
          time: number;
          retention?: number;
          type?: "started" | "reviewed" | "skipped";
          intervalDays?: number;
          notes?: string;
        }
    >(null);
    const [markerTooltip, setMarkerTooltip] = React.useState<MarkerTooltip | null>(null);

    const hideTooltip = () => setTooltip(null);
    const hideMarkerTooltip = () => setMarkerTooltip(null);

    const handlePointerMove: React.PointerEventHandler<SVGRectElement> = (event) => {
      if (isPanningRef.current) {
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
      const ratio = Math.min(1, Math.max(0, (offsetX - PADDING_X) / plotWidth));
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

    const isPanningRef = React.useRef(false);
    const panStartRef = React.useRef<{ x: number; domain: [number, number] } | null>(null);

    const handlePointerDown: React.PointerEventHandler<SVGRectElement> = (event) => {
      isPanningRef.current = true;
      panStartRef.current = { x: event.clientX, domain: xDomain };
      (event.target as Element).setPointerCapture(event.pointerId);
      hideMarkerTooltip();
    };

    const handlePointerUp: React.PointerEventHandler<SVGRectElement> = (event) => {
      isPanningRef.current = false;
      panStartRef.current = null;
      (event.target as Element).releasePointerCapture(event.pointerId);
    };

    const handlePointerLeave: React.PointerEventHandler<SVGRectElement> = () => {
      isPanningRef.current = false;
      panStartRef.current = null;
      hideTooltip();
      hideMarkerTooltip();
    };

    const handlePointerMovePan: React.PointerEventHandler<SVGRectElement> = (event) => {
      if (!isPanningRef.current || !panStartRef.current || !onDomainChange) return;
      const deltaPx = event.clientX - panStartRef.current.x;
      const fraction = deltaPx / plotWidth;
      const deltaMs = fraction * domainSpan;
      const next: [number, number] = [
        panStartRef.current.domain[0] - deltaMs,
        panStartRef.current.domain[1] - deltaMs
      ];
      onDomainChange(clampDomain(next, fullDomain));
    };

    const handleWheel: React.WheelEventHandler<SVGSVGElement> = (event) => {
      if (!onDomainChange) return;
      const { deltaY, deltaX, offsetX, shiftKey } = event.nativeEvent;

      if (shiftKey) {
        event.preventDefault();
        const delta = deltaX !== 0 ? deltaX : deltaY;
        if (delta === 0) return;
        const fraction = delta / plotWidth;
        const deltaMs = fraction * domainSpan;
        const next: [number, number] = [xDomain[0] + deltaMs, xDomain[1] + deltaMs];
        onDomainChange(clampDomain(next, fullDomain));
        return;
      }

      if (offsetX < PADDING_X || offsetX > width - PADDING_X) return;
      event.preventDefault();
      const zoomIn = deltaY < 0;
      let newSpan = domainSpan * (zoomIn ? 0.85 : 1.15);
      const fullSpan = fullDomain ? Math.max(MIN_SPAN_MS, fullDomain[1] - fullDomain[0]) : Number.POSITIVE_INFINITY;
      newSpan = Math.max(MIN_SPAN_MS, Math.min(newSpan, fullSpan));
      const ratio = Math.min(1, Math.max(0, (offsetX - PADDING_X) / plotWidth));
      const anchorTime = xDomain[0] + domainSpan * ratio;
      const nextStart = anchorTime - newSpan * ratio;
      const nextEnd = nextStart + newSpan;
      onDomainChange(clampDomain([nextStart, nextEnd], fullDomain));
    };

    React.useEffect(() => {
      setMarkerTooltip(null);
    }, [examMarkers, xDomain]);

    const paths = series.map((line) => (
      <g key={line.topicId}>
        <path
          d={line.points
            .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.t)} ${scaleY(point.r)}`)
            .join(" ")}
          fill="none"
          stroke={line.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {line.events.map((event) => {
          const x = scaleX(event.t);
          const y = scaleY(event.type === "started" ? 1 : 1);
          const handleFocus = () =>
            setTooltip({
              x,
              y: scaleY(0.9),
              topic: line.topicTitle,
              time: event.t,
              type: event.type,
              intervalDays: event.intervalDays,
              notes: event.notes
            });
          return (
            <g key={event.id} transform={`translate(${x}, ${y})`}>
              {event.type === "started" ? (
                <rect
                  x={-5}
                  y={-5}
                  width={10}
                  height={10}
                  fill={line.color}
                  tabIndex={0}
                  aria-label={`${line.topicTitle} started ${tooltipDateFormatter.format(new Date(event.t))}`}
                  onFocus={handleFocus}
                  onBlur={hideTooltip}
                  onMouseEnter={handleFocus}
                  onMouseLeave={hideTooltip}
                />
              ) : event.type === "skipped" ? (
                <polygon
                  points="0,-6 6,0 0,6 -6,0"
                  fill={line.color}
                  tabIndex={0}
                  aria-label={`${line.topicTitle} skipped ${tooltipDateFormatter.format(new Date(event.t))}`}
                  onFocus={handleFocus}
                  onBlur={hideTooltip}
                  onMouseEnter={handleFocus}
                  onMouseLeave={hideTooltip}
                />
              ) : (
                <circle
                  r={5}
                  fill={line.color}
                  tabIndex={0}
                  aria-label={`${line.topicTitle} reviewed ${tooltipDateFormatter.format(new Date(event.t))}`}
                  onFocus={handleFocus}
                  onBlur={hideTooltip}
                  onMouseEnter={handleFocus}
                  onMouseLeave={hideTooltip}
                />
              )}
            </g>
          );
        })}
      </g>
    ));

    const clampX = React.useCallback(
      (value: number) => Math.max(PADDING_X, Math.min(width - PADDING_X, value)),
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

    return (
      <div ref={containerRef} className="w-full overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-4">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          role="img"
          aria-label="Retention timeline"
          onWheel={handleWheel}
        >
          <rect
            x={PADDING_X}
            y={PADDING_Y}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerMove={(event) => {
              handlePointerMovePan(event);
              handlePointerMove(event);
            }}
            onDoubleClick={() => onResetDomain?.()}
          />
          {gridElements}
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
                      Event: {tooltip.type === "started" ? "Started" : tooltip.type === "skipped" ? "Skipped" : "Reviewed"}
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





