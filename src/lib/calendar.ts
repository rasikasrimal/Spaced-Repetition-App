import { Subject, Topic } from "@/types/topic";
import { FALLBACK_SUBJECT_COLOR } from "@/lib/colors";
import {
  addMonthsInTimeZone,
  formatInTimeZone,
  getDayKeyInTimeZone,
  startOfMonthInTimeZone
} from "@/lib/date";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const NO_SUBJECT_ID = "__none__";

type SubjectInfo = {
  id: string;
  name: string;
  color: string;
  icon: string;
  examDate: string | null;
};

export type CalendarSubjectAggregate = SubjectInfo & {
  count: number;
};

export type CalendarDaySubjectEntry = {
  subject: SubjectInfo;
  topics: Topic[];
  count: number;
};

export type CalendarDayData = {
  date: Date;
  dayKey: string;
  dayNumberLabel: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  subjects: CalendarDaySubjectEntry[];
  overflowSubjects: CalendarDaySubjectEntry[];
  examSubjects: SubjectInfo[];
  hasExam: boolean;
  hasOverdueBacklog: boolean;
  totalTopics: number;
};

type SubjectEntryMap = Map<string, CalendarDaySubjectEntry>;
type DaySubjectMap = Map<string, SubjectEntryMap>;

type BuildCalendarMonthParams = {
  topics: Topic[];
  subjects: Subject[];
  timeZone: string;
  monthDate: Date;
  selectedSubjectIds: Set<string> | null;
  todayKey: string;
  weekStartsOn?: 0 | 1;
};

export type CalendarMonthData = {
  weeks: CalendarDayData[][];
  days: CalendarDayData[];
  subjectOptions: CalendarSubjectAggregate[];
  hasVisibleContent: boolean;
  totalVisibleTopics: number;
  gridStart: Date;
  gridEnd: Date;
  overdueCount: number;
};

const normalizeWeekdayIndex = (value: string) => {
  const index = WEEKDAY_NAMES.findIndex((name) => name.toLowerCase() === value.toLowerCase());
  return index >= 0 ? index : 0;
};

const deriveFallbackSubject = (subjects: Subject[]): SubjectInfo => {
  if (subjects.length === 0) {
    return {
      id: NO_SUBJECT_ID,
      name: "General",
      color: FALLBACK_SUBJECT_COLOR,
      icon: "Sparkles",
      examDate: null
    };
  }

  const defaultSubject =
    subjects.find((subject) => subject.id === "subject-general") ?? subjects[0];

  return {
    id: defaultSubject.id,
    name: defaultSubject.name,
    color: defaultSubject.color,
    icon: defaultSubject.icon,
    examDate: defaultSubject.examDate ?? null
  };
};

