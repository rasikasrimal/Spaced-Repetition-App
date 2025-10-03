import { Topic, TopicEvent } from "@/types/topic";
import { DAY_MS, STABILITY_MIN_DAYS, computeRetrievability } from "@/lib/forgetting-curve";

export interface CurveSegment {
  topicId: string;
  start: TopicEvent;
  /** Timestamp where the retention segment actually ends (next review). */
  endAt: string;
  /** Timestamp that should be plotted for the decay (checkpoint for active segment). */
  displayEndAt: string;
  /** Scheduled checkpoint where R(t) ≈ target retrievability. */
  checkpointAt: string;
  stabilityDays: number;
  target: number;
  isHistorical: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const cloneEvent = (topic: Topic, at: string): TopicEvent => ({
  id: `${topic.id}-synthetic-${at}`,
  topicId: topic.id,
  type: "reviewed",
  at,
  intervalDays: (new Date(topic.nextReviewDate).getTime() - new Date(at).getTime()) / DAY_MS,
  reviewKind: "scheduled",
  reviewQuality: 1,
  resultingStability: topic.stability,
  targetRetrievability: topic.retrievabilityTarget,
  nextReviewAt: topic.nextReviewDate,
  backfill: true
});

const ensureSegmentsForTopic = (topic: Topic): CurveSegment[] => {
  const reviewEvents = [...(topic.events ?? [])]
    .filter((event) => event.type === "reviewed")
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  if (reviewEvents.length === 0) {
    const anchor = topic.lastReviewedAt ?? topic.startedAt ?? topic.createdAt;
    const synthetic = cloneEvent(topic, anchor);
    return [
      {
        topicId: topic.id,
        start: synthetic,
        endAt: topic.nextReviewDate,
        displayEndAt: topic.nextReviewDate,
        checkpointAt: topic.nextReviewDate,
        stabilityDays: topic.stability,
        target: topic.retrievabilityTarget,
        isHistorical: false
      }
    ];
  }

  return reviewEvents.map((event, index) => {
    const nextEvent = reviewEvents[index + 1] ?? null;
    const checkpointAt = event.nextReviewAt ?? topic.nextReviewDate;
    const fallbackEnd = checkpointAt ?? topic.nextReviewDate;
    const endAt = nextEvent ? nextEvent.at : fallbackEnd;
    const displayEndAt = nextEvent ? nextEvent.at : fallbackEnd;

    return {
      topicId: topic.id,
      start: event,
      endAt,
      displayEndAt,
      checkpointAt,
      stabilityDays: event.resultingStability ?? topic.stability,
      target: event.targetRetrievability ?? topic.retrievabilityTarget,
      isHistorical: Boolean(nextEvent)
    };
  });
};

export const buildCurveSegments = (topics: Topic[]): CurveSegment[] => {
  const segments: CurveSegment[] = [];
  for (const topic of topics) {
    segments.push(...ensureSegmentsForTopic(topic));
  }
  return segments;
};

export const sampleSegment = (
  segment: CurveSegment,
  maxPoints = 160
): { t: number; r: number }[] => {
  const startTs = new Date(segment.start.at).getTime();
  const endTs = new Date(segment.displayEndAt).getTime();
  const durationMs = Math.max(60_000, endTs - startTs);
  const pointsCount = clamp(maxPoints, 16, 320);
  const stepMs = durationMs / pointsCount;
  const stability = Math.max(segment.stabilityDays, STABILITY_MIN_DAYS);
  const points: { t: number; r: number }[] = [];

  for (let ts = startTs; ts <= endTs; ts += stepMs) {
    const elapsedMs = ts - startTs;
    const retention = computeRetrievability(stability, elapsedMs);
    points.push({ t: ts, r: clamp(retention, 0, 1) });
  }

  if (!points.some((point) => point.t === endTs)) {
    const retention = computeRetrievability(stability, endTs - startTs);
    points.push({ t: endTs, r: clamp(retention, 0, 1) });
  }

  return points;
};
