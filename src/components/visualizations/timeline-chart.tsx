"use client";

import * as React from "react";

export type TimelineSeries = {
  topicId: string;
  topicTitle: string;
  color: string;
  points: { t: number; r: number }[];
  events: { id: string; t: number; type: "started" | "reviewed"; intervalDays?: number; notes?: string }[];
};

interface TimelineChartProps {
  series: TimelineSeries[];
  xDomain: [number, number];
  onDomainChange?: (domain: [number, number]) => void;
  fullDomain?: [number, number];
  height?: number;
  showGrid?: boolean;
}

const PADDING_X = 48;
const PADDING_Y = 32;
const MIN_SPAN_MS = 6 * 60 * 60 * 1000; // 6 hours

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

const formatTimestamp = (value: number) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);

export const TimelineChart = React.forwardRef<SVGSVGElement, TimelineChartProps>(
  ({ series, xDomain, onDomainChange, fullDomain, height = 320, showGrid = true }, ref) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    React.useImperativeHandle(ref, () => svgRef.current as SVGSVGElement);

    const [width, setWidth] = React.useState(960);

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
          type?: "started" | "reviewed";
          intervalDays?: number;
          notes?: string;
        }
    >(null);

    const hideTooltip = () => setTooltip(null);

    const handlePointerMove: React.PointerEventHandler<SVGRectElement> = (event) => {
      if (isPanningRef.current) {
        hideTooltip();
        return;
      }
      const { offsetX } = event.nativeEvent;
      if (offsetX < PADDING_X || offsetX > width - PADDING_X) {
        hideTooltip();
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
      event.preventDefault();
      const { deltaY, offsetX } = event.nativeEvent;
      if (offsetX < PADDING_X || offsetX > width - PADDING_X) return;
      const zoomIn = deltaY < 0;
      let newSpan = domainSpan * (zoomIn ? 0.85 : 1.15);
      const fullSpan = fullDomain ? Math.max(MIN_SPAN_MS, fullDomain[1] - fullDomain[0]) : Number.POSITIVE_INFINITY;
      newSpan = Math.max(MIN_SPAN_MS, Math.min(newSpan, fullSpan));
      const ratio = Math.min(1, Math.max(0, (offsetX - PADDING_X) / plotWidth));
      const anchorTime = xDomain[0] + domainSpan * ratio;
      let nextStart = anchorTime - newSpan * ratio;
      let nextEnd = nextStart + newSpan;
      if (fullDomain) {
        const clamped = clampDomain([nextStart, nextEnd], fullDomain);
        onDomainChange(clamped);
      } else {
        onDomainChange([nextStart, nextEnd]);
      }
    };

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
                  aria-label={`${line.topicTitle} started ${formatTimestamp(event.t)}`}
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
                  aria-label={`${line.topicTitle} reviewed ${formatTimestamp(event.t)}`}
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
          />
          {gridElements}
          {todayPosition !== null && (
            <g>
              <line
                x1={todayPosition}
                x2={todayPosition}
                y1={PADDING_Y}
                y2={height - PADDING_Y}
                className="stroke-red-400/60"
                strokeDasharray="4 4"
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
          {paths}
          <text x={width / 2} y={height - 6} className="fill-white/40 text-[11px]">
            Time
          </text>
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
                  <div>{formatTimestamp(tooltip.time)}</div>
                  {typeof tooltip.retention !== "undefined" && (
                    <div>Retention: {Math.round(tooltip.retention * 100)}%</div>
                  )}
                  {tooltip.type && <div>Event: {tooltip.type === "started" ? "Started" : "Reviewed"}</div>}
                  {typeof tooltip.intervalDays !== "undefined" && (
                    <div>Interval: {tooltip.intervalDays} day{tooltip.intervalDays === 1 ? "" : "s"}</div>
                  )}
                  {tooltip.notes && <div className="text-[11px] text-zinc-300">Notes: {tooltip.notes}</div>}
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




