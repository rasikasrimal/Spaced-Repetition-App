"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MIN_OVERLAY = 0.02;
const MAX_OVERLAY = 0.6;
export const DEFAULT_SURFACE_OVERLAY_OPACITY = 0.1;

type AppearanceState = {
  surfaceOverlayOpacity: number;
  setSurfaceOverlayOpacity: (value: number) => void;
};

export const clampOverlayOpacity = (value: number): number => {
  if (Number.isNaN(value)) {
    return DEFAULT_SURFACE_OVERLAY_OPACITY;
  }
  return Math.min(Math.max(value, MIN_OVERLAY), MAX_OVERLAY);
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      surfaceOverlayOpacity: DEFAULT_SURFACE_OVERLAY_OPACITY,
      setSurfaceOverlayOpacity: (value) => set({ surfaceOverlayOpacity: clampOverlayOpacity(value) })
    }),
    {
      name: "spaced-repetition-appearance",
      version: 1
    }
  )
);
