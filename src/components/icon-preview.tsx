import * as React from "react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconPreviewProps = {
  name: string;
  className?: string;
};

const iconMap = Icons as Record<string, LucideIcon>;
const fallbackIcon: LucideIcon = Icons.Sparkles;

export const IconPreview: React.FC<IconPreviewProps> = ({ name, className }) => {
  const Icon = iconMap[name] ?? fallbackIcon;
  return <Icon className={cn("h-5 w-5", className)} />;
};
