"use client";



import * as React from "react";

import { useTopicStore } from "@/stores/topics";

import { Button } from "@/components/ui/button";
import { FALLBACK_SUBJECT_COLOR } from "@/lib/colors";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue

} from "@/components/ui/select";

import { IntervalEditor } from "@/components/forms/interval-editor";

import { DEFAULT_INTERVALS, REMINDER_TIME_OPTIONS } from "@/lib/constants";

import { toast } from "sonner";

import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Info } from "lucide-react";

import { AutoAdjustPreference, Subject } from "@/types/topic";

import { daysBetween, formatFullDate } from "@/lib/date";

import { IconPreview } from "@/components/icon-preview";



const defaultIntervals = [...DEFAULT_INTERVALS];



const DEFAULT_AUTO_ADJUST: AutoAdjustPreference = "ask";

const INTERVAL_BLUEPRINT = [1, 3, 7, 14, 21, 30, 45, 60, 75, 90, 110, 130];

const MIN_INTERVALS = 5;

const MAX_INTERVALS = 12;



const AUTO_ADJUST_LABELS: Record<AutoAdjustPreference, string> = {

  always: "Always adjust automatically",

  never: "Never adjust automatically",

  ask: "Ask me each time"

};



type TopicFormMode = "create" | "edit";



type StepId = "basics" | "details" | "review";



interface TopicFormProps {

  topicId?: string | null;

  onSubmitComplete?: (mode: TopicFormMode) => void;

}



const wizardSteps: { id: StepId; title: string; description: string }[] = [

  { id: "basics", title: "Basics", description: "Give your topic a clear name and subject." },

  { id: "details", title: "Details", description: "Decide how reviews behave and add helpful context." },

  { id: "review", title: "Review & create", description: "Double-check everything before launching." }

];



const isValidTimeValue = (value: string) => /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(value);



const toDateInputValue = (value: string | null | undefined) => {

  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);

};



const toIsoDateFromInput = (value: string) => {

  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();

};



const buildExamSuggestion = (examDate: string | null): {

  intervals: number[];

  recommendedCount: number;

  daysUntilExam: number;

} | null => {

  if (!examDate) return null;

  const normalized = examDate.includes("T") ? examDate : `${examDate}T00:00:00`;

  const exam = new Date(normalized);

  if (Number.isNaN(exam.getTime())) return null;

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const days = daysBetween(today, exam);

  if (days <= 0) {

    return {

      intervals: [...defaultIntervals],

      recommendedCount: defaultIntervals.length,

      daysUntilExam: days

    };

  }



  const recommendedCount = Math.max(

    MIN_INTERVALS,

    Math.min(MAX_INTERVALS, Math.ceil(days / 21) + 3)

  );



  const blueprint = INTERVAL_BLUEPRINT.slice(0, recommendedCount);

  const lastBlueprint = blueprint[blueprint.length - 1] ?? 1;

  const scale = lastBlueprint > 0 ? Math.max(0.2, Math.min(2, days / lastBlueprint)) : 1;



  const cumulative: number[] = [];

  blueprint.forEach((value, index) => {

    const scaled = Math.max(1, Math.round(value * scale));

    if (index === 0) {

      cumulative.push(scaled);

      return;

    }



    const previous = cumulative[index - 1];

    cumulative.push(Math.max(previous + 1, scaled));

  });



  if (cumulative[cumulative.length - 1] > days) {

    cumulative[cumulative.length - 1] = days;

    for (let i = cumulative.length - 2; i >= 0; i -= 1) {

      if (cumulative[i] >= cumulative[i + 1]) {

        cumulative[i] = Math.max(1, cumulative[i + 1] - 1);

      }

    }

  }



  const intervals = cumulative.map((value, index) =>

    index === 0 ? Math.max(1, value) : Math.max(1, value - cumulative[index - 1])

  );



  return {

    intervals,

    recommendedCount,

    daysUntilExam: days

  };

};



