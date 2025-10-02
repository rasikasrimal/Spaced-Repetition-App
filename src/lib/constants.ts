import { IntervalPreset } from "@/types/topic";

export const DEFAULT_INTERVALS: IntervalPreset[] = [
  { id: "d1", label: "1 day", days: 1 },
  { id: "d4", label: "4 days", days: 4 },
  { id: "d14", label: "14 days", days: 14 },
  { id: "d30", label: "30 days", days: 30 },
  { id: "d60", label: "60 days", days: 60 }
];

export const ICON_OPTIONS = [
  "BookOpen",
  "Brain",
  "Code",
  "FlaskConical",
  "Languages",
  "Microscope",
  "Palette",
  "Sparkles",
  "Target"
];

export const COLOR_OPTIONS = [
  "#38bdf8",
  "#22d3ee",
  "#f97316",
  "#f59e0b",
  "#a855f7",
  "#10b981",
  "#ef4444"
];
