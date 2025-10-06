export const DEFAULT_INTERVALS = [1, 4, 14, 30, 60];

export type IconOption = {
  name: string;
  label: string;
  category:
    | "Science"
    | "Math"
    | "Language"
    | "History"
    | "Technology"
    | "General";
  keywords: string[];
};

export const ICON_LIBRARY: IconOption[] = [
  { name: "FlaskConical", label: "Flask", category: "Science", keywords: ["science", "chemistry", "lab"] },
  { name: "Beaker", label: "Beaker", category: "Science", keywords: ["science", "experiment", "liquid"] },
  { name: "Atom", label: "Atom", category: "Science", keywords: ["science", "physics", "molecule"] },
  { name: "Calculator", label: "Calculator", category: "Math", keywords: ["math", "arithmetic", "numbers"] },
  { name: "Sigma", label: "Sigma", category: "Math", keywords: ["math", "summation", "algebra"] },
  { name: "FunctionSquare", label: "Function", category: "Math", keywords: ["math", "function", "graph"] },
  { name: "Ruler", label: "Ruler", category: "Math", keywords: ["math", "measure", "geometry"] },
  { name: "BookOpen", label: "Book", category: "Language", keywords: ["language", "reading", "literature"] },
  { name: "PenLine", label: "Pen", category: "Language", keywords: ["language", "writing", "pen"] },
  { name: "Globe", label: "Globe", category: "Language", keywords: ["language", "world", "culture"] },
  { name: "Landmark", label: "Landmark", category: "History", keywords: ["history", "monument", "heritage"] },
  { name: "ScrollText", label: "Scroll", category: "History", keywords: ["history", "document", "chronicle"] },
  { name: "Clock", label: "Clock", category: "History", keywords: ["history", "time", "timeline"] },
  { name: "Cpu", label: "CPU", category: "Technology", keywords: ["technology", "hardware", "processor"] },
  { name: "Monitor", label: "Monitor", category: "Technology", keywords: ["technology", "display", "screen"] },
  { name: "Code", label: "Code", category: "Technology", keywords: ["technology", "software", "programming"] },
  { name: "Lightbulb", label: "Lightbulb", category: "General", keywords: ["general", "idea", "insight"] },
  { name: "Sparkles", label: "Sparkles", category: "General", keywords: ["general", "celebration", "highlight"] },
  { name: "Star", label: "Star", category: "General", keywords: ["general", "favorite", "important"] },
  { name: "Brain", label: "Brain", category: "General", keywords: ["general", "thinking", "study"] }
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
