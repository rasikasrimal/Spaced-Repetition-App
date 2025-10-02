"use client";

import * as React from "react";
import { useTopicStore } from "@/stores/topics";
import { featureFlags } from "@/lib/feature-flags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/forms/color-picker";
import { IconPicker } from "@/components/forms/icon-picker";
import { IconPreview } from "@/components/icon-preview";
import { Subject, SubjectSummary } from "@/types/topic";
import { daysBetween, formatFullDate } from "@/lib/date";
import { toast } from "sonner";
import { Calendar, Clock, PencilLine, Plus, Sparkles, Trash2 } from "lucide-react";

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const SubjectAdminPage: React.FC = () => {
  const subjects = useTopicStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);
  const addSubject = useTopicStore((state) => state.addSubject);
  const updateSubject = useTopicStore((state) => state.updateSubject);
  const deleteSubject = useTopicStore((state) => state.deleteSubject);
  const summaries = useTopicStore((state) => state.getSubjectSummaries());

  const [name, setName] = React.useState("");
  const [examDate, setExamDate] = React.useState("");
  const [color, setColor] = React.useState("#38bdf8");
  const [icon, setIcon] = React.useState("Sparkles");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState({ name: "", examDate: "", color: "#38bdf8", icon: "Sparkles" });

  const summaryById = React.useMemo(() => {
    const map = new Map<string, SubjectSummary>();
    summaries.forEach((summary) => map.set(summary.subjectId, summary));
    return map;
  }, [summaries]);

  if (!featureFlags.subjectsAdminUi) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-4 px-4 py-16 text-center text-zinc-300">
        <Sparkles className="h-8 w-8 text-accent" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Subjects admin is currently disabled</h1>
          <p className="text-sm text-zinc-400">
            Enable the <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/90">NEXT_PUBLIC_FF_SUBJECTS_ADMIN_UI</code> flag to manage subjects.
          </p>
        </div>
      </main>
    );
  }

  const resetForm = () => {
    setName("");
    setExamDate("");
    setColor("#38bdf8");
    setIcon("Sparkles");
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
                const examInput = toDateInputValue(subject.examDate ?? null);
                const daysLeft = subject.examDate ? daysBetween(new Date(), new Date(subject.examDate)) : null;
                const hasTopics = topics.some((topic) => topic.subjectId === subject.id);
                const isEditing = editing === subject.id;

                return (
                  <div key={subject.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-10 w-10 items-center justify-center rounded-2xl"
                              style={{ backgroundColor: `${subject.color}25` }}
                            >
                              <IconPreview name={subject.icon} className="h-5 w-5" />
                            </span>
                            <div>
                              <h3 className="text-lg font-semibold text-white">{subject.name}</h3>
                              {subject.examDate ? (
                                <p className="text-xs text-zinc-400">
                                  Exam on {formatFullDate(subject.examDate)}
                                  {typeof daysLeft === "number" ? ` • ${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining` : ""}
                                </p>
                              ) : (
                                <p className="text-xs text-zinc-400">No exam date set</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {examInput ? `Exam ${examInput}` : "No exam"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {summary?.upcomingReviewsCount ?? 0} reviews next 7 days
                            </span>
                            <span>{summary?.topicsCount ?? 0} topics</span>
                          </div>
                        </div>
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
                            disabled={hasTopics || subject.id === "subject-general"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
            <Button type="submit" className="w-full gap-2">
              <Plus className="h-4 w-4" /> Create subject
            </Button>
          </form>
        </aside>
      </section>
    </main>
  );
};

export default SubjectAdminPage;
