"use client";

import * as React from "react";
import { useProfileStore } from "@/stores/profile";
import { useReviewPreferencesStore } from "@/stores/review-preferences";
import { useTopicStore } from "@/stores/topics";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/forms/color-picker";
import { BellRing, SwitchCamera } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectAdaptiveSchedule } from "@/lib/adaptive-scheduler";
import {
  DAY_MS,
  DEFAULT_RETENTION_FLOOR,
  DEFAULT_STABILITY_DAYS,
  STABILITY_MIN_DAYS,
  computeRetrievability
} from "@/lib/forgetting-curve";
import { formatDateWithWeekday, formatRelativeToNow } from "@/lib/date";

export default function SettingsPage() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const toggleNotification = useProfileStore((state) => state.toggleNotification);
  const reviewTrigger = useReviewPreferencesStore((state) => state.reviewTrigger);
  const mode = useReviewPreferencesStore((state) => state.mode);
  const setMode = useReviewPreferencesStore((state) => state.setMode);
  const setReviewTrigger = useReviewPreferencesStore((state) => state.setReviewTrigger);
  const triggerPercent = Math.round(reviewTrigger * 100);

  const [form, setForm] = React.useState(profile);

  React.useEffect(() => {
    setForm(profile);
  }, [profile]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProfile(form);
  };

  const handleChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const initials = React.useMemo(() => {
    if (!form.name) return "U";
    const parts = form.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
  }, [form.name]);

  const emailClasses = cn(
    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
    profile.notifications.email ? "border-accent/40 bg-accent/10 text-accent" : "border-inverse/10 text-muted-foreground hover:text-fg/80"
  );

  const pushClasses = cn(
    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
    profile.notifications.push ? "border-accent/40 bg-accent/10 text-accent" : "border-inverse/10 text-muted-foreground hover:text-fg/80"
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg">Profile settings</h1>
        <p className="text-sm text-muted-foreground">Keep your details and notification preferences up to date.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-inverse/5 bg-card/60 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Your name"
              className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="you@example.com"
              className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-role">Role</Label>
            <Input
              id="profile-role"
              value={form.role}
              onChange={handleChange("role")}
              placeholder="Learner"
              className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-timezone">Timezone</Label>
            <Input
              id="profile-timezone"
              value={form.timezone}
              onChange={handleChange("timezone")}
              placeholder="UTC"
              className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"
            />
            <p className="text-xs text-muted-foreground/80">
              We use this timezone for all date labels and to reset the daily revise limit at local midnight.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
          <div>
            <Label>Avatar colour</Label>
            <div className="mt-2 flex items-center gap-4">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-fg"
                style={{ backgroundColor: form.avatarColor }}
              >
                {initials}
              </span>
              <ColorPicker value={form.avatarColor} onChange={(value) => setForm((prev) => ({ ...prev, avatarColor: value }))} />
            </div>
          </div>
          <div className="space-y-2 rounded-2xl border border-inverse/10 bg-inverse/5 p-4 text-xs text-muted-foreground">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            <button type="button" onClick={() => toggleNotification("email")} className={emailClasses}>
              <span className="flex items-center gap-2"><BellRing className="h-4 w-4" /> Email reminders</span>
              <span>{profile.notifications.email ? "On" : "Off"}</span>
            </button>
            <button type="button" onClick={() => toggleNotification("push")} className={pushClasses}>
              <span className="flex items-center gap-2"><SwitchCamera className="h-4 w-4" /> Push alerts</span>
              <span>{profile.notifications.push ? "On" : "Off"}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setForm(profile)}>
            Reset
          </Button>
          <Button type="submit">Save profile</Button>
        </div>
      </form>

      <div className="space-y-6 rounded-3xl border border-inverse/5 bg-card/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-fg">Revision strategy</h2>
            <p className="text-sm text-muted-foreground">
              Tune the adaptive forgetting-curve model or fall back to manual fixed intervals.
            </p>
          </div>
          <div className="inline-flex overflow-hidden rounded-full border border-inverse/10 bg-inverse/5 text-xs font-semibold uppercase tracking-wide">
            <button
              type="button"
              onClick={() => setMode("adaptive")}
              className={cn(
                "px-3 py-2 transition",
                mode === "adaptive"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-fg"
              )}
            >
              Adaptive
            </button>
            <button
              type="button"
              onClick={() => setMode("fixed")}
              className={cn(
                "px-3 py-2 transition",
                mode === "fixed" ? "bg-muted text-fg" : "text-muted-foreground hover:text-fg"
              )}
            >
              Fixed interval
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {mode === "fixed"
            ? "Manual intervals stay in place. Adaptive scheduling is paused until you switch modes."
            : "The app will reschedule every topic as soon as its predicted retention reaches your trigger threshold."}
        </p>

        <div className="space-y-3 rounded-2xl border border-inverse/10 bg-inverse/5 p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="review-trigger" className="text-sm font-medium text-fg">
              Revise when retention ≤ {triggerPercent}%
            </Label>
            <span className="text-xs text-muted-foreground">{triggerPercent}%</span>
          </div>
          <input
            id="review-trigger"
            type="range"
            min={30}
            max={80}
            step={1}
            value={triggerPercent}
            disabled={mode === "fixed"}
            onChange={(event) => setReviewTrigger(Number(event.target.value) / 100)}
            className="w-full accent-accent"
            aria-describedby="review-trigger-helper"
          />
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground/70">
            <span>30%</span>
            <span id="review-trigger-helper">Adaptive range</span>
            <span>80%</span>
          </div>
        </div>

        <AdaptiveStrategyPreview disabled={mode === "fixed"} />
      </div>
    </section>
  );
}

