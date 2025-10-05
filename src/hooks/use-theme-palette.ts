"use client";

import * as React from "react";
import { useThemeStore } from "@/stores/theme";
import { getThemePalette, ThemePalette } from "@/lib/theme-palettes";

export function useThemePalette(): ThemePalette {
  const theme = useThemeStore((state) => state.theme);
  return React.useMemo(() => getThemePalette(theme), [theme]);
}
