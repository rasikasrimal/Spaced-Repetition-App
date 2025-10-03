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

const getZonedFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

const getZonedParts = (value: string | Date, timeZone: string) => {
  const date = ensureDate(value);
  const formatter = getZonedFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
    hour: lookup("hour"),
    minute: lookup("minute"),
    second: lookup("second"),
    millisecond: date.getMilliseconds()
  };
};

const normalizeToStartOfDay = (value: string | Date) => {
  const date = ensureDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const startOfDayInTimeZone = (value: string | Date, timeZone: string) => {
  const { year, month, day } = getZonedParts(value, timeZone);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
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

export const getDayKeyInTimeZone = (value: string | Date, timeZone: string) => {
  const zoned = startOfDayInTimeZone(value, timeZone);
  const month = String(zoned.getUTCMonth() + 1).padStart(2, "0");
  const day = String(zoned.getUTCDate()).padStart(2, "0");
  return `${zoned.getUTCFullYear()}-${month}-${day}`;
};

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

export const nowInTimeZone = (timeZone: string) => {
  const { year, month, day, hour, minute, second, millisecond } = getZonedParts(new Date(), timeZone);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
};

export const nextStartOfDayInTimeZone = (timeZone: string, from?: string | Date) => {
  const reference = from ? ensureDate(from) : new Date();
  const start = startOfDayInTimeZone(reference, timeZone);
  const next = new Date(start.getTime());
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
};

export const formatInTimeZone = (
  value: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
) => {
  const date = ensureDate(value);
  return new Intl.DateTimeFormat("en", { timeZone, ...options }).format(date);
};

export const isPast = (value: string) => ensureDate(value).getTime() < Date.now();

export const addDays = (value: string | Date, amount: number) => {
  const date = ensureDate(value);
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next.toISOString();
};


export const startOfMonthInTimeZone = (value: string | Date, timeZone: string) => {
  const { year, month } = getZonedParts(value, timeZone);
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
};

export const addMonthsInTimeZone = (value: string | Date, amount: number, timeZone: string) => {
  const { year, month } = getZonedParts(value, timeZone);
  const targetMonthIndex = month - 1 + amount;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  return new Date(Date.UTC(targetYear, normalizedMonth, 1, 0, 0, 0, 0));
};

export const endOfMonthInTimeZone = (value: string | Date, timeZone: string) => {
  const startOfNextMonth = addMonthsInTimeZone(value, 1, timeZone);
  const previousDay = new Date(startOfNextMonth.getTime() - DAY_IN_MS);
  return new Date(Date.UTC(previousDay.getUTCFullYear(), previousDay.getUTCMonth(), previousDay.getUTCDate(), 0, 0, 0, 0));
};

export const formatMonthYearInTimeZone = (value: string | Date, timeZone: string) => {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    month: "long",
    year: "numeric"
  }).format(ensureDate(value));
};
