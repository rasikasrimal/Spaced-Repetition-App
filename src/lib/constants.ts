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
  {
    name: "Beaker",
    label: "Chemistry",
    keywords: ["chemistry", "science", "lab", "beaker", "experiment"]
  },
  {
    name: "Atom",
    label: "Physics",
    keywords: ["physics", "science", "atom", "molecule", "energy"]
  },
  {
    name: "FunctionSquare",
    label: "Mathematics",
    keywords: ["math", "algebra", "formula", "calculus", "function"]
  },
  {
    name: "Dna",
    label: "Biology",
    keywords: ["biology", "science", "genetics", "cells", "dna"]
  },
  {
    name: "Cpu",
    label: "Computer Science",
    keywords: ["computer", "technology", "coding", "programming", "hardware"]
  },
  {
    name: "BookOpen",
    label: "Literature",
    keywords: ["literature", "reading", "books", "english", "stories"]
  },
  {
    name: "Type",
    label: "Language",
    keywords: ["language", "letters", "linguistics", "typing", "writing"]
  },
  {
    name: "Palette",
    label: "Art",
    keywords: ["art", "design", "painting", "creative", "color"]
  },
  {
    name: "Music3",
    label: "Music",
    keywords: ["music", "sound", "rhythm", "melody", "notes"]
  },
  {
    name: "Globe2",
    label: "Geography",
    keywords: ["geography", "earth", "maps", "world", "travel"]
  },
  {
    name: "Landmark",
    label: "History",
    keywords: ["history", "culture", "monument", "civilization", "heritage"]
  },
  {
    name: "PenTool",
    label: "Writing",
    keywords: ["writing", "design", "drafting", "illustration", "creative"]
  },
  {
    name: "Microscope",
    label: "Science",
    keywords: ["science", "research", "biology", "analysis", "microscope"]
  },
  {
    name: "Lightbulb",
    label: "Ideas",
    keywords: ["ideas", "creativity", "innovation", "inspiration", "light"]
  }
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