export function buildCalendarMonthData({
  topics,
  subjects,
  timeZone,
  monthDate,
  selectedSubjectIds,
  todayKey,
  weekStartsOn = 0
}: BuildCalendarMonthParams): CalendarMonthData {
  const subjectInfoById = new Map<string, SubjectInfo>();

  for (const subject of subjects) {
    subjectInfoById.set(subject.id, {
      id: subject.id,
      name: subject.name,
      color: subject.color,
      icon: subject.icon,
      examDate: subject.examDate ?? null
    });
  }

  const fallbackSubject = deriveFallbackSubject(subjects);
  if (!subjectInfoById.has(fallbackSubject.id)) {
    subjectInfoById.set(fallbackSubject.id, fallbackSubject);
  }

  const resolveSubjectInfo = (topic: Topic): SubjectInfo => {
    if (topic.subjectId && subjectInfoById.has(topic.subjectId)) {
      return subjectInfoById.get(topic.subjectId)!;
    }

    if (topic.subjectId) {
      const info: SubjectInfo = {
        id: topic.subjectId,
        name: topic.subjectLabel || fallbackSubject.name,
        color: fallbackSubject.color,
        icon: fallbackSubject.icon,
        examDate: null
      };
      subjectInfoById.set(info.id, info);
      return info;
    }

    if (!subjectInfoById.has(fallbackSubject.id)) {
      subjectInfoById.set(fallbackSubject.id, fallbackSubject);
    }
    return subjectInfoById.get(fallbackSubject.id)!;
  };

  const isSubjectSelected = (id: string) => selectedSubjectIds === null || selectedSubjectIds.has(id);

  const daySubjectMap: DaySubjectMap = new Map();
  let filteredOverdueCount = 0;

  for (const topic of topics) {
    const subjectInfo = resolveSubjectInfo(topic);
    const dayKey = getDayKeyInTimeZone(topic.nextReviewDate, timeZone);

    if (dayKey < todayKey && isSubjectSelected(subjectInfo.id)) {
      filteredOverdueCount += 1;
    }

    let subjectMap = daySubjectMap.get(dayKey);
    if (!subjectMap) {
      subjectMap = new Map();
      daySubjectMap.set(dayKey, subjectMap);
    }

    let entry = subjectMap.get(subjectInfo.id);
    if (!entry) {
      entry = {
        subject: subjectInfo,
        topics: [],
        count: 0
      };
      subjectMap.set(subjectInfo.id, entry);
    }

    entry.topics.push(topic);
    entry.count += 1;
  }

  const monthStart = startOfMonthInTimeZone(monthDate, timeZone);
  const monthStartWeekdayName = formatInTimeZone(monthStart, timeZone, { weekday: "long" });
  const monthStartWeekday = normalizeWeekdayIndex(monthStartWeekdayName);
  const startOffset = (monthStartWeekday - weekStartsOn + 7) % 7;
  const referenceMonth = Number(formatInTimeZone(monthStart, timeZone, { month: "numeric" }));
  const referenceYear = Number(formatInTimeZone(monthStart, timeZone, { year: "numeric" }));

  const gridStart = new Date(monthStart.getTime() - startOffset * DAY_IN_MS);
  const monthEndExclusive = addMonthsInTimeZone(monthStart, 1, timeZone);

  const examMap = new Map<string, SubjectInfo[]>();
  for (const subject of subjects) {
    if (!subject.examDate) continue;
    const subjectInfo = subjectInfoById.get(subject.id);
    if (!subjectInfo) continue;
    const examKey = getDayKeyInTimeZone(subject.examDate, timeZone);
    const existing = examMap.get(examKey) ?? [];
    existing.push(subjectInfo);
    examMap.set(examKey, existing);
  }

  const days: CalendarDayData[] = [];
  const subjectsInPeriod = new Set<string>();
  let totalVisibleTopics = 0;

  for (let cursor = new Date(gridStart.getTime()); cursor < monthEndExclusive || days.length % 7 !== 0; ) {
    const dayDate = new Date(cursor.getTime());
    const dayKey = getDayKeyInTimeZone(dayDate, timeZone);
    const subjectMap = daySubjectMap.get(dayKey);
    const subjectEntries = subjectMap ? Array.from(subjectMap.values()) : [];

    for (const entry of subjectEntries) {
      subjectsInPeriod.add(entry.subject.id);
    }

    const examEntries = examMap.get(dayKey) ?? [];
    for (const entry of examEntries) {
      subjectsInPeriod.add(entry.id);
    }

    const filteredSubjects = subjectEntries
      .filter((entry) => isSubjectSelected(entry.subject.id))
      .sort((a, b) => a.subject.name.localeCompare(b.subject.name, "en", { sensitivity: "base" }));

    const visibleSubjects = filteredSubjects.slice(0, 5);
    const overflowSubjects = filteredSubjects.slice(5);

    const filteredExamSubjects = examEntries
      .filter((entry) => isSubjectSelected(entry.id))
      .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

    const dayMonth = Number(formatInTimeZone(dayDate, timeZone, { month: "numeric" }));
    const dayYear = Number(formatInTimeZone(dayDate, timeZone, { year: "numeric" }));
    const isCurrentMonth = dayMonth === referenceMonth && dayYear === referenceYear;
    const dayNumberLabel = formatInTimeZone(dayDate, timeZone, { day: "numeric" });
    const isToday = dayKey === todayKey;
    const isPast = dayKey < todayKey;

    const dayVisibleTopics = filteredSubjects.reduce((sum, item) => sum + item.count, 0);
    totalVisibleTopics += dayVisibleTopics;

    days.push({
      date: dayDate,
      dayKey,
      dayNumberLabel,
      isCurrentMonth,
      isToday,
      isPast,
      subjects: visibleSubjects,
      overflowSubjects,
      examSubjects: filteredExamSubjects,
      hasExam: filteredExamSubjects.length > 0,
      hasOverdueBacklog: isToday && filteredOverdueCount > 0,
      totalTopics: dayVisibleTopics
    });

    cursor = new Date(cursor.getTime() + DAY_IN_MS);
  }

  const weeks: CalendarDayData[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  const subjectCountMap = new Map<string, number>();
  for (const day of days) {
    const subjectMap = daySubjectMap.get(day.dayKey);
    if (!subjectMap) continue;
    for (const entry of subjectMap.values()) {
      if (!subjectsInPeriod.has(entry.subject.id)) continue;
      subjectCountMap.set(entry.subject.id, (subjectCountMap.get(entry.subject.id) ?? 0) + entry.count);
    }
  }

  const subjectOptions: CalendarSubjectAggregate[] = Array.from(subjectsInPeriod)
    .map((id) => {
      const info = subjectInfoById.get(id);
      if (!info) return null;
      return {
        ...info,
        count: subjectCountMap.get(id) ?? 0
      };
    })
    .filter((value): value is CalendarSubjectAggregate => value !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const hasVisibleContent = days.some(
    (day) => day.subjects.length > 0 || day.overflowSubjects.length > 0 || day.examSubjects.length > 0
  );

  const gridEnd = new Date(days[days.length - 1]?.date ?? monthStart);

  return {
    weeks,
    days,
    subjectOptions,
    hasVisibleContent,
    totalVisibleTopics,
    gridStart,
    gridEnd,
    overdueCount: filteredOverdueCount
  };
}
