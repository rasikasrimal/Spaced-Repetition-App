import * as React from "react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconPreviewProps = {
  name: string;
  className?: string;
};

const fallbackIcon = Icons.Sparkles as LucideIcon;

const resolveIcon = (name: string): LucideIcon => {
  const candidate = (Icons as Record<string, unknown>)[name];
  if (typeof candidate === "function") {
    return candidate as LucideIcon;
  }
  return fallbackIcon;
};

export const IconPreview: React.FC<IconPreviewProps> = ({ name, className }) => {
  const Icon = resolveIcon(name);
  return <Icon className={cn("h-5 w-5", className)} />;
};
