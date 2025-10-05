import {
  DAY_MS,
  DEFAULT_RETENTION_FLOOR,
  REVIEW_TRIGGER_MAX,
  REVIEW_TRIGGER_MIN,
  STABILITY_MAX_DAYS,
  STABILITY_MIN_DAYS,
  computeIntervalDays,
  computeRetrievability
} from "@/lib/forgetting-curve";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const DEFAULT_GROWTH_ALPHA = 0.25;
export const DEFAULT_LAPSE_BETA = 0.15;
export const MAX_PROJECTED_REVIEWS = 48;

export interface AdaptiveScheduleOptions {
  /** Date of the last successful review (or topic start). */
  anchorDate: Date;
  /** Current stability in days. */
  stabilityDays: number;
  /** Reviews logged so far. */
  reviewsCount: number;
  /** Target retention threshold (0-1). */
  reviewTrigger: number;
  /** Optional exam cap; schedule stops before this. */
  examDate?: Date | null;
  /** Maximum reviews to project (failsafe). */
  maxReviews?: number;
  /** Custom alpha for stability growth. */
  alpha?: number;
  /** Custom beta for lapse penalty. */
  beta?: number;
  /** Number of consecutive lapses to model. */
  lapses?: number;
  /** Retention floor. */
  floor?: number;
}

export interface AdaptiveReviewCheckpoint {
  index: number;
  /** ISO string for the scheduled review date. */
  date: string;
  /** Interval in days leading to this review. */
  intervalDays: number;
  /** Projected stability immediately after this review. */
  stabilityDays: number;
  /** Retention right before the review. */
  retention: number;
}

const applyLapsePenalty = (stabilityDays: number, beta: number, lapses: number) => {
  let next = stabilityDays;
  for (let index = 0; index < lapses; index += 1) {
    next *= 1 - beta;
  }
  return clamp(next, STABILITY_MIN_DAYS, STABILITY_MAX_DAYS);
};

export const projectAdaptiveSchedule = ({
  anchorDate,
  stabilityDays,
  reviewsCount,
  reviewTrigger,
  examDate,
  maxReviews = MAX_PROJECTED_REVIEWS,
  alpha = DEFAULT_GROWTH_ALPHA,
  beta = DEFAULT_LAPSE_BETA,
  lapses = 0,
  floor = DEFAULT_RETENTION_FLOOR
}: AdaptiveScheduleOptions): AdaptiveReviewCheckpoint[] => {
  const trigger = clamp(reviewTrigger, REVIEW_TRIGGER_MIN, REVIEW_TRIGGER_MAX);
  const effectiveAlpha = Math.max(0, alpha);
  const effectiveBeta = clamp(beta, 0, 1);
  const anchorMs = anchorDate.getTime();
  const examMs = examDate ? examDate.getTime() : null;

  let stability = clamp(stabilityDays, STABILITY_MIN_DAYS, STABILITY_MAX_DAYS);
  let count = Math.max(0, reviewsCount);
  let currentMs = anchorMs;
  let remainingLapses = Math.max(0, Math.floor(lapses));

  const checkpoints: AdaptiveReviewCheckpoint[] = [];

  for (let iteration = 0; iteration < maxReviews; iteration += 1) {
    const intervalDays = computeIntervalDays(stability, trigger);
    const intervalMs = intervalDays * DAY_MS;
    const scheduledMs = currentMs + intervalMs;
    if (examMs && scheduledMs > examMs) {
      break;
    }

    const retention = computeRetrievability(stability, intervalMs, floor);
    const scheduledDate = new Date(scheduledMs);
    checkpoints.push({
      index: count + 1,
      date: scheduledDate.toISOString(),
      intervalDays,
      stabilityDays: stability,
      retention
    });

    currentMs = scheduledMs;
    count += 1;
    stability = clamp(stability * (1 + effectiveAlpha), STABILITY_MIN_DAYS, STABILITY_MAX_DAYS);
    if (remainingLapses > 0) {
      stability = applyLapsePenalty(stability, effectiveBeta, 1);
      remainingLapses -= 1;
    }
  }

  return checkpoints;
};

export const computeNextAdaptiveReview = (options: AdaptiveScheduleOptions): AdaptiveReviewCheckpoint | null => {
  const schedule = projectAdaptiveSchedule({ ...options, maxReviews: Math.min(options.maxReviews ?? 1, 1) });
  return schedule[0] ?? null;
};
