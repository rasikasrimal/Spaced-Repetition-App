"use client";

import { create } from "zustand";

export type ThemeName = "light" | "dark";

interface ThemeState {
  theme: ThemeName;
  initialized: boolean;
  setTheme: (theme: ThemeName) => void;
  setInitialized: (value: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark",
  initialized: false,
  setTheme: (theme) => set({ theme }),
  setInitialized: (value) => set({ initialized: value })
}));
