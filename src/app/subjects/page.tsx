"use client";

import * as React from "react";
import { useTopicStore } from "@/stores/topics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/forms/color-picker";
import { IconPicker } from "@/components/forms/icon-picker";
import { IconPreview } from "@/components/icon-preview";
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
import { Calendar, ChevronDown, Clock, PencilLine, Plus, Trash2 } from "lucide-react";
import { useProfileStore } from "@/stores/profile";
import { DAY_MS } from "@/lib/forgetting-curve";
import { TopicHistoryEditor } from "@/components/topics/history-editor";

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

type TopicStatus = "overdue" | "due-today" | "upcoming";

const STATUS_META: Record<TopicStatus, { label: string; tone: string }> = {
  overdue: { label: "Overdue", tone: "bg-rose-500/20 text-rose-100" },
  "due-today": { label: "Due today", tone: "bg-amber-500/20 text-amber-100" },
  upcoming: { label: "Upcoming", tone: "bg-sky-500/20 text-sky-100" }
};

const DEFAULT_SUBJECT_ID = "subject-general";

const computeTopicStatus = (topic: Topic, startMs: number, endMs: number): TopicStatus => {
  const nextMs = new Date(topic.nextReviewDate).getTime();
  if (nextMs < startMs) return "overdue";
  if (nextMs < endMs) return "due-today";
  return "upcoming";
};

