export const DEFAULT_INTERVALS = [1, 4, 14, 30, 60];

export type IconOption = {
  /**
   * Lucide icon component name.
   */
  name: string;
  /**
   * Human readable subject that the icon represents.
   */
  label: string;
  /**
   * Keywords that make the icon discoverable via search.
   */
  keywords: string[];
};

export const ICON_LIBRARY: IconOption[] = [
  { name: "Beaker", label: "Chemistry", keywords: ["chemistry", "science", "lab", "experiment"] },
  { name: "Atom", label: "Physics", keywords: ["physics", "science", "atom", "molecule"] },
  { name: "SquareFunction", label: "Mathematics", keywords: ["math", "function", "algebra", "formula"] },
  { name: "Dna", label: "Biology", keywords: ["biology", "science", "genetics", "cells"] },
  { name: "Cpu", label: "Computer Science", keywords: ["computer", "technology", "coding", "hardware"] },
  { name: "BookOpen", label: "Literature", keywords: ["literature", "reading", "books", "stories"] },
  { name: "Type", label: "Language", keywords: ["language", "linguistics", "typing", "letters"] },
  { name: "Palette", label: "Art", keywords: ["art", "design", "painting", "creative"] },
  { name: "Music3", label: "Music", keywords: ["music", "sound", "melody", "rhythm"] },
  { name: "Globe2", label: "Geography", keywords: ["geography", "maps", "earth", "world"] },
  { name: "Landmark", label: "History", keywords: ["history", "monument", "heritage", "culture"] },
  { name: "PenTool", label: "Writing", keywords: ["writing", "creative", "pen", "drafting"] },
  { name: "Microscope", label: "Science", keywords: ["science", "research", "analysis", "lab"] },
  { name: "Lightbulb", label: "Ideas", keywords: ["ideas", "innovation", "insight", "brainstorm"] },
  { name: "Sparkles", label: "General", keywords: ["general", "sparkles", "highlight", "default"] },
  { name: "Star", label: "Favorites", keywords: ["favorite", "star", "important", "priority"] }
];

export type ColorPreset = {
  name: string;
  value: string;
};

export const COLOR_PRESETS: ColorPreset[] = [
  { name: "Ocean Blue", value: "hsl(221, 83%, 53%)" },
  { name: "Emerald", value: "hsl(152, 67%, 45%)" },
  { name: "Sunset", value: "hsl(20, 90%, 55%)" },
  { name: "Amber", value: "hsl(45, 95%, 58%)" },
  { name: "Violet", value: "hsl(268, 75%, 60%)" },
  { name: "Coral", value: "hsl(350, 85%, 65%)" },
  { name: "Sky", value: "hsl(190, 90%, 55%)" },
  { name: "Forest", value: "hsl(130, 45%, 38%)" },
  { name: "Charcoal", value: "hsl(0, 0%, 20%)" },
  { name: "Slate", value: "hsl(210, 10%, 45%)" }
];

export const REMINDER_TIME_OPTIONS = [
  { value: "06:00", label: "6:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM (Default)" },
  { value: "12:00", label: "12:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "custom", label: "Custom time (set below)" },
  { value: "none", label: "No reminder" }
] as const;

export const REVISE_LOCKED_MESSAGE = "You’ve already revised this today. Available again after midnight.";
