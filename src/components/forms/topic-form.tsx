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
import { DEFAULT_INTERVALS } from "@/lib/constants";
import { toast } from "sonner";

const defaultIntervals = DEFAULT_INTERVALS.map((preset) => preset.days);

export const TopicForm: React.FC = () => {
  const { addTopic, categories, addCategory } = useTopicStore();
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>("general");
  const [categoryLabel, setCategoryLabel] = React.useState("General");
  const [newCategory, setNewCategory] = React.useState("");
  const [icon, setIcon] = React.useState("Sparkles");
  const [color, setColor] = React.useState("#38bdf8");
  const [reminderTime, setReminderTime] = React.useState<string | null>(null);
  const [intervals, setIntervals] = React.useState<number[]>(defaultIntervals);

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setCategoryId("general");
    setCategoryLabel("General");
    setIcon("Sparkles");
    setColor("#38bdf8");
    setReminderTime(null);
    setIntervals(defaultIntervals);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Topic title is required");
      return;
    }

    let resolvedCategoryId = categoryId;
    let resolvedCategoryLabel = categoryLabel;

    if (categoryId === "create") {
      if (!newCategory.trim()) {
        toast.error("Name your new category first");
        return;
      }
      const created = addCategory({ label: newCategory.trim(), color, icon });
      resolvedCategoryId = created.id;
      resolvedCategoryLabel = created.label;
      setCategoryId(created.id);
      setCategoryLabel(created.label);
      setNewCategory("");
    }

    addTopic({
      title,
      notes,
      categoryId: resolvedCategoryId,
      categoryLabel: resolvedCategoryLabel,
      icon,
      color,
      reminderTime,
      intervals: [...intervals].sort((a, b) => a - b)
    });
    toast.success("Topic saved");
    resetForm();
  };

  const handleCreateCategory = () => {
    if (!newCategory.trim()) return;
    const category = addCategory({ label: newCategory.trim(), color, icon });
    setCategoryId(category.id);
    setCategoryLabel(category.label);
    setNewCategory("");
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
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
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
                placeholder="New category name"
              />
              <Button type="button" onClick={handleCreateCategory}>
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
          <Label htmlFor="reminder">Reminder</Label>
          <Input
            id="reminder"
            type="time"
            value={reminderTime ?? ""}
            onChange={(event) => setReminderTime(event.target.value || null)}
          />
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
          <Button type="submit" className="px-6">
            Save Topic
          </Button>
        </div>
      </div>
    </form>
  );
};
