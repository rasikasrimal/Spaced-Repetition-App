"use client";

import * as React from "react";
import { useThemeStore } from "@/stores/theme";

const THEME_STORAGE_KEY = "sr-theme";

const isDarkSchemePreferred = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeManager() {
  const theme = useThemeStore((state) => state.theme);
  const initialized = useThemeStore((state) => state.initialized);
  const setTheme = useThemeStore((state) => state.setTheme);
  const setInitialized = useThemeStore((state) => state.setInitialized);

  React.useEffect(() => {
    if (initialized) {
      return;
    }
    const stored =
      typeof window !== "undefined"
        ? (window.localStorage.getItem(THEME_STORAGE_KEY) as "light" | "dark" | null)
        : null;
    const resolved = stored ?? (isDarkSchemePreferred() ? "dark" : "light");
    setTheme(resolved);
    setInitialized(true);
  }, [initialized, setInitialized, setTheme]);

  React.useEffect(() => {
    if (!initialized || typeof document === "undefined") {
      return;
    }
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [initialized, theme]);

  return null;
}