export const TopicForm: React.FC<TopicFormProps> = ({ topicId = null, onSubmitComplete }) => {

  const { addTopic, updateTopic, addCategory, categories, subjects, topics } = useTopicStore((state) => ({

    addTopic: state.addTopic,

    updateTopic: state.updateTopic,

    addCategory: state.addCategory,

    categories: state.categories,

    subjects: state.subjects,

    topics: state.topics

  }));



  const topic = React.useMemo(

    () => (topicId ? topics.find((item) => item.id === topicId) ?? null : null),

    [topics, topicId]

  );



  const isEditing = Boolean(topicId && topic);

  const lastLoadedTopicRef = React.useRef<string | null>(null);



  const [stepIndex, setStepIndex] = React.useState(0);

  const [stepError, setStepError] = React.useState<string | null>(null);



  const [title, setTitle] = React.useState("");

  const [notes, setNotes] = React.useState("");

  const [categoryId, setCategoryId] = React.useState<string | null>("general");

  const [categoryLabel, setCategoryLabel] = React.useState("General");

  const [newCategory, setNewCategory] = React.useState("");

  const [reminderTime, setReminderTime] = React.useState<string | null>("09:00");

  const [timeOption, setTimeOption] = React.useState<string>("09:00");

  const [customTime, setCustomTime] = React.useState("09:00");

  const [intervals, setIntervals] = React.useState<number[]>(() => [...defaultIntervals]);

  const [autoAdjustPreference, setAutoAdjustPreference] = React.useState<AutoAdjustPreference>(

    DEFAULT_AUTO_ADJUST

  );



  const resetToDefaults = React.useCallback(() => {

    setTitle("");

    setNotes("");

    setCategoryId("general");

    setCategoryLabel("General");

    setReminderTime("09:00");

    setTimeOption("09:00");

    setCustomTime("09:00");

    setIntervals([...defaultIntervals]);

    setNewCategory("");

    setAutoAdjustPreference(DEFAULT_AUTO_ADJUST);

    setStepIndex(0);

    setStepError(null);

  }, []);



  React.useEffect(() => {

    if (!topicId) {

      resetToDefaults();

      lastLoadedTopicRef.current = null;

    }

  }, [topicId, resetToDefaults]);



  const loadTopic = React.useCallback(() => {

    if (!topic) return;



    lastLoadedTopicRef.current = topic.id;



    setTitle(topic.title);

    setNotes(topic.notes);



    const normalizedCategoryLabel = topic.categoryLabel?.toLowerCase();

    const matchedCategory = topic.categoryId

      ? categories.find((item) => item.id === topic.categoryId)

      : normalizedCategoryLabel

      ? categories.find((item) => item.label.toLowerCase() === normalizedCategoryLabel)

      : undefined;



    const resolvedCategoryId = matchedCategory?.id ?? topic.categoryId ?? "general";

    const resolvedCategoryLabel = matchedCategory?.label ?? topic.categoryLabel ?? "General";



    setCategoryId(resolvedCategoryId);

    setCategoryLabel(resolvedCategoryLabel);

    setIntervals([...topic.intervals]);

    setNewCategory("");

    setAutoAdjustPreference(topic.autoAdjustPreference ?? DEFAULT_AUTO_ADJUST);



    if (topic.reminderTime) {

      const presetMatch = REMINDER_TIME_OPTIONS.find((option) => option.value === topic.reminderTime);

      if (presetMatch && presetMatch.value !== "custom" && presetMatch.value !== "none") {

        setTimeOption(presetMatch.value);

        setReminderTime(presetMatch.value);

        setCustomTime(presetMatch.value);

      } else {

        setTimeOption("custom");

        setCustomTime(topic.reminderTime);

        setReminderTime(topic.reminderTime);

      }

    } else {

      setTimeOption("none");

      setReminderTime(null);

      setCustomTime("09:00");

    }



    setStepIndex(0);

    setStepError(null);

  }, [topic, categories]);



  React.useEffect(() => {

    if (!topic || topic.id === lastLoadedTopicRef.current) return;

    loadTopic();

  }, [topic, loadTopic]);



  const handleTimeOptionChange = (value: string) => {

    setTimeOption(value);

    if (value === "none") {

      setReminderTime(null);

      return;

    }

    if (value === "custom") {

      setReminderTime(customTime);

      return;

    }

    setReminderTime(value);

  };



  const handleCustomTimeChange = (value: string) => {

    setCustomTime(value);

    if (isValidTimeValue(value)) {

      setReminderTime(value);

    }

  };



  const handleNewCategoryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {

    if (event.key === "Enter") {

      event.preventDefault();

      handleCreateCategory();

    }

  };



  const handleCreateCategory = () => {

    const trimmed = newCategory.trim();

    if (!trimmed) return;

    const category = addCategory({ label: trimmed });

    setCategoryId(category.id);

    setCategoryLabel(category.label);

    setNewCategory("");

    toast.success("Category saved");

  };



  const handleCategoryChange = (value: string) => {

    if (value === "create") {

      setCategoryId("create");

      return;

    }

    setCategoryId(value);

    const selected = categories.find((item) => item.id === value);

    setCategoryLabel(selected?.label ?? "");

  };



  const handleReset = () => {

    if (isEditing) {

      loadTopic();

      return;

    }

    resetToDefaults();

  };



  const validateStep = (step: StepId) => {

    if (step === "basics") {

      if (!title.trim()) {

        setStepError("Give your topic a memorable name before moving on.");

        return false;

      }

    }

    if (step === "details") {

      if (intervals.length === 0) {

        setStepError("Please add at least one review interval.");

        return false;

      }

    }

    setStepError(null);

    return true;

  };



  const goToPreviousStep = () => {

    setStepError(null);

    setStepIndex((index) => Math.max(0, index - 1));

  };



  const selectedSubject = React.useMemo(() => subjects.find((item) => item.id === categoryId) ?? null, [subjects, categoryId]);

  const selectedSubjectExamDate = selectedSubject?.examDate ?? null;

  const activeExamDateIso = selectedSubjectExamDate;



  const goToNextStep = () => {

    const currentStep = wizardSteps[stepIndex].id;

    if (!validateStep(currentStep)) return;

    setStepIndex((index) => Math.min(wizardSteps.length - 1, index + 1));

  };



  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    const currentStep = wizardSteps[stepIndex].id;

    if (currentStep !== "review") {

      goToNextStep();

      return;

    }



    const payload = {

      title: title.trim(),

      notes,

      subjectId: categoryId === "create" ? null : categoryId,

      subjectLabel: categoryId === "create" ? newCategory.trim() : categoryLabel,

      categoryId: categoryId === "create" ? null : categoryId,

      categoryLabel: categoryId === "create" ? newCategory.trim() : categoryLabel,

      reminderTime,

      intervals: intervals.length > 0 ? intervals : [...defaultIntervals],

      autoAdjustPreference

    };



    try {

      if (categoryId === "create" && newCategory.trim()) {

        const category = addCategory({ label: newCategory.trim() });

        payload.categoryId = category.id;

        payload.categoryLabel = category.label;

        payload.subjectId = category.id;

        payload.subjectLabel = category.label;

      }



      if (isEditing && topic) {

        updateTopic(topic.id, payload);

        toast.success("Topic updated");

        onSubmitComplete?.("edit");

      } else {

        addTopic(payload);

        toast.success("Topic added to your review plan");

        onSubmitComplete?.("create");

        resetToDefaults();

      }

    } catch (error) {

      toast.error(error instanceof Error ? error.message : "Unable to save topic");

    }

  };



  const currentStep = wizardSteps[stepIndex];



  const examSuggestion = React.useMemo(() => buildExamSuggestion(activeExamDateIso), [activeExamDateIso]);



  const handleApplySuggestion = () => {

    if (!examSuggestion) return;

    setIntervals(examSuggestion.intervals);

    toast.success("Intervals updated for your exam timeline");

  };



  return (

    <form onSubmit={handleSubmit} data-testid="topic-form" className="space-y-6">

      <WizardSteps steps={wizardSteps} activeStep={currentStep.id} />



      <div className="rounded-3xl border border-inverse/5 bg-bg/60 p-5 backdrop-blur">

        <header className="mb-4 space-y-1">

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">

            Step {stepIndex + 1} of {wizardSteps.length}

          </p>

          <h2 className="text-xl font-semibold text-fg">{currentStep.title}</h2>

          <p className="text-sm text-muted-foreground">{currentStep.description}</p>

        </header>



        <WizardStepContent

          step={currentStep.id}

          title={title}

          onTitleChange={setTitle}

          categories={categories}

          categoryId={categoryId}

          categoryLabel={categoryLabel}

          onCategoryChange={handleCategoryChange}

          newCategory={newCategory}

          onNewCategoryChange={setNewCategory}

          onNewCategoryKeyDown={handleNewCategoryKeyDown}

          onCreateCategory={handleCreateCategory}

          selectedSubject={selectedSubject}

          notes={notes}

          onNotesChange={setNotes}

          reminderTime={reminderTime}

          timeOption={timeOption}

          onTimeOptionChange={handleTimeOptionChange}

          customTime={customTime}

          onCustomTimeChange={handleCustomTimeChange}

          intervals={intervals}

          onIntervalsChange={setIntervals}

          selectedSubjectExamDate={selectedSubjectExamDate}

          examSuggestion={examSuggestion}

          onApplySuggestion={handleApplySuggestion}

          autoAdjustPreference={autoAdjustPreference}

          onAutoAdjustPreferenceChange={setAutoAdjustPreference}

        />



        {stepError ? (

          <p className="mt-4 rounded-2xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn/30">

            {stepError}

          </p>

        ) : null}

      </div>



      <footer className="flex items-center justify-between">

        <Button type="button" variant="ghost" onClick={handleReset} className="rounded-2xl text-muted-foreground hover:text-fg">

          Start over

        </Button>

        <div className="flex items-center gap-3">

          <Button

            type="button"

            variant="outline"

            onClick={goToPreviousStep}

            disabled={stepIndex === 0}

            className="gap-2 rounded-2xl border-inverse/20 text-fg disabled:opacity-40"

          >

            <ChevronLeft className="h-4 w-4" /> Back

          </Button>

          {currentStep.id === "review" ? (

            <Button type="submit" className="gap-2 rounded-2xl">

              <CheckCircle2 className="h-4 w-4" /> {isEditing ? "Save changes" : "Create topic"}

            </Button>

          ) : (

            <Button type="button" onClick={goToNextStep} className="gap-2 rounded-2xl">

              Next {currentStep.id === "details" ? "review" : "step"}

              <ChevronRight className="h-4 w-4" />

            </Button>

          )}

        </div>

      </footer>

    </form>

  );

};



