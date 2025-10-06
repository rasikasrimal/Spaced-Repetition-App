"use client";

import * as React from "react";
import Link from "next/link";
import { useTopicStore } from "@/stores/topics";
import { useReviewPreferencesStore } from "@/stores/review-preferences";
import { FALLBACK_SUBJECT_COLOR } from "@/lib/colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ColorPicker } from "@/components/forms/color-picker";
import { IconPicker } from "@/components/forms/icon-picker";
import { IconPreview } from "@/components/icon-preview";
import { ICON_LIBRARY } from "@/lib/constants";
import { Subject, SubjectSummary, Topic } from "@/types/topic";
import {
  daysBetween,
  formatDateWithWeekday,
  formatFullDate,
  formatRelativeToNow,
  nowInTimeZone,
  startOfDayInTimeZone
} from "@/lib/date";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarDays,
  Clock,
  Info,
  ListChecks,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  X
} from "lucide-react";
import { useProfileStore } from "@/stores/profile";
import { DAY_MS } from "@/lib/forgetting-curve";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { resetCardPointerPosition, updateCardPointerPosition } from "@/lib/card-motion";

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

type TopicStatus = "overdue" | "due-today" | "upcoming";

const STATUS_META: Record<TopicStatus, { label: string; badgeClass: string; textClass: string }> = {
  overdue: {
    label: "Overdue",
    badgeClass: "status-chip status-chip--overdue",
    textClass: "status-text status-text--overdue"
  },
  "due-today": {
    label: "Due today",
    badgeClass: "status-chip status-chip--due-today",
    textClass: "status-text status-text--due"
  },
  upcoming: {
    label: "Upcoming",
    badgeClass: "status-chip status-chip--upcoming",
    textClass: "status-text status-text--upcoming"
  }
};

type SubjectPreviewProps = {
  name: string;
  color: string;
  icon: string;
  examDate?: string;
};

const FALLBACK_SUBJECT_HSL = "221 83% 53%";

const extractHslComponents = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const bareMatch = trimmed.match(/^(\d+(?:\.\d+)?)(?:deg)?\s+(\d+(?:\.\d+)?%)\s+(\d+(?:\.\d+)?%)$/i);
  if (bareMatch) {
    return `${bareMatch[1]} ${bareMatch[2]} ${bareMatch[3]}`;
  }

  const functionMatch = trimmed.match(/^hsla?\(([^)]+)\)$/i);
  if (!functionMatch) return null;

  const contents = functionMatch[1]
    .replace(/\s*,\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const [hue, saturation, lightness] = contents.split(" ");
  if (!hue || !saturation || !lightness) return null;

  const normalizedHue = hue.replace(/deg$/i, "");
  return `${normalizedHue} ${saturation.replace(/,/g, "")} ${lightness.replace(/,/g, "")}`;
};

const buildSubjectColorVariables = (color: string): React.CSSProperties => {
  const parsed = extractHslComponents(color) ?? extractHslComponents(FALLBACK_SUBJECT_COLOR) ?? FALLBACK_SUBJECT_HSL;
  return {
    "--subject-color": parsed,
    "--subject-bg": `hsl(${parsed} / 0.18)`,
    "--subject-bg-hover": `hsl(${parsed} / 0.25)`,
    "--subject-border": `hsl(${parsed} / 0.35)`,
    "--subject-glow": `hsl(${parsed} / 0.6)`,
    "--subject-accent": `hsl(${parsed})`
  } as React.CSSProperties;
};

