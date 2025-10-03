"use client";

import * as React from "react";
import { SubjectFilterValue } from "@/components/dashboard/topic-list";

export const SUBJECT_FILTER_STORAGE_KEY = "dashboard-subject-filter";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

type SubjectFilterSetter = (
  value:
    | SubjectFilterValue
    | ((previous: SubjectFilterValue) => SubjectFilterValue)
) => void;

export function usePersistedSubjectFilter(): {
  subjectFilter: SubjectFilterValue | undefined;
  setSubjectFilter: SubjectFilterSetter;
} {
  const [state, setState] = React.useState<SubjectFilterValue | undefined>(
    undefined
  );

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SUBJECT_FILTER_STORAGE_KEY);
    if (!stored) {
      setState(null);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
        setState(parsed.length === 0 ? new Set<string>() : new Set<string>(parsed));
      } else {
        setState(null);
      }
    } catch {
      setState(null);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof state === "undefined") return;
    if (state === null) {
      window.localStorage.removeItem(SUBJECT_FILTER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        SUBJECT_FILTER_STORAGE_KEY,
        JSON.stringify(Array.from(state))
      );
    }
  }, [state]);

  const setSubjectFilter = React.useCallback<SubjectFilterSetter>((value) => {
    setState((previous) => {
      const current: SubjectFilterValue =
        typeof previous === "undefined" ? null : previous;
      const next = typeof value === "function" ? value(current) : value;
      return next;
    });
  }, []);

  return {
    subjectFilter: state,
    setSubjectFilter
  };
}