interface WizardStepContentProps {

  step: StepId;

  title: string;

  onTitleChange: (value: string) => void;

  categories: { id: string; label: string; color: string }[];

  categoryId: string | null;

  categoryLabel: string;

  onCategoryChange: (value: string) => void;

  newCategory: string;

  onNewCategoryChange: (value: string) => void;

  onNewCategoryKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;

  onCreateCategory: () => void;

  selectedSubject: Subject | null;

  notes: string;

  onNotesChange: (value: string) => void;

  reminderTime: string | null;

  timeOption: string;

  onTimeOptionChange: (value: string) => void;

  customTime: string;

  onCustomTimeChange: (value: string) => void;

  intervals: number[];

  onIntervalsChange: (value: number[]) => void;

  selectedSubjectExamDate: string | null;

  examSuggestion: ReturnType<typeof buildExamSuggestion>;

  onApplySuggestion: () => void;

  autoAdjustPreference: AutoAdjustPreference;

  onAutoAdjustPreferenceChange: (value: AutoAdjustPreference) => void;

}



const WizardStepContent: React.FC<WizardStepContentProps> = ({

  step,

  title,

  onTitleChange,

  categories,

  categoryId,

  categoryLabel,

  onCategoryChange,

  newCategory,

  onNewCategoryChange,

  onNewCategoryKeyDown,

  onCreateCategory,

  selectedSubject,

  notes,

  onNotesChange,

  reminderTime,

  timeOption,

  onTimeOptionChange,

  customTime,

  onCustomTimeChange,

  intervals,

  onIntervalsChange,

  selectedSubjectExamDate,

  examSuggestion,

  onApplySuggestion,

  autoAdjustPreference,

  onAutoAdjustPreferenceChange

}) => {

  const previewIcon = selectedSubject?.icon ?? "Sparkles";

  const previewColor = selectedSubject?.color ?? FALLBACK_SUBJECT_COLOR;

  const fallbackLabel = categoryLabel || "General";

  const previewLabel = selectedSubject?.name ?? fallbackLabel;

  if (step === "basics") {

    return (

      <div className="space-y-6">

        <div className="space-y-2">

          <Label htmlFor="topic">Topic title</Label>

          <Input

            id="topic"

            value={title}

            onChange={(event) => onTitleChange(event.target.value)}

            placeholder="What do you want to remember?"

            className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"

          />

        </div>



        <div className="space-y-2">

          <Label>Subject</Label>

          <Select value={categoryId ?? undefined} onValueChange={onCategoryChange}>

            <SelectTrigger className="h-11 rounded-2xl border-inverse/10 bg-inverse/10">

              <SelectValue placeholder="Select subject" />

            </SelectTrigger>

            <SelectContent>

              {categories.map((category) => (

                <SelectItem key={category.id} value={category.id}>

                  <span className="flex items-center gap-2">

                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />

                    {category.label}

                  </span>

                </SelectItem>

              ))}

              <SelectItem value="create">+ Create new</SelectItem>

            </SelectContent>

          </Select>

          {categoryId === "create" ? (

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">

              <Input

                value={newCategory}

                onChange={(event) => onNewCategoryChange(event.target.value)}

                onKeyDown={onNewCategoryKeyDown}

                placeholder="New subject name"

                className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"

              />

              <Button

                type="button"

                variant="outline"

                size="lg"

                className="sm:w-auto"

                onClick={onCreateCategory}

                disabled={!newCategory.trim()}

              >

                Save

              </Button>

            </div>

          ) : null}

          <p className="text-xs text-muted-foreground">

            Subjects help you group related topics and power the dashboard filters.

          </p>

        </div>

      </div>

    );

  }



  if (step === "details") {

    return (

      <div className="space-y-6">

        <div className="space-y-2">

          <Label className="flex items-center gap-2">

            Reminder

            <span title="Pick a reminder time to nudge you on days with scheduled reviews." className="text-accent">

              <Info className="h-3.5 w-3.5" />

            </span>

          </Label>

          <Select value={timeOption} onValueChange={onTimeOptionChange}>

            <SelectTrigger className="h-11 rounded-2xl border-inverse/10 bg-inverse/10">

              <SelectValue placeholder="Select reminder time" />

            </SelectTrigger>

            <SelectContent>

              {REMINDER_TIME_OPTIONS.map((option) => (

                <SelectItem key={option.value} value={option.value}>

                  {option.label}

                </SelectItem>

              ))}

            </SelectContent>

          </Select>

          {timeOption === "custom" ? (

            <Input

              type="time"

              value={customTime}

              onChange={(event) => onCustomTimeChange(event.target.value)}

              className="mt-2 h-11 w-40 rounded-2xl border-inverse/10 bg-inverse/10"

            />

          ) : null}

          <p className="text-xs text-muted-foreground">

            Reminders arrive at the chosen time. You can switch them off anytime.

          </p>

        </div>



        <div className="space-y-3">

          <div className="space-y-2 rounded-2xl border border-inverse/10 bg-inverse/5 p-4 text-sm text-muted-foreground">

            <p className="font-semibold text-fg">Subject exam timeline</p>

            <p className="text-xs text-fg/80">

              Set the exam date for this subject to optimize your review schedule. No reviews will be scheduled after the exam.

            </p>

            {selectedSubjectExamDate ? (

              <p className="text-xs text-success/20">

                No reviews will be scheduled after {formatFullDate(selectedSubjectExamDate)}.

              </p>

            ) : (

              <p className="text-xs text-muted-foreground">

                No exam date set yet. You can update it from the Subjects page whenever you&rsquo;re ready.

              </p>

            )}

          </div>



          {examSuggestion ? (

            <div className="space-y-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">

              <p className="font-semibold">

                {examSuggestion.daysUntilExam > 0

                  ? `Exam in ${examSuggestion.daysUntilExam} day${examSuggestion.daysUntilExam === 1 ? "" : "s"}.`

                  : "Exam date is today."}

              </p>

              <p className="text-accent/80">

                We recommend {examSuggestion.recommendedCount} intervals to stay on track. Apply the suggestion to distribute reviews evenly without crossing your exam date.

              </p>

              <Button

                type="button"

                size="sm"

                variant="outline"

                className="rounded-xl border-accent/40 text-accent hover:bg-accent/10"

                onClick={onApplySuggestion}

              >

                Use suggested intervals

              </Button>

            </div>

          ) : null}







          <div className="space-y-2">

            <Label className="flex items-center gap-2">

              Intervals

              <span title="Intervals space your reviews. Longer gaps appear as you succeed." className="text-accent">

                <Info className="h-3.5 w-3.5" />

              </span>

            </Label>

            <div className="rounded-2xl border border-inverse/10 bg-inverse/10 p-4">

              <IntervalEditor value={intervals} onChange={onIntervalsChange} />

            </div>

            <p className="text-xs text-muted-foreground">

              Adjust or add intervals to match your pace. We�ll keep them flexible so reviews never pile up.

            </p>

          </div>



          <div className="space-y-2">

            <Label className="flex items-center gap-2">

              Auto-adjust preference

              <span title="Decide how the schedule adapts when you review earlier than planned." className="text-accent">

                <Info className="h-3.5 w-3.5" />

              </span>

            </Label>

            <Select value={autoAdjustPreference} onValueChange={(value: AutoAdjustPreference) => onAutoAdjustPreferenceChange(value)}>

              <SelectTrigger className="h-11 rounded-2xl border-inverse/10 bg-inverse/10 text-left">

                <SelectValue placeholder="Choose behaviour" />

              </SelectTrigger>

              <SelectContent>

                {Object.entries(AUTO_ADJUST_LABELS).map(([value, label]) => (

                  <SelectItem key={value} value={value}>

                    {label}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

            <p className="text-xs text-muted-foreground">

              You can change this later from the dashboard if you prefer a different level of automation.

            </p>

          </div>



          <div className="space-y-2 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-xs text-warn/30">

            <p className="font-semibold">? Skipping today may cause too many reviews to pile up later.</p>

            <p className="text-warn/20/80">

              Use the �Skip today� action sparingly � we�ll rebalance the schedule, but you should still aim to review consistently.

            </p>

          </div>

        </div>



        <div className="space-y-2">

          <Label className="flex items-center gap-2">

            Notes

            <span title="Add mnemonics or context to refresh your memory fast." className="text-accent">

              <Info className="h-3.5 w-3.5" />

            </span>

          </Label>

          <Textarea

            value={notes}

            onChange={(event) => onNotesChange(event.target.value)}

            placeholder="Capture keywords, mnemonics, or highlights..."

            rows={6}

            className="min-h-[160px] rounded-2xl border-inverse/10 bg-inverse/10"

          />

        </div>

      </div>

    );

  }



  return (

    <div className="space-y-4 text-sm text-muted-foreground">

      <div className="rounded-2xl border border-inverse/10 bg-inverse/5 p-4">

        <h3 className="text-base font-semibold text-fg">Basics</h3>

        <p className="text-xs text-muted-foreground">{title || "Untitled topic"}</p>

        <div className="mt-2 text-xs text-muted-foreground">

          Subject: <span className="text-fg">{categoryLabel || "General"}</span>

        </div>

      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="rounded-2xl border border-inverse/10 bg-inverse/5 p-4">

          <h3 className="text-base font-semibold text-fg">Subject identity</h3>

          <p className="text-xs text-muted-foreground">Topics inherit their look from the assigned subject.</p>

          <div className="mt-3 flex items-center gap-3">

            <span

              className="flex h-12 w-12 items-center justify-center rounded-2xl"

              style={{ backgroundColor: `${previewColor}22` }}

              aria-hidden="true"

            >

              <IconPreview name={previewIcon} className="h-5 w-5" />

            </span>

            <div className="text-xs text-muted-foreground space-y-1">

              <p>

                Subject: <span className="text-fg">{previewLabel}</span>

              </p>

              <p>

                Icon: <span className="text-fg">{previewIcon}</span>

              </p>

              <p>

                Colour: <span className="text-fg">{previewColor}</span>

              </p>

              <p className="mt-1 text-[11px] text-muted-foreground/80">

                Change identity from the Subjects page to update every topic in this subject instantly.

              </p>

            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-inverse/10 bg-inverse/5 p-4 space-y-2">

          <h3 className="text-base font-semibold text-fg">Schedule</h3>

          <p className="text-xs text-muted-foreground">

            Reminder: <span className="text-fg">{timeOption === "none" ? "None" : reminderTime ?? "Custom"}</span>

          </p>

          <p className="text-xs text-muted-foreground">

            Intervals: <span className="text-fg">{intervals.join(", ")} day{intervals.length === 1 ? "" : "s"}</span>

          </p>

          <p className="text-xs text-muted-foreground">

            Auto-adjust: <span className="text-fg">{AUTO_ADJUST_LABELS[autoAdjustPreference]}</span>

          </p>

          <p className="text-xs text-muted-foreground">

            Exam date: <span className="text-fg">{selectedSubjectExamDate ? formatFullDate(selectedSubjectExamDate) : "Not set"}</span>

          </p>

        </div>

      </div>

      <div className="rounded-2xl border border-inverse/10 bg-inverse/5 p-4">

        <h3 className="text-base font-semibold text-fg">Notes preview</h3>

        <p className="text-xs text-muted-foreground">

          {notes.trim() || "Nothing yet � add a note in the previous step to make reviews richer."}

        </p>

      </div>

    </div>

  );

};



const WizardSteps = ({ steps, activeStep }: { steps: typeof wizardSteps; activeStep: StepId }) => {

  const activeIndex = steps.findIndex((step) => step.id === activeStep);

  return (

    <nav aria-label="Topic creation steps" className="flex items-center justify-between gap-3 rounded-3xl border border-inverse/5 bg-inverse/5 px-4 py-3">

      {steps.map((step, index) => {

        const isActive = step.id === activeStep;

        const isCompleted = index < activeIndex;

        return (

          <div key={step.id} className="flex flex-1 items-center gap-3 text-left">

            <span

              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${

                isCompleted

                  ? "border-success/40 bg-success/20 text-success/20"

                  : isActive

                  ? "border-accent/40 bg-accent/15 text-accent"

                  : "border-inverse/10 bg-inverse/5 text-muted-foreground"

              }`}

            >

              {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}

            </span>

            <div>

              <p className={`text-xs font-semibold uppercase tracking-wide ${isActive ? "text-fg" : "text-muted-foreground"}`}>

                {step.title}

              </p>

              <p className="text-[11px] text-muted-foreground/80">{step.description}</p>

            </div>

          </div>

        );

      })}

    </nav>

  );

};










          onIntervalsChange={setIntervals}
          selectedSubjectExamDate={selectedSubjectExamDate}
          examSuggestion={examSuggestion}
          onApplySuggestion={handleApplySuggestion}
          autoAdjustPreference={autoAdjustPreference}
          onAutoAdjustPreferenceChange={setAutoAdjustPreference}
        />

        {stepError ? (
          <p className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {stepError}
          </p>
        ) : null}
      </div>

      <footer className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={handleReset} className="rounded-2xl text-zinc-400 hover:text-white">
          Start over
        </Button>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            disabled={stepIndex === 0}
            className="gap-2 rounded-2xl border-white/20 text-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {currentStep.id === "review" ? (
            <Button type="submit" className="gap-2 rounded-2xl">
              <CheckCircle2 className="h-4 w-4" /> {isEditing ? "Save changes" : "Create topic"}
            </Button>
          ) : (
            <Button type="button" onClick={goToNextStep} className="gap-2 rounded-2xl">
              Next {currentStep.id === "details" ? "review" : "step"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </form>
  );
};

interface WizardStepContentProps {
  step: StepId;
  title: string;
  onTitleChange: (value: string) => void;
  categories: { id: string; label: string; color: string }[];
  categoryId: string | null;
  categoryLabel: string;
  onCategoryChange: (value: string) => void;
  newCategory: string;
  onNewCategoryChange: (value: string) => void;
  onNewCategoryKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onCreateCategory: () => void;
  selectedSubject: Subject | null;
  notes: string;
  onNotesChange: (value: string) => void;
  reminderTime: string | null;
  timeOption: string;
  onTimeOptionChange: (value: string) => void;
  customTime: string;
  onCustomTimeChange: (value: string) => void;
  intervals: number[];
  onIntervalsChange: (value: number[]) => void;
  selectedSubjectExamDate: string | null;
  examSuggestion: ReturnType<typeof buildExamSuggestion>;
  onApplySuggestion: () => void;
  autoAdjustPreference: AutoAdjustPreference;
  onAutoAdjustPreferenceChange: (value: AutoAdjustPreference) => void;
}

const WizardStepContent: React.FC<WizardStepContentProps> = ({
  step,
  title,
  onTitleChange,
  categories,
  categoryId,
  categoryLabel,
  onCategoryChange,
  newCategory,
  onNewCategoryChange,
  onNewCategoryKeyDown,
  onCreateCategory,
  selectedSubject,
  notes,
  onNotesChange,
  reminderTime,
  timeOption,
  onTimeOptionChange,
  customTime,
  onCustomTimeChange,
  intervals,
  onIntervalsChange,
  selectedSubjectExamDate,
  examSuggestion,
  onApplySuggestion,
  autoAdjustPreference,
  onAutoAdjustPreferenceChange
}) => {
  const previewIcon = selectedSubject?.icon ?? "Sparkles";
  const previewColor = selectedSubject?.color ?? "#38bdf8";
  const fallbackLabel = categoryLabel || "General";
  const previewLabel = selectedSubject?.name ?? fallbackLabel;
  if (step === "basics") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="topic">Topic title</Label>
          <Input
            id="topic"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="What do you want to remember?"
            className="h-11 rounded-2xl border-white/10 bg-white/10"
          />
        </div>

        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={categoryId ?? undefined} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-white/10">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                    {category.label}
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="create">+ Create new</SelectItem>
            </SelectContent>
          </Select>
          {categoryId === "create" ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Input
                value={newCategory}
                onChange={(event) => onNewCategoryChange(event.target.value)}
                onKeyDown={onNewCategoryKeyDown}
                placeholder="New subject name"
                className="h-11 rounded-2xl border-white/10 bg-white/10"
              />
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="sm:w-auto"
                onClick={onCreateCategory}
                disabled={!newCategory.trim()}
              >
                Save
              </Button>
            </div>
          ) : null}
          <p className="text-xs text-zinc-400">
            Subjects help you group related topics and power the dashboard filters.
          </p>
        </div>
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Reminder
            <span title="Pick a reminder time to nudge you on days with scheduled reviews." className="text-accent">
              <Info className="h-3.5 w-3.5" />
            </span>
          </Label>
          <Select value={timeOption} onValueChange={onTimeOptionChange}>
            <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-white/10">
              <SelectValue placeholder="Select reminder time" />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_TIME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {timeOption === "custom" ? (
            <Input
              type="time"
              value={customTime}
              onChange={(event) => onCustomTimeChange(event.target.value)}
              className="mt-2 h-11 w-40 rounded-2xl border-white/10 bg-white/10"
            />
          ) : null}
          <p className="text-xs text-zinc-400">
            Reminders arrive at the chosen time. You can switch them off anytime.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            <p className="font-semibold text-white">Subject exam timeline</p>
            <p className="text-xs text-zinc-200">
              Set the exam date for this subject to optimize your review schedule. No reviews will be scheduled after the exam.
            </p>
            {selectedSubjectExamDate ? (
              <p className="text-xs text-emerald-200">
                No reviews will be scheduled after {formatFullDate(selectedSubjectExamDate)}.
              </p>
            ) : (
              <p className="text-xs text-zinc-400">
                No exam date set yet. You can update it from the Subjects page whenever you&rsquo;re ready.
              </p>
            )}
          </div>

          {examSuggestion ? (
            <div className="space-y-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
              <p className="font-semibold">
                {examSuggestion.daysUntilExam > 0
                  ? `Exam in ${examSuggestion.daysUntilExam} day${examSuggestion.daysUntilExam === 1 ? "" : "s"}.`
                  : "Exam date is today."}
              </p>
              <p className="text-accent/80">
                We recommend {examSuggestion.recommendedCount} intervals to stay on track. Apply the suggestion to distribute reviews evenly without crossing your exam date.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-accent/40 text-accent hover:bg-accent/10"
                onClick={onApplySuggestion}
              >
                Use suggested intervals
              </Button>
            </div>
          ) : null}



          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Intervals
              <span title="Intervals space your reviews. Longer gaps appear as you succeed." className="text-accent">
                <Info className="h-3.5 w-3.5" />
              </span>
            </Label>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <IntervalEditor value={intervals} onChange={onIntervalsChange} />
            </div>
            <p className="text-xs text-zinc-400">
              Adjust or add intervals to match your pace. We�ll keep them flexible so reviews never pile up.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Auto-adjust preference
              <span title="Decide how the schedule adapts when you review earlier than planned." className="text-accent">
                <Info className="h-3.5 w-3.5" />
              </span>
            </Label>
            <Select value={autoAdjustPreference} onValueChange={(value: AutoAdjustPreference) => onAutoAdjustPreferenceChange(value)}>
              <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-white/10 text-left">
                <SelectValue placeholder="Choose behaviour" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AUTO_ADJUST_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-400">
              You can change this later from the dashboard if you prefer a different level of automation.
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <p className="font-semibold">? Skipping today may cause too many reviews to pile up later.</p>
            <p className="text-amber-100/80">
              Use the �Skip today� action sparingly � we�ll rebalance the schedule, but you should still aim to review consistently.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Notes
            <span title="Add mnemonics or context to refresh your memory fast." className="text-accent">
              <Info className="h-3.5 w-3.5" />
            </span>
          </Label>
          <Textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Capture keywords, mnemonics, or highlights..."
            rows={6}
            className="min-h-[160px] rounded-2xl border-white/10 bg-white/10"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm text-zinc-300">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-base font-semibold text-white">Basics</h3>
        <p className="text-xs text-zinc-400">{title || "Untitled topic"}</p>
        <div className="mt-2 text-xs text-zinc-400">
          Subject: <span className="text-white">{categoryLabel || "General"}</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-base font-semibold text-white">Subject identity</h3>
          <p className="text-xs text-zinc-400">Topics inherit their look from the assigned subject.</p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${previewColor}22` }}
              aria-hidden="true"
            >
              <IconPreview name={previewIcon} className="h-5 w-5" />
            </span>
            <div className="text-xs text-zinc-400 space-y-1">
              <p>
                Subject: <span className="text-white">{previewLabel}</span>
              </p>
              <p>
                Icon: <span className="text-white">{previewIcon}</span>
              </p>
              <p>
                Colour: <span className="text-white">{previewColor}</span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Change identity from the Subjects page to update every topic in this subject instantly.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <h3 className="text-base font-semibold text-white">Schedule</h3>
          <p className="text-xs text-zinc-400">
            Reminder: <span className="text-white">{timeOption === "none" ? "None" : reminderTime ?? "Custom"}</span>
          </p>
          <p className="text-xs text-zinc-400">
            Intervals: <span className="text-white">{intervals.join(", ")} day{intervals.length === 1 ? "" : "s"}</span>
          </p>
          <p className="text-xs text-zinc-400">
            Auto-adjust: <span className="text-white">{AUTO_ADJUST_LABELS[autoAdjustPreference]}</span>
          </p>
          <p className="text-xs text-zinc-400">
            Exam date: <span className="text-white">{selectedSubjectExamDate ? formatFullDate(selectedSubjectExamDate) : "Not set"}</span>
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-base font-semibold text-white">Notes preview</h3>
        <p className="text-xs text-zinc-400">
          {notes.trim() || "Nothing yet � add a note in the previous step to make reviews richer."}
        </p>
      </div>
    </div>
  );
};

const WizardSteps = ({ steps, activeStep }: { steps: typeof wizardSteps; activeStep: StepId }) => {
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  return (
    <nav aria-label="Topic creation steps" className="flex items-center justify-between gap-3 rounded-3xl border border-white/5 bg-white/5 px-4 py-3">
      {steps.map((step, index) => {
        const isActive = step.id === activeStep;
        const isCompleted = index < activeIndex;
        return (
          <div key={step.id} className="flex flex-1 items-center gap-3 text-left">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                isCompleted
                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                  : isActive
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </span>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${isActive ? "text-white" : "text-zinc-400"}`}>
                {step.title}
              </p>
              <p className="text-[11px] text-zinc-500">{step.description}</p>
            </div>
          </div>
        );
      })}
    </nav>
  );
};




