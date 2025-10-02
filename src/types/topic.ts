export type IntervalPreset = {
  id: string;
  label: string;
  days: number;
};

export type Topic = {
  id: string;
  title: string;
  notes: string;
  categoryId: string | null;
  categoryLabel: string;
  icon: string;
  color: string;
  reminderTime: string | null;
  intervals: number[];
  currentIntervalIndex: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  createdAt: string;
};

export type Category = {
  id: string;
  label: string;
  color: string;
  icon: string;
};