const SubjectAdminPage: React.FC = () => {
  const subjects = useTopicStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);
  const addSubject = useTopicStore((state) => state.addSubject);
  const updateSubject = useTopicStore((state) => state.updateSubject);
  const deleteSubject = useTopicStore((state) => state.deleteSubject);
  const summaries = useTopicStore((state) => state.getSubjectSummaries());
  const timezone = useProfileStore((state) => state.profile.timezone) || "Asia/Colombo";

  const [name, setName] = React.useState("");
  const [examDate, setExamDate] = React.useState("");
  const [color, setColor] = React.useState("#38bdf8");
  const [icon, setIcon] = React.useState("Sparkles");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState({ name: "", examDate: "", color: "#38bdf8", icon: "Sparkles" });
  const [expandedSubjects, setExpandedSubjects] = React.useState<Set<string>>(new Set());
  const [historyTarget, setHistoryTarget] = React.useState<{ topic: Topic; subject: Subject | null } | null>(null);

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
      list.sort(
        (a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
      );
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

  const resetForm = () => {
    setName("");
    setExamDate("");
    setColor("#38bdf8");
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
      return;
    }
    toast.success(`Subject “${subject.name}” removed`);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-12 md:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Subjects</h1>
        <p className="text-sm text-zinc-400">
          Manage the subjects that power your review schedule, including exam dates and identity settings.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/40">
            <h2 className="text-xl font-semibold text-white">All subjects</h2>
            <p className="text-sm text-zinc-400">Edit existing subjects and their exam timelines.</p>

            <div className="mt-6 space-y-4">
              {subjects.map((subject) => {
                const summary = summaryById.get(subject.id);
                const daysLeft = subject.examDate ? daysBetween(new Date(), new Date(subject.examDate)) : null;
                const subjectTopics = topicsBySubject.get(subject.id) ?? [];
                const isEditing = editing === subject.id;
                const isExpanded = expandedSubjects.has(subject.id);
                const topicsCount = summary?.topicsCount ?? subjectTopics.length;
                const upcomingCount = summary?.upcomingReviewsCount ?? 0;
                const nextReviewAt = summary?.nextReviewAt ?? null;
                const hasTopics = subjectTopics.length > 0;

                const nextReviewLabel = nextReviewAt
                  ? `${formatRelativeToNow(nextReviewAt)} • ${formatDateWithWeekday(nextReviewAt)}`
                  : "No upcoming reviews";

                return (
                  <div key={subject.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`subject-name-${subject.id}`}>Name</Label>
                            <Input
                              id={`subject-name-${subject.id}`}
                              value={editDraft.name}
                              onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                              placeholder="Subject name"
                              className="h-10"
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
                              className="h-10"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Icon</Label>
                            <IconPicker value={editDraft.icon} onChange={(value) => setEditDraft((prev) => ({ ...prev, icon: value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Color</Label>
                            <ColorPicker value={editDraft.color} onChange={(value) => setEditDraft((prev) => ({ ...prev, color: value }))} />
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Live preview</p>
                          <div className="mt-3 flex items-center gap-3">
                            <span
                              className="flex h-12 w-12 items-center justify-center rounded-2xl"
                              style={{ backgroundColor: `${editDraft.color}22` }}
                              aria-hidden="true"
                            >
                              <IconPreview name={editDraft.icon} className="h-5 w-5" />
                            </span>
                            <div className="text-xs text-zinc-300 space-y-1">
                              <p>
                                Icon: <span className="text-white">{editDraft.icon}</span>
                              </p>
                              <p>
                                Colour: <span className="text-white">{editDraft.color}</span>
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                Saving updates every topic assigned to this subject.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                          <Button type="button" onClick={() => handleSaveEdit(subject)}>
                            Save changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <button
                            type="button"
                            onClick={() => toggleSubjectExpansion(subject.id)}
                            aria-expanded={isExpanded}
                            aria-controls={`subject-topics-${subject.id}`}
                            className="group flex flex-1 items-stretch justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left transition hover:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/40"
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                                  style={{ backgroundColor: `${subject.color ?? "#38bdf8"}22` }}
                                  aria-hidden="true"
                                >
                                  <IconPreview name={subject.icon} className="h-5 w-5" />
                                </span>
                                <div>
                                  <h3 className="text-lg font-semibold text-white">{subject.name}</h3>
                                  {subject.examDate ? (
                                    <p className="text-xs text-zinc-400">
                                      Exam on {formatFullDate(subject.examDate)}
                                      {typeof daysLeft === "number"
                                        ? ` • ${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`
                                        : ""}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-zinc-400">No exam date set</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                                <span>{topicsCount} topics</span>
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {upcomingCount} reviews next 7 days
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" /> {nextReviewLabel}
                                </span>
                              </div>
                            </div>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5">
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                aria-hidden="true"
                              />
                            </span>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => handleStartEdit(subject)}>
                              <PencilLine className="h-4 w-4" /> Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-rose-200 hover:text-rose-100"
                              onClick={() => handleDeleteSubject(subject)}
                              disabled={hasTopics || subject.id === DEFAULT_SUBJECT_ID}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {isExpanded ? (
                          <div id={`subject-topics-${subject.id}`} className="space-y-3">
                            {subjectTopics.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-4 text-sm text-zinc-400">
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
                                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:flex-row md:items-center md:justify-between"
                                  >
                                    <div className="min-w-0 space-y-1">
                                      <p className="text-sm font-semibold text-white">{topic.title}</p>
                                      <p className="text-xs text-zinc-400">
                                        Next {nextDateLabel} • {nextRelative}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusMeta.tone}`}
                                      >
                                        {statusMeta.label}
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => setHistoryTarget({ topic, subject })}
                                      >
                                        <Clock className="h-4 w-4" /> Edit history
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}

              {subjects.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                  No subjects yet. Create one to get started.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/40">
          <h2 className="text-xl font-semibold text-white">Create a subject</h2>
          <p className="text-sm text-zinc-400">Subjects group related topics and enforce exam date cutoffs.</p>

          <form className="mt-6 space-y-4" onSubmit={handleCreateSubject}>
            <div className="space-y-2">
              <Label htmlFor="new-subject-name">Name</Label>
              <Input
                id="new-subject-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g., Organic Chemistry"
                className="h-10"
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
                className="h-10"
              />
              <p className="text-xs text-zinc-500">
                Set the exam date for this subject to optimize your review schedule. No reviews will be scheduled after the exam.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Icon</Label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker value={color} onChange={setColor} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Live preview</p>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${color}22` }}
                  aria-hidden="true"
                >
                  <IconPreview name={icon} className="h-5 w-5" />
                </span>
                <div className="text-xs text-zinc-300 space-y-1">
                  <p>
                    Icon: <span className="text-white">{icon}</span>
                  </p>
                  <p>
                    Colour: <span className="text-white">{color}</span>
                  </p>
                  <p className="text-[11px] text-zinc-500">Topics created in this subject will use this identity.</p>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full gap-2">
              <Plus className="h-4 w-4" /> Create subject
            </Button>
          </form>
        </aside>
      </section>
      {historyTarget ? (
        <TopicHistoryEditor
          open={Boolean(historyTarget)}
          topic={historyTarget.topic}
          subject={historyTarget.subject}
          onClose={() => setHistoryTarget(null)}
        />
      ) : null}
    </main>
  );
};

export default SubjectAdminPage;
