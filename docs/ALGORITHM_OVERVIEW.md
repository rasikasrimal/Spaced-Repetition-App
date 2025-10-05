# Adaptive Revision Scheduler Overview

The adaptive scheduler is anchored to the exponential forgetting curve:

\[ R(t) = \exp\left(-\frac{t}{s}\right) \]

- **R(t)** – predicted retention at elapsed time *t* (days).
- **s** – topic stability measured in days.

## Trigger-driven intervals

Learners choose a retention trigger **T** (30–80%). The next review interval is derived directly from the curve:

\[ t_{\text{next}} = -s \cdot \ln(T) \]

This interval represents the point where retention is expected to decay to the trigger level. Every rescheduled review resets retention to ~100% and uses the same trigger to compute the next checkpoint.

## Stability growth and lapses

We gradually lengthen future reviews using two tunable parameters:

- **α (alpha)** = 0.25 by default. After a successful review the scheduler multiplies stability by *(1 + α)*.
- **β (beta)** = 0.15 by default. Each missed review applies a penalty of *(1 – β)*.

The parameters mirror the richer `updateStability` model used when real reviews are logged, but keep the preview predictable.

## Projection loop

Pseudocode for generating the schedule used in previews and documentation:

```
next = []
stability = clamp(stability, min, max)
count = currentReviews
anchor = lastReviewDate
while next.length < limit and beforeExam(anchor):
    interval = computeIntervalDays(stability, trigger)
    anchor = anchor + interval
    retention = computeRetrievability(stability, interval)
    next.push({ interval, anchor, retention })
    stability *= 1 + alpha
    apply lapse penalties if requested
```

Each projected checkpoint records:

- sequential index
- scheduled ISO date
- interval in days
- retention immediately before the review

The live app truncates the list once the exam date would be exceeded.

## Example

For a new topic (*s* = 1 day) and trigger **T = 0.5**:

| Review | Stability (days) | Interval (days) | Scheduled when retention ≈ | Date offset |
| ------ | ---------------- | --------------- | -------------------------- | ----------- |
| 1      | 1.00             | 0.69            | 50%                         | +0.69 days  |
| 2      | 1.25             | 0.86            | 50%                         | +1.55 days  |
| 3      | 1.56             | 1.08            | 50%                         | +2.63 days  |

After each review the stability grows by 25%, pushing later sessions further into the future.

## Relationship to production scheduling

- The **preview** uses the simplified α/β growth factors described above for clarity.
- Actual review events in the app still rely on the richer `updateStability` heuristics that factor in spacing, streaks, and quality.
- Both systems converge on the same core rule: schedule the next review the moment retention is predicted to hit the configured trigger.
