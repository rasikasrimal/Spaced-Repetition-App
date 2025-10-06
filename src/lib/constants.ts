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
    | "Misc";
  keywords: string[];
};

export const ICON_LIBRARY: IconOption[] = [
  { name: "FlaskConical", label: "Flask", category: "Science", keywords: ["science", "chemistry", "lab"] },
  { name: "Atom", label: "Atom", category: "Science", keywords: ["science", "physics", "molecule"] },
  { name: "Beaker", label: "Beaker", category: "Science", keywords: ["science", "liquid", "experiment"] },
  { name: "Microscope", label: "Microscope", category: "Science", keywords: ["science", "biology", "research"] },
  { name: "Dna", label: "DNA", category: "Science", keywords: ["science", "genetics", "biology"] },
  { name: "BookOpen", label: "Book", category: "Language", keywords: ["language", "reading", "literature"] },
  { name: "Feather", label: "Feather", category: "Language", keywords: ["writing", "pen", "language"] },
  { name: "Languages", label: "Languages", category: "Language", keywords: ["language", "translate", "globe"] },
  { name: "PenLine", label: "Pen", category: "Language", keywords: ["writing", "essay", "language"] },
  { name: "Globe", label: "Globe", category: "Language", keywords: ["language", "geography", "travel"] },
  { name: "Sigma", label: "Sigma", category: "Math", keywords: ["math", "summation", "algebra"] },
  { name: "Calculator", label: "Calculator", category: "Math", keywords: ["math", "arithmetic", "numbers"] },
  { name: "Pi", label: "Pi", category: "Math", keywords: ["math", "geometry", "circle"] },
  { name: "PlusMinus", label: "Plus Minus", category: "Math", keywords: ["math", "algebra", "equations"] },
  { name: "Grid3x3", label: "Grid", category: "Math", keywords: ["math", "matrix", "geometry"] },
  { name: "Landmark", label: "Landmark", category: "History", keywords: ["history", "monument", "architecture"] },
  { name: "Scroll", label: "Scroll", category: "History", keywords: ["history", "document", "ancient"] },
  { name: "Library", label: "Library", category: "History", keywords: ["history", "archives", "study"] },
  { name: "Hourglass", label: "Hourglass", category: "History", keywords: ["history", "time", "ancient"] },
  { name: "CalendarClock", label: "Clock", category: "History", keywords: ["history", "calendar", "timeline"] },
  { name: "Cpu", label: "CPU", category: "Technology", keywords: ["technology", "computer", "hardware"] },
  { name: "Code", label: "Code", category: "Technology", keywords: ["technology", "software", "programming"] },
  { name: "Monitor", label: "Monitor", category: "Technology", keywords: ["technology", "screen", "display"] },
  { name: "ServerCog", label: "Server", category: "Technology", keywords: ["technology", "infrastructure", "ops"] },
  { name: "CircuitBoard", label: "Circuit", category: "Technology", keywords: ["technology", "electronics", "hardware"] },
  { name: "Sparkles", label: "Sparkles", category: "Misc", keywords: ["default", "magic", "celebration"] },
  { name: "Star", label: "Star", category: "Misc", keywords: ["misc", "favorite", "important"] },
  { name: "Lightbulb", label: "Lightbulb", category: "Misc", keywords: ["idea", "insight", "misc"] },
  { name: "Rocket", label: "Rocket", category: "Misc", keywords: ["launch", "goal", "misc"] },
  { name: "Compass", label: "Compass", category: "Misc", keywords: ["navigation", "direction", "misc"] }
];

export type ColorPreset = {
  name: string;
  value: string;
};

export const COLOR_PRESETS: ColorPreset[] = [
  { name: "Ocean Blue", value: "hsl(221, 83%, 53%)" },
  { name: "Emerald Green", value: "hsl(152, 67%, 45%)" },
  { name: "Sunset Orange", value: "hsl(20, 90%, 55%)" },
  { name: "Golden Yellow", value: "hsl(45, 95%, 58%)" },
  { name: "Violet Dream", value: "hsl(268, 75%, 60%)" },
  { name: "Coral Pink", value: "hsl(350, 85%, 65%)" },
  { name: "Sky Cyan", value: "hsl(190, 90%, 55%)" },
  { name: "Slate Gray", value: "hsl(210, 10%, 45%)" },
  { name: "Forest Green", value: "hsl(130, 45%, 38%)" },
  { name: "Charcoal", value: "hsl(0, 0%, 20%)" },
  { name: "Lavender Fog", value: "hsl(270, 45%, 72%)" },
  { name: "Midnight Indigo", value: "hsl(231, 53%, 32%)" }
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