const SubjectIdentityPreview: React.FC<SubjectPreviewProps> = ({ name, color, icon, examDate }) => {
  const displayName = name.trim() ? name.trim() : "Untitled subject";
  const examLabel = examDate ? `Exam on ${formatFullDate(examDate)}` : "Exam not scheduled";
  const colorVariables = React.useMemo(() => buildSubjectColorVariables(color), [color]);
  const iconMeta = React.useMemo(() => ICON_LIBRARY.find((candidate) => candidate.name === icon), [icon]);
  const accentColor = (colorVariables["--subject-accent"] as string) ?? `hsl(${FALLBACK_SUBJECT_HSL})`;

  return (
    <div className="rounded-2xl border border-inverse/10 bg-bg/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live preview</p>
      <div
        className={cn(
          "subject-preview-card relative mt-3 flex flex-col gap-5 overflow-hidden rounded-3xl border bg-card/70 p-6 text-left backdrop-blur-sm",
          "ring-1 ring-inset"
        )}
        style={colorVariables}
      >
        <span aria-hidden="true" className="subject-preview-card__shimmer z-0" />
        <div className="relative z-[1] flex items-center gap-4">
          <div
            aria-hidden="true"
            className="subject-preview-icon-container flex h-14 w-14 items-center justify-center rounded-2xl border"
            style={{ borderColor: "var(--subject-border)", backgroundColor: "var(--subject-bg)", color: "var(--subject-accent)" }}
          >
            <IconPreview key={icon} name={icon} className="subject-preview-icon h-7 w-7" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 key={displayName} className="animate-in fade-in-50 text-xl font-semibold text-fg">
              {displayName}
            </h3>
            <p key={examLabel} className="animate-in fade-in-50 text-sm text-muted-foreground">
              {examLabel}
            </p>
          </div>
        </div>
        <div className="relative z-[1] mt-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-inverse/10 bg-bg/80 p-4 transition-colors duration-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accent tone</p>
            <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-fg">
              <span
                aria-hidden="true"
                className="h-5 w-5 rounded-full"
                style={{ background: accentColor, boxShadow: "0 0 0 1px var(--subject-border)" }}
              />
              <span className="truncate text-base font-medium text-muted-foreground">{color}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-inverse/10 bg-bg/80 p-4 transition-colors duration-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Icon</p>
            <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-fg">
              <IconPreview key={`${icon}-label`} name={icon} className="h-5 w-5 text-muted-foreground" />
              <span className="truncate text-base font-medium text-muted-foreground">{iconMeta?.label ?? icon}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-inverse/10 bg-bg/80 p-4 transition-colors duration-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next milestone</p>
            <p className="mt-1 text-base font-medium text-muted-foreground">{examLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_SUBJECT_ID = "subject-general";

const computeTopicStatus = (topic: Topic, startMs: number, endMs: number): TopicStatus => {
  const nextMs = new Date(topic.nextReviewDate).getTime();
  if (nextMs < startMs) return "overdue";
  if (nextMs < endMs) return "due-today";
  return "upcoming";
};

type SortOption = "urgency" | "exam-date" | "name";

interface ExamUrgencyMeta {
  label: string;
  description: string;
  accentClass: string;
}

const getExamUrgencyMeta = (daysLeft: number | null): ExamUrgencyMeta => {
  if (daysLeft === null) {
    return {
      label: "No exam date",
      description: "Set an exam date to unlock countdowns and exam alerts.",
      accentClass: "ring-1 ring-inset ring-border/60"
    };
  }

  if (daysLeft < 0) {
    return {
      label: "Exam passed",
      description: "This exam date has passed. Plan a new milestone when you are ready.",
      accentClass: "ring-1 ring-inset ring-border/60"
    };
  }

  if (daysLeft <= 7) {
    return {
      label: "Urgent",
      description: "Exam is around the corner. Prioritise these reviews.",
      accentClass: "ring-1 ring-inset ring-error/40"
    };
  }

  if (daysLeft <= 30) {
    return {
      label: "Next up",
      description: "Exam is approaching. Keep momentum steady.",
      accentClass: "ring-1 ring-inset ring-warn/40"
    };
  }

  return {
    label: "Plenty of time",
    description: "Planned well ahead. Maintain a consistent cadence.",
    accentClass: "ring-1 ring-inset ring-success/40"
  };
};

const SubjectAdminPage: React.FC = () => {
  const subjects = useTopicStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);
  const addSubject = useTopicStore((state) => state.addSubject);
  const updateSubject = useTopicStore((state) => state.updateSubject);
  const deleteSubject = useTopicStore((state) => state.deleteSubject);
  const summaries = useTopicStore((state) => state.getSubjectSummaries());
  const timezone = useProfileStore((state) => state.profile.timezone) || "Asia/Colombo";
  const reviewTrigger = useReviewPreferencesStore((state) => state.reviewTrigger);
  const triggerPercent = Math.round(reviewTrigger * 100);

  const [name, setName] = React.useState("");
  const [examDate, setExamDate] = React.useState("");
  const [color, setColor] = React.useState(FALLBACK_SUBJECT_COLOR);
  const [icon, setIcon] = React.useState("Sparkles");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState({ name: "", examDate: "", color: FALLBACK_SUBJECT_COLOR, icon: "Sparkles" });
  const [expandedSubjects, setExpandedSubjects] = React.useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [sortOption, setSortOption] = React.useState<SortOption>("urgency");
  const [subjectPendingDelete, setSubjectPendingDelete] = React.useState<Subject | null>(null);

  const handleCardPointerMove = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    updateCardPointerPosition(event.currentTarget, event);
  }, []);

  const handleCardPointerLeave = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    resetCardPointerPosition(event.currentTarget);
  }, []);

  React.useEffect(() => {
    if (!isCreateOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isCreateOpen]);

  const summaryById = React.useMemo(() => {
    const map = new Map<string, SubjectSummary>();
    summaries.forEach((summary) => map.set(summary.subjectId, summary));
    return map;
  }, [summaries]);

  const topicsBySubject = React.useMemo(() => {
    const map = new Map<string, Topic[]>();
    for (const topic of topics) {
      const key = topic.subjectId ?? DEFAULT_SUBJECT_ID;
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(topic);
      } else {
        map.set(key, [topic]);
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
    }
    return map;
  }, [topics]);

  const zonedNow = React.useMemo(() => nowInTimeZone(timezone), [timezone]);
  const startOfToday = React.useMemo(
    () => startOfDayInTimeZone(zonedNow, timezone),
    [zonedNow, timezone]
  );
  const startMs = startOfToday.getTime();
  const endMs = startMs + DAY_MS;

  const sortedSubjects = React.useMemo(() => {
    const now = new Date();
    return [...subjects].sort((a, b) => {
      if (sortOption === "name") {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }

      const aExam = a.examDate ? new Date(a.examDate) : null;
      const bExam = b.examDate ? new Date(b.examDate) : null;
      const aDays = aExam ? daysBetween(now, aExam) : Number.POSITIVE_INFINITY;
      const bDays = bExam ? daysBetween(now, bExam) : Number.POSITIVE_INFINITY;

      if (sortOption === "exam-date") {
        if (aExam && bExam) return aExam.getTime() - bExam.getTime();
        if (aExam) return -1;
        if (bExam) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }

      if (aDays === bDays) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      return aDays - bDays;
    });
  }, [sortOption, subjects]);

  const resetForm = () => {
    setName("");
    setExamDate("");
    setColor(FALLBACK_SUBJECT_COLOR);
    setIcon("Sparkles");
  };

  const toggleSubjectExpansion = (id: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateSubject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Subject name is required");
      return;
    }
    try {
      const created = addSubject({ name: trimmed, color, icon, examDate });
      toast.success(`Subject “${created.name}” created`);
      resetForm();
      setIsCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create subject");
    }
  };

  const handleStartEdit = (subject: Subject) => {
    setEditing(subject.id);
    setEditDraft({
      name: subject.name,
      examDate: toDateInputValue(subject.examDate ?? null),
      color: subject.color,
      icon: subject.icon
    });
  };

  const handleCancelEdit = () => {
    setEditing(null);
  };

  const handleSaveEdit = (subject: Subject) => {
    try {
      updateSubject(subject.id, {
        name: editDraft.name,
        color: editDraft.color,
        icon: editDraft.icon,
        examDate: editDraft.examDate
      });
      toast.success(`Subject “${editDraft.name || subject.name}” updated`);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update subject");
    }
  };

  const handleDeleteSubject = (subject: Subject) => {
    const result = deleteSubject(subject.id);
    if (!result.success) {
      toast.error(result.reason ?? "Unable to delete subject");
      return false;
    }
    toast.success(`Subject “${subject.name}” removed`);
    return true;
  };

  const handleConfirmDelete = () => {
    if (!subjectPendingDelete) {
      return;
    }
    const wasDeleted = handleDeleteSubject(subjectPendingDelete);
    if (wasDeleted) {
      setSubjectPendingDelete(null);
    }
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 pb-24 pt-12 md:px-8 lg:px-10">
      <header className="relative flex flex-col gap-6 pb-8">
        <div className="space-y-3 pr-0 md:pr-64">
          <h1 className="text-4xl font-semibold text-fg">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Manage the subjects that power your review schedule, including exam dates and identity settings.
          </p>
          <p className="text-xs text-muted-foreground">
            Adaptive reviews fire as soon as predicted retention dips under {triggerPercent}% for any topic in the subject.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Sort</span>
            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger className="w-48 border-inverse/10 bg-inverse/5 text-fg/90 backdrop-blur">
                <SelectValue placeholder="Sort subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Order subjects</SelectLabel>
                  <SelectItem value="urgency">Exam urgency</SelectItem>
                  <SelectItem value="exam-date">Exam date</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground/80 sm:text-sm">
            {subjects.length} subject{subjects.length === 1 ? "" : "s"} tracked
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setIsCreateOpen(true)}
          className="self-start rounded-full bg-accent px-6 py-3 text-base font-semibold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 md:absolute md:right-0 md:top-0"
          aria-haspopup="dialog"
          aria-expanded={isCreateOpen}
          aria-controls="create-subject-drawer"
        >
          ➕ New Subject
        </Button>
      </header>

      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-fg">Subjects overview</h2>
          <p className="text-sm text-muted-foreground">
            Monitor exam timelines, review momentum, and drill into topics from a single place.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {sortedSubjects.map((subject) => {
            const summary = summaryById.get(subject.id);
            const subjectTopics = topicsBySubject.get(subject.id) ?? [];
            const isEditing = editing === subject.id;
            const isExpanded = expandedSubjects.has(subject.id);
            const examDateValue = subject.examDate ? new Date(subject.examDate) : null;
            const daysLeft = examDateValue ? daysBetween(startOfToday, examDateValue) : null;
            const urgencyMeta = getExamUrgencyMeta(daysLeft);
            const accentColor = (subject.color?.trim() || FALLBACK_SUBJECT_COLOR) as string;
            const topicsCount = summary?.topicsCount ?? subjectTopics.length;
            const upcomingCount = summary?.upcomingReviewsCount ?? 0;
            const nextReviewAt = summary?.nextReviewAt ?? null;
            const hasTopics = subjectTopics.length > 0;
            const countdownText =
              daysLeft === null
                ? null
                : daysLeft < 0
                ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`
                : daysLeft === 0
                ? "Exam today"
                : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
            const nextReviewLabel = nextReviewAt
              ? `${formatRelativeToNow(nextReviewAt)} • ${formatDateWithWeekday(nextReviewAt)}`
              : "No upcoming reviews";
            const examBadgeText =
              daysLeft === null
                ? "No exam date set"
                : daysLeft < 0
                ? "Exam passed"
                : daysLeft === 0
                ? "Exam today"
                : `Exam in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
            const examInfoClassName = cn(
              "subject-exam-info text-sm text-muted-foreground dark:text-zinc-300",
              daysLeft !== null && daysLeft <= 7 ? "subject-exam-soon" : undefined
            );

            if (isEditing) {
              return (
                <div
                  key={subject.id}
                  className={cn(
                    "card-interactive relative overflow-hidden rounded-3xl border border-inverse/10 bg-bg/70 p-6",
                    urgencyMeta.accentClass
                  )}
                  onMouseMove={handleCardPointerMove}
                  onMouseLeave={handleCardPointerLeave}
                  style={{ "--card-accent": accentColor } as React.CSSProperties}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-0 h-px opacity-40"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Editing</p>
                        <h3 className="text-xl font-semibold text-fg">{subject.name}</h3>
                        <p className="text-sm text-muted-foreground">Adjust the identity and exam target for this subject.</p>
                      </div>
                      <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`subject-name-${subject.id}`}>Name</Label>
                        <Input
                          id={`subject-name-${subject.id}`}
                          value={editDraft.name}
                          onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder="Subject name"
                          className="h-11 rounded-xl border-inverse/10 bg-inverse/5 text-fg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`subject-exam-${subject.id}`}>Exam date (optional)</Label>
                        <Input
                          id={`subject-exam-${subject.id}`}
                          type="date"
                          value={editDraft.examDate}
                          min={toDateInputValue(new Date().toISOString())}
                          onChange={(event) => setEditDraft((prev) => ({ ...prev, examDate: event.target.value }))}
                          className="h-11 rounded-xl border-inverse/10 bg-inverse/5 text-fg"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <IconPicker value={editDraft.icon} onChange={(value) => setEditDraft((prev) => ({ ...prev, icon: value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <ColorPicker value={editDraft.color} onChange={(value) => setEditDraft((prev) => ({ ...prev, color: value }))} />
                      </div>
                    </div>
                    <SubjectIdentityPreview
                      name={editDraft.name}
                      color={editDraft.color}
                      icon={editDraft.icon}
                      examDate={editDraft.examDate || undefined}
                    />
                    <p className="text-xs text-muted-foreground/80">
                      Saving applies the updated icon and color to every topic in this subject.
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => handleSaveEdit(subject)}>
                        Save changes
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <article
                key={subject.id}
                className={cn(
                  "card-interactive relative overflow-hidden rounded-3xl border border-inverse/10 bg-bg/70 p-6",
                  urgencyMeta.accentClass
                )}
                onMouseMove={handleCardPointerMove}
                onMouseLeave={handleCardPointerLeave}
                style={{ "--card-accent": accentColor } as React.CSSProperties}
              >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-0 h-px opacity-40"
                    style={{ backgroundColor: accentColor }}
                  />
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-1 items-start gap-4">
                      <span
                        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-inverse/10"
                        style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
                        aria-hidden="true"
                      >
                        <IconPreview name={subject.icon} className="h-6 w-6" />
                      </span>
                      <div className="space-y-3">
                        <h3 className="text-xl font-semibold text-fg">{subject.name}</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              type="exam"
                              className="exam-date"
                              icon={CalendarDays}
                              label={examBadgeText}
                              date={subject.examDate ?? undefined}
                            />
                            {subject.examDate ? (
                              <span className={examInfoClassName}>
                                Exam on {formatFullDate(subject.examDate)}
                                {countdownText ? ` • ${countdownText}` : ""}
                              </span>
                            ) : (
                              <span className={examInfoClassName}>{urgencyMeta.description}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 border-inverse/10 bg-inverse/5 text-fg hover:border-inverse/30 hover:bg-inverse/10"
                        onClick={() => handleStartEdit(subject)}
                      >
                        <PencilLine className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-error/20 hover:text-error/20"
                        onClick={() => setSubjectPendingDelete(subject)}
                        disabled={hasTopics}
                        aria-label={
                          hasTopics ? "Cannot delete a subject while topics exist" : `Delete ${subject.name}`
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-inverse/10 bg-bg/80 p-4">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Topics</span>
                        <BookOpen className="h-4 w-4 text-muted-foreground/80" aria-hidden="true" />
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-fg">{topicsCount}</p>
                      {topicsCount === 0 ? (
                        <span
                          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground/80"
                          title="No topics yet. Create topics and assign them to this subject."
                        >
                          <Info className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden="true" />
                          No topics
                        </span>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">Active topics</p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-inverse/10 bg-bg/80 p-4">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Upcoming</span>
                        <RefreshCw className="h-4 w-4 text-muted-foreground/80" aria-hidden="true" />
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-fg">{upcomingCount}</p>
                      {upcomingCount === 0 ? (
                        <span
                          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground/80"
                          title="No reviews scheduled in the next 7 days."
                        >
                          <Info className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden="true" />
                          No upcoming reviews
                        </span>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">Reviews next 7 days</p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-inverse/10 bg-bg/80 p-4">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Next review</span>
                        <Clock className="h-4 w-4 text-muted-foreground/80" aria-hidden="true" />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-fg">
                        {nextReviewAt ? formatDateWithWeekday(nextReviewAt) : "--"}
                      </p>
                      {nextReviewAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">{formatRelativeToNow(nextReviewAt)}</p>
                      ) : (
                        <span
                          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground/80"
                          title="Once a topic is due this will show the next review time."
                        >
                          <Info className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden="true" />
                          No upcoming reviews
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden="true" />
                      <span>{nextReviewLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-fg/80 hover:text-fg"
                        onClick={() => toggleSubjectExpansion(subject.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`subject-topics-${subject.id}`}
                      >
                        <ListChecks className="h-4 w-4" aria-hidden="true" />
                        {isExpanded ? "Hide topics" : `View topics (${subjectTopics.length})`}
                      </Button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div
                      id={`subject-topics-${subject.id}`}
                      className="mt-4 space-y-3 rounded-2xl border border-inverse/10 bg-bg/80 p-4"
                    >
                      {subjectTopics.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Info className="h-4 w-4 text-muted-foreground/80" aria-hidden="true" />
                          No topics assigned yet.
                        </div>
                      ) : (
                        subjectTopics.map((topic) => {
                          const status = computeTopicStatus(topic, startMs, endMs);
                          const statusMeta = STATUS_META[status];
                          const nextDateLabel = formatDateWithWeekday(topic.nextReviewDate);
                          const nextRelative = formatRelativeToNow(topic.nextReviewDate);
                          return (
                            <div
                              key={topic.id}
                              className="flex flex-col gap-3 rounded-2xl border border-inverse/10 bg-bg/90 p-4 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="min-w-0 space-y-1">
                                <p className="text-sm font-semibold text-fg">{topic.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  Next {nextDateLabel} • {nextRelative}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-wide ${statusMeta.badgeClass}`}
                                >
                                  {statusMeta.label}
                                </span>
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 border-inverse/10 bg-inverse/5 text-fg hover:border-inverse/30 hover:bg-inverse/10"
                                >
                                  <Link href={`/subjects/${subject.id}/history`}>
                                    <Clock className="h-4 w-4" aria-hidden="true" /> Review history
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {sortedSubjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-inverse/10 bg-bg/60 p-10 text-center text-sm text-muted-foreground">
            <p className="mx-auto max-w-sm">
              You haven’t created any subjects yet. Use the <span className="font-semibold text-fg">New Subject</span> button to get started.
            </p>
          </div>
        ) : null}
      </section>

      {isCreateOpen ? (
        <div
          id="create-subject-drawer"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur"
            onClick={() => setIsCreateOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto bg-bg/95 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-fg">Create a subject</h2>
                <p className="text-sm text-muted-foreground">
                  Subjects group related topics and enforce exam date cutoffs.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsCreateOpen(false)}>
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleCreateSubject}>
              <div className="space-y-2">
                <Label htmlFor="new-subject-name">Name</Label>
                <Input
                  id="new-subject-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g., Organic Chemistry"
                  className="h-11 rounded-xl border-inverse/10 bg-inverse/5 text-fg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-subject-exam">Exam date (optional)</Label>
                <Input
                  id="new-subject-exam"
                  type="date"
                  value={examDate}
                  min={toDateInputValue(new Date().toISOString())}
                  onChange={(event) => setExamDate(event.target.value)}
                  className="h-11 rounded-xl border-inverse/10 bg-inverse/5 text-fg"
                />
                <p className="text-xs text-muted-foreground/80">
                  Set the exam date for this subject to optimise your review schedule. No reviews will be scheduled after the exam.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <IconPicker value={icon} onChange={setIcon} />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
              </div>
              <SubjectIdentityPreview name={name} color={color} icon={icon} examDate={examDate || undefined} />
              <p className="text-xs text-muted-foreground/80">
                Topics created in this subject will inherit the selected icon and color.
              </p>
              <Button type="submit" size="lg" className="w-full gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" /> Create subject
              </Button>
            </form>
          </aside>
        </div>
      ) : null}
      <ConfirmationDialog
        open={subjectPendingDelete !== null}
        title="Delete subject"
        description={
          subjectPendingDelete
            ? `This will permanently remove “${subjectPendingDelete.name}” and its identity settings.`
            : "This will permanently remove the selected subject and its identity settings."
        }
        warning="Existing topics must be reassigned or removed separately."
        confirmLabel="Delete subject"
        confirmTone="danger"
        icon={<Trash2 className="h-5 w-5" aria-hidden="true" />}
        onConfirm={handleConfirmDelete}
        onClose={() => setSubjectPendingDelete(null)}
        onCancel={() => setSubjectPendingDelete(null)}
      />
    </main>
  );
};

export default SubjectAdminPage;