type AdaptiveStrategyPreviewProps = {
  disabled: boolean;
};

const AdaptiveStrategyPreview: React.FC<AdaptiveStrategyPreviewProps> = ({ disabled }) => {
  const reviewTrigger = useReviewPreferencesStore((state) => state.reviewTrigger);
  const alpha = useReviewPreferencesStore((state) => state.alpha);
  const beta = useReviewPreferencesStore((state) => state.beta);
  const topics = useTopicStore((state) => state.topics);
  const subjects = useTopicStore((state) => state.subjects);

  const baseline = React.useMemo(() => {
    if (disabled) return null;
    if (topics.length === 0) {
      const now = new Date();
      return {
        stability: DEFAULT_STABILITY_DAYS,
        reviewsCount: 0,
        anchorDate: now,
        examDate: null as Date | null,
        topicTitle: null as string | null
      };
    }
    const sorted = [...topics].sort((a, b) => {
      const aTime = new Date(a.lastReviewedAt ?? a.startedAt ?? a.createdAt).getTime();
      const bTime = new Date(b.lastReviewedAt ?? b.startedAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });
    const sample = sorted[0]!;
    const anchorIso = sample.lastReviewedAt ?? sample.startedAt ?? sample.createdAt;
    const anchorDate = new Date(anchorIso);
    const subject = sample.subjectId
      ? subjects.find((entry) => entry.id === sample.subjectId) ?? null
      : null;
    return {
      stability: Number.isFinite(sample.stability) ? sample.stability : DEFAULT_STABILITY_DAYS,
      reviewsCount: sample.reviewsCount ?? 0,
      anchorDate: Number.isFinite(anchorDate.getTime()) ? anchorDate : new Date(),
      examDate: subject?.examDate ? new Date(subject.examDate) : null,
      topicTitle: sample.title
    };
  }, [disabled, topics, subjects]);

  if (disabled) {
    return (
      <div className="rounded-2xl border border-dashed border-inverse/10 bg-inverse/5 p-4 text-sm text-muted-foreground">
        Fixed interval mode keeps using the per-topic interval lists. Switch back to adaptive mode to project retention-based
        checkpoints.
      </div>
    );
  }

  if (!baseline) {
    return null;
  }

  const schedule = projectAdaptiveSchedule({
    anchorDate: baseline.anchorDate,
    stabilityDays: baseline.stability,
    reviewsCount: baseline.reviewsCount,
    reviewTrigger,
    examDate: baseline.examDate,
    alpha,
    beta,
    maxReviews: 5
  });

  const nextReview = schedule[0] ?? null;
  const horizonDays = Math.max(nextReview?.intervalDays ?? 1, 0.5);
  const stability = Math.max(baseline.stability, STABILITY_MIN_DAYS);
  const width = 320;
  const height = 160;
  const horizonMs = horizonDays * DAY_MS;

  const steps = 48;
  const segments: string[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const elapsedMs = ratio * horizonMs;
    const retention = computeRetrievability(stability, elapsedMs, DEFAULT_RETENTION_FLOOR);
    const x = ratio * width;
    const y = height - retention * height;
    segments.push(`${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  const path = segments.join(" ");

  const triggerY = height - reviewTrigger * height;
  const markerX = width;
  const examLabel = baseline.examDate ? formatDateWithWeekday(baseline.examDate.toISOString()) : null;
  const nextRelative = nextReview ? formatRelativeToNow(nextReview.date) : null;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
      <div className="rounded-2xl border border-inverse/10 bg-inverse/5 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{baseline.topicTitle ?? "Sample topic"}</span>
          {examLabel ? <span>Exam {examLabel}</span> : null}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-40 w-full" aria-hidden="true">
          <rect x={0} y={0} width={width} height={height} rx={12} className="fill-transparent" />
          <path d={path} className="fill-none stroke-accent" strokeWidth={2} />
          <line x1={0} y1={triggerY} x2={width} y2={triggerY} strokeWidth={1} strokeDasharray="4 4" className="stroke-muted-foreground/40" />
          <circle cx={markerX} cy={triggerY} r={4} className="fill-accent" />
        </svg>
        <p className="mt-2 text-xs text-muted-foreground">
          Curve shows predicted retention from the last review to the next trigger checkpoint.
        </p>
      </div>

      <div className="flex flex-col gap-3 text-sm">
        {nextReview ? (
          <div className="rounded-xl border border-inverse/10 bg-inverse/5 p-3">
            <p className="font-semibold text-fg">Next review {formatDateWithWeekday(nextReview.date)}</p>
            <p className="text-xs text-muted-foreground">
              {Math.round(nextReview.intervalDays)} days out • {nextRelative ?? "soon"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-inverse/10 bg-inverse/5 p-3 text-xs text-muted-foreground">
            No adaptive reviews within the exam window.
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projected cadence</p>
          {schedule.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {schedule.slice(0, 4).map((checkpoint) => (
                <li
                  key={checkpoint.index}
                  className="flex items-center justify-between rounded-lg border border-inverse/10 bg-inverse/5 px-3 py-2"
                >
                  <span>Review {checkpoint.index}</span>
                  <span>{formatDateWithWeekday(checkpoint.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-inverse/10 bg-inverse/5 px-3 py-2 text-xs text-muted-foreground">
              Exam window is too close to schedule another adaptive review.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
