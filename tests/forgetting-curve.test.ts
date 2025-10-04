import { strict as assert } from "node:assert";
import test from "node:test";

import {
  DEFAULT_RETRIEVABILITY_TARGET,
  DEFAULT_RETENTION_FLOOR,
  DEFAULT_STABILITY_DAYS,
  DAY_MS,
  computeIntervalDays,
  computeRetrievability,
  updateStability
} from "../src/lib/forgetting-curve";

test("spaced reviews grow stability and lengthen future intervals", () => {
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
});

test("retention curves flatten with review count and respect the floor", () => {
  let stability = DEFAULT_STABILITY_DAYS;
  const retentions: number[] = [];
  const elapsedSeries = [12, 24, 30];

  elapsedSeries.forEach((elapsedDays, index) => {
    const reviewCount = index + 1;
    stability = updateStability({
      previousStability: stability,
      elapsedDays,
      quality: 1,
      reviewCount
    });
    retentions.push(computeRetrievability(stability, 30 * DAY_MS));
  });

  assert.ok(
    retentions[1] > retentions[0],
    "second review should retain more after 30 days than the first"
  );
  assert.ok(
    retentions[2] > retentions[1],
    "third review should further flatten the forgetting curve"
  );

  const longHorizon = computeRetrievability(stability, 180 * DAY_MS);
  assert.ok(
    longHorizon > DEFAULT_RETENTION_FLOOR,
    "long-term retention should stay above the floor"
  );
  assert.ok(
    longHorizon - DEFAULT_RETENTION_FLOOR < 0.3,
    "long-term retention should taper toward the floor instead of staying near 100%"
  );
});

test("lapses weaken stability but retain long-term memory", () => {
  let stability = DEFAULT_STABILITY_DAYS;

  stability = updateStability({
    previousStability: stability,
    elapsedDays: 14,
    quality: 1,
    reviewCount: 1
  });
  stability = updateStability({
    previousStability: stability,
    elapsedDays: 21,
    quality: 1,
    reviewCount: 2
  });

  const retentionBeforeLapse = computeRetrievability(stability, 30 * DAY_MS);

  const lapsedStability = updateStability({
    previousStability: stability,
    elapsedDays: 7,
    quality: 0,
    reviewCount: 3
  });

  assert.ok(lapsedStability < stability, "failed reviews should reduce stability");

  const retentionAfterLapse = computeRetrievability(lapsedStability, 30 * DAY_MS);
  assert.ok(
    retentionAfterLapse < retentionBeforeLapse,
    "lapses should lower projected retention"
  );
  assert.ok(
    retentionAfterLapse >= DEFAULT_RETENTION_FLOOR,
    "even after lapses, retention should not fall below the baseline floor"
  );
});
