const DAY_IN_MS = 24 * 60 * 60 * 1000;
const HOUR_IN_MS = 60 * 60 * 1000;

const dayMonthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric"
});

const weekdayFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric"
});

const fullDateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric"
});

const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto"
});

const formatWithFormatter = (value: string | Date, formatter: Intl.DateTimeFormat) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatter.format(date);
};

const ensureDate = (value: string | Date) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value provided");
  }
  return date;
};

const normalizeToStartOfDay = (value: string | Date) => {
  const date = ensureDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const toDayKey = (value: string | Date) => {
  const normalized = normalizeToStartOfDay(value);
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${normalized.getFullYear()}-${month}-${day}`;
};

export const formatDate = (value: string) => formatWithFormatter(value, dayMonthFormatter);

export const formatDateWithWeekday = (value: string) => formatWithFormatter(value, weekdayFormatter);

export const formatFullDate = (value: string) => formatWithFormatter(value, fullDateFormatter);

export const formatRelativeToNow = (value: string) => {
  const date = ensureDate(value);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const dayDiff = Math.round(diffMs / DAY_IN_MS);

  if (Math.abs(dayDiff) >= 1) {
    return relativeFormatter.format(dayDiff, "day");
  }

  const hourDiff = Math.round(diffMs / HOUR_IN_MS);
  if (Math.abs(hourDiff) >= 1) {
    return relativeFormatter.format(hourDiff, "hour");
  }

  const minuteDiff = Math.round(diffMs / (60 * 1000));
  return relativeFormatter.format(minuteDiff, "minute");
};

export const isDueToday = (value: string) => {
  const today = normalizeToStartOfDay(new Date());
  const date = normalizeToStartOfDay(value);
  return date.getTime() <= today.getTime();
};

export const isSameDay = (first: string | Date, second: string | Date) => toDayKey(first) === toDayKey(second);

export const isToday = (value: string | Date) => isSameDay(value, new Date());

export const getDayKey = (value: string | Date) => toDayKey(value);

export const daysBetween = (start: string | Date, end: string | Date) => {
  const startDate = normalizeToStartOfDay(start);
  const endDate = normalizeToStartOfDay(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / DAY_IN_MS);
};

export const formatTime = (value: string | null) => {
  if (!value) return "No reminder";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours));
  date.setMinutes(Number(minutes));
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};

export const startOfToday = () => normalizeToStartOfDay(new Date());

export const isPast = (value: string) => ensureDate(value).getTime() < Date.now();

export const addDays = (value: string | Date, amount: number) => {
  const date = ensureDate(value);
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next.toISOString();
};


