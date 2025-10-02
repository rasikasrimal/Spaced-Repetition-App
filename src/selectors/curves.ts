import { Topic, TopicEvent } from "@/types/topic";

export interface CurveSegment {
  topicId: string;
  from: TopicEvent;
  to?: TopicEvent;
  tauHours: number;
  beta: number;
}

const DEFAULT_CFG = {
  beta: 1.0,
  strategy: "reviews" as const,
  baseHalfLifeHours: 12,
  growthPerSuccessfulReview: 2.0
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const calcTau = (topic: Topic, events: TopicEvent[], startIndex: number): number => {
  const cfg = { ...DEFAULT_CFG, ...(topic.forgetting ?? {}) };
  if (cfg.strategy === "interval") {
    const nextEvent = events[startIndex + 1];
    const fallbackDays = topic.intervals?.[topic.intervalIndex] ?? topic.intervals?.[0] ?? 1;
    const intervalDays = nextEvent?.intervalDays ?? fallbackDays;
    const estimatedHours = 0.5 * intervalDays * 24;
    return clamp(estimatedHours, 8, 24 * 180);
  }

  const cutoff = new Date(events[startIndex].at).getTime();
  const reviewsSoFar = events.filter(
    (event) => event.type === "reviewed" && new Date(event.at).getTime() <= cutoff
  ).length;
  const base = cfg.baseHalfLifeHours ?? DEFAULT_CFG.baseHalfLifeHours;
  const growth = cfg.growthPerSuccessfulReview ?? DEFAULT_CFG.growthPerSuccessfulReview;
  return base * Math.pow(growth, reviewsSoFar);
};

const topicCache = new Map<string, { hash: string; segments: CurveSegment[] }>();

const hashTopic = (topic: Topic): string => {
  const events = topic.events ?? [];
  const eventKey = events.map((event) => `${event.id}:${event.at}:${event.intervalDays ?? ""}`).join("|");
  const forgettingKey = `${topic.forgetting?.beta ?? DEFAULT_CFG.beta}-${topic.forgetting?.strategy ?? DEFAULT_CFG.strategy}-${topic.forgetting?.baseHalfLifeHours ?? DEFAULT_CFG.baseHalfLifeHours}-${topic.forgetting?.growthPerSuccessfulReview ?? DEFAULT_CFG.growthPerSuccessfulReview}`;
  const intervalKey = `${topic.intervalIndex}|${(topic.intervals ?? []).join(",")}`;
  return `${topic.id}-${eventKey}-${forgettingKey}-${intervalKey}`;
};

const computeSegmentsForTopic = (topic: Topic): CurveSegment[] => {
  const orderedEvents = [...(topic.events ?? [])].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  if (orderedEvents.length === 0) return [];
  const segments: CurveSegment[] = [];
  for (let index = 0; index < orderedEvents.length; index += 1) {
    const from = orderedEvents[index];
    const to = orderedEvents[index + 1];
    const tauHours = calcTau(topic, orderedEvents, index);
    segments.push({
      topicId: topic.id,
      from,
      to,
      tauHours,
      beta: topic.forgetting?.beta ?? DEFAULT_CFG.beta
    });
  }
  return segments;
};

export const buildCurveSegments = (topics: Topic[]): CurveSegment[] => {
  const segments: CurveSegment[] = [];
  for (const topic of topics) {
    const hash = hashTopic(topic);
    const cached = topicCache.get(topic.id);
    if (cached && cached.hash === hash) {
      segments.push(...cached.segments);
      continue;
    }
    const computed = computeSegmentsForTopic(topic);
    topicCache.set(topic.id, { hash, segments: computed });
    segments.push(...computed);
  }
  return segments;
};

export const sampleSegment = (
  segment: CurveSegment,
  maxPoints = 160
): { t: number; r: number }[] => {
  const startTs = new Date(segment.from.at).getTime();
  const endTs = segment.to ? new Date(segment.to.at).getTime() : Date.now();
  const durationMs = Math.max(60_000, endTs - startTs);
  const targetPoints = clamp(maxPoints, 16, 320);
  const stepMs = durationMs / targetPoints;
  const points: { t: number; r: number }[] = [];
  for (let ts = startTs; ts <= endTs; ts += stepMs) {
    const elapsedHours = (ts - startTs) / 3_600_000;
    const ratio = elapsedHours / Math.max(0.001, segment.tauHours);
    const retention = Math.exp(-Math.pow(ratio, segment.beta));
    points.push({ t: ts, r: clamp(retention, 0, 1) });
  }
  if (!points.some((point) => point.t === endTs)) {
    const elapsedHours = (endTs - startTs) / 3_600_000;
    const ratio = elapsedHours / Math.max(0.001, segment.tauHours);
    const retention = Math.exp(-Math.pow(ratio, segment.beta));
    points.push({ t: endTs, r: clamp(retention, 0, 1) });
  }
  return points;
};
