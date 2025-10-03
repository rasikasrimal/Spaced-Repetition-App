const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_RETRIEVABILITY_TARGET = 0.7;
export const DEFAULT_STABILITY_DAYS = 1;
export const STABILITY_MIN_DAYS = 0.25;
export const STABILITY_MAX_DAYS = 3650;
export const STABILITY_ADJUSTMENT_ALPHA = 1.0;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const computeRetrievability = (stabilityDays: number, elapsedMs: number): number => {
  const safeStability = Math.max(stabilityDays, STABILITY_MIN_DAYS);
  const elapsedDays = Math.max(0, elapsedMs) / DAY_IN_MS;
  const retention = Math.exp(-elapsedDays / safeStability);
  if (!Number.isFinite(retention)) {
    return 0;
  }
  return clamp(retention, 0, 1);
};

export const computeIntervalDays = (
  stabilityDays: number,
  targetRetrievability: number
): number => {
  const safeTarget = clamp(targetRetrievability, 0.01, 0.99);
  const safeStability = Math.max(stabilityDays, STABILITY_MIN_DAYS);
  const interval = -safeStability * Math.log(safeTarget);
  return Math.max(interval, STABILITY_MIN_DAYS / 24);
};

export type ReviewQuality = 0 | 0.5 | 1;

export const updateStability = (
  stabilityDays: number,
  quality: ReviewQuality,
  alpha = STABILITY_ADJUSTMENT_ALPHA,
  min = STABILITY_MIN_DAYS,
  max = STABILITY_MAX_DAYS
): number => {
  const delta = alpha * (quality - 0.5);
  const next = stabilityDays * (1 + delta);
  return clamp(next, min, max);
};

export const computeOverduePenalty = (overdueDays: number) => {
  if (overdueDays <= 0) return 0;
  return Math.min(1, overdueDays / 3);
};

export const computeExamUrgency = (daysToExam: number | null) => {
  if (daysToExam === null) return 0;
  if (!Number.isFinite(daysToExam)) return 0;
  if (daysToExam < 0) {
    return 1;
  }
  const normalized = 1 / Math.max(1, daysToExam);
  return Math.min(1, normalized);
};

export interface RiskScoreOptions {
  now: Date;
  stabilityDays: number;
  targetRetrievability: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  reviewsCount: number;
  averageQuality: number | null;
  examDate?: string | null;
  difficultyModifier?: number | null;
}

export const computeRiskScore = ({
  now,
  stabilityDays,
  targetRetrievability,
  lastReviewedAt,
  nextReviewAt,
  reviewsCount,
  averageQuality,
  examDate,
  difficultyModifier
}: RiskScoreOptions) => {
  const nowMs = now.getTime();
  const lastReviewMs = lastReviewedAt ? new Date(lastReviewedAt).getTime() : null;
  const nextReviewMs = new Date(nextReviewAt).getTime();

  const effectiveStability = Math.max(stabilityDays * (difficultyModifier ?? 1), STABILITY_MIN_DAYS);
  const elapsedMs = lastReviewMs ? nowMs - lastReviewMs : 0;
  const retrievabilityNow = computeRetrievability(effectiveStability, elapsedMs);
  const forgettingRisk = 1 - retrievabilityNow;

  const overdueMs = nowMs - nextReviewMs;
  const overdueDays = overdueMs / DAY_IN_MS;
  const overduePenalty = computeOverduePenalty(overdueDays);

  let daysToExam: number | null = null;
  if (examDate) {
    const examMs = new Date(examDate).getTime();
    if (Number.isFinite(examMs)) {
      daysToExam = Math.round((examMs - nowMs) / DAY_IN_MS);
    }
  }

  const examUrgency = computeExamUrgency(daysToExam);

  let difficultyBump = 0;
  if (typeof averageQuality === "number" && averageQuality < 0.75) {
    difficultyBump += 0.15;
  }
  if (reviewsCount < 3) {
    difficultyBump += 0.05;
  }

  const score =
    0.55 * forgettingRisk + 0.25 * overduePenalty + 0.15 * examUrgency + 0.05 * difficultyBump;

  return {
    score,
    forgettingRisk,
    overduePenalty,
    examUrgency,
    difficultyBump,
    retrievabilityNow,
    intervalDays: computeIntervalDays(effectiveStability, targetRetrievability)
  };
};

export type RiskScore = ReturnType<typeof computeRiskScore>;

export const getAverageQuality = (qualities: number[]): number | null => {
  if (qualities.length === 0) return null;
  const total = qualities.reduce((sum, value) => sum + value, 0);
  return total / qualities.length;
};

export const DAY_MS = DAY_IN_MS;
