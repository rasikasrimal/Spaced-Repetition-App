"use client";

import * as React from "react";
import { useTopicStore } from "@/stores/topics";
import { Button } from "@/components/ui/button";
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
import { ColorPicker } from "@/components/forms/color-picker";
import { IconPicker } from "@/components/forms/icon-picker";
import { IntervalEditor } from "@/components/forms/interval-editor";
import { DEFAULT_INTERVALS, REMINDER_TIME_OPTIONS } from "@/lib/constants";
import { toast } from "sonner";

const defaultIntervals = DEFAULT_INTERVALS.map((preset) => preset.days);

type TopicFormMode = "create" | "edit";

interface TopicFormProps {
  topicId?: string | null;
  onSubmitComplete?: (mode: TopicFormMode) => void;
}

const isValidTimeValue = (value: string) => /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(value);

export const TopicForm: React.FC<TopicFormProps> = ({ topicId = null, onSubmitComplete }) => {
  const { addTopic, updateTopic, addCategory, categories, topics, initialize, hydrated } =
    useTopicStore((state) => ({
      addTopic: state.addTopic,
      updateTopic: state.updateTopic,
      addCategory: state.addCategory,
      categories: state.categories,
      topics: state.topics,
      initialize: state.initialize,
      hydrated: state.hydrated
    }));

  React.useEffect(() => {
    if (!hydrated) {
      void initialize();
    }
  }, [hydrated, initialize]);

  const topic = React.useMemo(
    () => (topicId ? topics.find((item) => item.id === topicId) ?? null : null),
    [topics, topicId]
  );

  const isEditing = Boolean(topicId && topic);
  const lastLoadedTopicRef = React.useRef<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>("general");
  const [categoryLabel, setCategoryLabel] = React.useState("General");
  const [newCategory, setNewCategory] = React.useState("");
  const [icon, setIcon] = React.useState("Sparkles");
  const [color, setColor] = React.useState("#38bdf8");
  const [reminderTime, setReminderTime] = React.useState<string | null>("09:00");
  const [timeOption, setTimeOption] = React.useState<string>("09:00");
  const [customTime, setCustomTime] = React.useState("09:00");
  const [intervals, setIntervals] = React.useState<number[]>(() => [...defaultIntervals]);
  const [saving, setSaving] = React.useState(false);

  const resetToDefaults = React.useCallback(() => {
    setTitle("");
    setNotes("");
    setCategoryId("general");
    setCategoryLabel("General");
    setIcon("Sparkles");
    setColor("#38bdf8");
    setReminderTime("09:00");
    setTimeOption("09:00");
    setCustomTime("09:00");
    setIntervals([...defaultIntervals]);
    setNewCategory("");
  }, []);

  React.useEffect(() => {
    if (!topicId) {
      resetToDefaults();
      lastLoadedTopicRef.current = null;
    }
  }, [topicId, resetToDefaults]);

  React.useEffect(() => {
    if (!isEditing || !topic) return;
    if (lastLoadedTopicRef.current === topic.id) return;

    lastLoadedTopicRef.current = topic.id;

    setTitle(topic.title);
    setNotes(topic.notes);

    const matchedCategory = topic.categoryId
      ? categories.find((item) => item.id === topic.categoryId)
      : topic.categoryLabel
        ? categories.find(
            (item) => item.label.toLowerCase() === topic.categoryLabel?.toLowerCase()
          )
        : undefined;

    const resolvedCategoryId = matchedCategory?.id ?? topic.categoryId ?? "general";
    const resolvedCategoryLabel = matchedCategory?.label ?? topic.categoryLabel ?? "General";

    setCategoryId(resolvedCategoryId);
    setCategoryLabel(resolvedCategoryLabel);
    setIcon(topic.icon);
    setColor(topic.color);
    setIntervals([...topic.intervals]);
    setNewCategory("");

    if (topic.reminderTime) {
      const presetMatch = REMINDER_TIME_OPTIONS.find(
        (option) => option.value === topic.reminderTime
      );
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
  }, [isEditing, topic, categories]);

  const handleCreateCategory = async () => {
    const label = newCategory.trim();
    if (!label) return;

    const existing = categories.find(
      (item) => item.label.toLowerCase() === label.toLowerCase()
    );

    if (existing) {
      setCategoryId(existing.id);
      setCategoryLabel(existing.label);
      setNewCategory("");
      return;
    }

    const category = await addCategory({ label, color, icon });
    setCategoryId(category.id);
    setCategoryLabel(category.label);
    setNewCategory("");
  };

  const handleNewCategoryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleCreateCategory();
    }
  };

  const handleTimeOptionChange = (value: string) => {
    if (value === "none") {
      setTimeOption(value);
      setReminderTime(null);
      return;
    }

    if (value === "custom") {
      setTimeOption(value);
      const nextCustom = isValidTimeValue(customTime) ? customTime : "09:00";
      setCustomTime(nextCustom);
      setReminderTime(nextCustom);
      return;
    }

    setTimeOption(value);
    setReminderTime(value);
    setCustomTime(value);
  };

  const handleCustomTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setCustomTime(next);
    if (isValidTimeValue(next)) {
      setReminderTime(next);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (!title.trim()) {
      toast.error("Topic title is required");
      return;
    }

    let resolvedCategoryId = categoryId;

    if (categoryId === "create") {
      const label = newCategory.trim();
      if (!label) {
        toast.error("Name your new category first");
        return;
      }

      const existing = categories.find(
        (item) => item.label.toLowerCase() === label.toLowerCase()
      );

      if (existing) {
        resolvedCategoryId = existing.id;
        setCategoryId(existing.id);
        setCategoryLabel(existing.label);
        setNewCategory("");
      } else {
        const created = await addCategory({ label, color, icon });
        resolvedCategoryId = created.id;
        setCategoryId(created.id);
        setCategoryLabel(created.label);
        setNewCategory("");
      }
    }

    let nextReminderTime: string | null;
    if (timeOption === "none") {
      nextReminderTime = null;
    } else if (timeOption === "custom") {
      if (!isValidTimeValue(customTime)) {
        toast.error("Enter a valid custom reminder time");
        return;
      }
      nextReminderTime = customTime;
    } else {
      nextReminderTime = timeOption;
    }

    const payload = {
      title,
      notes,
      categoryId: resolvedCategoryId,
      icon,
      color,
      reminderTime: nextReminderTime,
      intervals: [...intervals].sort((a, b) => a - b)
    };

    try {
      setSaving(true);
      if (isEditing && topic) {
        await updateTopic(topic.id, payload);
        toast.success("Topic updated");
        onSubmitComplete?.("edit");
        return;
      }

      await addTopic(payload);
      toast.success("Topic saved");
      resetToDefaults();
      onSubmitComplete?.("create");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while saving the topic");
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === "create") {
      setCategoryId("create");
      setCategoryLabel("");
      return;
    }
    setCategoryId(value);
    const selected = categories.find((item) => item.id === value);
    setCategoryLabel(selected?.label ?? "");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-lg backdrop-blur"
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What do you want to remember?"
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId ?? undefined} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: category.color ?? color }}
                    />
                    {category.label}
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="create">+ Create new</SelectItem>
            </SelectContent>
          </Select>
          {categoryId === "create" ? (
            <div className="mt-3 flex gap-2">
              <Input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                onKeyDown={handleNewCategoryKeyDown}
                placeholder="New category name"
              />
              <Button
                type="button"
                onClick={() => void handleCreateCategory()}
                disabled={!newCategory.trim()}
              >
                Save
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Reminder</Label>
          <Select value={timeOption} onValueChange={handleTimeOptionChange}>
            <SelectTrigger>
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
              onChange={handleCustomTimeChange}
              className="w-full"
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Capture keywords, mnemonics, or highlights..."
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <Label>Intervals</Label>
          <IntervalEditor value={intervals} onChange={setIntervals} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="px-6" disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Update Topic" : "Save Topic"}
          </Button>
        </div>
      </div>
    </form>
  );
};
