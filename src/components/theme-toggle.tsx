"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "default";
}

export function ThemeToggle({ className, size = "sm" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const activeTheme = (theme ?? resolvedTheme ?? "light") as "light" | "dark";
  const isDark = activeTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={() => setTheme(nextTheme)}
      aria-pressed={isDark}
      aria-label={`Switch to ${nextTheme} theme`}
      className={cn("inline-flex items-center gap-2", className)}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="text-xs font-medium uppercase tracking-wide">
        {isDark ? "Light" : "Dark"}
      </span>
    </Button>
  );
}
