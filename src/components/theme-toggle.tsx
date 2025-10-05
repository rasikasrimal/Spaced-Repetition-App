"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const TOGGLE_OPTIONS = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" }
] as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const activeTheme = theme ?? resolvedTheme;

  return (
    <div className="flex items-center gap-2">
      {TOGGLE_OPTIONS.map((option) => (
        <Button
          key={option.key}
          type="button"
          variant={activeTheme === option.key ? "default" : "outline"}
          size="sm"
          onClick={() => setTheme(option.key)}
          aria-label={`${option.label} theme`}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
