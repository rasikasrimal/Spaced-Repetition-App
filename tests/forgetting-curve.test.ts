import { strict as assert } from "node:assert";
import test from "node:test";

import {
  DEFAULT_RETRIEVABILITY_TARGET,
  DEFAULT_STABILITY_DAYS,
  DAY_MS,
  computeIntervalDays,
  computeRetrievability,
  updateStability
} from "../src/lib/forgetting-curve";

test("stability grows and retention improves with spaced reviews", () => {
  const firstElapsedDays = 10;
  const firstStability = updateStability({
    previousStability: DEFAULT_STABILITY_DAYS,
    elapsedDays: firstElapsedDays,
    quality: 1,
    reviewCount: 1
  });

  assert.ok(
    firstStability > DEFAULT_STABILITY_DAYS,
    "first review should boost stability beyond the default"
  );

  const firstInterval = computeIntervalDays(firstStability, DEFAULT_RETRIEVABILITY_TARGET);
  const secondElapsedDays = 20;
  const secondStability = updateStability({
    previousStability: firstStability,
    elapsedDays: secondElapsedDays,
    quality: 1,
    reviewCount: 2
  });

  assert.ok(secondStability > firstStability, "later review should keep growing stability");

  const secondInterval = computeIntervalDays(secondStability, DEFAULT_RETRIEVABILITY_TARGET);
  assert.ok(secondInterval > firstInterval, "intervals should lengthen as stability grows");

  const retentionAfterFirst = computeRetrievability(firstStability, 60 * DAY_MS);
  const retentionAfterSecond = computeRetrievability(secondStability, 60 * DAY_MS);
  assert.ok(
    retentionAfterSecond > retentionAfterFirst,
    "later reviews should flatten the forgetting curve"
  );
});

test("items with fewer reviews decay faster and lapses reduce stability", () => {
  const spacedStability = updateStability({
    previousStability: DEFAULT_STABILITY_DAYS,
    elapsedDays: 12,
    quality: 1,
    reviewCount: 1
  });

  const reinforcedStability = updateStability({
    previousStability: spacedStability,
    elapsedDays: 18,
    quality: 1,
    reviewCount: 2
  });

  const singleReviewRetention = computeRetrievability(spacedStability, 30 * DAY_MS);
  const doubleReviewRetention = computeRetrievability(reinforcedStability, 30 * DAY_MS);
  assert.ok(
    doubleReviewRetention > singleReviewRetention,
    "more repetitions should improve 30-day retention"
  );

  const lapsedStability = updateStability({
    previousStability: reinforcedStability,
    elapsedDays: 5,
    quality: 0,
    reviewCount: 3
  });

  assert.ok(lapsedStability < reinforcedStability, "failed reviews should reduce stability");
});
